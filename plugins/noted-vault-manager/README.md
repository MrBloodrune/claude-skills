# noted-vault-manager

Obsidian vault automation plugin for Claude Code. Processes raw captures from Daily notes into structured, linked notes with intelligent categorization.

## Features

- **Daily Note Processing**: Automatically parse `# Quick Capture` section and sort into appropriate folders
- **Task Extraction**: Pull tasks from captures into `# To Do` section
- **Link Scraping**: Fetch articles from URLs and create structured notes
- **Settings Sync**: Synchronize Obsidian settings across vault instances via CouchDB/Livesync
- **Intelligent Categorization**: Route notes to Technology, Finance, Social, Plans based on content

## Components

### Skills
- `process-daily` - Core processing logic for Daily note captures
- `vault-management` - Obsidian settings, Livesync configuration, DataView patterns
- `secrets-management` - HashiCorp Vault integration for secure credential storage

### Commands
- `/noted:process [date]` - Process captures from Daily note (defaults to today)
- `/noted:scrape <url>` - Fetch article and create structured note
- `/noted:sync [push|pull]` - Sync Obsidian settings with CouchDB

### Agents
- `vault-processor` - Autonomous agent for processing vault captures

### Scripts
- `link-scraper.js` - Playwright-based article content extractor
- `couchdb-watcher.sh` - CouchDB changes feed monitor for automated processing
- `process-runner.sh` - Headless execution entry point

## Vault Structure

The plugin is designed for vaults with this structure:

```
vault/
├── Daily/           # Daily journal notes (YYYY-MM-DD.md)
├── Inbox/           # Uncategorized items
├── Technology/
│   ├── Dev/         # Software development, coding
│   └── Observation/ # Tech observations
├── Finance/         # Money, budgets, expenses
├── Social/          # People, relationships
├── Plans/           # Goals, projects
├── Content/         # Content creation, media
└── Templates/       # Note templates
```

## Daily Note Format

The plugin expects Daily notes with this structure:

```markdown
---
tags:
  - 🗓
---

# To Do
- [ ] Tasks extracted here

# Quick Capture
<!-- Raw notes below will be processed -->
dentist monday 2pm
https://interesting-article.com
research k3s vs k8s for homelab

# Processed
<!-- Links to processed notes appear here -->
- [[Dentist appointment]]
- [[k3s vs k8s comparison]]
```

## Infrastructure

Designed for deployment with:
- **CouchDB LXC** (222) - Livesync endpoint for vault synchronization
- **noted-agent LXC** (223) - Claude Code runner with this plugin
- **HashiCorp Vault** (206) - Secure credential storage
- **Caddy** (201) - TLS reverse proxy
- **Tailscale** - Secure network access

## Secrets Management

Credentials are stored in HashiCorp Vault, not in plaintext:

| Secret Path | Contents |
|-------------|----------|
| `secret/noted/couchdb` | CouchDB connection details |
| `secret/noted/livesync` | E2E encryption passphrase |
| `secret/noted/claude` | OAuth token for headless mode |

Scripts automatically load secrets via `vault-env` if available:

```bash
# Secrets loaded from Vault at runtime
source <(/usr/local/bin/vault-env)
```

See the `secrets-management` skill for setup details.

## Installation

1. Clone to your Claude Code plugins directory:
   ```bash
   git clone https://github.com/MrBloodrune/claude-skills.git
   ```

2. Enable the plugin in Claude Code settings

3. Configure vault path in your environment or settings

## Security

The agent will NOT process:
- 2FA recovery codes
- API keys or passwords
- Private keys
- Sensitive financial details

Content matching sensitive patterns is flagged and skipped.

## License

MIT
