#!/bin/bash
set -euo pipefail
# tmux-sessions: Log tool use events for monitoring.
# Only logs tools that commonly need approval (Write, Edit, Bash).
# Async hook -- does not block tool execution.

[ -z "${TMUX:-}" ] && exit 0

input=$(cat)

EVENTS_DIR="$HOME/.claude/tmux-events"
SESSIONS_DIR="$HOME/.claude/tmux-sessions"
mkdir -p "$EVENTS_DIR"

transcript=$(echo "$input" | jq -r '.transcript_path // empty' 2>/dev/null)
[ -z "$transcript" ] && exit 0

session_hash=$(echo -n "$transcript" | md5sum | awk '{print $1}')

tool_name=$(echo "$input" | jq -r '.tool_name // empty' 2>/dev/null)

case "$tool_name" in
    Write|Edit|Bash|NotebookEdit) ;;
    *) exit 0 ;;
esac

case "$tool_name" in
    Write|Edit)
        input_summary=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
        ;;
    Bash)
        input_summary=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null | head -c 80)
        ;;
    *)
        input_summary=""
        ;;
esac

session_name="unknown"
if [ -f "$SESSIONS_DIR/${session_hash}.json" ]; then
    session_name=$(jq -r '.session_name // "unknown"' "$SESSIONS_DIR/${session_hash}.json" 2>/dev/null)
fi

ts=$(date +%s)

jq -n \
  --arg event "tool_use" \
  --arg hash "$session_hash" \
  --arg name "$session_name" \
  --arg tool "$tool_name" \
  --arg summary "$input_summary" \
  --argjson ts "$ts" \
  '{event: $event, session_hash: $hash, session_name: $name, tool: $tool, input_summary: $summary, timestamp: $ts}' \
  > "$EVENTS_DIR/${ts}-${session_hash}-tool-${RANDOM}.json"
