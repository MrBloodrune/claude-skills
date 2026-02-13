#!/bin/bash
# Speaks only the TTS_SUMMARY block from Claude's response via kokoro-tts

VOICE="${KOKORO_VOICE:-af_sky}"
MODEL_DIR="${KOKORO_MODEL_DIR:-$HOME/.local/share/kokoro-tts}"
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"
LOG="/tmp/kokoro-hook.log"

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

# Only speak if TTS_SUMMARY is present -- skip entirely otherwise
if ! echo "$claude_response" | grep -q "<!-- TTS_SUMMARY"; then
  echo "[$(date)] No TTS_SUMMARY found, skipping TTS" >> "$LOG"
  exit 0
fi

tts_summary=$(echo "$claude_response" | awk '
  {
    start = index($0, "<!-- TTS_SUMMARY")
    if (start > 0) {
      rest = substr($0, start + 16)
      end = index(rest, "TTS_SUMMARY -->")
      if (end > 0) {
        content = substr(rest, 1, end - 1)
        gsub(/^[[:space:]]+/, "", content)
        gsub(/[[:space:]]+$/, "", content)
        print content
      }
    }
  }
')

if [ -z "$tts_summary" ]; then
  echo "[$(date)] TTS_SUMMARY marker found but empty, skipping" >> "$LOG"
  exit 0
fi

echo "[$(date)] Speaking TTS_SUMMARY (${#tts_summary} chars)" >> "$LOG"
echo "[$(date)] TTS_SUMMARY content: $tts_summary" >> "$LOG"

# Strip markdown artifacts
tts_summary=$(echo "$tts_summary" | uv run --project "$PLUGIN_DIR/scripts" python "$PLUGIN_DIR/scripts/strip_markdown.py" 2>>"$LOG" || echo "$tts_summary")

if pkill -9 kokoro-tts 2>/dev/null; then
  echo "[$(date)] Killed existing kokoro-tts process" >> "$LOG"
fi

tmpfile=$(mktemp /tmp/kokoro-input.XXXXXX)
chmod 600 "$tmpfile"
echo "$tts_summary" > "$tmpfile"

(
  kokoro-tts "$tmpfile" --voice "$VOICE" --stream --model "$MODEL_DIR/kokoro-v1.0.onnx" --voices "$MODEL_DIR/voices-v1.0.bin" >>"$LOG" 2>&1
  rm -f "$tmpfile"
) &

exit 0
