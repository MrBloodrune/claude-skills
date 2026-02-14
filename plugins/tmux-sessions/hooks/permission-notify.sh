#!/bin/bash
set -euo pipefail
# tmux-sessions: Notify parent session when a dispatched Claude session hits a permission prompt.
# Writes a permission event to ~/.claude/tmux-events/ and pastes a message into the parent tmux session.

[ -z "${TMUX:-}" ] && exit 0

input=$(cat)

EVENTS_DIR="$HOME/.claude/tmux-events"
SESSIONS_DIR="$HOME/.claude/tmux-sessions"
mkdir -p "$EVENTS_DIR"

transcript=$(echo "$input" | jq -r '.transcript_path // empty' 2>/dev/null)
[ -z "$transcript" ] && exit 0

session_hash=$(echo -n "$transcript" | md5sum | awk '{print $1}')

session_name="unknown"
if [ -f "$SESSIONS_DIR/${session_hash}.json" ]; then
    session_name=$(jq -r '.session_name // "unknown"' "$SESSIONS_DIR/${session_hash}.json" 2>/dev/null)
fi

# Extract tool name from notification message (e.g. "Claude needs your permission to use Bash")
message=$(echo "$input" | jq -r '.message // ""' 2>/dev/null)
tool_name=$(echo "$message" | sed -n 's/.*permission to use \(.*\)/\1/p')
[ -z "$tool_name" ] && tool_name="unknown"
ts=$(date +%s)

jq -n \
  --arg event "permission" \
  --arg hash "$session_hash" \
  --arg name "$session_name" \
  --arg tool "$tool_name" \
  --argjson ts "$ts" \
  '{event: $event, session_hash: $hash, session_name: $name, tool: $tool, timestamp: $ts}' \
  > "$EVENTS_DIR/${ts}-${session_hash}-permission.json"

# Notify parent session via tmux if one is registered
parent_file="$SESSIONS_DIR/${session_name}.parent"
if [ -f "$parent_file" ]; then
    parent_session=$(cat "$parent_file")
    if tmux has-session -t "$parent_session" 2>/dev/null; then
        notify_file="/tmp/tmux-notify-${session_name}.txt"
        echo "The tmux session \"${session_name}\" needs permission to use ${tool_name}. Switch to it or reply with instructions." > "$notify_file"
        tmux load-buffer "$notify_file"
        tmux paste-buffer -t "$parent_session"
        sleep 0.5
        tmux send-keys -t "$parent_session" Enter
        rm -f "$notify_file"
    fi
fi
