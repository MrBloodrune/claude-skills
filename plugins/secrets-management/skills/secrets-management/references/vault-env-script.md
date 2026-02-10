# vault-env Script Reference

## Location

`/usr/local/bin/vault-env` on noted-agent container (CT 223)

## Full Implementation

```bash
#!/bin/bash
#
# vault-env - Fetch secrets from HashiCorp Vault and export as environment variables
#
# Usage:
#   source <(vault-env)            # Export all noted secrets
#   eval "$(vault-env)"            # Alternative syntax
#
# Requires: /etc/vault.d/role-id and /etc/vault.d/secret-id

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://vault.mrbloodrune.dev}"
ROLE_ID_FILE="${ROLE_ID_FILE:-/etc/vault.d/role-id}"
SECRET_ID_FILE="${SECRET_ID_FILE:-/etc/vault.d/secret-id}"

# Authenticate and get token
get_token() {
    local role_id secret_id
    role_id=$(cat "$ROLE_ID_FILE")
    secret_id=$(cat "$SECRET_ID_FILE")

    curl -sf -X POST "${VAULT_ADDR}/v1/auth/approle/login" \
        -d "{\"role_id\":\"${role_id}\",\"secret_id\":\"${secret_id}\"}" \
        | jq -r '.auth.client_token'
}

# Read a secret from Vault
read_secret() {
    local path="$1"
    local token="$2"

    curl -sf -H "X-Vault-Token: ${token}" \
        "${VAULT_ADDR}/v1/secret/data/${path}" \
        | jq -r '.data.data'
}

main() {
    local token
    token=$(get_token)

    if [[ -z "$token" || "$token" == "null" ]]; then
        echo "# ERROR: Failed to authenticate with Vault" >&2
        exit 1
    fi

    # Fetch CouchDB secrets
    local couchdb
    couchdb=$(read_secret "noted/couchdb" "$token")

    echo "export COUCHDB_URI='$(echo "$couchdb" | jq -r '.uri')'"
    echo "export COUCHDB_USER='$(echo "$couchdb" | jq -r '.username')'"
    echo "export COUCHDB_PASSWORD='$(echo "$couchdb" | jq -r '.password')'"
    echo "export COUCHDB_DATABASE='$(echo "$couchdb" | jq -r '.database')'"

    # Fetch Claude OAuth token
    local claude
    claude=$(read_secret "noted/claude" "$token")
    echo "export CLAUDE_CODE_OAUTH_TOKEN='$(echo "$claude" | jq -r '.oauth_token')'"

    # Fetch Livesync passphrase
    local livesync
    livesync=$(read_secret "noted/livesync" "$token")
    echo "export LIVESYNC_PASSPHRASE='$(echo "$livesync" | jq -r '.passphrase')'"
}

main "$@"
```

## Dependencies

- `curl` - HTTP client for Vault API
- `jq` - JSON parsing
- `/etc/vault.d/role-id` - AppRole Role ID file
- `/etc/vault.d/secret-id` - AppRole Secret ID file

## File Permissions

```bash
# vault-env script
-rwxr-xr-x root root /usr/local/bin/vault-env

# Credential files (owned by noted user)
drwx------ noted noted /etc/vault.d/
-rw------- noted noted /etc/vault.d/role-id
-rw------- noted noted /etc/vault.d/secret-id
```

## Error Handling

The script exits with code 1 if:
- Cannot read role-id or secret-id files
- Vault authentication fails
- Cannot fetch secrets from Vault

When sourced with `2>/dev/null || true`, failures are silently ignored and scripts fall back to environment variables or defaults.

## Extending

To add new secrets, modify the main() function:

```bash
# Example: Add a new secret path
local newsecret
newsecret=$(read_secret "noted/newsecret" "$token")
echo "export NEW_VAR='$(echo "$newsecret" | jq -r '.field')'"
```
