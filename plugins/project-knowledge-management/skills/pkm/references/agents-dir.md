# .agents/ Directory Standard

## Structure

```
.agents/
├── registry.json    # Machine-readable manifest (REQUIRED)
├── docs/            # Human-readable documentation
│   └── plans/       # Design docs, implementation plans
├── diagrams/        # Visual artifacts (drawio, mermaid)
├── configs/         # Environment configs, settings
├── mops/            # Operational procedures
│   └── scripts/     # Automation scripts
└── templates/       # Code templates, scaffolds
```

## Directory Purposes

| Directory | Contents | When to Create |
|-----------|----------|----------------|
| `docs/` | Architecture docs, analysis, reference material | Always (created by `/init`) |
| `docs/plans/` | Design docs and implementation plans | When planning features |
| `diagrams/` | Mermaid `.mmd`, draw.io `.drawio`, flow charts | When visualizing architecture |
| `configs/` | Environment configs, deployment settings, tool configs | When project has config that agents need |
| `mops/` | Operational procedures, runbooks | When project has repeatable operations |
| `mops/scripts/` | Automation scripts | When ops need scripting |
| `templates/` | Code templates, scaffolds, boilerplate | When project has reusable patterns |

## Rules

1. **Only `registry.json` is required.** All directories are optional — create as needed.
2. **Don't create empty directories.** If you don't have diagrams, don't create `diagrams/`.
3. **The agent owns this space.** `.agents/` is the agent's workspace — it should feel free to create, update, and organize docs here.
4. **Git tracks it.** The `.agents/` directory is version-controlled with the project. Commit docs alongside code changes.
5. **Vault sees it.** Everything in `.agents/` is visible in Obsidian via the vault symlink. Write accordingly — use Obsidian markdown.

## Relationship to CLAUDE.md

`CLAUDE.md` in the project root should have an `## Agent Workspace` section pointing to `.agents/registry.json`. The registry is the machine-readable entry point. CLAUDE.md is the human-readable pointer.

## Relationship to Obsidian Vault

The `.agents/` directory is symlinked from the Obsidian vault:
`~/Documents/rmv0/Technology/Dev/Projects/Workspaces/<project-name>/ → /path/to/project/.agents/`

The symlink is created automatically by the SessionStart hook or by running `/init`.
