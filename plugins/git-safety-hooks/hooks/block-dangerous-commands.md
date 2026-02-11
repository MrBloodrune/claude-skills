---
event: PreToolUse
match_tool: Bash
---

Evaluate the command about to be executed. BLOCK the command if it matches any of the following dangerous patterns:

## Dangerous Git Commands — BLOCK these

- `git push --force` or `git push -f` (any branch — use `--force-with-lease` instead)
- `git reset --hard`
- `git clean -f` or `git clean -fd` or any `git clean` with `-f` flag
- `git checkout .` (discards all working tree changes)
- `git restore .` (discards all working tree changes)
- `git branch -D` (force-deletes a branch without merge check)
- `git rebase` when the target is `main` or `master` (e.g. `git rebase main`, `git rebase origin/main`, `git rebase master`, `git rebase origin/master`)

## Dangerous rm Commands — BLOCK these

- `rm -rf /` (root filesystem)
- `rm -rf ~` or `rm -rf $HOME` (home directory)
- `rm -rf .` (current directory)
- `rm -rf` on any path with fewer than 3 directory components (e.g. `rm -rf /usr` or `rm -rf ~/Documents` — too broad)

## ALLOWED — do NOT block these

- Normal `git push` (without `--force` or `-f`)
- `git push --force-with-lease` (safe force push)
- `git branch -d` (safe delete, checks merge status)
- `git rebase` on feature branches (not main/master)
- `rm -rf` on build artifact directories: paths containing `node_modules`, `target`, `dist`, `build`, `.cache`, `tmp`, or `__pycache__`
- `rm -rf` on paths with 3+ directory components (e.g. `rm -rf ./src/old/module`)

## Response format

If the command is dangerous:
- BLOCK the command
- Explain exactly which dangerous pattern was matched
- Suggest a safer alternative

If the command is safe, ALLOW it without comment.
