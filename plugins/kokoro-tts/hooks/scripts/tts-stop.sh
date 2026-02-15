#!/bin/bash
# Kokoro TTS v3 — weighted communication router
# Parses TTS_RESPONSE weight, applies KOKORO_MODE ceiling, routes to speech/sound/silence

VOICE="${KOKORO_VOICE:-af_sky}"
SPEED="${KOKORO_SPEED:-1.0}"
PORT="${KOKORO_PORT:-6789}"
MODE="${KOKORO_MODE:-brief}"
SERVER="http://127.0.0.1:$PORT"
LOG="/tmp/kokoro-hook.log"
ASSETS_DIR="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}/assets"

echo "[$(date)] Kokoro TTS hook triggered (mode=$MODE)" >> "$LOG"

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

session_id=$(echo "$transcript_path" | md5sum | awk '{print $1}')

# Health check
if ! curl -sf --max-time 1 "$SERVER/health" >/dev/null 2>&1; then
  echo "[$(date)] ERROR: Kokoro server not responding" >> "$LOG"
  paplay "$ASSETS_DIR/error.wav" 2>/dev/null &
  exit 0
fi

# Extract all assistant text from the current turn (scan backwards, stop at user prompt)
claude_response=$(tac "$transcript_path" | python3 -c '
import sys, json
collected = []
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
    except:
        continue
    t = obj.get("type", "")
    # Stop at a real user prompt (not tool_result which is mid-turn)
    if t == "user":
        content = obj.get("content", obj.get("message", {}).get("content", []))
        is_tool_result = isinstance(content, list) and all(c.get("type") == "tool_result" for c in content)
        if not is_tool_result:
            break
    if t == "assistant":
        texts = [c["text"] for c in obj.get("message", {}).get("content", []) if c.get("type") == "text" and c.get("text", "").strip()]
        if texts:
            collected.append(" ".join(texts))
if collected:
    # Reverse since we scanned backwards, join all fragments
    print(" ".join(reversed(collected)))
' 2>/dev/null)

if [ -z "$claude_response" ]; then
  echo "[$(date)] No response found" >> "$LOG"
  exit 0
fi

# Parse TTS_RESPONSE or legacy TTS_SUMMARY
# Priority: TTS_RESPONSE (new format) > TTS_SUMMARY (legacy)
parsed=$(echo "$claude_response" | python3 -c '
import sys, re

text = sys.stdin.read()

# Try TTS_RESPONSE (new format) -- find last occurrence
# Two patterns: self-closing (sounds/silent) and multiline (speech with content)
matches = list(re.finditer(r"<!--\s*TTS_RESPONSE\s+weight=\"([^\"]+)\"\s*\n([\s\S]*?)\nTTS_RESPONSE\s*-->", text))
if not matches:
    matches = list(re.finditer(r"<!--\s*TTS_RESPONSE\s+weight=\"([^\"]+)\"\s*-->", text))
if matches:
    m = matches[-1]
    weight = m.group(1)
    content = (m.group(2).strip() if m.lastindex >= 2 else "")
    print(f"weight={weight}")
    if content:
        print(f"content={content}")
    sys.exit(0)

# Try legacy TTS_SUMMARY -- find last occurrence
matches = list(re.finditer(r"<!--\s*TTS_SUMMARY\s*\n([\s\S]*?)\nTTS_SUMMARY\s*-->", text))
if matches:
    content = matches[-1].group(1).strip()
    if content:
        print("weight=speech")
        print(f"content={content}")
        sys.exit(0)

# Nothing found
print("weight=none")
' 2>/dev/null)

weight=$(echo "$parsed" | head -1 | sed 's/^weight=//')
content=$(echo "$parsed" | tail -n +2 | sed 's/^content=//')

echo "[$(date)] Parsed: weight=$weight content_len=${#content}" >> "$LOG"

if [ "$weight" = "none" ]; then
  echo "[$(date)] No TTS block found, playing coin" >> "$LOG"
  paplay "$ASSETS_DIR/coin.wav" 2>/dev/null &
  exit 0
fi

# Weight hierarchy for ceiling comparison
weight_rank() {
  case "$1" in
    silent)          echo 0 ;;
    sound:working)   echo 1 ;;
    sound:done)      echo 2 ;;
    sound:attention) echo 3 ;;
    speech)          echo 4 ;;
    *)               echo 0 ;;
  esac
}

# Mode ceiling (max allowed weight)
mode_ceiling() {
  case "$1" in
    quiet)          echo 0 ;;  # silent only
    ambient)        echo 3 ;;  # up to sound:attention
    brief)          echo 4 ;;  # up to speech
    conversational) echo 4 ;;  # up to speech
    verbose)        echo 4 ;;  # up to speech
    *)              echo 4 ;;  # default: brief
  esac
}

w_rank=$(weight_rank "$weight")
m_ceil=$(mode_ceiling "$MODE")

# Downgrade if weight exceeds ceiling
if [ "$w_rank" -gt "$m_ceil" ]; then
  case "$m_ceil" in
    0) weight="silent" ;;
    1) weight="sound:working" ;;
    2) weight="sound:done" ;;
    3) weight="sound:attention" ;;
  esac
  echo "[$(date)] Downgraded to $weight (mode=$MODE ceiling=$m_ceil)" >> "$LOG"
fi

# Route
case "$weight" in
  silent)
    echo "[$(date)] Silent -- no output" >> "$LOG"
    ;;
  sound:working)
    echo "[$(date)] Playing working tick" >> "$LOG"
    paplay "$ASSETS_DIR/working.wav" 2>/dev/null &
    ;;
  sound:done)
    echo "[$(date)] Playing done chime" >> "$LOG"
    paplay "$ASSETS_DIR/done.wav" 2>/dev/null &
    ;;
  sound:attention)
    echo "[$(date)] Playing attention ping" >> "$LOG"
    paplay "$ASSETS_DIR/attention.wav" 2>/dev/null &
    ;;
  speech)
    if [ -z "$content" ]; then
      echo "[$(date)] Speech weight but no content, playing done" >> "$LOG"
      paplay "$ASSETS_DIR/done.wav" 2>/dev/null &
    else
      preview="${content:0:40}"
      echo "[$(date)] Speaking: \"${preview}...\" (${#content} chars)" >> "$LOG"
      response=$(curl -s -X POST "$SERVER/speak" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg t "$content" --arg s "$session_id" \
          --arg v "$VOICE" --argjson sp "$SPEED" \
          '{text:$t, session_id:$s, voice:$v, speed:$sp}')" \
        2>&1)
      status=$(echo "$response" | jq -r '.status' 2>/dev/null)
      echo "[$(date)] Server response: $status" >> "$LOG"
    fi
    ;;
esac

exit 0
