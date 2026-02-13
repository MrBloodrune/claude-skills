#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────
VAULT_BASE="${HOME}/Documents/rmv0"
WORKSPACES_DIR="${VAULT_BASE}/Technology/Dev/Projects/Workspaces"
PROJECT_ROOTS=("${HOME}/dev" "/data/dev/projects" "/data/dev/admin")

# ── Colors ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { printf "${BLUE}[info]${NC} %s\n" "$*"; }
success() { printf "${GREEN}[ok]${NC} %s\n" "$*"; }
warn()    { printf "${YELLOW}[warn]${NC} %s\n" "$*"; }
error()   { printf "${RED}[error]${NC} %s\n" "$*" >&2; }

# ── Helpers ────────────────────────────────────────────────────────────

# Derive a workspace name from a project path.
# Uses the directory basename, lowercased, with spaces replaced by hyphens.
workspace_name_from_path() {
    local project_dir="$1"
    basename "$project_dir" | tr '[:upper:]' '[:lower:]' | tr ' ' '-'
}

# Validate JSON with python3 and check required fields.
# Returns 0 on success, 1 on failure. Prints errors.
validate_registry() {
    local registry="$1"
    local project_dir
    project_dir="$(dirname "$(dirname "$registry")")"

    # Check valid JSON
    if ! python3 -c "import json, sys; json.load(open(sys.argv[1]))" "$registry" 2>/dev/null; then
        error "$registry: invalid JSON"
        return 1
    fi

    # Check required fields
    local missing=()
    for field in name type category workspace; do
        if ! python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
assert sys.argv[2] in data and data[sys.argv[2]]
" "$registry" "$field" 2>/dev/null; then
            missing+=("$field")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        error "$registry: missing required fields: ${missing[*]}"
        return 1
    fi

    # Check that workspace dirs exist
    python3 -c "
import json, sys, os
data = json.load(open(sys.argv[1]))
project = sys.argv[2]
ws = data.get('workspace', {})
errors = []
for key, rel in ws.items():
    full = os.path.join(project, '.agents', rel)
    if not os.path.exists(full):
        errors.append(f'{key}: {full}')
if errors:
    for e in errors:
        print(e)
    sys.exit(1)
" "$registry" "$project_dir" 2>/dev/null
    local ws_rc=$?
    if [[ $ws_rc -ne 0 ]]; then
        warn "$registry: some workspace dirs are missing (non-fatal)"
    fi

    return 0
}

# Create or verify a workspace symlink in the vault Workspaces/ dir.
# $1 = project directory (absolute path)
# Returns 0 on success.
ensure_workspace_link() {
    local project_dir="$1"
    local agents_dir="${project_dir}/.agents"
    local ws_name
    ws_name="$(workspace_name_from_path "$project_dir")"
    local link_path="${WORKSPACES_DIR}/${ws_name}"

    # Create Workspaces dir if needed
    if [[ ! -d "$WORKSPACES_DIR" ]]; then
        mkdir -p "$WORKSPACES_DIR"
        info "Created ${WORKSPACES_DIR}"
    fi

    # If link already exists
    if [[ -L "$link_path" ]]; then
        local current_target
        current_target="$(readlink "$link_path")"
        if [[ "$current_target" == "$agents_dir" ]]; then
            return 0  # Already correct, silent success
        else
            warn "${link_path} points to ${current_target}, expected ${agents_dir}"
            return 1
        fi
    elif [[ -e "$link_path" ]]; then
        error "${link_path} exists but is not a symlink"
        return 1
    fi

    # Create symlink
    ln -s "$agents_dir" "$link_path"
    success "Linked ${ws_name} -> ${agents_dir}"
    return 0
}

# ── Commands ───────────────────────────────────────────────────────────

cmd_sync() {
    info "Scanning project roots for .agents/ directories..."
    local found=0
    local linked=0
    local errors=0

    for root in "${PROJECT_ROOTS[@]}"; do
        if [[ ! -d "$root" ]]; then
            warn "Project root not found: ${root}"
            continue
        fi

        # Find .agents directories (max 3 levels deep to handle nested projects like esp32/base)
        while IFS= read -r agents_dir; do
            local project_dir
            project_dir="$(dirname "$agents_dir")"
            found=$((found + 1))

            if ensure_workspace_link "$project_dir"; then
                linked=$((linked + 1))
            else
                errors=$((errors + 1))
            fi
        done < <(find "$root" -maxdepth 4 -name ".agents" -type d ! -path "*/.git/*" ! -path "*/node_modules/*" 2>/dev/null)
    done

    info "Found ${found} project(s) with .agents/"
    info "Linked: ${linked}, Errors: ${errors}"

    # Report orphaned symlinks
    if [[ -d "$WORKSPACES_DIR" ]]; then
        local orphans=0
        for link in "${WORKSPACES_DIR}"/*; do
            [[ -e "$link" ]] || [[ -L "$link" ]] || continue
            if [[ -L "$link" ]] && [[ ! -e "$link" ]]; then
                local target
                target="$(readlink "$link")"
                warn "Orphaned symlink: ${link} -> ${target}"
                orphans=$((orphans + 1))
            fi
        done
        if [[ $orphans -gt 0 ]]; then
            warn "${orphans} orphaned symlink(s) found in Workspaces/"
        fi
    fi
}

cmd_check() {
    info "Validating registries and symlinks..."
    local checked=0
    local valid=0
    local invalid=0

    for root in "${PROJECT_ROOTS[@]}"; do
        if [[ ! -d "$root" ]]; then
            continue
        fi

        while IFS= read -r registry; do
            checked=$((checked + 1))
            local project_dir
            project_dir="$(dirname "$(dirname "$registry")")"

            # Validate registry JSON and fields
            if validate_registry "$registry"; then
                success "${registry}"
                valid=$((valid + 1))
            else
                invalid=$((invalid + 1))
            fi
        done < <(find "$root" -maxdepth 5 -path "*/.agents/registry.json" -type f ! -path "*/.git/*" ! -path "*/node_modules/*" 2>/dev/null)
    done

    # Check workspace symlinks
    if [[ -d "$WORKSPACES_DIR" ]]; then
        info "Checking workspace symlinks..."
        local broken=0
        for link in "${WORKSPACES_DIR}"/*; do
            [[ -L "$link" ]] || continue
            if [[ ! -e "$link" ]]; then
                local target
                target="$(readlink "$link")"
                error "Broken symlink: ${link} -> ${target}"
                broken=$((broken + 1))
            else
                success "Symlink OK: $(basename "$link")"
            fi
        done
        if [[ $broken -gt 0 ]]; then
            error "${broken} broken symlink(s)"
        fi
    fi

    info "Checked ${checked} registries: ${valid} valid, ${invalid} invalid"
    [[ $invalid -eq 0 ]] && return 0 || return 1
}

cmd_status() {
    local project_dir="${1:-$(pwd)}"
    project_dir="$(cd "$project_dir" && pwd)"  # Resolve to absolute

    local agents_dir="${project_dir}/.agents"
    if [[ ! -d "$agents_dir" ]]; then
        error "No .agents/ directory in ${project_dir}"
        return 1
    fi

    local ws_name
    ws_name="$(workspace_name_from_path "$project_dir")"

    printf "\n"
    info "=== Workspace Status: ${project_dir} ==="
    printf "\n"

    # Registry info
    local registry="${agents_dir}/registry.json"
    if [[ -f "$registry" ]]; then
        info "Registry: ${registry}"
        python3 -c "
import json, sys
data = json.load(open(sys.argv[1]))
fields = ['name', 'type', 'category', 'vault_note', 'repo']
for f in fields:
    val = data.get(f, '—')
    print(f'  {f}: {val}')
ws = data.get('workspace', {})
if ws:
    print('  workspace:')
    for k, v in ws.items():
        print(f'    {k}: {v}')
" "$registry" 2>/dev/null || warn "Could not parse registry.json"
    else
        warn "No registry.json found"
    fi

    printf "\n"

    # Symlink status
    local link_path="${WORKSPACES_DIR}/${ws_name}"
    info "Workspace link: ${link_path}"
    if [[ -L "$link_path" ]]; then
        local target
        target="$(readlink "$link_path")"
        if [[ "$target" == "$agents_dir" ]]; then
            success "Symlink OK -> ${target}"
        else
            warn "Symlink points to ${target} (expected ${agents_dir})"
        fi
    elif [[ ! -e "$link_path" ]]; then
        warn "No workspace symlink exists"
    else
        error "${link_path} exists but is not a symlink"
    fi

    printf "\n"

    # Doc inventory
    local docs_dir="${agents_dir}/docs"
    if [[ -d "$docs_dir" ]] || [[ -L "$docs_dir" ]]; then
        info "Docs directory: ${docs_dir}"
        if [[ -L "$docs_dir" ]]; then
            local docs_target
            docs_target="$(readlink "$docs_dir")"
            info "  -> symlink to ${docs_target}"
            if [[ ! -e "$docs_dir" ]]; then
                error "  Broken symlink!"
            fi
        fi
        if [[ -e "$docs_dir" ]]; then
            local doc_count
            doc_count="$(find -L "$docs_dir" -type f -name "*.md" 2>/dev/null | wc -l)"
            info "  ${doc_count} markdown file(s)"
        fi
    else
        info "No docs/ directory"
    fi

    # List .agents/ contents
    printf "\n"
    info "Contents of .agents/:"
    for item in "${agents_dir}"/*; do
        [[ -e "$item" ]] || continue
        local name
        name="$(basename "$item")"
        if [[ -L "$item" ]]; then
            printf "  %s -> %s\n" "$name" "$(readlink "$item")"
        elif [[ -d "$item" ]]; then
            printf "  %s/\n" "$name"
        else
            printf "  %s\n" "$name"
        fi
    done
    printf "\n"
}

cmd_init() {
    local project_dir="${1:?Usage: agents-link.sh init <path>}"
    project_dir="$(cd "$project_dir" && pwd)"  # Resolve to absolute

    local agents_dir="${project_dir}/.agents"
    local registry="${agents_dir}/registry.json"
    local project_name
    project_name="$(basename "$project_dir")"

    info "Initializing .agents/ in ${project_dir}"

    # Create .agents/ if missing
    if [[ ! -d "$agents_dir" ]]; then
        mkdir -p "$agents_dir"
        success "Created ${agents_dir}"
    fi

    # Create docs/ if missing
    local docs_dir="${agents_dir}/docs"
    if [[ ! -d "$docs_dir" ]] && [[ ! -L "$docs_dir" ]]; then
        mkdir -p "$docs_dir"
        success "Created ${docs_dir}"
    fi

    # Detect category and vault note from CLAUDE.md
    local category=""
    local vault_note=""
    local claude_md="${project_dir}/CLAUDE.md"
    if [[ -f "$claude_md" ]]; then
        local vault_line
        vault_line="$(grep -oP '\*\*Vault\*\*:\s*`~/Documents/rmv0/Technology/Dev/Projects/\K[^`]+' "$claude_md" 2>/dev/null || true)"
        if [[ -n "$vault_line" ]]; then
            category="$(dirname "$vault_line")"
            vault_note="Technology/Dev/Projects/${vault_line}"
            info "Detected category: ${category}"
            info "Detected vault note: ${vault_note}"
        fi
    fi

    # Detect repo URL from git remote
    local repo=""
    if [[ -d "${project_dir}/.git" ]]; then
        repo="$(git -C "$project_dir" remote get-url origin 2>/dev/null || true)"
    fi

    # Create or validate registry.json
    if [[ -f "$registry" ]]; then
        info "Registry already exists: ${registry}"
        if validate_registry "$registry"; then
            success "Registry is valid"
        else
            warn "Registry has issues (see above)"
        fi
    else
        # Generate registry from template
        python3 -c "
import json, sys

data = {
    'name': sys.argv[1],
    'type': 'project',
    'category': sys.argv[2] if sys.argv[2] else '',
    'vault_note': sys.argv[3] if sys.argv[3] else '',
    'repo': sys.argv[4] if sys.argv[4] else '',
    'workspace': {
        'docs': 'docs/'
    }
}

with open(sys.argv[5], 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
" "$project_name" "$category" "$vault_note" "$repo" "$registry"
        success "Created ${registry}"
    fi

    # Ensure workspace symlink
    ensure_workspace_link "$project_dir"
}

cmd_link() {
    local project_dir="${1:?Usage: agents-link.sh link <path>}"
    project_dir="$(cd "$project_dir" && pwd)"

    local agents_dir="${project_dir}/.agents"
    if [[ ! -d "$agents_dir" ]]; then
        error "No .agents/ directory in ${project_dir}"
        error "Run 'agents-link.sh init ${project_dir}' first"
        return 1
    fi

    ensure_workspace_link "$project_dir"
}

# ── Main ───────────────────────────────────────────────────────────────

usage() {
    cat <<'EOF'
Usage: agents-link.sh <command> [args]

Commands:
  sync          Scan project roots, create missing vault symlinks
  check         Validate registries and symlinks, report issues
  status [path] Show workspace state (default: CWD)
  init <path>   Scaffold .agents/ in a project
  link <path>   Create vault symlink for a single project

Configuration:
  VAULT_BASE     ~/Documents/rmv0
  WORKSPACES_DIR ~/Documents/rmv0/Technology/Dev/Projects/Workspaces
  PROJECT_ROOTS  ~/dev, /data/dev/projects, /data/dev/admin
EOF
}

main() {
    local cmd="${1:-}"
    shift || true

    case "$cmd" in
        sync)   cmd_sync "$@" ;;
        check)  cmd_check "$@" ;;
        status) cmd_status "$@" ;;
        init)   cmd_init "$@" ;;
        link)   cmd_link "$@" ;;
        -h|--help|help) usage ;;
        *)
            error "Unknown command: ${cmd:-<none>}"
            usage
            return 1
            ;;
    esac
}

main "$@"
