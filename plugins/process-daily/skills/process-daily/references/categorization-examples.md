# Categorization Examples

Worked examples showing how to process raw captures into structured vault entries.

## Example 1: Mixed Task + Research

**Raw capture:**
```
dentist monday 2pm, also look into k3s vs k8s for homelab
```

**Analysis:**
- Contains task with time reference ("dentist monday 2pm")
- Contains research topic ("k3s vs k8s for homelab")
- Should split into two outputs

**Processing:**
1. Task extracted: `- [ ] Dentist appointment - Monday 2pm`
2. Note created: `Technology/Dev/k3s vs k8s comparison.md`
3. Daily `# Processed`: `- [[k3s vs k8s comparison]] - homelab container orchestration research`

---

## Example 2: Pure Task (No Note Needed)

**Raw capture:**
```
buy milk and eggs
```

**Analysis:**
- Simple task with no reference value
- No need to create a separate note

**Processing:**
1. Task extracted: `- [ ] Buy milk and eggs`
2. No note created
3. Raw capture cleared from `# Quick Capture`

---

## Example 3: Tech Observation

**Raw capture:**
```
interesting - cloudflare has a new r2 egress feature, zero cost
```

**Analysis:**
- Technology observation about Cloudflare
- Has reference value for future use
- Could append to existing Cloudflare note or create new

**Processing:**
1. Check if `Technology/Cloudflare.md` exists
2. If exists: Consider appending (flag for user decision)
3. If not: Create `Technology/Cloudflare R2 egress.md`
4. Daily `# Processed`: `- [[Cloudflare R2 egress]] - zero cost egress feature`

---

## Example 4: Social + Task

**Raw capture:**
```
meet jake for coffee thursday, discuss his startup idea
```

**Analysis:**
- Task with social context and time
- Person reference (Jake)
- May warrant Social note for relationship tracking

**Processing:**
1. Task extracted: `- [ ] Coffee with Jake - Thursday (discuss startup)`
2. Check if `Social/Jake.md` exists
3. If exists: Append meeting note
4. If not: Create `Social/Jake.md` with context
5. Daily `# Processed`: `- [[Jake]] - coffee meeting, startup discussion`

---

## Example 5: Finance Entry

**Raw capture:**
```
spent $45 on new mechanical keyboard switches
```

**Analysis:**
- Financial transaction
- Has reference value (hardware purchase)
- Should update Daily and potentially create tech note

**Processing:**
1. Add to Daily `# Money Spent`: `- $45 - mechanical keyboard switches`
2. Optionally create: `Technology/Mechanical keyboard.md` (if substantial topic)
3. Daily `# Processed`: `- Logged expense: keyboard switches $45`

---

## Example 6: Vague/Ambiguous

**Raw capture:**
```
think more about life direction
```

**Analysis:**
- NOT actionable (too vague for task)
- Personal reflection
- File to Inbox for later organization

**Processing:**
1. NOT a task (no clear action)
2. Create: `Inbox/Life direction thoughts.md`
3. Daily `# Processed`: `- [[Life direction thoughts]]`

---

## Example 7: Learning Note

**Raw capture:**
```
learned that rust's borrow checker prevents data races at compile time
```

**Analysis:**
- Learning/knowledge capture
- Technical content about Rust
- Should go to Daily section AND create reference

**Processing:**
1. Add to Daily `# Things Learned`: `- Rust borrow checker prevents data races at compile time`
2. Create: `Technology/Dev/Rust borrow checker.md`
3. Daily `# Processed`: `- [[Rust borrow checker]]`

---

## Example 8: URL Only

**Raw capture:**
```
https://blog.example.com/interesting-article-about-kubernetes
```

**Analysis:**
- Bare URL, no context
- Likely wants to save for later reading
- Should scrape or create placeholder

**Processing:**
1. Determine category from URL (kubernetes → Technology/Dev)
2. Option A (with scraping): Run link-scraper, create full note
3. Option B (placeholder): Create `Technology/Dev/Kubernetes article.md` with just URL
4. Daily `# Processed`: `- [[Kubernetes article]] - queued for reading`

---

## Example 9: DnD/Gaming

**Raw capture:**
```
DnD session - party defeated the lich, Jake's character got the vorpal sword
```

**Analysis:**
- Gaming content (D&D)
- Social context (Jake)
- Should go to Social/DnD

**Processing:**
1. Create: `Social/DnD/Session - Lich Battle.md`
2. Include party members, loot, story beats
3. Daily `# Processed`: `- [[Session - Lich Battle]] - party victory, vorpal sword acquired`

---

## Example 10: Multi-Line Capture

**Raw capture:**
```
project idea: build a CLI tool that
- syncs obsidian vaults
- uses couchdb for backend
- has offline support
```

**Analysis:**
- Single coherent thought spanning multiple lines
- Project/planning content
- Should preserve structure in note

**Processing:**
1. Create: `Plans/Obsidian sync CLI.md` or `Technology/Dev/Apps/obsidian-sync-cli.md`
2. Preserve bullet structure in note body
3. Daily `# Processed`: `- [[Obsidian sync CLI]] - project idea with requirements`

---

## Example 11: Sensitive Content (SKIP)

**Raw capture:**
```
new api key for openai: sk-proj-abc123xyz789...
```

**Analysis:**
- Contains sensitive credential
- MUST NOT process or expose
- Flag and skip

**Processing:**
1. **DO NOT create note**
2. **DO NOT add to any section**
3. Leave in `# Quick Capture` with warning comment
4. Log: "Skipped sensitive content (API key pattern detected)"

---

## Example 12: Meeting Notes

**Raw capture:**
```
meeting with sarah about Q1 roadmap - agreed on 3 priorities: auth refactor, mobile app, docs overhaul
```

**Analysis:**
- Meeting content with person and outcomes
- Could be Social (person) or Plans (roadmap)
- Best fit: Plans with Social link

**Processing:**
1. Task potential: Extract any follow-ups if explicit
2. Create: `Plans/Q1 Roadmap.md`
3. Add link to Sarah if Social/Sarah.md exists
4. Daily `# Meetings`: `- Sarah - Q1 roadmap planning`
5. Daily `# Processed`: `- [[Q1 Roadmap]] - meeting outcomes with Sarah`

---

## Classification Priority

When a capture fits multiple categories, use this priority:

1. **Task** - If actionable, always extract task first
2. **Sensitive** - If contains credentials, skip entirely
3. **Primary category** - Determine main topic
4. **Secondary links** - Add cross-references

## Edge Cases

**Empty after task extraction:**
If a capture is entirely a task with no reference value, don't create a note.

**Duplicate topics:**
Check for existing notes on the same topic. Prefer appending or linking over creating duplicates.

**Uncertain categorization:**
When in doubt, file to `Inbox/` with descriptive title. User can refile later.

**Very long captures:**
If capture exceeds 500 words, it's likely a substantial thought. Create note in most relevant category and preserve full content.
