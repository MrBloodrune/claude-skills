# AppRole Setup Reference

## Creating the noted-agent AppRole

### 1. Create Policy

```bash
VAULT_ADDR='https://vault.mrbloodrune.dev'
VAULT_TOKEN='<root-token>'

curl -sk -X PUT \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  -d '{
    "policy": "path \"secret/data/noted/*\" { capabilities = [\"read\", \"list\"] }"
  }' \
  "${VAULT_ADDR}/v1/sys/policies/acl/noted-secrets"
```

### 2. Create AppRole

```bash
curl -sk -X POST \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  -d '{
    "token_policies": ["noted-secrets"],
    "token_ttl": "1h",
    "token_max_ttl": "4h",
    "token_type": "batch",
    "secret_id_ttl": "720h",
    "secret_id_num_uses": 0,
    "bind_secret_id": true,
    "secret_id_bound_cidrs": ["10.0.99.27/32"],
    "token_bound_cidrs": ["10.0.99.27/32"]
  }' \
  "${VAULT_ADDR}/v1/auth/approle/role/noted-agent"
```

### 3. Get Role ID

```bash
ROLE_ID=$(curl -sk \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  "${VAULT_ADDR}/v1/auth/approle/role/noted-agent/role-id" \
  | jq -r '.data.role_id')

echo "Role ID: ${ROLE_ID}"
```

### 4. Generate Secret ID

```bash
SECRET_ID=$(curl -sk -X POST \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  "${VAULT_ADDR}/v1/auth/approle/role/noted-agent/secret-id" \
  | jq -r '.data.secret_id')

echo "Secret ID: ${SECRET_ID}"
```

### 5. Deploy to Container

```bash
# Create directory
ssh pv01 "pct exec 223 -- bash -c 'mkdir -p /etc/vault.d && chmod 700 /etc/vault.d'"

# Deploy credentials
ssh pv01 "pct exec 223 -- bash -c 'echo ${ROLE_ID} > /etc/vault.d/role-id'"
ssh pv01 "pct exec 223 -- bash -c 'echo ${SECRET_ID} > /etc/vault.d/secret-id'"
ssh pv01 "pct exec 223 -- bash -c 'chmod 600 /etc/vault.d/*'"

# Set ownership to noted user
ssh pv01 "pct exec 223 -- chown -R noted:noted /etc/vault.d"
```

## Storing Secrets

### CouchDB Credentials

```bash
curl -sk -X POST \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  -d '{
    "data": {
      "host": "10.0.99.29",
      "port": "5984",
      "database": "rmv0-vault",
      "username": "admin",
      "password": "<password>",
      "uri": "https://vault-sync.mrbloodrune.dev"
    }
  }' \
  "${VAULT_ADDR}/v1/secret/data/noted/couchdb"
```

### Livesync Passphrase

```bash
curl -sk -X POST \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  -d '{
    "data": {
      "passphrase": "<e2e-passphrase>",
      "description": "Obsidian Livesync E2E encryption passphrase"
    }
  }' \
  "${VAULT_ADDR}/v1/secret/data/noted/livesync"
```

### Claude OAuth Token

```bash
curl -sk -X POST \
  -H "X-Vault-Token: ${VAULT_TOKEN}" \
  -d '{
    "data": {
      "oauth_token": "<oauth-token>",
      "description": "Claude Code OAuth token for headless operation"
    }
  }' \
  "${VAULT_ADDR}/v1/secret/data/noted/claude"
```

## Security Considerations

### CIDR Restriction

The AppRole is bound to `10.0.99.27/32` - only the noted-agent container can authenticate. Attempts from other IPs will fail.

### Token Lifetime

- **Token TTL**: 1 hour - short-lived tokens minimize exposure
- **Token Type**: batch - lightweight, no renewal overhead
- **Secret ID TTL**: 30 days - requires monthly rotation

### Rotation Schedule

Set calendar reminder for Secret ID rotation:
- Every 25 days (5-day buffer before expiry)
- Use the rotation procedure in SKILL.md
