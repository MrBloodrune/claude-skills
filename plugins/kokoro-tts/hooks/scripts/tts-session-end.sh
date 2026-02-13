#!/bin/bash
# Cleanup TTS session tracking on session end

PORT="${KOKORO_PORT:-6789}"
SERVER="http://127.0.0.1:$PORT"
LOG="/tmp/kokoro-hook.log"

input=$(cat)

session_id=$(echo "$input" | jq -r '.session_id')
reason=$(echo "$input" | jq -r '.reason')
transcript_path=$(echo "$input" | jq -r '.transcript_path' 2>/dev/null)
transcript_path="${transcript_path/#\~/$HOME}"

echo "[$(date)] SessionEnd hook: session $session_id (reason: $reason)" >> "$LOG"

if [ -n "$transcript_path" ] && [ "$transcript_path" != "null" ]; then
  kokoro_session=$(echo "$transcript_path" | md5sum | awk '{print $1}')
else
  kokoro_session="default"
fi

curl -s -X POST "$SERVER/cleanup" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg s "$kokoro_session" '{session_id:$s}')" \
  >> "$LOG" 2>&1

echo "[$(date)] Session cleanup completed" >> "$LOG"

exit 0
