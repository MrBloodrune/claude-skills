# Mode: Inbox Processing

Scan the Inbox/ folder for unprocessed notes and classify them for proper vault placement.

## Trigger

- `/process inbox` — scan and process all unprocessed items in Inbox/

## Source

**Directory:** `~/Documents/rmv0/Inbox/`

Scan for `.md` files that do NOT start with `<!-- processed:`. These are unprocessed items.

Use Glob to find files: `~/Documents/rmv0/Inbox/*.md`

Then Read each file and check if the first line matches `<!-- processed: YYYY-MM-DD -->`. Skip files that have this marker.

## Process

### Step 1: Inventory

List all unprocessed `.md` files in Inbox/. Report count to user.

If none found, report "Inbox is clean — no unprocessed items" and stop.

### Step 2: Safety Check

For each file, scan content for sensitive patterns (same rules as mode-daily Step 2). Skip files with sensitive content.

### Step 3: Classify Each File

Read each file's content. Use `references/categorization.md` to determine:

1. **Target category** — where this note should live in the vault
2. **Template match** — which template from `references/templates.md` best fits
3. **Existing duplicates** — Glob the target folder for notes with similar titles

### Step 4: Create Destination Note

For each classified file:

1. Determine the destination path from `references/vault-structure.md`
2. Select and fill the appropriate template from `references/templates.md`
3. Incorporate the original content into the template structure
4. Ensure frontmatter follows `references/output-format.md`
5. Add `Links:` backlink — if the Inbox note has a `Links:` field, preserve it. Otherwise link to today's daily note.
6. Write the new note to the destination path

**If a note with a similar title exists at the destination:**
- Do NOT overwrite
- Keep the Inbox file unprocessed
- Report: "Skipped [filename] — potential duplicate of [[Existing Note]]. Review manually."

### Step 5: Mark Source as Processed

After successfully creating the destination note, edit the original Inbox file:

- Prepend `<!-- processed: YYYY-MM-DD — filed to [destination path] -->` as the first line
- Do NOT delete or modify any other content in the file

The original file stays in Inbox/ as an archive. User can clean up manually.

## Output

- **New notes:** Written to vault folders per categorization
- **Inbox files:** Marked with processed comment

## Cleanup

No file deletion. Inbox files are marked, not moved. User can periodically review and delete processed files from Inbox/.

## Dry Run

When `--dry-run` is active:

- List each unprocessed file with its proposed classification
- List: "Would create: [destination path] from Inbox/[filename]"
- List: "Would mark processed: Inbox/[filename]"
- List any skipped files (sensitive, duplicate)
- Do NOT modify any files
