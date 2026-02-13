---
name: pkm
description: Use when working with project documentation in .agents/ workspaces — creating docs, updating plans, maintaining registry.json, or when the obsidian skill for creating markdown should be referenced for docs in the .agents/ workspace. Provides standards for current-state-only documentation, Obsidian markdown format, and workspace structure.
---

# Project Knowledge Management

You are working with a standardized `.agents/` workspace. This skill defines how to create, organize, and maintain project documentation.

## Core Principle: Current State Only

**Docs describe what IS, never what WAS.**

- When something changes, update the doc to reflect the new state
- Do NOT append changelog entries or "Updated on" timestamps
- Do NOT keep historical sections ("Previously we used X")
- Remove outdated content immediately — stale docs are worse than no docs
- If history matters, that's what git blame is for

## Workspace Discovery

Every project with a `.agents/` directory has a `registry.json` manifest:

```bash
cat .agents/registry.json
```

This tells you:
- `name`: project identifier
- `type`: "project" or "infrastructure"
- `category`: vault category (Finance, Voice, Network, etc.)
- `vault_note`: path to the overview note in the Obsidian vault
- `workspace`: map of purpose → relative directory path

**Always read `registry.json` before working with docs.** It tells you where things go.

## Writing Documentation

### File Placement

- **Plans and designs**: `.agents/docs/plans/` — kebab-case, date-prefixed for plans: `2026-02-13-auth-design.md`
- **Architecture docs**: `.agents/docs/` — kebab-case: `api-architecture.md`
- **Diagrams**: `.agents/diagrams/` — mermaid in `.mmd`, draw.io in `.drawio`
- **Configs**: `.agents/configs/` — environment configs, deployment settings

### Markdown Format

Use Obsidian-flavored markdown. See `references/markdown-rules.md` for full details.

**Required frontmatter** for all docs:

```yaml
---
title: Document Title
tags:
  - project/<project-name>
  - type/<doc-type>
status: current
---
```

Status values: `draft`, `current`, `archived`

**Key formatting rules:**
- Wikilinks for cross-references within workspace: `[[docs/plans/auth-design]]`
- Callouts for warnings and important notes: `> [!warning]`, `> [!note]`, `> [!tip]`
- Code blocks with language tags always: ` ```json `, ` ```bash `, ` ```python `
- No excessive formatting — content over decoration
- Headings: `##` for sections, `###` for subsections, never `#` (reserved for title)

### Naming Conventions

- **Files**: kebab-case, human-readable: `auth-design.md`, `api-endpoints.md`
- **Directories**: lowercase, short: `plans/`, `configs/`, `diagrams/`
- **No abbreviations** unless universally understood: `api` yes, `auth-svc-cfg` no

## Maintaining the Registry

Update `registry.json` when:
- A new directory is added to `.agents/` → add to `workspace` map
- Project category changes → update `category` and `vault_note`
- Repo URL changes → update `repo`

Do NOT add directories to `workspace` that don't exist. Only map what's actually there.

## Vault Integration

The `.agents/` directory is symlinked into the Obsidian vault at:
`~/Documents/rmv0/Technology/Dev/Projects/Workspaces/<project-name>/`

This means:
- All docs in `.agents/` are browsable in Obsidian
- Wikilinks work across the vault
- Search in Obsidian includes workspace docs
- Changes in either location are the same files (symlink)

## When to Create Docs

Create documentation when:
- A design decision is made that affects architecture
- A plan is written before implementation
- An operational procedure needs to be repeatable
- A complex system needs explanation for future agents/developers

Do NOT create documentation for:
- Trivial implementation details (the code is the doc)
- Temporary debugging notes (use git stash or scratch files)
- Meeting notes or status updates (that's what the vault overview note is for)
