#!/bin/bash
# Speaks only the TTS_SUMMARY block from Claude's response via kokoro-tts-server

VOICE="${KOKORO_VOICE:-af_sky}"
SPEED="${KOKORO_SPEED:-1.0}"
PORT="${KOKORO_PORT:-6789}"
SERVER="http://127.0.0.1:$PORT"
LOG="/tmp/kokoro-hook.log"
ASSETS_DIR="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}/assets"

echo "[$(date)] Kokoro TTS hook triggered" >> "$LOG"

sleep 1

input=$(cat)

if ! echo "$input" | jq -e . >/dev/null 2>&1; then
  echo "[$(date)] Invalid JSON input, exiting" >> "$LOG"
  exit 0
fi

transcript_path=$(echo "$input" | jq -r '.transcript_path')
transcript_path="${transcript_path/#\~/$HOME}"

if [ ! -f "$transcript_path" ]; then
  echo "[$(date)] Transcript file not found: $transcript_path" >> "$LOG"
  exit 0
fi

# Derive session ID from transcript path
session_id=$(echo "$transcript_path" | md5sum | awk '{print $1}')

# Health check - verify server is alive before proceeding
if ! curl -sf --max-time 1 "$SERVER/health" >/dev/null 2>&1; then
  echo "[$(date)] ERROR: Kokoro server not responding" >> "$LOG"
  paplay "$ASSETS_DIR/error.wav" 2>/dev/null &
  exit 0
fi

# Extract Claude's last response from the transcript
seen_tool_result=0
claude_response=""
while IFS= read -r line; do
  message_type=$(echo "$line" | jq -r '.type' 2>/dev/null)

  if [ "$message_type" = "tool_result" ]; then
    seen_tool_result=1
  fi

  if [ "$message_type" = "assistant" ]; then
    TEXT=$(echo "$line" | jq -r '.message.content[]? | select(.type == "text") | .text' 2>/dev/null | tr '\n' ' ')

    if [ -n "$TEXT" ]; then
      if [ "$seen_tool_result" != "1" ]; then
        claude_response="$TEXT"
        break
      fi
    fi
  fi
done < <(tac "$transcript_path")

if [ -z "$claude_response" ]; then
  echo "[$(date)] No response found" >> "$LOG"
  exit 0
fi

# Check for TTS_SUMMARY - play coin sound if missing
if ! echo "$claude_response" | grep -q "<!-- TTS_SUMMARY"; then
  echo "[$(date)] No TTS_SUMMARY found, playing coin" >> "$LOG"
  paplay "$ASSETS_DIR/coin.wav" 2>/dev/null &
  exit 0
fi

# Extract last TTS_SUMMARY block (responses may mention the marker in explanation text)
tts_summary=$(echo "$claude_response" | awk '
  {
    s = $0
    last_content = ""
    while (1) {
      start = index(s, "<!-- TTS_SUMMARY")
      if (start == 0) break
      rest = substr(s, start + 16)
      end = index(rest, "TTS_SUMMARY -->")
      if (end > 0) {
        content = substr(rest, 1, end - 1)
        gsub(/^[[:space:]]+/, "", content)
        gsub(/[[:space:]]+$/, "", content)
        last_content = content
        s = substr(rest, end + 15)
      } else {
        break
      }
    }
    if (last_content != "") print last_content
  }
')

if [ -z "$tts_summary" ]; then
  echo "[$(date)] TTS_SUMMARY marker found but empty, playing coin" >> "$LOG"
  paplay "$ASSETS_DIR/coin.wav" 2>/dev/null &
  exit 0
fi

# Send to persistent TTS server
preview="${tts_summary:0:40}"
echo "[$(date)] Speaking: \"${preview}...\" (${#tts_summary} chars)" >> "$LOG"

response=$(curl -s -X POST "$SERVER/speak" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg t "$tts_summary" --arg s "$session_id" \
    --arg v "$VOICE" --argjson sp "$SPEED" \
    '{text:$t, session_id:$s, voice:$v, speed:$sp}')" \
  2>&1)

status=$(echo "$response" | jq -r '.status' 2>/dev/null)
echo "[$(date)] Server response: $status" >> "$LOG"

exit 0
