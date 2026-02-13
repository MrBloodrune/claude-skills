# registry.json Schema

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Project directory name (lowercase, matches filesystem) |
| `type` | string | `"project"` or `"infrastructure"` |
| `category` | string | Vault category: Embedded, Finance, Games, ML, Network, Tools, TUI, UI, Voice |
| `workspace` | object | Maps purpose names to relative directory paths within `.agents/` |

## Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `vault_note` | string | Relative vault path to overview note: `Technology/Dev/Projects/<Category>/<Name>.md` |
| `repo` | string | Remote repository URL |

## Workspace Map

The `workspace` object maps purpose names to relative paths. Only include directories that exist:

```json
{
  "workspace": {
    "docs": "docs/",
    "plans": "docs/plans/",
    "diagrams": "diagrams/",
    "configs": "configs/",
    "mops": "mops/",
    "scripts": "mops/scripts/",
    "templates": "templates/"
  }
}
```

Common purposes: `docs`, `plans`, `diagrams`, `configs`, `mops`, `scripts`, `templates`

## Example: Simple Project

```json
{
  "name": "banker",
  "type": "project",
  "category": "Finance",
  "vault_note": "Technology/Dev/Projects/Finance/Banker.md",
  "repo": "https://gitlab.mrbloodrune.dev/bloodrune/banker",
  "workspace": {
    "docs": "docs/"
  }
}
```

## Example: Infrastructure (admin)

```json
{
  "name": "admin",
  "type": "infrastructure",
  "category": "Homelab",
  "vault_note": "Technology/Dev/Homelab/Overview.md",
  "workspace": {
    "docs": "docs/",
    "mops": "mops/",
    "scripts": "mops/scripts/",
    "diagrams": "diagrams/",
    "configs": "configs/",
    "templates": "templates/"
  }
}
```

## Validation Rules

1. `name` must match the parent directory of `.agents/`
2. All paths in `workspace` must be relative (no leading `/`)
3. All paths in `workspace` must point to existing directories
4. `category` must be a recognized vault category
5. JSON must be valid and parseable
