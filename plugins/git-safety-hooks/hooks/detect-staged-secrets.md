---
event: PreToolUse
match_tool: Bash
---

If the command being executed is a `git commit` command, evaluate whether staged files may contain secrets or credentials. If the command is not a `git commit`, ALLOW it without comment.

For `git commit` commands, check the staged diff (`git diff --cached`) for the following secret patterns:

## Secret Patterns — BLOCK if found

### API Keys and Tokens
- AWS access keys: strings starting with `AKIA`
- GitHub tokens: strings starting with `ghp_` or `gho_`
- GitLab tokens: strings starting with `glpat-`
- Stripe keys: strings starting with `sk_live_`, `sk_test_`, `pk_live_`, `pk_test_`
- Generic API key assignments: lines matching `api_key`, `apikey`, `api-key`, `API_KEY` followed by `=` or `:` and a quoted or unquoted value that looks like a real key (not a placeholder like `your-api-key-here`)

### Private Keys
- Lines containing `-----BEGIN` followed by `PRIVATE KEY-----` (RSA, EC, ED25519, OpenSSH private keys)
- Lines containing `-----BEGIN PGP PRIVATE KEY BLOCK-----`

### Credentials in Config Files
- Files named `.env`, `.env.*`, `credentials`, `credentials.*`, or containing `secret` in the filename with password/token/key assignments that have real values (not empty or placeholder)
- Connection strings containing embedded passwords: `://user:password@`, `mongodb+srv://`, `postgres://`, `mysql://`, `redis://` with credentials

### OAuth / Bearer Tokens
- Lines containing `Bearer ` followed by a long token string (20+ characters)
- Lines containing `oauth_token`, `access_token`, or `refresh_token` with assigned values

## ALLOWED — do NOT block these

- Placeholder values like `your-api-key-here`, `TODO`, `CHANGEME`, `xxx`, `***`, `<token>`, `${VAR}`, environment variable references
- Comments explaining token formats
- Test fixtures with obviously fake keys
- Documentation about secret patterns

## Response format

If a potential secret is detected:
- BLOCK the commit
- Identify the specific pattern matched and the file it was found in
- Recommend removing the secret and using environment variables or a secrets manager instead

If no secrets are detected, ALLOW the commit without comment.
