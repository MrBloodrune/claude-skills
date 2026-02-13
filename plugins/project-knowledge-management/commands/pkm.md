---
name: pkm
description: Workspace management — sync vault links, validate registries, show status
---

Manage `.agents/` workspaces and their Obsidian vault integration.

## Usage

- `/pkm sync` — Scan all project dirs, create missing vault symlinks
- `/pkm check` — Validate registries, symlinks, report issues
- `/pkm status` — Show current project's workspace state

## Commands

### `/pkm sync`

Run the sync operation across all configured project roots:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/agents-link.sh sync
```

Report the results to the user. If orphaned symlinks are found, list them and ask if the user wants them removed.

### `/pkm check`

Run validation across all workspaces:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/agents-link.sh check
```

If issues are found:
1. Report each issue clearly
2. For missing registry fields — offer to fix them
3. For broken symlinks — offer to remove or re-link
4. For missing workspace dirs — offer to create them

If the user wants deeper doc maintenance, suggest using the `workspace-maintainer` agent.

### `/pkm status`

Show the current project's workspace state:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/agents-link.sh status "$(pwd)"
```

If no argument is provided, default to the current working directory.

Present the output to the user. If the workspace isn't initialized, suggest running `/init`.
