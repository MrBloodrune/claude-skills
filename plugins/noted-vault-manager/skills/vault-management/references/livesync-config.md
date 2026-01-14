# Livesync Configuration

Complete guide to setting up Obsidian Livesync with CouchDB.

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Device 1  │     │   Device 2  │     │   Device 3  │
│  Obsidian   │     │  Obsidian   │     │  Obsidian   │
│  + Livesync │     │  + Livesync │     │  + Livesync │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │      HTTPS        │      HTTPS        │
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │   CouchDB     │
                   │   Server      │
                   │   (Central)   │
                   └───────────────┘
```

## CouchDB Server Setup

### System Requirements

- Debian 12 / Ubuntu 24.04 LXC
- 512MB RAM minimum
- 8GB disk (scales with vault size)
- Network accessible to all devices

### Installation

```bash
# Add CouchDB repository
curl https://couchdb.apache.org/repo/keys.asc | gpg --dearmor -o /usr/share/keyrings/couchdb-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] https://apache.jfrog.io/artifactory/couchdb-deb/ bookworm main" > /etc/apt/sources.list.d/couchdb.list

apt update && apt install -y couchdb
```

### Configuration

Edit `/opt/couchdb/etc/local.ini`:

```ini
[couchdb]
max_document_size = 50000000

[chttpd]
bind_address = 127.0.0.1
port = 5984
enable_cors = true

[cors]
origins = app://obsidian.md, capacitor://localhost, http://localhost
credentials = true
methods = GET, PUT, POST, HEAD, DELETE
headers = accept, authorization, content-type, origin, referer, x-csrf-token

[admins]
admin = your_secure_password
```

### Create Database

```bash
# Create vault database
curl -X PUT http://admin:password@127.0.0.1:5984/rmv0-vault

# Verify
curl http://admin:password@127.0.0.1:5984/_all_dbs
```

## Reverse Proxy Setup (Caddy)

### Caddyfile

```caddyfile
noted-couchdb.tailnet.ts.net {
    reverse_proxy 127.0.0.1:5984

    header {
        Access-Control-Allow-Origin "app://obsidian.md"
        Access-Control-Allow-Methods "GET, PUT, POST, HEAD, DELETE"
        Access-Control-Allow-Headers "accept, authorization, content-type, origin, referer, x-csrf-token"
        Access-Control-Allow-Credentials "true"
    }
}
```

### With Tailscale HTTPS

Caddy automatically handles HTTPS for Tailscale domains:

```bash
# Enable Tailscale HTTPS
tailscale cert noted-couchdb.tailnet.ts.net

# Caddy will auto-provision cert
systemctl reload caddy
```

## Livesync Plugin Configuration

### Initial Setup

1. Install "Self-hosted LiveSync" from Obsidian community plugins
2. Open Settings → Self-hosted LiveSync
3. Configure remote database:

```
URI: https://noted-couchdb.tailnet.ts.net
Username: admin
Password: [your password]
Database name: rmv0-vault
```

### Recommended Settings

```json
{
  "liveSync": true,
  "syncOnStart": true,
  "syncOnSave": true,
  "syncOnEditorSave": true,
  "batchSave": false,
  "batchSaveMinimumDelay": 5,
  "batchSaveMaximumDelay": 60,
  "trashInsteadDelete": true,
  "doNotDeleteFolder": false,
  "resolveConflictsByNewerFile": true,
  "checkConflictOnlyOnOpen": false,
  "syncInternalFiles": false,
  "syncInternalFilesBeforeReplication": false,
  "encrypt": false,
  "usePathObfuscation": false
}
```

### Sync Internal Files

To sync `.obsidian/` settings:

1. Enable "Sync internal files" in plugin settings
2. Configure which files to sync:
   - ✅ `app.json`
   - ✅ `appearance.json`
   - ✅ `hotkeys.json`
   - ✅ `community-plugins.json`
   - ✅ `core-plugins.json`
   - ❌ `workspace.json`
   - ❌ `workspace-mobile.json`

### Customization Sync (Beta)

For plugin settings sync:

1. Enable "Customization sync" in plugin settings
2. Choose sync preset or configure manually
3. Sync triggers on plugin setting changes

## Troubleshooting

### Connection Refused

Check:
1. CouchDB running: `systemctl status couchdb`
2. Firewall allows port: `ufw status`
3. Caddy running: `systemctl status caddy`
4. Tailscale connected: `tailscale status`

### CORS Errors

Verify CouchDB CORS config:
```bash
curl http://admin:password@127.0.0.1:5984/_node/_local/_config/cors
```

Expected output:
```json
{
  "credentials": "true",
  "headers": "accept, authorization, content-type, origin, referer, x-csrf-token",
  "methods": "GET, PUT, POST, HEAD, DELETE",
  "origins": "app://obsidian.md, capacitor://localhost, http://localhost"
}
```

### Sync Not Working

1. Check database exists: `curl http://admin:password@127.0.0.1:5984/rmv0-vault`
2. Check credentials in Livesync settings
3. Try "Rebuild everything" in plugin settings (destructive!)
4. Check Obsidian developer console for errors

### Document Conflicts

When same note edited on multiple devices simultaneously:

1. Livesync attempts automatic merge
2. If conflict: Creates `.conflicted` version
3. Manually resolve by comparing and merging
4. Delete conflicted version after resolution

## Performance Tuning

### Large Vaults

For vaults >1000 files:

```ini
# /opt/couchdb/etc/local.ini
[couchdb]
max_document_size = 100000000

[chttpd]
buffer_response = true

[couch_httpd_auth]
timeout = 43200
```

### Batch Operations

For bulk imports:

1. Disable live sync temporarily
2. Import files
3. Run manual sync
4. Re-enable live sync

### Mobile Optimization

On mobile devices:
- Enable "Periodic sync" instead of "Live sync"
- Set sync interval to 5 minutes
- Disable "Sync on save" to save battery

## Security Considerations

### Authentication

- Always use HTTPS (via Caddy/Tailscale)
- Use strong admin password
- Consider creating read-only users for backup clients

### Network Access

- Prefer Tailscale (private network)
- If public: Use Cloudflare Tunnel
- Never expose CouchDB directly to internet without auth

### Encryption

Livesync supports end-to-end encryption:

```json
{
  "encrypt": true,
  "passphrase": "your-encryption-passphrase"
}
```

Note: All devices must use same passphrase.

## Monitoring

### CouchDB Stats

```bash
# Database info
curl http://admin:password@127.0.0.1:5984/rmv0-vault

# Active tasks
curl http://admin:password@127.0.0.1:5984/_active_tasks

# Changes feed (for monitoring)
curl "http://admin:password@127.0.0.1:5984/rmv0-vault/_changes?feed=longpoll"
```

### Log Files

- CouchDB: `/opt/couchdb/var/log/`
- Caddy: `journalctl -u caddy`
- Obsidian: Developer console (Ctrl+Shift+I)

## Backup

### Database Backup

```bash
# Full backup
curl -X POST http://admin:password@127.0.0.1:5984/_replicate \
  -H "Content-Type: application/json" \
  -d '{"source":"rmv0-vault","target":"rmv0-vault-backup","create_target":true}'

# Export to file
couchdb-dump http://admin:password@127.0.0.1:5984/rmv0-vault > vault-backup.json
```

### Restore

```bash
# From backup database
curl -X POST http://admin:password@127.0.0.1:5984/_replicate \
  -H "Content-Type: application/json" \
  -d '{"source":"rmv0-vault-backup","target":"rmv0-vault"}'
```
