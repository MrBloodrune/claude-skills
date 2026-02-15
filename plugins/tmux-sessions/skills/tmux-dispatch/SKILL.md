---
name: tmux-dispatch
description: This skill should be used when the user asks to "run this in tmux", "launch a separate session", "dispatch to tmux", "parallel session in tmux", "spawn a tmux session", or wants to delegate work to a separate Claude instance running in tmux.
---

# tmux-dispatch

## Purpose

Delegate long-running tasks (implementation plans, large refactors, multi-file migrations) to a separate Claude session running in a new Kitty window with tmux. The parent session dispatches work, then **waits** -- monitoring progress passively until the child completes.

## Ownership Model

**The child session owns all file operations.** Once you dispatch a task, the parent session must NOT read, write, or edit any files the child might be working on. Two sessions touching the same files causes conflicts -- edits overwrite each other, reads see stale state, and both sessions make bad decisions based on wrong data.

**Parent session role: dispatch and monitor only.**
- Launch the child, send it a prompt, then hands off.
- Poll periodically to confirm the child is still working (not stalled or crashed).
- Wait for the sentinel file indicating completion.
- Only after the child is done should you inspect results, review changes, or take further action on those files.

**Do NOT:**
- Read project files "to check how it's going" -- use pane capture instead.
- Make "small fixes" while the child is running.
- Start working on related files in the same project concurrently.

## Architecture

- **Parent session**: Your current Claude session (not in tmux). Dispatches, monitors, and reviews after completion.
- **Child session**: Claude running inside tmux in a separate Kitty window. Owns all file operations until it finishes.
- **Communication**: One-way via filesystem. Child writes events to `~/.claude/tmux-events/` and a sentinel file to `~/.claude/tmux-sessions/<name>.done` on completion. Parent polls to check progress.

There is **no automatic callback** into the parent session. You must actively poll for completion.

## Launch Procedure

Follow these steps exactly. Each step matters -- shortcuts cause failures.

### Step 1: Create the tmux session in a new Kitty window

Create a detached tmux session, then attach it in a new Kitty window:

```bash
tmux new-session -d -s <name> -c <project_dir>
kitty sh -c "tmux attach -t <name>" &
```

- `<name>`: Short, descriptive (e.g., `meshstended`, `auth-refactor`).
- `<project_dir>`: Absolute path to the project root.
- **Must** create detached first, then attach in the new window.
- **Do NOT use `--single-instance`** -- it drops command args when an existing Kitty instance is running.
- **Must** use `sh -c "tmux attach -t <name>"`, not bare `tmux attach`.
- Verify creation with `tmux list-sessions`.

### Step 2: Launch interactive Claude

Start Claude interactively inside the new session. The `CLAUDECODE` env var must be unset first -- it's inherited from the parent and blocks nested launches:

```bash
tmux send-keys -t <name> "unset CLAUDECODE && claude --dangerously-skip-permissions" Enter
```

**CRITICAL: NEVER use `claude -p`** -- it exits after one exchange. Follow-up questions go to zsh, not Claude.

Wait 12 seconds, then verify Claude has fully initialized by capturing the pane:

```bash
sleep 12
tmux capture-pane -t <name> -p -S -10
```

Look for the Claude Code banner (version, model, project path). If you see only a shell prompt, Claude failed to start -- check the captured output for errors and retry.

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

### Step 6: Start background polling

After confirming the child is running, start a background poll that watches for completion and verifies the child hasn't stalled. This is your only monitoring mechanism -- do NOT read project files to check progress.

```bash
# Poll every 60 seconds, writing the latest pane state to a log file
while true; do
  if [ -f ~/.claude/tmux-sessions/<name>.done ]; then
    echo "=== SESSION COMPLETE $(date) ===" >> /tmp/tmux-poll-<name>.log
    cat ~/.claude/tmux-sessions/<name>.done >> /tmp/tmux-poll-<name>.log
    break
  fi
  echo "=== POLL $(date) ===" >> /tmp/tmux-poll-<name>.log
  tmux capture-pane -t <name> -p -S -30 >> /tmp/tmux-poll-<name>.log 2>/dev/null
  sleep 60
done
```

Run this as a background Bash command (`run_in_background: true`). Choose the poll interval based on expected task duration -- 30-60 seconds for most tasks, longer for multi-hour work.

The poll serves two purposes:
1. **Detect completion** -- the sentinel file check.
2. **Detect stalls** -- if the pane output is identical across multiple polls, the child may be stuck. Investigate via pane capture, not by opening project files.

### Step 7: Wait for completion

**After dispatching, your job is to wait.** Do not start working on the same project. Tell the user the child is running and offer to check on it periodically or when asked.

**Check if the session is done:**

```bash
# Sentinel file is written by the child's stop hook
cat ~/.claude/tmux-sessions/<name>.done 2>/dev/null
```

If the file exists, the child has stopped. Its contents include the stop reason and timestamp.

**Check the poll log for progress:**

```bash
# Read recent poll captures
tail -80 /tmp/tmux-poll-<name>.log
```

**Manual spot check (pane capture only -- do NOT read project files):**

```bash
# Capture recent pane output directly
tmux capture-pane -t <name> -p -S -30

# Or scan the event log for a quick summary
bash ${CLAUDE_PLUGIN_ROOT}/scripts/event-watcher.sh <name> 1
```

### Step 8: Review after completion

Only after the sentinel file confirms the child is done should you:
- Read project files to inspect what changed
- Run tests or linters to verify the work
- Report results to the user
- Take follow-up actions on those files

**IMPORTANT:** Do not assume the child succeeded -- verify by reviewing the actual changes and running relevant checks.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `claude -p` | Use interactive `claude --dangerously-skip-permissions` |
| Using `send-keys` for the prompt | Use `load-buffer` + `paste-buffer` |
| Not waiting for Claude to init | `sleep 12` then capture pane to verify banner |
| Not unsetting `CLAUDECODE` | Prefix with `unset CLAUDECODE &&` -- inherited env blocks nested launches |
| Using `kitty --single-instance` | Drops command args when existing Kitty is running. Use `kitty sh -c "..."` instead |
| Reading/editing project files while child runs | Use pane capture to monitor. Only touch files after the child is done |
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
