---
description: Process today's Obsidian daily note captures into structured, categorized notes
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: [YYYY-MM-DD]
---

Process captures from an Obsidian daily note in the RMV0 vault (`~/Documents/rmv0/`).

If $ARGUMENTS is provided, use it as the date (format: YYYY-MM-DD).
Otherwise, use today's date.

**Target file:** `~/Documents/rmv0/Daily/$DATE.md`

Follow the process-daily skill workflow:
1. Read the daily note
2. Extract content from `# Quick Capture` section
3. Classify and process each capture
4. Update the daily note with processed results
5. Report a summary of what was processed

Refer to the process-daily skill for detailed categorization rules, templates, and vault structure.
