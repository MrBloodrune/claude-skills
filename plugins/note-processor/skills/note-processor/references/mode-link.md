# Mode: Link Processing

Process a URL into a structured note in the vault.

## Trigger

- `/process link <URL>` — process a specific URL
- Also invoked by mode-daily when a capture is classified as a URL

## Source

**Input:** A URL provided as argument.

## Process

### Step 1: Fetch Content

Use the WebFetch tool to retrieve the URL content. Prompt: "Extract the article title, author, publication date, and a concise summary of the main content. List 3-5 key points."

If WebFetch fails (404, timeout, paywall):
- Create a placeholder note with just the URL
- Mark as "🌱 To be read" in tags
- Report: "Could not fetch [URL] — created placeholder"

### Step 2: Classify

Determine the vault category based on the content:

- Technical/dev content → `Technology/Dev/`
- General tech/software → `Technology/`
- Financial content → `Finance/`
- Other → determine from content, default to `Inbox/`

Use `references/categorization.md` signal words applied to the fetched content.

### Step 3: Check for Duplicates

Search the vault for notes that reference the same URL:

Use Grep to search for the URL domain + path across `~/Documents/rmv0/`:
```
Grep pattern: "example.com/article-path" path: ~/Documents/rmv0/
```

If found, report: "URL already saved in [[Existing Note]]" and stop (don't create duplicate).

### Step 4: Create Note

1. Use the **Link/Article** template from `references/templates.md`
2. Fill in:
   - Title: article title from fetched content
   - Source: `[Title](URL)`
   - Tags: `📝`, `🔗`, `article`, plus category tag
   - Links: `[[Daily/YYYY-MM-DD]]` (today)
   - Summary: from fetched content
   - Highlights: key quotes if available
   - My Thoughts: leave as placeholder "Personal takeaways TBD"
3. Follow `references/output-format.md` formatting
4. Write to the classified vault folder

### Step 5: Filename

Derive filename from article title:
- Use Title Case
- Remove special characters except hyphens and spaces
- Truncate to 60 characters if needed
- Example: `Kubernetes Best Practices 2026.md`

## Output

- **New note:** Written to appropriate vault folder
- **Report:** Note path, category, title

## Cleanup

None — URL is ephemeral input.

## Dry Run

When `--dry-run` is active:

- Fetch and classify as normal
- Report: "Would create: [path] from [URL]"
- Show proposed title, category, and template
- Do NOT create any files
