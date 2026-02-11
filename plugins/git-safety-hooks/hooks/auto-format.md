---
event: PostToolUse
match_tool: Write,Edit
---

After a file has been written or edited, automatically format it if it matches a supported file type.

## Formatting Rules

Check the file path of the file that was just written or edited:

### Prettier (web stack)
If the file extension is `.svelte`, `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, or `.json`:
- Run: `npx prettier --write <filepath>`

### Rustfmt (Rust)
If the file extension is `.rs`:
- Run: `rustfmt <filepath>`

## Skip Conditions — do NOT format

Do not run any formatter if the file path contains any of these directory segments:
- `node_modules/`
- `target/`
- `dist/`
- `build/`

## Behavior

- Run the appropriate formatter silently
- If the formatter is not installed or fails, do not treat it as an error — skip quietly
- Only format the single file that was just written or edited, never batch-format
