---
name: note-processor
description: This skill should be used when the user asks to "process notes", "process daily", "process my inbox", "file my captures", "save this link", "organize notes", "process quick capture", or mentions processing, categorizing, or filing notes into an Obsidian vault. Provides a mode-based processing system with safety-first design.
---

# Note Processor

Process text and images into structured, categorized notes in the Obsidian vault using deterministic mode-based workflows.

## Overview

This plugin provides processing **modes** — each mode is a self-contained recipe for handling a specific type of input. Modes are defined in reference files under `references/mode-*.md`.

### Available Modes

| Mode | Trigger | What It Does |
|------|---------|--------------|
| `daily` | `/process daily [date]` | Parse daily note Quick Capture section, classify and file captures |
| `inbox` | `/process inbox` | Scan Inbox/ folder, classify and refile notes to proper locations |
| `link` | `/process link <URL>` | Fetch URL, create structured note in appropriate vault folder |

### Mode Selection

- `/process daily` — run daily mode for today
- `/process daily 2026-02-15` — run daily mode for a specific date
- `/process inbox` — run inbox mode
- `/process link https://example.com` — run link mode
- `/process` — suggest which mode to run based on context
- `/process --dry-run daily` — show what would happen without acting

## Vault Configuration

- **Vault path:** `~/Documents/rmv0/`
- **Daily notes:** `Daily/YYYY-MM-DD.md`
- **Inbox:** `Inbox/`
- **Classification rules:** See `references/categorization.md`
- **Output format:** See `references/output-format.md`
- **Note templates:** See `references/templates.md`
- **Folder taxonomy:** See `references/vault-structure.md`

## Safety Rules

### Tool Restrictions

The note-processor agent has access to: `Read`, `Write`, `Edit`, `Glob`, `Grep`, `WebFetch`.

**No Bash access.** This prevents file deletion, arbitrary command execution, and destructive operations.

### Editing Rules

These rules are **non-negotiable**. Every mode must follow them:

1. **Daily notes:** Only edit within `# Quick Capture`, `# Processed`, and `# To Do` sections. Never touch other content.
2. **Inbox files:** Only prepend a `<!-- processed: YYYY-MM-DD -->` marker. Never delete or overwrite.
3. **All other vault files:** Create new files only. Never modify existing notes.
4. **Protected paths:** NEVER touch files in `Templates/`, `.obsidian/`, `Canvas/`, `Attachments/`.

### Create-Over-Edit

When a note on the same topic already exists:
- Create the new note in `Inbox/` with a wikilink to the existing note
- Do NOT merge content into existing notes
- Report the potential duplicate for user decision

### Secret Detection

**NEVER process content containing:**
- API key patterns (`[A-Za-z0-9_-]{20,}` in key-like context)
- 2FA recovery codes (sequences of 6-10 digit numbers)
- Password-like strings in sensitive context
- Private key markers (`-----BEGIN`)

Flag sensitive content, skip processing, and report to user.

### Dry Run

Every mode supports dry-run. When `--dry-run` is specified:
- Read and classify as normal
- Instead of creating/editing files, output a report listing planned actions
- Format: "Would create: [path]", "Would edit: [path] section [name]"
- User reviews, then triggers actual processing

## Processing Workflow

For any mode, the agent follows this general pattern:

1. **Read the mode reference** — `references/mode-{name}.md`
2. **Read supporting references** — `output-format.md`, `categorization.md`, `templates.md`
3. **Read source content** — as defined by the mode
4. **Classify** — using categorization rules
5. **Transform** — create notes using templates and output format
6. **Write** — create files at vault locations per vault-structure rules
7. **Cleanup** — mode-specific source cleanup (mark processed, clear section, etc.)
8. **Report** — summarize what was done

## Adding New Modes

To add a new processing mode:

1. Create `references/mode-{name}.md` following the mode template structure
2. Define: Trigger, Source, Process steps, Output, Cleanup
3. The `/process` command will automatically route to it
4. No other files need to change
