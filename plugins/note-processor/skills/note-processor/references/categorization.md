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
