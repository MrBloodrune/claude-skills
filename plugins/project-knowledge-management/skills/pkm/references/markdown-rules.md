# Obsidian Markdown Rules for Project Docs

## Frontmatter

Every document MUST have YAML frontmatter:

```yaml
---
title: Human-Readable Title
tags:
  - project/<project-name>
  - type/<doc-type>
status: current
---
```

**Status values:**
- `draft` — work in progress, may be incomplete
- `current` — reflects the actual current state
- `archived` — no longer relevant, kept for reference only

**Tag conventions:**
- `project/<name>` — project identifier
- `type/plan` — design/implementation plan
- `type/architecture` — architecture documentation
- `type/analysis` — analysis or investigation
- `type/config` — configuration documentation
- `type/procedure` — operational procedure

## Headings

- `##` for top-level sections (never `#` — that's the title from frontmatter)
- `###` for subsections
- `####` sparingly for sub-subsections
- Keep heading hierarchy consistent — don't skip levels

## Links

**Wikilinks** for cross-references within the workspace:
- `[[docs/plans/auth-design]]` — link to another doc
- `[[docs/plans/auth-design#API Endpoints]]` — link to a heading
- `[[docs/plans/auth-design#^block-id]]` — link to a specific block

**Standard markdown links** for external URLs:
- `[GitHub Issue](https://github.com/user/repo/issues/1)`

## Callouts

Use for important information that should stand out:

```markdown
> [!note]
> General information or context

> [!warning]
> Something that could cause problems

> [!tip]
> Helpful suggestion or best practice

> [!important]
> Critical information that must not be missed
```

Do NOT overuse callouts. One or two per doc is plenty. If everything is important, nothing is.

## Code Blocks

Always specify the language:

````markdown
```json
{ "key": "value" }
```

```bash
echo "hello"
```

```python
def main():
    pass
```
````

For inline code, use backticks: `variable_name`, `file.txt`, `/path/to/thing`

## Lists

- Use `-` for unordered lists (not `*`)
- Use `1.` for ordered lists
- Use `- [ ]` / `- [x]` for task lists
- Indent with 2 spaces for nesting

## Tables

Use for structured data:

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| data     | data     | data     |
```

Keep tables simple. If a table has more than 5 columns, consider restructuring.

## What NOT to Do

- No HTML in markdown (Obsidian handles it poorly in some views)
- No excessive bold/italic — use sparingly for emphasis
- No emoji unless the project specifically uses them
- No "last updated" dates in the doc body (frontmatter `status` is sufficient)
- No changelog sections — update the doc to reflect current state
- No commented-out sections (`%%...%%`) for "maybe later" content — delete it or don't write it
