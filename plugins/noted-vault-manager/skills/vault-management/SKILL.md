---
name: vault-management
description: This skill should be used when the user asks to "sync vault settings", "manage obsidian config", "configure livesync", "sync themes", "dataview queries", "vault maintenance", "orphan notes", or mentions Obsidian settings synchronization and vault administration tasks.
---

# Vault Management

Manage Obsidian vault configuration, settings synchronization, and maintenance tasks.

## Overview

Obsidian vaults contain configuration in the `.obsidian/` folder that controls themes, plugins, hotkeys, and appearance. When using multiple devices with Livesync, keeping these settings synchronized ensures a consistent experience.

## Settings Structure

The `.obsidian/` folder contains:

```
.obsidian/
├── app.json              # Core app settings
├── appearance.json       # Theme, font, CSS
├── community-plugins.json # Installed plugins list
├── core-plugins.json     # Core plugin toggles
├── hotkeys.json          # Custom keybindings
├── workspace.json        # Window layout (device-specific)
├── plugins/              # Plugin configurations
│   ├── plugin-name/
│   │   ├── data.json
│   │   └── main.js
└── themes/               # Custom themes
    └── theme-name/
```

## Sync Strategy

### Safe to Sync (Recommended)

These files provide consistent experience across devices:
- `app.json` - Editor settings, spell check, etc.
- `appearance.json` - Theme, accent color, font
- `hotkeys.json` - Keyboard shortcuts
- `community-plugins.json` - Plugin list
- `core-plugins.json` - Core feature toggles
- `plugins/*/data.json` - Plugin settings

### Device-Specific (Do Not Sync)

These vary by device and should NOT be synced:
- `workspace.json` - Window positions, open files
- `workspace-mobile.json` - Mobile-specific layout
- `.obsidian-mobile/` - Mobile-only settings

### Sync Conflicts

When settings differ between devices:
1. Compare timestamps to identify newer version
2. Present diff to user for decision
3. Merge non-conflicting changes automatically
4. Flag conflicting values for manual resolution

## Livesync Configuration

Livesync plugin settings for CouchDB synchronization.

### Required Settings

```json
{
  "couchDB_URI": "https://noted-couchdb.tailnet.ts.net",
  "couchDB_USER": "admin",
  "couchDB_PASSWORD": "...",
  "couchDB_DBNAME": "rmv0-vault",
  "liveSync": true,
  "syncOnStart": true,
  "syncOnSave": true
}
```

### CORS Configuration

CouchDB must allow Obsidian origins:
- `app://obsidian.md`
- `capacitor://localhost`
- `http://localhost`

For detailed Livesync setup, see `references/livesync-config.md`.

## DataView Integration

DataView plugin enables dynamic queries across the vault.

### Aggregated TODO List

Create a note with this query to aggregate all tasks:

```dataview
TASK
FROM "Daily"
WHERE !completed
SORT file.name DESC
```

### Recent Notes

```dataview
TABLE file.mtime as "Modified"
FROM ""
WHERE file.mtime >= date(today) - dur(7 days)
SORT file.mtime DESC
LIMIT 20
```

### Orphan Detection

Find notes with no incoming links:

```dataview
LIST
FROM ""
WHERE length(file.inlinks) = 0
AND !contains(file.path, "Templates")
AND !contains(file.path, "Daily")
```

## Maintenance Tasks

### Orphan Note Cleanup

Identify notes that may need attention:
1. No incoming links (orphans)
2. No outgoing links (isolated)
3. In Inbox for >30 days (stale)

### Duplicate Detection

Find potential duplicates:
1. Similar titles (fuzzy match)
2. Same tags but different locations
3. Notes referencing same source URL

### Tag Normalization

Ensure consistent tagging:
1. List all unique tags
2. Identify variations (e.g., `dev` vs `development`)
3. Standardize to canonical form

## Settings Sync Workflow

### Pull Settings (Download)

1. Connect to CouchDB
2. Fetch `.obsidian/` documents
3. Compare with local settings
4. Merge or replace based on strategy
5. Reload Obsidian to apply

### Push Settings (Upload)

1. Read local `.obsidian/` contents
2. Exclude device-specific files
3. Upload to CouchDB
4. Verify upload success

## Security Considerations

The `.obsidian/` folder may contain:
- Plugin API keys (in plugin data.json)
- Sync credentials (Livesync config)
- Custom CSS with potential external URLs

When syncing:
- Never log credential values
- Verify plugin sources before syncing
- Review custom CSS for external references

## Additional Resources

### Reference Files

- **`references/obsidian-settings.md`** - Complete .obsidian/ structure guide
- **`references/livesync-config.md`** - CouchDB + Livesync setup details
