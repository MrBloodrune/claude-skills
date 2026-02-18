# Output Format: Obsidian Markdown

All notes created by the note-processor use Obsidian-flavored markdown. This file defines the conventions.

## Frontmatter

Every note MUST have YAML frontmatter:

---
tags:
  - 📝
  - [category-tag]
---
Links: [[Daily/YYYY-MM-DD]]

**Required fields:**
- `tags:` — array with at minimum one tag
- After the frontmatter close, a `Links:` line with a wikilink back to the source (daily note, or the note that triggered processing)

**Optional fields:**
- `Source:` — URL for link-based notes
- `Status:` — for project/plan notes (`draft`, `active`, `complete`)

## Tag Conventions

| Tag | Use When |
|-----|----------|
| 📝 | All notes (default) |
| 🌱 | New/seedling ideas |
| 🔧 | Technical/dev content |
| 🔬 | Research/investigation |
| 👤 | People/social |
| 💰 | Financial |
| 🎯 | Goals/projects |
| 🔗 | Links/articles |
| 🚨 | Urgent/important |

## Wikilinks

Use wikilinks for all cross-references within the vault:

- `[[Note Name]]` — link to a note
- `[[folder/Note Name]]` — link with folder path
- `[[Note Name#Heading]]` — link to a specific heading
- `[[Note Name|Display Text]]` — link with custom display text

Use standard markdown links for external URLs:
- `[Title](https://example.com)`

## Callouts

Use sparingly — one or two per note maximum:

> [!note]
> General information or context

> [!warning]
> Something that could cause problems

> [!tip]
> Helpful suggestion

## Formatting Rules

- Headings: `#` for title, `##` for sections, `###` for subsections
- Lists: `-` for unordered (not `*`), `1.` for ordered, `- [ ]` for tasks
- Code blocks: always include language tag (```bash, ```json, etc.)
- Inline code: backticks for `file paths`, `commands`, `variable names`
- No HTML
- No excessive bold/italic — use sparingly for emphasis
- No emoji in body text unless the content specifically warrants it
