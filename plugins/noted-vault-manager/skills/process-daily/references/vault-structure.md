# RMV0 Vault Structure

Complete folder taxonomy for the RMV0 Obsidian vault with filing rules for each location.

## Root Folders

### Daily/
Daily journal notes following `YYYY-MM-DD.md` naming.

**Filing rule:** NEVER create notes here. Only modify today's Daily note in designated sections.

**Contains:**
- Daily notes with structured template
- `# To Do` for tasks
- `# Quick Capture` for raw input
- `# Processed` for filed note links

### Inbox/
Uncategorized items awaiting proper filing.

**Filing rule:** Use when categorization is uncertain. Better to file here than guess wrong.

**Use for:**
- Ambiguous content
- Items needing user decision
- Temporary holding

### Technology/
Technical topics, tools, and research.

**Filing rule:** Default location for anything tech-related that isn't clearly development.

#### Technology/Dev/
Software development, coding, programming projects.

**Filing rule:** Code, programming languages, development tools, homelab infrastructure.

**Subfolders:**
- `Apps/` - Application projects
  - `In Progress/` - Active development
    - `confgen/` - Config generator project
- `Domains/` - Domain-related notes
  - `Host/` - Hosting configurations
- `Home Network/` - Network infrastructure
- `Prompts/` - AI prompts and templates
  - `System Prompts/` - System prompt definitions
- `Proxmox/` - Proxmox virtualization
  - `Hosts/` - Host configurations
- `Sentinel/` - Security monitoring
- `VPN/` - VPN configurations

**Examples:** Kubernetes, Docker, Python scripts, MCP servers, CI/CD pipelines, Git workflows

#### Technology/Observation/
Tech observations, discoveries, things noticed.

**Filing rule:** Observations that aren't active research or development.

**Subfolders:**
- `Alloy/` - Grafana Alloy observations

**Examples:** "Noticed X tool does Y", bug observations, interesting behaviors

#### Technology/ (root level)
General tech that isn't development or observation.

**Examples:** 1Password, Cloudflare, hardware notes, UnraidOS, software tools

### Finance/
Money, budgets, expenses, financial planning.

**Filing rule:** Anything involving money or financial decisions.

**Examples:** Purchases, bills, investments, subscriptions, budget planning

**Note:** Contains sensitive financial data. Process with care.

### Social/
People, relationships, social events.

**Filing rule:** Content primarily about people or social interactions.

**Subfolders:**
- `DnD/` - Dungeons & Dragons campaign notes

**Examples:** Contact notes, event planning, relationship notes, game sessions

### Plans/
Goals, planning, structured thinking.

**Filing rule:** Future-oriented content, goals, project planning.

**Subfolders:**
- `Games/` - Gaming-related plans

**Examples:** Project roadmaps, life goals, bucket lists, game wishlists

### Content/
Content creation, media, learning resources.

**Filing rule:** Things to create, consume, or learn.

**Examples:** YouTube video ideas, blog post drafts, course notes, PKM methodology

### Canvas/
Obsidian canvas files for visual thinking.

**Filing rule:** NEVER create files here programmatically. Canvas files are complex JSON.

### Templates/
Note templates.

**Filing rule:** NEVER modify. Read-only reference for note creation.

**Contains:**
- `Daily.md` - Daily note template
- `Note.md` - General note template

### Attachments/ and Attachment/
Images, PDFs, files. (Note: duplicate folders exist)

**Filing rule:** NEVER create files here programmatically. For manual attachment storage.

## Filing Decision Tree

```
Is it a task with deadline/action?
  └─ YES → Extract to Daily # To Do
  └─ NO ↓

Is it a URL/link?
  └─ YES → Queue for scraping, determine category from content
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

## Tag Conventions

Common tags used in the vault:

| Tag | Meaning |
|-----|---------|
| 🗓 | Daily note |
| 🚨 | Urgent/important |
| 📝 | General note |
| 🌱 | Seedling (new idea) |

## Filename Conventions

- Use Title Case for note titles: `Kubernetes Setup Guide.md`
- Use kebab-case for technical topics: `k3s-vs-k8s-comparison.md`
- Include date prefix for time-sensitive: `2026-01-13 Meeting Notes.md`
- Avoid special characters except hyphens and spaces
