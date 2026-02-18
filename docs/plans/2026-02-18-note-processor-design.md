# Note Processor Plugin — Design

## Problem

The existing `process-daily` plugin handles one specific case: parsing Obsidian daily note captures. But note processing needs are broader — inbox folders with stray files, links to save, images to classify — and the system needs to be modular, safe, and deterministic enough for smaller models to execute reliably. A previous attempt at CouchDB-direct processing failed due to E2E encryption making document parsing unreliable.

## Goals

1. Mode-based processing — each mode is a self-contained recipe for a specific input type
2. Absorb `process-daily` as the first mode (daily note processing)
3. Safety-first — no file deletion, section-scoped edits, secret detection, dry-run support
4. Deterministic instructions — Sonnet 4.6 can follow them reliably without creative reasoning
5. Extensible — adding a new mode = adding a reference file
6. Obsidian-native output with swappable format for future non-vault destinations

## Non-Goals

- Audio/voice processing (separate pipeline upstream; voice notes get transcribed before reaching this plugin)
- Fully autonomous background processing (user triggers modes interactively)
- CouchDB direct access (filesystem operations via LiveSync'd local vault copy)
- Real-time file watching / daemon behavior

## Architecture

### Mode System

Each mode is a reference file (`references/mode-*.md`) defining:

| Section | Purpose |
|---------|---------|
| **Trigger** | What input does this mode handle |
| **Source** | Where to read from |
| **Process** | Step-by-step classification and transformation |
| **Output** | Where to write results |
| **Cleanup** | What to do with the source after processing |

### Initial Modes

**Mode: `daily`** — Process daily note captures
- Source: `~/Documents/rmv0/Daily/YYYY-MM-DD.md`, `# Quick Capture` section
- Process: Split by blank lines → classify each capture → create notes using templates
- Output: New notes filed to vault folders. Tasks extracted to `# To Do`.
- Cleanup: Clear `# Quick Capture`, populate `# Processed` with wikilinks

**Mode: `inbox`** — Scan inbox folder for unprocessed items
- Source: `~/Documents/rmv0/Inbox/` — any `.md` files
- Process: Read each file → classify → determine proper vault location
- Output: New note created at destination with proper frontmatter. Source file gets `<!-- processed: YYYY-MM-DD -->` marker prepended (not moved or deleted).
- Cleanup: Marked files stay in Inbox until user manually removes them

**Mode: `link`** — Process a URL into a structured note
- Source: URL provided as argument
- Process: Fetch URL → extract title and summary → classify topic → create note
- Output: Note created in appropriate vault folder using Link/Article template
- Cleanup: None (URL is ephemeral input)

### Mode Selection

- `/process daily` → mode-daily
- `/process daily 2026-02-15` → mode-daily with date argument
- `/process inbox` → mode-inbox
- `/process link https://example.com` → mode-link
- `/process` (no args) → agent suggests which mode based on context

### Dry Run

Every mode supports `--dry-run`:
- Read and classify as normal
- Output a report instead of creating/editing files
- User reviews, then triggers actual processing

## Plugin Structure

```
plugins/note-processor/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── note-processor/
│       ├── SKILL.md                    # Core skill: mode system, safety rules, vault config
│       └── references/
│           ├── mode-daily.md           # Mode: process daily note captures
│           ├── mode-inbox.md           # Mode: scan inbox folder
│           ├── mode-link.md            # Mode: process URL into note
│           ├── output-format.md        # Obsidian markdown conventions
│           ├── categorization.md       # Classification rules and decision tree
│           ├── templates.md            # Note templates per category
│           └── vault-structure.md      # Vault folder taxonomy
├── commands/
│   ├── process.md                      # /process [mode] [args] — main entry
│   └── process-daily.md               # /process-daily [date] — shortcut
└── agents/
    └── note-processor.md              # Sonnet 4.6, no-Bash agent
```

### Relationship to process-daily

The `process-daily` plugin's logic is absorbed into `mode-daily.md`. Reference files (categorization, templates, vault-structure) are carried over and refined. The `process-daily` plugin is deprecated — its marketplace entry can remain with a note pointing to `note-processor`.

## Safety Model

### Tool Restrictions

Agent tools: `Read`, `Write`, `Edit`, `Glob`, `Grep`. **No Bash.**

This prevents:
- `rm`, `mv`, or any destructive shell commands
- Arbitrary code execution
- Network access beyond what Write/Edit provide

### Editing Rules

- **Daily notes:** Only edit within `# Quick Capture`, `# Processed`, and `# To Do` sections
- **Inbox files:** Only prepend a `<!-- processed -->` marker
- **All other files:** Create new, never modify existing
- **Protected paths:** Never touch `Templates/`, `.obsidian/`, `Canvas/`, `Attachments/`

### Create-Over-Edit Preference

When a note on the same topic already exists:
- Create the new note in `Inbox/` with a wikilink to the existing note
- Do NOT merge content into existing notes automatically
- Report the potential duplicate for user decision

### Secret Detection

Skip captures matching:
- API key patterns (`[A-Za-z0-9_-]{20,}`)
- 2FA recovery codes (sequences of 6-10 digit numbers)
- Password-like strings in sensitive context
- Private key markers (`-----BEGIN`)

Flag and report. Never process or expose in output.

## Agent Design

```yaml
name: note-processor
description: >-
  Process notes, captures, and links into structured vault entries.
  Triggered by /process commands or direct requests.
model: sonnet  # Sonnet 4.6 for reliable classification
tools: [Read, Write, Edit, Glob, Grep]
```

### Agent Workflow

1. Receive mode from command or user request
2. Read the mode reference file (`references/mode-*.md`)
3. Read `output-format.md` for writing conventions
4. Read `categorization.md` for classification rules
5. Follow the mode's step-by-step process exactly
6. Use templates from `templates.md` for note creation
7. Report summary of actions taken (or planned, in dry-run)

### What the Agent Cannot Do

- Delete files
- Run shell commands
- Modify protected paths
- Process sensitive content
- Merge into existing notes
- Act without user trigger

## Output Format

The `output-format.md` reference defines Obsidian-flavored markdown conventions:

- YAML frontmatter: `tags`, `Links` (backlink to source), optional `Source` for URLs
- Wikilinks for cross-references: `[[Note Name]]`, `[[folder/Note#Heading]]`
- Callouts: `> [!note]`, `> [!warning]`, `> [!tip]`
- Lists: `-` for unordered, `1.` for ordered, `- [ ]` for tasks
- Code blocks with language tags
- No HTML
- Tag conventions: emoji tags per vault standard (📝, 🌱, 🔧, etc.)

**Extensibility:** For future non-vault destinations, create `output-format-plain.md` and have the mode reference it. Mode files specify which output format to use.

## Commands

### `/process [mode] [args] [--dry-run]`

Main entry point. Routes to the appropriate mode:

- Parses mode name from first argument
- Passes remaining arguments to the mode
- If `--dry-run`, instructs agent to report without acting
- If no mode specified, agent analyzes context and suggests one

### `/process-daily [date]`

Shortcut for `/process daily [date]`. Backwards-compatible with the old process-daily command.

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audio handling | Excluded | Separate pipeline; this plugin processes text/images only |
| Model | Sonnet 4.6 | Reliable classification; Haiku too risky for categorization accuracy |
| Safety model | No-Bash + section-scoped edits | Prevents destructive operations while allowing useful editing |
| Inbox cleanup | Mark-processed, don't delete | User controls when source files are removed |
| Existing note conflict | Create in Inbox + wikilink | Never auto-merge; let user decide |
| Output format | Reference file | Obsidian by default, swappable for future formats |
| Relationship to process-daily | Absorb as mode-daily | All logic preserved, just reorganized |
| Vault access | Filesystem via LiveSync | CouchDB direct failed due to E2E encryption |
