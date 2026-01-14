---
name: sync
description: Synchronize Obsidian settings (themes, hotkeys, plugin configs) between local vault and CouchDB. Use 'push' to upload local settings or 'pull' to download remote settings.
argument-hint: "[push|pull]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
---

# Sync Settings Command

Synchronize Obsidian `.obsidian/` settings between local vault and CouchDB.

## Arguments

- **direction** (optional): `push` or `pull`. Defaults to `pull`.
  - `pull`: Download settings from CouchDB to local
  - `push`: Upload local settings to CouchDB

## Execution Steps

### Pull (Download Settings)

1. **Connect to CouchDB**
   - Read CouchDB credentials from environment or config
   - Verify connection to database

2. **Fetch remote settings**
   - Query documents matching `.obsidian/*` pattern
   - Download: app.json, appearance.json, hotkeys.json, etc.
   - Skip: workspace.json, workspace-mobile.json

3. **Compare with local**
   - Identify files that differ
   - Check timestamps for conflict detection
   - Present diff summary to user

4. **Apply changes**
   - Backup current local settings
   - Write fetched settings to `.obsidian/`
   - Report changes applied

### Push (Upload Settings)

1. **Read local settings**
   - Collect files from `.obsidian/`
   - Filter to sync-safe files only
   - Exclude workspace and device-specific files

2. **Connect to CouchDB**
   - Verify write access to database

3. **Upload settings**
   - Push each settings file as document
   - Handle revision conflicts
   - Report upload status

## Example Usage

```
/noted:sync
# Pulls settings from CouchDB (default)

/noted:sync pull
# Explicitly pull settings

/noted:sync push
# Push local settings to CouchDB
```

## Files Synced

| File | Synced | Notes |
|------|--------|-------|
| app.json | ✅ | Core settings |
| appearance.json | ✅ | Theme, fonts |
| hotkeys.json | ✅ | Keybindings |
| community-plugins.json | ✅ | Plugin list |
| core-plugins.json | ✅ | Core toggles |
| graph.json | ✅ | Graph settings |
| bookmarks.json | ✅ | Bookmarks |
| templates.json | ✅ | Template config |
| workspace.json | ❌ | Device-specific |
| workspace-mobile.json | ❌ | Device-specific |

## Plugin Settings

Plugin data in `plugins/*/data.json` is handled specially:

- Most plugin settings: Synced
- Livesync credentials: NOT synced (device-specific)
- Plugin code (main.js): NOT synced (installed per-device)

## Conflict Resolution

When local and remote differ:

1. Compare modification timestamps
2. If remote newer: Prompt to overwrite local
3. If local newer: Prompt to overwrite remote
4. If same timestamp: Show diff, ask user to choose

## Configuration

Environment variables:

```bash
NOTED_VAULT_PATH=/home/user/vaults/RMV0
COUCHDB_URI=https://noted-couchdb.tailnet.ts.net
COUCHDB_USER=admin
COUCHDB_PASSWORD=secret
COUCHDB_DATABASE=rmv0-vault
```

## Output Format

### Pull Output

```
Syncing settings from CouchDB...

Fetching remote settings...
✓ Connected to: https://noted-couchdb.tailnet.ts.net/rmv0-vault

Comparing with local:
  app.json: Remote newer (2 hours ago)
  appearance.json: Same
  hotkeys.json: Local newer (conflict)
  community-plugins.json: Remote newer (1 day ago)

Applying changes:
✓ Updated: app.json
○ Skipped: appearance.json (unchanged)
? Conflict: hotkeys.json
  Remote has: Mod+Shift+N → new-note
  Local has: Mod+Shift+N → daily-note
  Keep local? [y/N]: y
✓ Updated: community-plugins.json

Sync complete. 2 files updated, 1 conflict resolved.
```

### Push Output

```
Pushing settings to CouchDB...

Collecting local settings...
Found 6 files to sync

Uploading:
✓ app.json (rev: 5-abc123)
✓ appearance.json (rev: 3-def456)
✓ hotkeys.json (rev: 2-ghi789)
✓ community-plugins.json (rev: 7-jkl012)
✓ core-plugins.json (rev: 4-mno345)
✓ graph.json (rev: 1-pqr678)

Push complete. 6 files uploaded.
```

## Safety

- Always backup before overwriting local settings
- Never sync credentials or secrets
- Verify CouchDB connection before destructive operations
- Prompt before overwriting newer local changes
