---
name: tmux-status
description: This skill should be used when the user asks to "check tmux", "session status", "is it done", "tmux progress", "what's happening in tmux", "check on the other session", or wants to monitor the state of Claude sessions running in tmux.
---

# tmux-status

## Purpose

Check on the status of Claude sessions dispatched to tmux. Provides methods for reading the event queue, listing active sessions, capturing pane output, and determining whether a session has completed.

## How to Check

### Quick status: Read event queue

```bash
# List recent events (newest first)
ls -lt ~/.claude/tmux-events/ 2>/dev/null | head -10

# Read the latest event
cat "$(ls -t ~/.claude/tmux-events/*.json 2>/dev/null | head -1)" 2>/dev/null | jq .

# Show all stop events (completions)
for f in ~/.claude/tmux-events/*-stop.json; do
    [ -f "$f" ] && jq -c '{session: .session_name, reason: .reason, time: (.timestamp | todate)}' "$f" 2>/dev/null
done
```

### Active sessions

```bash
# Registered Claude tmux sessions
for f in ~/.claude/tmux-sessions/*.json; do
    [ -f "$f" ] && jq -c '{session: .session_name, project: .project, started: (.started | todate)}' "$f" 2>/dev/null
done

# Cross-reference with live tmux sessions
tmux list-sessions 2>/dev/null
```

### Read a session's current output

```bash
tmux capture-pane -t <session_name> -p -S -50
```

### Check if Claude is still running

```bash
pane_pid=$(tmux list-panes -t <session_name> -F '#{pane_pid}' 2>/dev/null)
if [ -n "$pane_pid" ] && pgrep -P "$pane_pid" -f "claude" > /dev/null 2>&1; then
    echo "running"
else
    echo "exited"
fi
```

### Clean up old events

```bash
find ~/.claude/tmux-events/ -name '*.json' -mmin +60 -delete
```

## Event Formats

**Stop event** (`*-stop.json`):
```json
{"event": "stop", "session_name": "meshstended", "reason": "task_complete", "timestamp": 1739487900}
```

**Tool use event** (`*-tool.json`):
```json
{"event": "tool_use", "session_name": "meshstended", "tool": "Write", "input_summary": "MeshstendedTypes.h", "timestamp": 1739487850}
```

## Answering "Is it done?"

1. Check for stop events: `ls ~/.claude/tmux-events/*-stop.json 2>/dev/null`
2. If no stop event, check if claude is still running (pgrep method above)
3. If running, capture pane output to see current progress
4. If exited with no stop event, check tmux pane for errors
