---
name: process-daily
description: This skill should be used when the user asks to "process daily notes", "parse captures", "sort my notes", "file notes from today", "process quick capture", "organize daily entries", or mentions processing raw captures from Obsidian Daily notes. Provides categorization rules and processing workflow for the RMV0 vault structure.
---

# Process Daily Notes

Parse raw captures from Obsidian Daily notes and organize them into structured, linked notes within the vault.

## Overview

Daily notes contain a `# Quick Capture` section where raw, unstructured notes are dumped throughout the day. This skill provides the knowledge to parse these captures, classify them, extract tasks, create properly-filed notes, and update the Daily note with links.

## Processing Workflow

### 1. Read Daily Note

Locate and read the Daily note for the target date:
- Default path: `Daily/YYYY-MM-DD.md`
- Extract content between `# Quick Capture` and `# Processed` sections
- Skip if `# Quick Capture` section is empty or missing

### 2. Parse Captures

Split raw content into individual captures:
- Blank line separates distinct captures
- Bullet points (`-`) indicate list items within a capture
- URLs on their own line are link captures
- Preserve multi-line captures that form a single thought

### 3. Classify Each Capture

Determine the category for each capture using these signals:

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

For detailed categorization examples, consult `references/categorization-examples.md`.

### 4. Process by Type

**Tasks:**
- Extract actionable text
- Add to `# To Do` section as `- [ ] {task text}`
- Include time context if present (e.g., "Monday 2pm")
- Add urgency indicator for time-sensitive items

**Links:**
- Queue for scraping OR create placeholder note
- Determine likely category from URL domain
- Create note in appropriate folder with URL as reference

**Content Notes:**
- Determine target folder from vault structure
- Create new note using appropriate template
- Add frontmatter tags
- Include backlink to Daily note

### 5. Update Daily Note

After processing:
- Clear processed items from `# Quick Capture`
- Add links to created notes in `# Processed` section
- Format: `- [[Note Title]] - brief context`

## Vault Structure Reference

Target folders for categorized content:

```
Technology/
├── Dev/              # Software, coding, homelab
│   ├── Apps/         # Application projects
│   ├── Proxmox/      # Proxmox-specific
│   └── Prompts/      # AI prompts
└── Observation/      # Tech observations

Finance/              # Money matters
Social/
└── DnD/              # D&D campaign notes
Plans/
└── Games/            # Gaming plans
Content/              # Content creation
Inbox/                # Uncertain categorization
```

For complete structure details, see `references/vault-structure.md`.

## Note Creation

When creating new notes:

1. Use kebab-case or Title Case for filenames
2. Apply the standard Note template from `references/templates.md`
3. Add appropriate tags in frontmatter
4. Include `Links: [[Daily/YYYY-MM-DD]]` for traceability

## Safety Rules

**NEVER process content containing:**
- Strings matching API key patterns (`[A-Za-z0-9_-]{20,}`)
- 2FA recovery codes (sequences of 6-10 digit numbers)
- Password-like strings in sensitive context
- Private key markers (`-----BEGIN`)

Flag sensitive content and skip processing. Do not expose in logs or output.

**NEVER modify:**
- Content outside `# Quick Capture`, `# Processed`, `# To Do` sections
- Notes in `Templates/` folder
- `.obsidian/` configuration
- Existing notes (only create new ones)

## Automated Processing

### Agent
The **daily-processor** agent handles the full workflow autonomously. Trigger it by asking to "process today" or "file my captures".

### Command
Use `/process-today` to run processing for today's date, or `/process-today 2026-02-10` for a specific date.

## Additional Resources

### Reference Files

- **`references/vault-structure.md`** - Complete folder taxonomy with filing rules
- **`references/categorization-examples.md`** - 10+ worked examples of raw → processed
- **`references/templates.md`** - Note templates for each category
