#!/usr/bin/env bash
# PKM SessionStart hook — auto-create vault symlink for current project
# Silent unless a new link is created.

VAULT_BASE="${HOME}/Documents/rmv0"
WORKSPACES_DIR="${VAULT_BASE}/Technology/Dev/Projects/Workspaces"

# Find .agents/ in CWD or up to 3 parent dirs
dir="$(pwd)"
agents_dir=""
for _ in 1 2 3; do
    if [[ -d "${dir}/.agents" ]]; then
        agents_dir="${dir}/.agents"
        break
    fi
    dir="$(dirname "$dir")"
done

# No .agents/ found — exit silently
[[ -z "$agents_dir" ]] && exit 0

# Derive project name
project_dir="${agents_dir%/.agents}"
name="$(basename "$project_dir")"
link_path="${WORKSPACES_DIR}/${name}"

# Already linked — exit silently
[[ -L "$link_path" ]] && exit 0

# Conflict — not a symlink, don't touch it
[[ -e "$link_path" ]] && exit 0

# Create the link
mkdir -p "$WORKSPACES_DIR"
ln -s "$agents_dir" "$link_path"
echo "PKM: linked ${name} workspace to Obsidian vault"
