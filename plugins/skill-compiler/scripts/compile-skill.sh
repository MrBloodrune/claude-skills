#!/usr/bin/env bash
# skill-compiler: Compile marketplace-format skills into embedded-friendly format
#
# Takes a marketplace skill directory (containing SKILL.md + optional references/)
# and produces two output files:
#   - skill-name.memory  — frontmatter description for always-in-prompt summary
#   - skill-name.md      — flattened body + inlined references for on-demand loading
#
# Usage:
#   compile-skill.sh <skill-dir> <output-dir> [--budget <bytes>] [--force]
#
# Options:
#   --budget <bytes>   Context budget for .memory files (default: 11776)
#                      Based on device RAM: total_context - fixed_overhead
#   --force            Overwrite even if source hasn't changed
#   --dry-run          Show what would be done without writing files
#   --manifest <file>  Hash manifest path (default: <output-dir>/.manifest.json)
#
# Exit codes:
#   0  Success (files written or already up-to-date)
#   1  Error (missing input, parse failure)
#   2  Budget exceeded (combined .memory files exceed budget)

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────
DEFAULT_BUDGET=11776  # bytes available for skill summaries in 16KB context
MANIFEST_FILE=""
FORCE=false
DRY_RUN=false

# ── Parse arguments ───────────────────────────────────────────
usage() {
    sed -n '2,/^$/{ s/^# //; s/^#$//; p }' "$0"
    exit 1
}

POSITIONAL=()
BUDGET="$DEFAULT_BUDGET"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --budget)   BUDGET="$2"; shift 2 ;;
        --force)    FORCE=true; shift ;;
        --dry-run)  DRY_RUN=true; shift ;;
        --manifest) MANIFEST_FILE="$2"; shift 2 ;;
        --help|-h)  usage ;;
        *)          POSITIONAL+=("$1"); shift ;;
    esac
done

if [[ ${#POSITIONAL[@]} -lt 2 ]]; then
    echo "Error: requires <skill-dir> and <output-dir>" >&2
    usage
fi

SKILL_DIR="${POSITIONAL[0]}"
OUTPUT_DIR="${POSITIONAL[1]}"
SKILL_MD="$SKILL_DIR/SKILL.md"

if [[ ! -f "$SKILL_MD" ]]; then
    echo "Error: no SKILL.md found in $SKILL_DIR" >&2
    exit 1
fi

[[ -z "$MANIFEST_FILE" ]] && MANIFEST_FILE="$OUTPUT_DIR/.manifest.json"

# ── Hash check ────────────────────────────────────────────────
compute_hash() {
    # Hash all source files in the skill directory
    find "$SKILL_DIR" -type f -name '*.md' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1
}

SKILL_NAME="$(basename "$SKILL_DIR")"
SOURCE_HASH="$(compute_hash)"

# Check manifest for existing hash
if [[ "$FORCE" == false && -f "$MANIFEST_FILE" ]]; then
    EXISTING_HASH=$(python3 -c "
import json, sys
try:
    m = json.load(open('$MANIFEST_FILE'))
    print(m.get('$SKILL_NAME', {}).get('hash', ''))
except: pass
" 2>/dev/null || true)

    if [[ "$SOURCE_HASH" == "$EXISTING_HASH" ]]; then
        echo "Up-to-date: $SKILL_NAME (hash unchanged)"
        exit 0
    fi
fi

# ── Parse frontmatter ─────────────────────────────────────────
# Use Python to extract frontmatter fields reliably (handles >- multi-line, quotes, etc.)
extract_frontmatter_field() {
    local file="$1"
    local field="$2"

    python3 - "$file" "$field" <<'PYEOF'
import sys, re

filepath = sys.argv[1]
field = sys.argv[2]

with open(filepath, 'r') as f:
    content = f.read()

# Extract frontmatter between --- delimiters
fm_match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
if not fm_match:
    sys.exit(1)

fm = fm_match.group(1)

# Try multi-line >- or > or | syntax first (most common for descriptions)
pattern = rf'^{field}:\s*[>|]-?\s*\n((?:[ \t]+.+\n?)+)'
match = re.search(pattern, fm, re.MULTILINE)
if match:
    lines = match.group(1).strip().split('\n')
    val = ' '.join(l.strip() for l in lines)
    print(val)
    sys.exit(0)

# Try simple single-line: field: value or field: "value"
pattern = rf'^{field}:\s*(.+)$'
match = re.search(pattern, fm, re.MULTILINE)
if match:
    val = match.group(1).strip().strip('"').strip("'")
    if val not in ('>-', '>', '|', '|-'):
        print(val)
        sys.exit(0)

# Not found
print('')
PYEOF
}

DESCRIPTION="$(extract_frontmatter_field "$SKILL_MD" "description")"
NAME="$(extract_frontmatter_field "$SKILL_MD" "name")"

if [[ -z "$DESCRIPTION" ]]; then
    echo "Error: no 'description' field in frontmatter of $SKILL_MD" >&2
    exit 1
fi

[[ -z "$NAME" ]] && NAME="$SKILL_NAME"

# ── Generate .memory file ─────────────────────────────────────
MEMORY_CONTENT="$DESCRIPTION"
MEMORY_BYTES=${#MEMORY_CONTENT}

echo "Skill: $NAME"
echo "  .memory: $MEMORY_BYTES bytes (~$(( MEMORY_BYTES / 4 )) tokens)"

# ── Flatten body + references into .md ─────────────────────────
flatten_skill() {
    local skill_md="$1"
    local skill_dir="$2"
    local body=""

    # Extract body (everything after second ---)
    local past_frontmatter=false
    local found_end=false
    while IFS= read -r line; do
        if [[ "$found_end" == true ]]; then
            body+="$line"$'\n'
        elif [[ "$line" == "---" ]]; then
            if [[ "$past_frontmatter" == true ]]; then
                found_end=true
            else
                past_frontmatter=true
            fi
        fi
    done < "$skill_md"

    # Inline reference files
    local refs_dir="$skill_dir/references"
    if [[ -d "$refs_dir" ]]; then
        for ref_file in "$refs_dir"/*.md; do
            [[ -f "$ref_file" ]] || continue
            local ref_name
            ref_name="$(basename "$ref_file" .md)"
            body+=$'\n'"---"$'\n'
            body+=$'\n'"## Reference: $ref_name"$'\n'$'\n'
            body+="$(cat "$ref_file")"$'\n'
        done
    fi

    echo "$body"
}

FLAT_BODY="$(flatten_skill "$SKILL_MD" "$SKILL_DIR")"
FLAT_BYTES=${#FLAT_BODY}

echo "  .md:     $FLAT_BYTES bytes (~$(( FLAT_BYTES / 4 )) tokens)"

# ── Budget check ──────────────────────────────────────────────
# Check if adding this .memory to existing ones exceeds budget
EXISTING_MEMORY_BYTES=0
if [[ -d "$OUTPUT_DIR" ]]; then
    for mem_file in "$OUTPUT_DIR"/*.memory; do
        [[ -f "$mem_file" ]] || continue
        # Don't count the file we're about to overwrite
        if [[ "$(basename "$mem_file" .memory)" == "$SKILL_NAME" ]]; then
            continue
        fi
        EXISTING_MEMORY_BYTES=$(( EXISTING_MEMORY_BYTES + $(wc -c < "$mem_file") ))
    done
fi

# Add per-skill prompt overhead: "- **Name**: " prefix + "(read with: read_file /spiffs/skills/name.md)\n"
PROMPT_OVERHEAD=$(( ${#NAME} + ${#SKILL_NAME} + 60 ))
TOTAL_MEMORY=$(( EXISTING_MEMORY_BYTES + MEMORY_BYTES + PROMPT_OVERHEAD ))

echo "  Budget:  $TOTAL_MEMORY / $BUDGET bytes used by .memory files"

if [[ "$TOTAL_MEMORY" -gt "$BUDGET" ]]; then
    echo "WARNING: Combined .memory files ($TOTAL_MEMORY bytes) exceed budget ($BUDGET bytes)" >&2
    echo "  The system prompt may be truncated. Consider:" >&2
    echo "  - Shortening skill descriptions" >&2
    echo "  - Removing low-priority skills" >&2
    echo "  - Increasing MIMI_CONTEXT_BUF_SIZE on the device" >&2
    exit 2
fi

# ── Write output ──────────────────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
    echo "  [dry-run] Would write $SKILL_NAME.memory ($MEMORY_BYTES bytes)"
    echo "  [dry-run] Would write $SKILL_NAME.md ($FLAT_BYTES bytes)"
    exit 0
fi

mkdir -p "$OUTPUT_DIR"

echo "$MEMORY_CONTENT" > "$OUTPUT_DIR/$SKILL_NAME.memory"
echo "$FLAT_BODY" > "$OUTPUT_DIR/$SKILL_NAME.md"

# ── Update manifest ───────────────────────────────────────────
python3 -c "
import json, os

manifest_path = '$MANIFEST_FILE'
skill_name = '$SKILL_NAME'
source_hash = '$SOURCE_HASH'
memory_bytes = $MEMORY_BYTES
flat_bytes = $FLAT_BYTES

# Load or create manifest
manifest = {}
if os.path.exists(manifest_path):
    try:
        manifest = json.load(open(manifest_path))
    except:
        manifest = {}

manifest[skill_name] = {
    'hash': source_hash,
    'memory_bytes': memory_bytes,
    'flat_bytes': flat_bytes,
}

# Write budget summary
total_memory = sum(v.get('memory_bytes', 0) for v in manifest.values() if isinstance(v, dict))
manifest['_budget'] = {
    'total_memory_bytes': total_memory,
    'budget_bytes': $BUDGET,
    'utilization_pct': round(total_memory / $BUDGET * 100, 1) if $BUDGET > 0 else 0,
}

with open(manifest_path, 'w') as f:
    json.dump(manifest, f, indent=2)
" 2>/dev/null

echo "  Written: $OUTPUT_DIR/$SKILL_NAME.memory"
echo "  Written: $OUTPUT_DIR/$SKILL_NAME.md"
echo "  Manifest updated: $MANIFEST_FILE"
