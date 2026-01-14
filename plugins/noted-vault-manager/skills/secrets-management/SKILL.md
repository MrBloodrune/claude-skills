---
name: Secrets Management
description: This skill should be used when the user asks about "vault secrets", "AppRole authentication", "vault-env script", "rotate secret ID", "fetch secrets from Vault", or mentions HashiCorp Vault integration with the noted system. Provides guidance on secure credential management for CouchDB, Claude OAuth tokens, and Livesync encryption.
---

# Secrets Management for Noted

## Overview

The noted system uses HashiCorp Vault for secure credential storage. Secrets are fetched dynamically at runtime using AppRole authentication, eliminating hardcoded credentials.

## Architecture

```
noted-agent (CT 223)
    │
    ├── /etc/vault.d/role-id      # AppRole Role ID
    ├── /etc/vault.d/secret-id    # AppRole Secret ID (rotate monthly)
    │
    └── /usr/local/bin/vault-env  # Fetches secrets, exports as env vars
            │
            ▼
    HashiCorp Vault (CT 206)
        └── secret/noted/*
            ├── couchdb   # Database credentials
            ├── livesync  # E2E encryption passphrase
            └── claude    # OAuth token for headless mode
```

## Secrets Stored

| Path | Contents | Usage |
|------|----------|-------|
| `secret/noted/couchdb` | host, port, database, username, password, uri | CouchDB connection |
| `secret/noted/livesync` | passphrase | E2E encryption for Obsidian Livesync |
| `secret/noted/claude` | oauth_token | Claude Code headless authentication |

## Using vault-env

The `vault-env` script authenticates with Vault and exports secrets as environment variables.

### Basic Usage

```bash
# Source secrets into current shell
source <(/usr/local/bin/vault-env)

# Or use eval
eval "$(/usr/local/bin/vault-env)"

# Verify secrets loaded
echo $COUCHDB_URI
echo ${CLAUDE_CODE_OAUTH_TOKEN:0:20}...
```

### In Scripts

Scripts automatically load vault-env if available:

```bash
# At script start (already in process-runner.sh and couchdb-watcher.sh)
if [[ -x /usr/local/bin/vault-env ]]; then
    eval "$(/usr/local/bin/vault-env)" 2>/dev/null || true
fi
```

### Environment Variables Exported

After sourcing vault-env:
- `COUCHDB_URI` - Full CouchDB URI with protocol
- `COUCHDB_USER` - Database username
- `COUCHDB_PASSWORD` - Database password
- `COUCHDB_DATABASE` - Database name
- `CLAUDE_CODE_OAUTH_TOKEN` - OAuth token for Claude CLI
- `LIVESYNC_PASSPHRASE` - E2E encryption passphrase

## AppRole Configuration

| Setting | Value |
|---------|-------|
| Role Name | `noted-agent` |
| Role ID | `16a3f81a-a8d0-cb58-8623-1e33973919af` |
| Policy | `noted-secrets` |
| CIDR Restriction | `10.0.99.27/32` |
| Token TTL | 1 hour |
| Secret ID TTL | 30 days |

## Common Operations

### Rotate Secret ID

Secret IDs expire after 30 days. To rotate:

```bash
# On admin workstation with Vault access
VAULT_TOKEN=$(cat /path/to/vault-keys.json | jq -r '.root_token')
NEW_SECRET=$(curl -sk -X POST \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  "https://vault.mrbloodrune.dev/v1/auth/approle/role/noted-agent/secret-id" \
  | jq -r '.data.secret_id')

# Deploy to noted-agent
ssh pv01 "pct exec 223 -- bash -c 'echo ${NEW_SECRET} > /etc/vault.d/secret-id'"
```

### Update a Secret

```bash
# Update CouchDB password in Vault
curl -sk -X POST \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  -d '{"data": {"password": "new-password", ...}}' \
  "https://vault.mrbloodrune.dev/v1/secret/data/noted/couchdb"
```

### Test Authentication

```bash
# On noted-agent container
/usr/local/bin/vault-env
# Should output export statements with actual values
```

## Troubleshooting

### "Permission denied" reading credentials

```bash
# Check file ownership
ls -la /etc/vault.d/

# Fix if needed (files should be owned by noted user)
chown noted:noted /etc/vault.d/*
```

### "Invalid secret id"

Secret ID has expired (30-day TTL). Rotate using procedure above.

### Vault unreachable

```bash
# Test Vault connectivity
curl -sk https://vault.mrbloodrune.dev/v1/sys/health

# Check if Vault is sealed
# If sealed, unseal keys are in admin repo
```

## Additional Resources

For detailed Vault configuration and AppRole patterns, see:
- `references/vault-env-script.md` - Full vault-env implementation
- `references/approle-setup.md` - AppRole creation steps
