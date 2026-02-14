---
name: tmux-dispatch
description: This skill should be used when the user asks to "run this in tmux", "launch a separate session", "dispatch to tmux", "parallel session in tmux", "spawn a tmux session", or wants to delegate work to a separate Claude instance running in tmux.
---

# tmux-dispatch

## Purpose

Delegate long-running tasks (implementation plans, large refactors, multi-file migrations) to a separate Claude session in tmux while keeping the current session free. Handles interactive launch, safe prompt delivery via tmux paste-buffer, and event monitoring.

## Launch Procedure

Follow these steps exactly. Each step matters -- shortcuts cause failures.

### Step 1: Create the tmux session

Create a named tmux session rooted at the project directory:

```bash
tmux new-session -d -s <name> -c <project_dir>
```

- `<name>`: Short, descriptive (e.g., `meshstended`, `auth-refactor`).
- `<project_dir>`: Absolute path to the project root.
- Verify creation with `tmux list-sessions`.

Register the parent session so the dispatched session can notify you when it stops:

```bash
# Record this session as the parent (for stop notification)
tmux display-message -p '#S' > ~/.claude/tmux-sessions/<name>.parent
```

### Step 2: Launch interactive Claude

Start Claude interactively inside the new session:

```bash
tmux send-keys -t <name> "claude" Enter
```

**CRITICAL: NEVER use `claude -p`** -- it exits after one exchange. Follow-up questions or permission prompts go to zsh, not Claude.

Wait 5-8 seconds for Claude to initialize before proceeding.

### Step 3: Send the prompt safely

Write the prompt to a temp file, load it into a tmux buffer, and paste it into the session:

```bash
# Write prompt to a temp file (avoids all shell escaping issues)
cat > /tmp/tmux-prompt-<name>.txt << 'PROMPT'
<your multi-line prompt here>
PROMPT

# Load into tmux buffer and paste into the session
tmux load-buffer /tmp/tmux-prompt-<name>.txt
tmux paste-buffer -t <name>
```

**CRITICAL: NEVER use `tmux send-keys` for multi-line text** -- it mangles quotes, parens, and special chars. The `load-buffer` + `paste-buffer` pattern is the only reliable method.

### Step 4: Submit the prompt

Press Enter to submit the pasted prompt:

```bash
sleep 1
tmux send-keys -t <name> Enter
```

### Step 5: Verify it's running

Capture the pane output after a brief delay to confirm Claude is processing:

```bash
sleep 5
tmux capture-pane -t <name> -p -S -20
```

Expect to see Claude processing (reading files, creating tasks, etc.). If a shell prompt appears instead, Claude exited -- check for errors in the captured output.

### Step 6: Done — notification is automatic

The parent session file you wrote in Step 1 enables automatic notification. When the dispatched session stops, the stop hook will inject a message into this tmux pane telling you it's done. No polling needed.

To check progress manually before it finishes:

```bash
# Activity log (one-liner per tool use)
bash ${CLAUDE_PLUGIN_ROOT}/scripts/event-watcher.sh <name> 1 &
# Or capture the pane directly
tmux capture-pane -t <name> -p -S -30
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `claude -p` | Use interactive `claude` (no flags) |
| Using `send-keys` for the prompt | Use `load-buffer` + `paste-buffer` |
| Not waiting for Claude to init | `sleep 5` after launching claude |
| Sending a reply to a `-p` session | Can't -- it already exited. Relaunch interactively |
| Guessing CLI flags | Check `claude --help` first |

## Sending Follow-Up Messages

To reply when the spawned session asks a question or needs input:

```bash
# Write reply to temp file
echo "Your reply text here" > /tmp/tmux-reply.txt

# Paste into the session
tmux load-buffer /tmp/tmux-reply.txt
tmux paste-buffer -t <name>
sleep 1
tmux send-keys -t <name> Enter
```
