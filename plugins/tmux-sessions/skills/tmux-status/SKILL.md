---
name: tmux-status
description: This skill should be used when the user asks to "check tmux", "session status", "is it done", "tmux progress", "what's happening in tmux", "check on the other session", or wants to monitor the state of Claude sessions running in tmux.
---

# tmux-status

## Purpose

Check on the status of Claude sessions dispatched to tmux. The parent session must actively poll -- there is no automatic callback.

## Answering "Is it done?"

Check the sentinel file first -- this is the fastest and most reliable method:

```bash
cat ~/.claude/tmux-sessions/<name>.done 2>/dev/null
```

If the file exists, the session has stopped. It contains JSON with the stop reason and timestamp.

If no sentinel file exists, check if Claude is still running:

```bash
pane_pid=$(tmux list-panes -t <name> -F '#{pane_pid}' 2>/dev/null)
if [ -n "$pane_pid" ] && pgrep -P "$pane_pid" -f "claude" > /dev/null 2>&1; then
    echo "running"
else
    echo "exited"
fi
```

If exited with no sentinel file, the session may have crashed. Capture the pane to see what happened.

## Checking Progress

### Capture pane output

The most direct way to see what the child is doing right now:

```bash
tmux capture-pane -t <name> -p -S -50
```

### Activity log (event watcher)

One-liner-per-tool-use chronological summary:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/event-watcher.sh <name> 1
```

This prints recent tool uses and exits on stop. Use it for a quick catch-up.

### Event queue (raw)

```bash
# List recent events (newest first)
ls -lt ~/.claude/tmux-events/ 2>/dev/null | head -10

# Read the latest event
cat "$(ls -t ~/.claude/tmux-events/*.json 2>/dev/null | head -1)" 2>/dev/null | jq .
```

## Active Sessions

```bash
# Registered Claude tmux sessions
for f in ~/.claude/tmux-sessions/*.json; do
    [ -f "$f" ] && jq -c '{session: .session_name, project: .project, started: (.started | todate)}' "$f" 2>/dev/null
done

# Cross-reference with live tmux sessions
tmux list-sessions 2>/dev/null
```

## Clean Up

```bash
# Remove old events (older than 1 hour)
find ~/.claude/tmux-events/ -name '*.json' -mmin +60 -delete

# Remove stale sentinel files
rm -f ~/.claude/tmux-sessions/*.done
```

## Event Formats

**Sentinel file** (`<name>.done`):
```json
{"session_name": "meshstended", "reason": "task_complete", "timestamp": 1739487900, "finished": "2025-02-14T01:25:00Z"}
```

**Stop event** (`*-stop.json`):
```json
{"event": "stop", "session_name": "meshstended", "reason": "task_complete", "timestamp": 1739487900}
```

**Tool use event** (`*-tool-*.json`):
```json
{"event": "tool_use", "session_name": "meshstended", "tool": "Write", "input_summary": "src/main.rs", "timestamp": 1739487850}
```
