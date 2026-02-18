---
name: Skill Compiler
description: >-
  This skill should be used when the user asks to "compile a skill for MimiClaw",
  "minify a skill for embedded", "flatten a marketplace skill", "prepare skills
  for ESP32", "convert skills to embedded format", "check skill budget", or
  "batch compile skills", or wants to deploy Claude Code skills to a
  resource-constrained device. Covers the full pipeline: skill selection,
  script invocation, budget validation, minification, and SPIFFS deployment.
---

# Skill Compiler

Compile marketplace-format Claude Code skills into minified, embedded-friendly
format for resource-constrained agents. Produces two files per skill:

- **`.memory`** — Frontmatter description (~250-500 tokens). Always loaded into
  the device system prompt. Equivalent to the marketplace skill's YAML
  frontmatter `description` field.
- **`.md`** — Flattened body with inlined references. Loaded on-demand by the
  agent via `read_file` when the skill triggers.

## Context Budget

The target device has a fixed context buffer shared by the system prompt,
memory files, skill summaries, and conversation history. The `.memory` files
are the primary budget constraint since they are always in the prompt.

**Default budget (MimiClaw ESP32-S3, 16KB context buffer):**

| Component | Bytes | Notes |
|-----------|-------|-------|
| Static system prompt | ~1,900 | Tool descriptions, memory instructions |
| Section headers | ~150 | Markdown structure |
| SOUL.md + USER.md | ~500 | Bootstrap personality files |
| Long-term memory | ~2,000 | Grows over time |
| **Fixed overhead** | **~4,600** | |
| **Available for .memory** | **~11,800** | ~2,900 tokens |

At ~300 bytes per `.memory` file: ~39 skills fit.
At ~500 bytes per `.memory` file: ~23 skills fit.

To calculate for a different device, use:
`available = total_context_buffer - 4600`

For detailed buffer layout, per-device scaling tables, and token estimation,
read `references/context-budget.md`.

## Compilation Pipeline

### Step 1: Select Source Skills

Identify marketplace skills to compile. Source locations:

- Plugin skills: `plugins/<name>/skills/<skill-name>/SKILL.md`
- Standalone skills: any directory containing `SKILL.md`

Verify each source has valid YAML frontmatter with a `description` field.

### Step 2: Run the Compiler Script

The deterministic shell script handles parsing, flattening, and budget checking.
`${CLAUDE_PLUGIN_ROOT}` resolves to this plugin's install directory automatically.

```bash
# Single skill
bash ${CLAUDE_PLUGIN_ROOT}/scripts/compile-skill.sh \
  <skill-source-dir> <output-dir> \
  --budget 11776

# Dry run to preview
bash ${CLAUDE_PLUGIN_ROOT}/scripts/compile-skill.sh \
  <skill-source-dir> <output-dir> \
  --dry-run

# Force recompile (skip hash check)
bash ${CLAUDE_PLUGIN_ROOT}/scripts/compile-skill.sh \
  <skill-source-dir> <output-dir> \
  --force
```

The script:
1. Parses YAML frontmatter from SKILL.md
2. Extracts `description` field → writes `.memory` file
3. Strips frontmatter, concatenates body + `references/*.md` → writes `.md` file
4. Computes SHA-256 of source files → checks against manifest
5. Validates combined `.memory` size against budget
6. Updates `.manifest.json` with hashes and byte counts

### Step 3: Review and Optimize

After compilation, review the output:

- **Budget report**: The manifest `_budget` field shows total utilization
- **Oversized .memory files**: If a description exceeds ~500 bytes, rewrite it.
  Keep trigger phrases but cut prose. The marketplace description format is
  already designed for this density.
- **Oversized .md files**: If the flattened body exceeds ~8KB, consider:
  - Removing redundant examples (keep one per pattern)
  - Cutting verbose explanations the LLM already knows
  - Dropping reference sections that don't apply to the embedded context

### Step 4: Deploy to Device

Copy compiled files to the SPIFFS image source or flash directly:

```bash
# For MimiClaw build pipeline
cp output/*.memory output/*.md /path/to/spiffs_image/skills/

# Or use idf.py spiffsgen to build image
```

The device skill loader reads `.memory` files for prompt injection and
leaves `.md` files for on-demand `read_file` access.

## Writing Good .memory Content

The `.memory` file follows the same conventions as marketplace skill
frontmatter descriptions:

- **Third-person**: "This skill should be used when..."
- **Specific trigger phrases**: Exact utterances in quotes
- **Action-oriented**: What the skill does, not how it works
- **250-500 tokens max**: A few lines, not paragraphs

**Good example** (298 bytes):
```
This skill should be used when working with containers, writing
Containerfiles, creating pods, or setting up Quadlet systemd units.
Triggers on "podman", "container", "quadlet", "pod", "rootless".
Never suggest Docker — always use Podman equivalents.
```

**Bad example** (too long, too vague):
```
This skill provides comprehensive guidance for container management
including but not limited to creating containers, managing pods,
writing configuration files, and understanding the container ecosystem.
It covers rootless containers, systemd integration via Quadlet units,
container registries, image building with Buildah, and multi-container
composition with podman-compose...
```

## Minification Guidelines

When the flattened `.md` is too large for the token budget, apply these
reductions in order:

1. **Drop contributor/meta sections** — changelog, credits, version history
2. **Collapse multiple examples to one** — keep the most representative
3. **Remove "why" explanations** — keep "what" and "how"
4. **Strip code comments** in embedded code blocks
5. **Merge overlapping reference files** — deduplicate shared content
6. **Summarize reference material** — convert verbose docs to bullet lists

For aggressive minification, use an LLM pass: "Condense this skill to
under N bytes while preserving all actionable instructions and tool
references. Keep one example per pattern. Use imperative form."

## Batch Compilation

To compile all skills from a marketplace plugins directory, run from
the marketplace root (e.g. the directory containing `plugins/`):

```bash
for skill_dir in plugins/*/skills/*/; do
  [ -f "$skill_dir/SKILL.md" ] || continue
  bash ${CLAUDE_PLUGIN_ROOT}/scripts/compile-skill.sh \
    "$skill_dir" ./compiled-skills --budget 11776
done
```

Review the manifest afterward:
```bash
cat compiled-skills/.manifest.json
```
