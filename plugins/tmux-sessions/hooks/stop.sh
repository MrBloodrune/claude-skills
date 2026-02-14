#!/bin/bash
set -euo pipefail
# tmux-sessions: Notify that this Claude session is stopping.
# Writes a stop event to ~/.claude/tmux-events/.

[ -z "$TMUX" ] && exit 0

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

reason=$(echo "$input" | jq -r '.reason // "unknown"' 2>/dev/null)
ts=$(date +%s)

jq -n \
  --arg event "stop" \
  --arg hash "$session_hash" \
  --arg name "$session_name" \
  --arg reason "$reason" \
  --argjson ts "$ts" \
  '{event: $event, session_hash: $hash, session_name: $name, reason: $reason, timestamp: $ts}' \
  > "$EVENTS_DIR/${ts}-${session_hash}-stop.json"
