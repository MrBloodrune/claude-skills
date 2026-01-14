---
name: process
description: Process raw captures from today's (or specified date's) Daily note. Extracts tasks, creates linked notes, and updates the Daily note with results.
argument-hint: "[YYYY-MM-DD]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Process Daily Notes Command

Process raw captures from the Daily note's `# Quick Capture` section into structured, linked notes.

## Arguments

- **date** (optional): Target date in `YYYY-MM-DD` format. Defaults to today.

## Execution Steps

1. **Determine target date**
   - Use provided date argument if given
   - Otherwise use today's date: `date +%Y-%m-%d`

2. **Locate Daily note**
   - Path: `Daily/{date}.md`
   - Verify file exists before proceeding
   - If not found, report "No Daily note found for {date}"

3. **Read and parse Daily note**
   - Load full content of Daily note
   - Extract content between `# Quick Capture` and `# Processed` sections
   - If `# Quick Capture` section is empty, report "No captures to process"

4. **Process each capture**
   - Use `process-daily` skill knowledge for categorization
   - For each capture:
     - Classify type (task, tech, finance, social, link, etc.)
     - Determine action (extract task, create note, queue link)
     - Execute action

5. **Update Daily note**
   - Add extracted tasks to `# To Do` section
   - Clear processed items from `# Quick Capture`
   - Add links to created notes in `# Processed` section

6. **Report results**
   - Summary of actions taken
   - List of created notes
   - Any items skipped (sensitive content)

## Example Usage

```
/noted:process
# Processes today's Daily note

/noted:process 2026-01-12
# Processes Daily note for January 12, 2026
```

## Vault Path Configuration

The vault path should be set via environment variable `NOTED_VAULT_PATH` or default to `~/vaults/RMV0`.

## Safety Checks

Before processing:
- Verify vault path exists
- Verify Daily note exists
- Check for sensitive content patterns
- Backup original Daily note content (in memory)

If any capture contains sensitive content (API keys, passwords, 2FA codes):
- Skip that capture
- Log warning
- Leave in `# Quick Capture` with comment

## Output Format

```
Processing Daily/2026-01-13.md...

Captures found: 5

✓ Task extracted: "Dentist appointment - Monday 2pm"
✓ Note created: Technology/Dev/k3s vs k8s comparison.md
✓ Note created: Finance/Keyboard purchase.md
⚠ Skipped: Sensitive content detected
✓ Task extracted: "Buy groceries"

Summary:
- Tasks extracted: 2
- Notes created: 2
- Items skipped: 1

Daily note updated.
```
