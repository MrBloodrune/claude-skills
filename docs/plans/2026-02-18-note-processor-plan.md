# Note Processor Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mode-based note processing plugin that absorbs process-daily, adding inbox scanning and link processing modes with safety-first agent design.

**Architecture:** Plugin in the `claude-skills` marketplace at `plugins/note-processor/`. Three processing modes (daily, inbox, link) defined as skill reference files. Sonnet 4.6 agent with no-Bash restriction follows deterministic mode instructions. Commands provide `/process [mode]` entry point. Obsidian-native output format via swappable reference file.

**Tech Stack:** Markdown (skills, commands, agents, references), JSON (plugin.json)

**Plugin repo:** `/data/dev/skills/claude-skills/`
**Plugin dir:** `/data/dev/skills/claude-skills/plugins/note-processor/`
**Design doc:** `/data/dev/skills/claude-skills/docs/plans/2026-02-18-note-processor-design.md`
**Existing process-daily:** `/data/dev/skills/claude-skills/plugins/process-daily/`

---

### Task 1: Create Plugin Scaffold and Metadata

**Files:**
- Create: `plugins/note-processor/.claude-plugin/plugin.json`

**Step 1: Create directory structure**

```bash
cd /data/dev/skills/claude-skills
mkdir -p plugins/note-processor/{.claude-plugin,skills/note-processor/references,commands,agents}
```

**Step 2: Write plugin.json**

Create `plugins/note-processor/.claude-plugin/plugin.json`:

```json
{
  "name": "note-processor",
  "version": "1.0.0",
  "description": "Mode-based note processing for Obsidian vaults — daily captures, inbox scanning, and link archiving with safety-first agent design",
  "author": {
    "name": "MrBloodrune"
  },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "Apache-2.0",
  "keywords": ["obsidian", "notes", "pkm", "categorization", "inbox", "daily-notes"]
}
```

**Step 3: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('plugins/note-processor/.claude-plugin/plugin.json')); print('OK')"
```

Expected: `OK`

**Step 4: Commit**

```bash
git add plugins/note-processor/.claude-plugin/plugin.json
git commit -m "feat(note-processor): scaffold plugin directory and metadata"
```

---

### Task 2: Write the Core SKILL.md

The skill defines the mode system, safety rules, and vault configuration. This is what gets loaded when the skill is invoked.

**Files:**
- Create: `plugins/note-processor/skills/note-processor/SKILL.md`

**Step 1: Write SKILL.md**

Create `plugins/note-processor/skills/note-processor/SKILL.md`:

```markdown
---
name: note-processor
description: This skill should be used when the user asks to "process notes", "process daily", "process my inbox", "file my captures", "save this link", "organize notes", "process quick capture", or mentions processing, categorizing, or filing notes into an Obsidian vault. Provides a mode-based processing system with safety-first design.
---

# Note Processor

Process text and images into structured, categorized notes in the Obsidian vault using deterministic mode-based workflows.

## Overview

This plugin provides processing **modes** — each mode is a self-contained recipe for handling a specific type of input. Modes are defined in reference files under `references/mode-*.md`.

### Available Modes

| Mode | Trigger | What It Does |
|------|---------|--------------|
| `daily` | `/process daily [date]` | Parse daily note Quick Capture section, classify and file captures |
| `inbox` | `/process inbox` | Scan Inbox/ folder, classify and refile notes to proper locations |
| `link` | `/process link <URL>` | Fetch URL, create structured note in appropriate vault folder |

### Mode Selection

- `/process daily` — run daily mode for today
- `/process daily 2026-02-15` — run daily mode for a specific date
- `/process inbox` — run inbox mode
- `/process link https://example.com` — run link mode
- `/process` — suggest which mode to run based on context
- `/process --dry-run daily` — show what would happen without acting

## Vault Configuration

- **Vault path:** `~/Documents/rmv0/`
- **Daily notes:** `Daily/YYYY-MM-DD.md`
- **Inbox:** `Inbox/`
- **Classification rules:** See `references/categorization.md`
- **Output format:** See `references/output-format.md`
- **Note templates:** See `references/templates.md`
- **Folder taxonomy:** See `references/vault-structure.md`

## Safety Rules

### Tool Restrictions

The note-processor agent has access to: `Read`, `Write`, `Edit`, `Glob`, `Grep`.

**No Bash access.** This prevents file deletion, arbitrary command execution, and destructive operations.

### Editing Rules

These rules are **non-negotiable**. Every mode must follow them:

1. **Daily notes:** Only edit within `# Quick Capture`, `# Processed`, and `# To Do` sections. Never touch other content.
2. **Inbox files:** Only prepend a `<!-- processed: YYYY-MM-DD -->` marker. Never delete or overwrite.
3. **All other vault files:** Create new files only. Never modify existing notes.
4. **Protected paths:** NEVER touch files in `Templates/`, `.obsidian/`, `Canvas/`, `Attachments/`.

### Create-Over-Edit

When a note on the same topic already exists:
- Create the new note in `Inbox/` with a wikilink to the existing note
- Do NOT merge content into existing notes
- Report the potential duplicate for user decision

### Secret Detection

**NEVER process content containing:**
- API key patterns (`[A-Za-z0-9_-]{20,}` in key-like context)
- 2FA recovery codes (sequences of 6-10 digit numbers)
- Password-like strings in sensitive context
- Private key markers (`-----BEGIN`)

Flag sensitive content, skip processing, and report to user.

### Dry Run

Every mode supports dry-run. When `--dry-run` is specified:
- Read and classify as normal
- Instead of creating/editing files, output a report listing planned actions
- Format: "Would create: [path]", "Would edit: [path] section [name]"
- User reviews, then triggers actual processing

## Processing Workflow

For any mode, the agent follows this general pattern:

1. **Read the mode reference** — `references/mode-{name}.md`
2. **Read supporting references** — `output-format.md`, `categorization.md`, `templates.md`
3. **Read source content** — as defined by the mode
4. **Classify** — using categorization rules
5. **Transform** — create notes using templates and output format
6. **Write** — create files at vault locations per vault-structure rules
7. **Cleanup** — mode-specific source cleanup (mark processed, clear section, etc.)
8. **Report** — summarize what was done

## Adding New Modes

To add a new processing mode:

1. Create `references/mode-{name}.md` following the mode template structure
2. Define: Trigger, Source, Process steps, Output, Cleanup
3. The `/process` command will automatically route to it
4. No other files need to change
```

**Step 2: Verify frontmatter parses correctly**

```bash
python3 -c "
import re
content = open('plugins/note-processor/skills/note-processor/SKILL.md').read()
match = re.match(r'^---\n(.+?)\n---', content, re.DOTALL)
assert match, 'No frontmatter found'
assert 'name: note-processor' in match.group(1)
assert 'description:' in match.group(1)
print('OK')
"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add plugins/note-processor/skills/note-processor/SKILL.md
git commit -m "feat(note-processor): add core skill with mode system and safety rules"
```

---

### Task 3: Write Reference Files — Output Format, Categorization, Templates, Vault Structure

Carry over from process-daily with refinements. These are the shared references used by all modes.

**Files:**
- Create: `plugins/note-processor/skills/note-processor/references/output-format.md`
- Create: `plugins/note-processor/skills/note-processor/references/categorization.md`
- Create: `plugins/note-processor/skills/note-processor/references/templates.md`
- Create: `plugins/note-processor/skills/note-processor/references/vault-structure.md`

**Step 1: Write output-format.md**

Create `plugins/note-processor/skills/note-processor/references/output-format.md`:

This is new — defines Obsidian markdown conventions for all note output.

```markdown
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
```

**Step 2: Write categorization.md**

Create `plugins/note-processor/skills/note-processor/references/categorization.md`:

Carried from `process-daily/references/categorization-examples.md` with the classification rules from the SKILL.md merged in.

```markdown
# Categorization Rules

Rules for classifying captures into vault categories.

## Signal Words

| Category | Signal Words/Patterns |
|----------|----------------------|
| **Task** | call, buy, schedule, send, check, review, fix, remind, book, pay, cancel, meet, pick up, email, submit |
| **Technology/Dev** | code, script, api, framework, kubernetes, docker, python, rust, git, deploy, CI/CD, database, MCP, proxmox, homelab |
| **Technology** | tool, app, software, hardware, config, setup, cloudflare, tailscale, obsidian |
| **Finance** | $, spent, bought, paid, bill, invoice, budget, cost, price, subscription |
| **Social** | [Name] + social context, meet, dinner, coffee, party, DnD, game night |
| **Content** | video idea, blog, write about, content, youtube, article |
| **Plans** | goal, plan, want to, someday, project idea |
| **Link** | URL pattern (http://, https://) |

## Decision Tree

```
Is it a task with deadline/action?
  └─ YES → Extract to Daily # To Do
  └─ NO ↓

Does it contain sensitive content (API keys, passwords, private keys)?
  └─ YES → SKIP — flag and report
  └─ NO ↓

Is it a URL/link?
  └─ YES → Use mode-link processing, determine category from content
  └─ NO ↓

Is it about code/programming/infrastructure?
  └─ YES → Technology/Dev/
  └─ NO ↓

Is it about a tech tool/software/hardware?
  └─ YES → Technology/
  └─ NO ↓

Is it about money/purchases/finances?
  └─ YES → Finance/
  └─ NO ↓

Is it about a person or social event?
  └─ YES → Social/
  └─ NO ↓

Is it a goal or future plan?
  └─ YES → Plans/
  └─ NO ↓

Is it content to create or consume?
  └─ YES → Content/
  └─ NO ↓

Uncertain?
  └─ Inbox/
```

## Classification Priority

When a capture fits multiple categories:

1. **Task** — If actionable, always extract task first
2. **Sensitive** — If contains credentials, skip entirely
3. **Primary category** — Determine main topic
4. **Secondary links** — Add cross-references via wikilinks

## Examples

### Mixed Task + Research

**Raw:** `dentist monday 2pm, also look into k3s vs k8s for homelab`

**Result:**
- Task: `- [ ] Dentist appointment - Monday 2pm`
- Note: `Technology/Dev/k3s vs k8s comparison.md`

### Pure Task

**Raw:** `buy milk and eggs`

**Result:**
- Task: `- [ ] Buy milk and eggs`
- No note created (no reference value)

### Tech Observation

**Raw:** `interesting - cloudflare has a new r2 egress feature, zero cost`

**Result:**
- Note: `Technology/Cloudflare R2 egress.md`
- Check if `Technology/Cloudflare.md` exists first — if so, create in Inbox with wikilink

### URL Only

**Raw:** `https://blog.example.com/kubernetes-guide`

**Result:**
- Determine category from URL domain/path (kubernetes → Technology/Dev)
- Create note using Link/Article template

### Vague/Ambiguous

**Raw:** `think more about life direction`

**Result:**
- NOT a task (too vague)
- Create: `Inbox/Life direction thoughts.md`

### Sensitive Content (SKIP)

**Raw:** `new api key for openai: sk-proj-abc123xyz789...`

**Result:**
- DO NOT process
- Flag: "Skipped sensitive content (API key pattern detected)"

## Edge Cases

- **Empty after task extraction:** If a capture is entirely a task with no reference value, don't create a note.
- **Duplicate topics:** Check for existing notes. Create in Inbox with wikilink rather than merge.
- **Very long captures:** Over 500 words → create note in most relevant category, preserve full content.
- **Multi-line captures:** Bullets under a main line = single capture. Preserve structure.
```

**Step 3: Write templates.md**

Create `plugins/note-processor/skills/note-processor/references/templates.md`:

Carried from process-daily with minor refinements.

```markdown
# Note Templates

Templates for creating notes. Select based on the Template Selection Guide at the bottom.

## General Note

```markdown
---
tags:
  - 📝
  - 🌱
---
Links: [[Daily/YYYY-MM-DD]]

# [Title]

[Content goes here]

## Reference

- Related: [[related notes]]
```

## Technology/Dev Note

```markdown
---
tags:
  - 📝
  - 🔧
  - dev
---
Links: [[Daily/YYYY-MM-DD]]

# [Title]

## Overview

What this is and why it matters.

## Details

Technical details, code snippets, configuration.

## References

- Documentation links
- Related projects
```

## Research Note

```markdown
---
tags:
  - 📝
  - 🔬
  - research
---
Links: [[Daily/YYYY-MM-DD]]

# [Question or Topic]

## Findings

Key discoveries and insights.

## Comparison

| Option A | Option B |
|----------|----------|
| Pros     | Pros     |
| Cons     | Cons     |

## Conclusion

Summary and decision if applicable.

## Sources

- Links to sources
```

## Social/Person Note

```markdown
---
tags:
  - 📝
  - 👤
---
Links: [[Daily/YYYY-MM-DD]]

# [Person Name]

## About

How I know this person, relationship context.

## Interactions

### YYYY-MM-DD
- What we discussed
- Action items

## Notes

Preferences, interests, things to remember.
```

## Finance Note

```markdown
---
tags:
  - 📝
  - 💰
---
Links: [[Daily/YYYY-MM-DD]]

# [Title]

## Summary

What this is about financially.

## Details

- Amount: $X
- Date: YYYY-MM-DD
- Category: [Purchase/Bill/Investment/etc.]

## Notes

Additional context or considerations.
```

## Plans/Project Note

```markdown
---
tags:
  - 📝
  - 🎯
  - project
---
Links: [[Daily/YYYY-MM-DD]]

# [Project/Goal Name]

## Vision

What success looks like.

## Requirements

- [ ] Requirement 1
- [ ] Requirement 2

## Approach

How to achieve this.

## Status

Current state and next steps.
```

## Link/Article Note

```markdown
---
tags:
  - 📝
  - 🔗
  - article
---
Links: [[Daily/YYYY-MM-DD]]
Source: [Article Title](https://url.com)

# [Article Title]

## Summary

Key points from the article.

## Highlights

> Notable quotes or sections

## My Thoughts

Personal takeaways and how it applies.

## Related

- [[Related Note 1]]
```

## Quick Placeholder Note

For rapid capture when a full note isn't justified:

```markdown
---
tags:
  - 📝
  - 🌱
---
Links: [[Daily/YYYY-MM-DD]]

# [Title]

[Raw capture content here]

---
*To be expanded*
```

## Template Selection Guide

| Content Type | Template | Target Folder |
|--------------|----------|---------------|
| Code/infrastructure | Technology/Dev | Technology/Dev/ |
| Tool/software | General Note | Technology/ |
| Person/relationship | Social/Person | Social/ |
| Money/purchase | Finance Note | Finance/ |
| Goal/project | Plans/Project | Plans/ |
| Article/link | Link/Article | [Category]/ |
| Research/comparison | Research Note | [Category]/ |
| DnD/gaming | General Note | Social/DnD/ |
| Uncertain | Quick Placeholder | Inbox/ |
```

**Step 4: Write vault-structure.md**

Create `plugins/note-processor/skills/note-processor/references/vault-structure.md`:

Carried from process-daily.

```markdown
# Vault Structure

Folder taxonomy for the RMV0 Obsidian vault at `~/Documents/rmv0/`.

## Root Folders

| Folder | Purpose | Filing Rule |
|--------|---------|-------------|
| `Daily/` | Daily journal notes (`YYYY-MM-DD.md`) | NEVER create notes here. Only edit today's daily note in designated sections. |
| `Inbox/` | Uncategorized items | Use when uncertain. Better here than wrong folder. |
| `Technology/` | Tech topics, tools, research | Default for anything tech-related |
| `Technology/Dev/` | Software, coding, homelab | Code, programming, dev tools, infrastructure |
| `Technology/Observation/` | Tech observations | "Noticed X does Y" — not active research |
| `Finance/` | Money, budgets, expenses | Anything involving money |
| `Social/` | People, relationships, events | Content primarily about people |
| `Social/DnD/` | D&D campaign notes | Game session notes, characters, loot |
| `Plans/` | Goals, planning | Future-oriented content |
| `Plans/Games/` | Gaming plans | Game wishlists, gaming goals |
| `Content/` | Content creation, media | Things to create, consume, or learn |
| `Canvas/` | Obsidian canvas files | NEVER create files here programmatically |
| `Templates/` | Note templates | NEVER modify. Read-only. |
| `Attachments/` | Images, PDFs, files | NEVER create files here programmatically |

## Filename Conventions

- Title Case for note titles: `Kubernetes Setup Guide.md`
- kebab-case for technical topics: `k3s-vs-k8s-comparison.md`
- Date prefix for time-sensitive: `2026-01-13 Meeting Notes.md`
- No special characters except hyphens and spaces
```

**Step 5: Commit**

```bash
git add plugins/note-processor/skills/note-processor/references/
git commit -m "feat(note-processor): add reference files for output format, categorization, templates, vault structure"
```

---

### Task 4: Write Mode — Daily

The core mode that absorbs process-daily logic.

**Files:**
- Create: `plugins/note-processor/skills/note-processor/references/mode-daily.md`

**Step 1: Write mode-daily.md**

Create `plugins/note-processor/skills/note-processor/references/mode-daily.md`:

```markdown
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
```

**Step 2: Commit**

```bash
git add plugins/note-processor/skills/note-processor/references/mode-daily.md
git commit -m "feat(note-processor): add daily mode reference — absorbs process-daily logic"
```

---

### Task 5: Write Mode — Inbox

**Files:**
- Create: `plugins/note-processor/skills/note-processor/references/mode-inbox.md`

**Step 1: Write mode-inbox.md**

Create `plugins/note-processor/skills/note-processor/references/mode-inbox.md`:

```markdown
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
```

**Step 2: Commit**

```bash
git add plugins/note-processor/skills/note-processor/references/mode-inbox.md
git commit -m "feat(note-processor): add inbox mode reference — scan and classify inbox items"
```

---

### Task 6: Write Mode — Link

**Files:**
- Create: `plugins/note-processor/skills/note-processor/references/mode-link.md`

**Step 1: Write mode-link.md**

Create `plugins/note-processor/skills/note-processor/references/mode-link.md`:

```markdown
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
```

**Step 2: Commit**

```bash
git add plugins/note-processor/skills/note-processor/references/mode-link.md
git commit -m "feat(note-processor): add link mode reference — URL to structured note"
```

---

### Task 7: Write the /process Command

**Files:**
- Create: `plugins/note-processor/commands/process.md`

**Step 1: Write process.md**

Create `plugins/note-processor/commands/process.md`:

```markdown
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
```

**Step 2: Commit**

```bash
git add plugins/note-processor/commands/process.md
git commit -m "feat(note-processor): add /process command with mode routing"
```

---

### Task 8: Write the /process-daily Shortcut Command

**Files:**
- Create: `plugins/note-processor/commands/process-daily.md`

**Step 1: Write process-daily.md**

Create `plugins/note-processor/commands/process-daily.md`:

```markdown
---
description: Process today's Obsidian daily note captures (shortcut for /process daily)
allowed-tools: Read, Write, Edit, Glob, Grep
argument-hint: [YYYY-MM-DD]
---

Shortcut for `/process daily`. Process captures from an Obsidian daily note.

If `$ARGUMENTS` is provided, use it as the date (format: YYYY-MM-DD).
Otherwise, use today's date.

Follow the note-processor skill, specifically the `references/mode-daily.md` mode reference.

**Target file:** `~/Documents/rmv0/Daily/$DATE.md`

Refer to the note-processor skill for the full workflow: read daily note → extract Quick Capture → classify → create notes → update daily note.
```

**Step 2: Commit**

```bash
git add plugins/note-processor/commands/process-daily.md
git commit -m "feat(note-processor): add /process-daily shortcut command"
```

---

### Task 9: Write the Note Processor Agent

**Files:**
- Create: `plugins/note-processor/agents/note-processor.md`

**Step 1: Write note-processor.md**

Create `plugins/note-processor/agents/note-processor.md`:

```markdown
---
name: note-processor
description: >-
  Use this agent when the user asks to "process notes", "process daily",
  "file my captures", "sort my inbox", "save this link as a note",
  "organize today's notes", "process quick capture", or mentions
  processing, categorizing, or filing content into the Obsidian vault.

<example>
Context: User wants to process today's captures
user: "process today's daily note"
assistant: "I'll use the note-processor agent to classify and file your captures."
<commentary>
User wants daily note processing — route to daily mode.
</commentary>
</example>

<example>
Context: User wants inbox cleaned up
user: "clean up my inbox notes"
assistant: "I'll use the note-processor agent to scan and classify your inbox items."
<commentary>
Inbox processing request — route to inbox mode.
</commentary>
</example>

<example>
Context: User wants to save a link
user: "save this article https://example.com/good-read"
assistant: "I'll use the note-processor agent to create a structured note from that link."
<commentary>
Link processing — route to link mode.
</commentary>
</example>

model: sonnet
color: green
tools: ["Read", "Write", "Edit", "Glob", "Grep", "WebFetch"]
---

You are the note processor agent for the RMV0 Obsidian vault.

## Vault Location

`~/Documents/rmv0/`

## Your Role

You process text content into structured, categorized notes in the Obsidian vault. You follow deterministic mode-based workflows defined in reference files.

## How to Process

1. **Determine the mode** from the user's request:
   - Daily note processing → read `references/mode-daily.md`
   - Inbox scanning → read `references/mode-inbox.md`
   - Link saving → read `references/mode-link.md`

2. **Load supporting references:**
   - `references/output-format.md` — how to format markdown
   - `references/categorization.md` — how to classify content
   - `references/templates.md` — note templates per category
   - `references/vault-structure.md` — where folders are

3. **Follow the mode's process steps exactly.** Do not improvise or skip steps.

4. **Report what you did:**
   - Notes created (with paths)
   - Tasks extracted
   - Items skipped (with reason)
   - Sections edited

## Critical Safety Rules

You MUST follow these rules. They are non-negotiable:

1. **NEVER delete files.** You do not have Bash access. Do not attempt to remove files.
2. **NEVER modify content outside declared sections.** Daily notes: only touch `# Quick Capture`, `# Processed`, `# To Do`. Inbox files: only prepend processed marker.
3. **NEVER overwrite existing notes.** If a note exists at the target path, create in `Inbox/` with a wikilink instead.
4. **NEVER process sensitive content.** Skip API keys, passwords, 2FA codes, private keys. Flag and report.
5. **NEVER touch protected paths:** `Templates/`, `.obsidian/`, `Canvas/`, `Attachments/`
6. **When uncertain about category, use Inbox/.** Better to file in Inbox than guess wrong.

## Dry Run

If the user says "dry run", "show me what you'd do", or "preview":
- Read and classify as normal
- Report planned actions without executing them
- Wait for user confirmation before proceeding
```

**Step 2: Verify agent frontmatter**

```bash
python3 -c "
import re
content = open('plugins/note-processor/agents/note-processor.md').read()
match = re.match(r'^---\n(.+?)\n---', content, re.DOTALL)
assert match, 'No frontmatter found'
fm = match.group(1)
assert 'name: note-processor' in fm
assert 'model: sonnet' in fm
assert 'tools:' in fm
assert 'Bash' not in fm.split('tools:')[1].split('\\n')[0], 'Bash should not be in tools!'
print('OK — no Bash in tools')
"
```

Expected: `OK — no Bash in tools`

**Step 3: Commit**

```bash
git add plugins/note-processor/agents/note-processor.md
git commit -m "feat(note-processor): add Sonnet 4.6 agent with no-Bash safety restriction"
```

---

### Task 10: Update Marketplace — Add note-processor, Deprecate process-daily

**Files:**
- Modify: `.claude-plugin/marketplace.json`

**Step 1: Read current marketplace.json**

Read the file to get the current version and plugin list.

**Step 2: Add note-processor entry**

Add to the `plugins` array (after the process-daily entry):

```json
{
  "name": "note-processor",
  "description": "Mode-based note processing for Obsidian vaults — daily captures, inbox scanning, and link archiving with safety-first agent design",
  "source": "./plugins/note-processor",
  "strict": false
}
```

**Step 3: Update process-daily description to indicate deprecation**

Change the process-daily entry's description to:

```json
"description": "[Deprecated — use note-processor] Process raw captures from Obsidian Daily notes into structured, linked notes with intelligent categorization"
```

**Step 4: Bump marketplace version**

Update `metadata.version` from current value to next minor (e.g., `"2.6.2"` → `"2.7.0"`).

**Step 5: Validate JSON**

```bash
python3 -c "import json; d=json.load(open('.claude-plugin/marketplace.json')); print(f'OK — {len(d[\"plugins\"])} plugins, version {d[\"metadata\"][\"version\"]}')"
```

Expected: `OK — [N+1] plugins, version 2.7.0`

**Step 6: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat(note-processor): add to marketplace v2.7.0, deprecate process-daily"
```

---

### Task 11: End-to-End Validation

**Step 1: Verify plugin structure**

```bash
find plugins/note-processor/ -type f | sort
```

Expected files:
```
plugins/note-processor/.claude-plugin/plugin.json
plugins/note-processor/agents/note-processor.md
plugins/note-processor/commands/process-daily.md
plugins/note-processor/commands/process.md
plugins/note-processor/skills/note-processor/SKILL.md
plugins/note-processor/skills/note-processor/references/categorization.md
plugins/note-processor/skills/note-processor/references/mode-daily.md
plugins/note-processor/skills/note-processor/references/mode-inbox.md
plugins/note-processor/skills/note-processor/references/mode-link.md
plugins/note-processor/skills/note-processor/references/output-format.md
plugins/note-processor/skills/note-processor/references/templates.md
plugins/note-processor/skills/note-processor/references/vault-structure.md
```

**Step 2: Validate all JSON files**

```bash
python3 -c "
import json, glob
for f in glob.glob('plugins/note-processor/**/*.json', recursive=True):
    json.load(open(f))
    print(f'OK: {f}')
print('All JSON valid')
"
```

**Step 3: Validate all frontmatter**

```bash
python3 -c "
import re, glob
for f in glob.glob('plugins/note-processor/**/*.md', recursive=True):
    content = open(f).read()
    if content.startswith('---'):
        match = re.match(r'^---\n(.+?)\n---', content, re.DOTALL)
        if match:
            print(f'OK: {f}')
        else:
            print(f'BROKEN FRONTMATTER: {f}')
    else:
        print(f'NO FRONTMATTER: {f} (reference file, OK)')
print('Done')
"
```

Expected: SKILL.md, commands, and agent have valid frontmatter. Reference files may not have frontmatter (that's fine).

**Step 4: Verify vault directories exist**

```bash
ls -d ~/Documents/rmv0/Daily/ ~/Documents/rmv0/Inbox/ ~/Documents/rmv0/Technology/ ~/Documents/rmv0/Finance/ ~/Documents/rmv0/Social/ ~/Documents/rmv0/Plans/ ~/Documents/rmv0/Content/ 2>/dev/null || echo "Some vault directories missing — create as needed"
```

**Step 5: Check a sample daily note exists for testing**

```bash
ls ~/Documents/rmv0/Daily/$(date +%Y-%m-%d).md 2>/dev/null || echo "No daily note for today — create one to test mode-daily"
```

**Step 6: Review git log**

```bash
cd /data/dev/skills/claude-skills
git log --oneline -12
```

Expected: clean series of commits, one per task.

---

## Verification Checklist

After implementation, verify:

- [ ] Plugin loads in Claude Code (restart required)
- [ ] `/process daily` triggers daily mode processing
- [ ] `/process inbox` scans Inbox/ for unprocessed items
- [ ] `/process link <URL>` creates a structured note
- [ ] `/process --dry-run daily` reports without modifying files
- [ ] `/process-daily` shortcut works
- [ ] Agent has no Bash access (verify in agent frontmatter)
- [ ] Created notes follow Obsidian markdown format
- [ ] Sensitive content is detected and skipped
- [ ] Existing notes are not overwritten (new ones go to Inbox/)
- [ ] Daily note edits only touch declared sections
