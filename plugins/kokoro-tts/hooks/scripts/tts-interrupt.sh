#!/bin/bash
# Stops ongoing TTS playback when user submits a new prompt

PORT="${KOKORO_PORT:-6789}"
SERVER="http://127.0.0.1:$PORT"
LOG="/tmp/kokoro-hook.log"

echo "[$(date)] TTS Interrupt hook triggered" >> "$LOG"

input=$(cat)

transcript_path=$(echo "$input" | jq -r '.transcript_path' 2>/dev/null)
transcript_path="${transcript_path/#\~/$HOME}"

if [ -n "$transcript_path" ] && [ "$transcript_path" != "null" ]; then
  session_id=$(echo "$transcript_path" | md5sum | awk '{print $1}')
  curl -s -X POST "$SERVER/interrupt" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg s "$session_id" '{session_id:$s}')" \
    >> "$LOG" 2>&1
  echo "[$(date)] Sent interrupt for session $session_id" >> "$LOG"
else
  curl -s -X POST "$SERVER/interrupt" \
    -H "Content-Type: application/json" \
    -d '{"session_id":"default"}' \
    >> "$LOG" 2>&1
  echo "[$(date)] Sent interrupt for default session" >> "$LOG"
fi

exit 0
