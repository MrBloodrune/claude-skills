---
name: init
description: Scaffold a .agents/ workspace in the current project with registry, docs, and Obsidian vault link
---

Initialize or validate the `.agents/` workspace for the current project.

## What This Does

1. Detects the project name and root directory
2. Creates `.agents/` structure with `registry.json` and `docs/`
3. Creates a vault symlink at `~/Documents/rmv0/Technology/Dev/Projects/Workspaces/<name>/`
4. Adds the `## Agent Workspace` section to `CLAUDE.md` if missing

## Steps

### Step 1: Run the scaffold script

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/agents-link.sh init "$(pwd)"
```

If it reports "Already initialized", proceed to validation in Step 2.

### Step 2: Validate the result

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/agents-link.sh status "$(pwd)"
```

Review the output. Check that:
- `registry.json` exists and has correct `name`, `type`, `category`
- Vault symlink is created
- `docs/` directory exists

### Step 3: Check registry.json accuracy

Read `.agents/registry.json`. If the `category` is "Uncategorized" or the `vault_note` is empty, ask the user which category this project belongs to from: Embedded, Finance, Games, ML, Network, Tools, TUI, UI, Voice.

Then update `registry.json` with the correct category and vault_note path following the pattern: `Technology/Dev/Projects/<Category>/<Name>.md`

### Step 4: Ensure CLAUDE.md has the Agent Workspace section

Read `CLAUDE.md` in the project root. If it does NOT contain a `## Agent Workspace` section, add this section (adjust category and name):

```markdown
## Agent Workspace
- **Registry**: `.agents/registry.json`
- **Vault**: `~/Documents/rmv0/Technology/Dev/Projects/<Category>/<Name>.md`

Agents: consult `.agents/registry.json` for workspace navigation. Maintain docs in `.agents/docs/`.
```

Do not modify the section if it already exists.

### Step 5: Report

Tell the user what was created/validated:
- Registry location and contents
- Vault symlink path
- Whether CLAUDE.md was updated
- Next steps: "Add documentation to `.agents/docs/` — it's now visible in Obsidian under Projects/Workspaces/<name>/"
