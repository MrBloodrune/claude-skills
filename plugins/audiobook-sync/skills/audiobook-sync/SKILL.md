---
name: Audiobook Sync
description: This skill should be used when the user asks to "sync audiobooks", "download audible books", "run libation", "update audiobookshelf", "check for new audiobooks", "liberate audiobooks", or mentions Libation, Audiobookshelf, or Audible library sync. Provides workflow for syncing Audible purchases to Audiobookshelf server.
---

# Audiobook Sync Skill

Manage the workflow for downloading Audible audiobooks via Libation CLI and syncing them to the Audiobookshelf server.

## Infrastructure Overview

| Component | Location | Purpose |
|-----------|----------|---------|
| **Libation** | `ashelf:/home/bloodrune/Libation/` | Downloads and decrypts Audible AAX files |
| **LibationCLI** | `/usr/bin/libationcli` | Command-line interface for Libation |
| **Sync Script** | `ashelf:/home/bloodrune/sync-books.sh` | Copies books to Audiobookshelf |
| **Audiobookshelf** | `ashelf:/home/abyss_host/audiobookshelf/` | Self-hosted audiobook server |
| **Web UI** | `http://10.0.101.10:13378` | Audiobookshelf interface |

## Complete Sync Workflow

To sync new Audible purchases to Audiobookshelf, execute these three steps in order:

### Step 1: Scan for New Purchases

```bash
ssh ashelf "cd /home/bloodrune/Libation && libationcli scan"
```

This checks the linked Audible account for new purchases. Output shows total processed and new books found.

### Step 2: Download and Decrypt (Liberate)

```bash
ssh ashelf "cd /home/bloodrune/Libation && libationcli liberate"
```

Downloads and decrypts all un-liberated audiobooks to M4B format with chapters preserved. This may take several minutes per book depending on size.

### Step 3: Sync to Audiobookshelf

```bash
ssh ashelf "sudo /home/bloodrune/sync-books.sh"
```

Copies new books from Libation output to Audiobookshelf library directory with correct ownership.

## LibationCLI Commands Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `scan` | Check Audible for new purchases | `libationcli scan` |
| `liberate` | Download and decrypt new books | `libationcli liberate` |
| `liberate pdf` | Download only PDFs | `libationcli liberate pdf` |
| `convert` | Convert mp4 to mp3 | `libationcli convert` |
| `search` | Search library | `libationcli search "harry potter"` |
| `set-status` | Update download statuses | `libationcli set-status` |
| `export` | Export library data | `libationcli export --json /tmp/lib.json` |

## Directory Structure

```
/home/bloodrune/Libation/
├── Books/                    # Downloaded audiobooks (M4B format)
├── LibationContext.db        # Library database
├── AccountsSettings.json     # Audible account configuration
├── Settings.json             # Libation settings
└── Images/                   # Cover art cache

/home/abyss_host/audiobookshelf/
├── audiobooks/               # Synced audiobook library
├── podcasts/                 # Podcast storage
├── metadata/                 # Audiobookshelf metadata
├── config/                   # Server configuration
└── backups/                  # Backup storage
```

## Sync Script Details

The sync script (`/home/bloodrune/sync-books.sh`) performs:

1. Scans `/home/bloodrune/Libation/Books/` for book directories
2. Copies each book to `/home/abyss_host/audiobookshelf/audiobooks/`
3. Sets ownership to `abyss_host:abyss_host`
4. Skips books that already exist in destination
5. Logs all operations to `/home/abyss_host/libation-sync.log`

## Quick Reference Commands

### Full Sync (All Steps)
```bash
ssh ashelf "cd /home/bloodrune/Libation && libationcli scan && libationcli liberate" && \
ssh ashelf "sudo /home/bloodrune/sync-books.sh"
```

### Check Sync Log
```bash
ssh ashelf "sudo tail -30 /home/abyss_host/libation-sync.log"
```

### Count Books
```bash
# In Libation
ssh ashelf "ls /home/bloodrune/Libation/Books/ | wc -l"

# In Audiobookshelf
ssh ashelf "sudo ls /home/abyss_host/audiobookshelf/audiobooks/ | wc -l"
```

### Verify Audiobookshelf Running
```bash
ssh ashelf "curl -sf http://localhost:13378/healthcheck"
```

## Troubleshooting

### Libation Authentication Issues
If scan fails with authentication errors, the Audible session may have expired. Run the GUI version of Libation to re-authenticate:
```bash
ssh -X ashelf "libation"
```

### Permission Denied on Sync
The sync script requires sudo to write to abyss_host's directory:
```bash
ssh ashelf "sudo /home/bloodrune/sync-books.sh"
```

### Books Not Appearing in Audiobookshelf
After sync, trigger a library scan in Audiobookshelf:
1. Open `http://10.0.101.10:13378`
2. Navigate to Settings → Libraries
3. Click "Scan" on the audiobooks library

## Additional Resources

For detailed configuration and advanced usage, consult:
- **`references/libation-config.md`** - Libation configuration details
- **`references/sync-script.md`** - Full sync script source and customization
