---
description: Process today's Obsidian daily note captures (shortcut for /process daily)
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch
argument-hint: [YYYY-MM-DD]
---

Shortcut for `/process daily`. Process captures from an Obsidian daily note.

If `$ARGUMENTS` is provided, use it as the date (format: YYYY-MM-DD).
Otherwise, use today's date.

Follow the note-processor skill, specifically the `references/mode-daily.md` mode reference.

**Target file:** `~/Documents/rmv0/Daily/$DATE.md`

Refer to the note-processor skill for the full workflow: read daily note → extract Quick Capture → classify → create notes → update daily note.
