---
name: tmux-status
description: This skill should be used when the user asks to "check tmux", "session status", "is it done", "tmux progress", "what's happening in tmux", "check on the other session", or wants to monitor the state of Claude sessions running in tmux.
---

# tmux-status

## Purpose

Quick manual spot-checks on dispatched sessions. Use this when the user asks about session status outside of the normal monitoring loop handled by tmux-dispatch.

## Is It Done?

Check if Claude is still running in the session:

```bash
pane_pid=$(tmux list-panes -t <name> -F '#{pane_pid}' 2>/dev/null)
if [ -n "$pane_pid" ] && pgrep -P "$pane_pid" -f "claude" > /dev/null 2>&1; then
    echo "running"
else
    echo "exited"
fi
```

If exited, capture the pane to see what happened:

```bash
tmux capture-pane -t <name> -p -S -50
```

## What's It Doing?

Capture current pane output:

```bash
tmux capture-pane -t <name> -p -S -50
```

## Session Exists?

```bash
tmux has-session -t <name> 2>/dev/null && echo "exists" || echo "gone"
```

## List All Sessions

```bash
tmux list-sessions 2>/dev/null
```

## Active Registrations

List Claude sessions registered by the session-start hook:

```bash
for f in ~/.claude/tmux-sessions/*.json; do
    [ -f "$f" ] && jq -c '{session: .session_name, project: .project, started: (.started | todate)}' "$f" 2>/dev/null
done
```
