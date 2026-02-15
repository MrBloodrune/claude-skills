---
name: tmux-dispatch
description: This skill should be used when the user asks to "run this in tmux", "launch a separate session", "dispatch to tmux", "parallel session in tmux", "spawn a tmux session", or wants to delegate work to a separate Claude instance running in tmux.
---

# tmux-dispatch

## Purpose

Delegate long-running tasks (implementation plans, large refactors, multi-file migrations) to a separate Claude session running in a new Kitty window with tmux. The parent session acts as the senior engineer -- it dispatches work, monitors progress via file-based events and pane capture, and checks results when done.

## Architecture

- **Parent session**: Your current Claude session (not in tmux). Dispatches and monitors.
- **Child session**: Claude running inside tmux in a separate Kitty window. Does the work autonomously.
- **Communication**: One-way via filesystem. Child writes events to `~/.claude/tmux-events/` and a sentinel file to `~/.claude/tmux-sessions/<name>.done` on completion. Parent polls to check progress.

There is **no automatic callback** into the parent session. You must actively check on the child.

## Launch Procedure

Follow these steps exactly. Each step matters -- shortcuts cause failures.

### Step 1: Create the tmux session in a new Kitty window

Create a named tmux session inside a new Kitty terminal window:

```bash
kitty --single-instance tmux new-session -d -s <name> -c <project_dir>
```

- `<name>`: Short, descriptive (e.g., `meshstended`, `auth-refactor`).
- `<project_dir>`: Absolute path to the project root.
- This opens a new Kitty OS window with the tmux session attached.
- Verify creation with `tmux list-sessions`.

### Step 2: Launch interactive Claude

Start Claude interactively inside the new session:

```bash
tmux send-keys -t <name> "claude --dangerously-skip-permissions" Enter
```

**CRITICAL: NEVER use `claude -p`** -- it exits after one exchange. Follow-up questions go to zsh, not Claude.

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

### Step 6: Monitor and check completion

There is no automatic callback. You must poll for completion.

**Check if the session is done:**

```bash
# Sentinel file is written by the child's stop hook
cat ~/.claude/tmux-sessions/<name>.done 2>/dev/null
```

If the file exists, the child has stopped. Its contents include the stop reason and timestamp.

**Check progress while running:**

```bash
# Capture recent pane output
tmux capture-pane -t <name> -p -S -30

# Or scan the event log for a quick summary
bash ${CLAUDE_PLUGIN_ROOT}/scripts/event-watcher.sh <name> 1
```

**IMPORTANT:** As the senior session, you should check on the child periodically or when the user asks. Don't assume it succeeded -- verify by reading the pane output or sentinel file.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `claude -p` | Use interactive `claude --dangerously-skip-permissions` |
| Using `send-keys` for the prompt | Use `load-buffer` + `paste-buffer` |
| Not waiting for Claude to init | `sleep 5` after launching claude |
| Assuming automatic notification | Poll the sentinel file or capture the pane |
| Sending a reply to a `-p` session | Can't -- it already exited. Relaunch interactively |

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
