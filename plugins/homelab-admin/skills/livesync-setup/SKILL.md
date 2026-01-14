---
name: Livesync Setup
description: This skill should be used when the user asks to "set up livesync", "configure CouchDB for Obsidian", "create vault sync", "Obsidian mobile sync", "self-hosted sync", or mentions setting up Obsidian Livesync with CouchDB on Proxmox. Provides infrastructure setup for mobile-first note capture with E2E encryption.
---

# Obsidian Livesync Infrastructure Setup

## Overview

Set up self-hosted Obsidian sync using CouchDB and the Livesync plugin. This provides mobile-first note capture with E2E encryption, eliminating dependency on Obsidian Sync subscription.

## Architecture

```
Phone (Obsidian)                    Desktop (Obsidian)
      │                                    │
      └──────────┬─────────────────────────┘
                 │
                 ▼
         Caddy (TLS Proxy)
                 │
                 ▼
    CouchDB (Document Store)
                 │
                 ▼
    noted-agent (Optional)
    └── Headless Claude Code
        └── Automated Processing
```

## Infrastructure Components

| Component | Purpose | Proxmox CTID |
|-----------|---------|--------------|
| CouchDB | Document sync database | 222 |
| Caddy | TLS termination, reverse proxy | 201 |
| noted-agent | Headless processing (optional) | 223 |
| Vault | Secrets management | 206 |

## Container Setup

### CouchDB Container (CTID 222)

Create unprivileged Debian container:

```bash
# On Proxmox host
pct create 222 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname noted-couchdb \
  --memory 1024 \
  --cores 2 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=10.0.99.29/24,gw=10.0.99.254 \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1

pct start 222
```

Install CouchDB:

```bash
pct exec 222 -- bash -c '
apt update && apt install -y curl gnupg apt-transport-https

# Add CouchDB repo
curl https://couchdb.apache.org/repo/keys.asc | gpg --dearmor > /usr/share/keyrings/couchdb-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] https://apache.jfrog.io/artifactory/couchdb-deb/ bookworm main" > /etc/apt/sources.list.d/couchdb.list

apt update && apt install -y couchdb
'
```

Configure CouchDB:

```ini
# /opt/couchdb/etc/local.ini
[couchdb]
single_node=true

[chttpd]
bind_address = 0.0.0.0

[admins]
admin = <password>

[httpd]
enable_cors = true

[cors]
origins = app://obsidian.md,capacitor://localhost,http://localhost
credentials = true
methods = GET, PUT, POST, HEAD, DELETE
headers = accept, authorization, content-type, origin, referer
```

Create database:

```bash
curl -X PUT http://admin:<password>@localhost:5984/rmv0-vault
```

### Caddy Configuration

Add to Caddyfile on Caddy container:

```caddyfile
vault-sync.mrbloodrune.dev {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
    reverse_proxy http://10.0.99.29:5984 {
        header_up Host {upstream_hostport}
    }
}
```

Reload Caddy:

```bash
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

## Client Configuration

### Obsidian Livesync Plugin

Install from Community Plugins, then configure:

| Setting | Value |
|---------|-------|
| Remote URI | `https://vault-sync.mrbloodrune.dev` |
| Username | `admin` |
| Password | (from Vault) |
| Database | `rmv0-vault` |
| E2E Encryption | Enabled |
| Passphrase | (from Vault) |

### Recommended Sync Settings

- **Sync Mode**: LiveSync (real-time)
- **Conflict Resolution**: Newer wins
- **Batch Size**: 50
- **Batch Limit**: 40

## E2E Encryption

All documents are encrypted client-side before transmission. CouchDB stores only encrypted blobs.

### Verification

Encrypted documents have:
- `"e_": true` flag
- Hashed document IDs (e.g., `h:+101kmmg8qs3z4`)
- Base64-encoded data field

```bash
# Check encryption status
curl -s -u admin:<password> \
  'http://localhost:5984/rmv0-vault/_all_docs?limit=1&startkey="h"' | jq '.'
```

## Secrets Management

Store credentials in HashiCorp Vault:

```bash
# secret/noted/couchdb
{
  "host": "10.0.99.29",
  "port": "5984",
  "database": "rmv0-vault",
  "username": "admin",
  "password": "<password>",
  "uri": "https://vault-sync.mrbloodrune.dev"
}

# secret/noted/livesync
{
  "passphrase": "<e2e-passphrase>"
}
```

## Troubleshooting

### Connection Refused

Check CouchDB bind address:

```bash
grep bind_address /opt/couchdb/etc/local.ini
# Should be: bind_address = 0.0.0.0
```

### CORS Errors

Verify CORS configuration includes Obsidian origins.

### Sync Conflicts

Use Livesync's conflict resolution or manually resolve in CouchDB Fauxton UI.

## Additional Resources

- `references/couchdb-config.md` - Complete CouchDB configuration
- `references/tailscale-setup.md` - Optional Tailscale VPN access
