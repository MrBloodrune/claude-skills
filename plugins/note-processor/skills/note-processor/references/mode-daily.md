# Mode: Daily Note Processing

Process captures from the Obsidian daily note's Quick Capture section.

## Trigger

- `/process daily` — process today's daily note
- `/process daily YYYY-MM-DD` — process a specific date
- `/process-daily [date]` — shortcut command

## Source

**File:** `~/Documents/rmv0/Daily/YYYY-MM-DD.md`

Read the file and extract content between `# Quick Capture` and the next heading (or end of file if no following heading).

If `# Quick Capture` is empty or missing, report "No captures to process" and stop.

## Process

### Step 1: Parse Captures

Split the Quick Capture content into individual captures:

- **Blank line** separates distinct captures
- **Bullet points** (`-`) are sub-items of the preceding capture (keep together)
- **URLs on their own line** are link captures
- **Multi-line text** without bullets = single thought (keep together)

### Step 2: Safety Check

For each capture, check for sensitive content:
- API key patterns: strings matching `[A-Za-z0-9_-]{20,}` in key-like context
- 2FA codes: sequences of 6-10 digit numbers grouped together
- Private key markers: `-----BEGIN`
- Password-like context: "password:", "secret:", "token:"

If detected: **SKIP the capture entirely.** Leave it in Quick Capture. Add to report: "Skipped: sensitive content detected (type: [pattern])."

### Step 3: Classify Each Capture

Use `references/categorization.md` rules:

1. **Extract tasks first** — if the capture contains an actionable item with a verb (call, buy, schedule, fix, etc.), extract it as a task. The capture may ALSO produce a note if it has reference value beyond the task.

2. **Classify the remainder** — use the decision tree in categorization.md to determine the target category.

3. **Check for existing notes** — before creating, use Glob to check if a note on the same topic exists in the target folder. If it does, create in `Inbox/` with a `See also: [[Existing Note]]` reference.

### Step 4: Create Notes

For each classified capture that warrants a note:

1. Select template from `references/templates.md` based on category
2. Fill in the template:
   - Title: descriptive, derived from capture content
   - Tags: per the output-format tag conventions
   - Links: `[[Daily/YYYY-MM-DD]]` (the source daily note)
   - Content: the capture text, expanded into the template structure
3. Follow `references/output-format.md` for all markdown formatting
4. Write the file to the path determined by `references/vault-structure.md`

### Step 5: Extract Tasks

For captures classified as tasks:

- Format as `- [ ] [Task text]`
- Include time context if present (e.g., "Monday 2pm")
- Prepend 🚨 for time-sensitive items

These will be added to the daily note's `# To Do` section.

## Output

- **New notes:** Written to vault folders per categorization
- **Tasks:** Appended to `# To Do` section of the daily note
- **Daily note edits:**
  - Clear content from `# Quick Capture` (replace with empty section)
  - Populate `# Processed` with wikilinks to created notes, format: `- [[Note Title]] - brief context`
  - Append tasks to `# To Do` as checkboxes

## Cleanup

Edit the daily note using the Edit tool:

1. **Clear Quick Capture:** Replace the content between `# Quick Capture` and the next heading with an empty line. Do NOT remove the heading itself.
2. **Populate Processed:** Add entries under `# Processed`. If the section doesn't exist, create it after `# Quick Capture`.
3. **Add Tasks:** Append to `# To Do`. If the section doesn't exist, create it.

## Dry Run

When `--dry-run` is active, instead of writing files:

- Report each capture with its classification
- List: "Would create: [path] ([template type])"
- List: "Would add task: [task text]"
- List: "Would edit: Daily/YYYY-MM-DD.md sections: Quick Capture, Processed, To Do"
- Do NOT modify any files
