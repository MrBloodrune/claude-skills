---
description: Process notes, captures, or links into structured vault entries
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch
argument-hint: [--dry-run] <mode> [args] (modes: daily, inbox, link)
---

Process content into the Obsidian vault using the note-processor skill.

## Usage

- `/process daily` — process today's daily note captures
- `/process daily 2026-02-15` — process a specific date
- `/process inbox` — scan and process inbox items
- `/process link https://example.com` — save a URL as a note
- `/process --dry-run daily` — show what would happen without acting
- `/process` — suggest which mode to run

## Instructions

Follow the note-processor skill exactly. Load the skill first, then:

1. Parse `$ARGUMENTS` to determine mode and options:
   - If `--dry-run` is present anywhere in args, set dry-run mode
   - First non-flag argument is the mode name (`daily`, `inbox`, `link`)
   - Remaining arguments are mode-specific (date for daily, URL for link)

2. If no mode specified, check context:
   - If there are unprocessed items in Inbox/, suggest inbox mode
   - Otherwise suggest daily mode for today
   - Ask the user which to run

3. Load the mode reference file: `references/mode-{mode}.md`

4. Follow the mode's process steps exactly

5. Report results — what was created, edited, or skipped

## Safety Reminders

- NEVER delete files
- NEVER modify content outside declared sections
- NEVER process sensitive content (API keys, passwords, etc.)
- When in doubt, create in Inbox/ rather than guess the category
- In dry-run mode, report only — do not modify any files
