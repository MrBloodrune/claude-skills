#!/bin/bash
# Kokoro TTS v3 — weighted communication router
# Parses TTS_RESPONSE weight, applies KOKORO_MODE ceiling, routes to speech/sound/silence

VOICE="${KOKORO_VOICE:-af_sky}"
SPEED="${KOKORO_SPEED:-1.0}"
PORT="${KOKORO_PORT:-6789}"
MODE="${KOKORO_MODE:-brief}"
SERVER="http://127.0.0.1:$PORT"
LOG="/tmp/kokoro-hook.log"

MUTE_FILE="${XDG_RUNTIME_DIR:-/tmp}/kokoro-muted"

echo "[$(date)] Kokoro TTS hook triggered (mode=$MODE)" >> "$LOG"

# Check mute state before doing anything
if [ -f "$MUTE_FILE" ]; then
  echo "[$(date)] Muted -- skipping all audio" >> "$LOG"
  exit 0
fi

input=$(cat)

# Brief delay to ensure transcript is fully flushed before reading
sleep 1

if ! echo "$input" | jq -e . >/dev/null 2>&1; then
  echo "[$(date)] Invalid JSON input, exiting" >> "$LOG"
  exit 0
fi

echo "[$(date)] Input keys: $(echo "$input" | jq -r 'keys | join(", ")')" >> "$LOG"

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
  # Output hook message -- server is down, can't play sounds through it
  PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"
  cat <<EOF
{"hookResponse": {"message": "Kokoro TTS server is not responding on port $PORT.\n\nCheck: curl $SERVER/health\nRestart: nohup uv run --project $PLUGIN_DIR/server python $PLUGIN_DIR/server/kokoro_server.py >> /tmp/kokoro-hook.log 2>&1 &"}}
EOF
  exit 0
fi

# Extract all assistant text from the current turn (scan backwards, stop at user prompt)
# Also detect intermediate stops (last assistant entry has tool_use = more turns coming)
claude_response=$(tac "$transcript_path" | python3 -c '
import sys, json
collected = []
last_assistant_has_tool_use = False
first_assistant = True
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
    except:
        continue
    t = obj.get("type", "")
    # Skip non-conversation entries
    if t not in ("user", "assistant"):
        continue
    # Stop at a real user prompt (not tool_result which is mid-turn)
    if t == "user":
        content = obj.get("content", obj.get("message", {}).get("content", []))
        is_tool_result = isinstance(content, list) and all(c.get("type") == "tool_result" for c in content)
        if not is_tool_result:
            break
    if t == "assistant":
        msg_content = obj.get("message", {}).get("content", [])
        content_types = {c.get("type") for c in msg_content}
        # Track if the most recent assistant entry has tool_use (intermediate stop)
        if first_assistant:
            last_assistant_has_tool_use = "tool_use" in content_types
            first_assistant = False
        texts = [c["text"] for c in msg_content if c.get("type") == "text" and c.get("text", "").strip()]
        if texts:
            collected.append(" ".join(texts))
# If the last assistant entry was a tool_use, this is an intermediate stop
if last_assistant_has_tool_use:
    print("__INTERMEDIATE__")
    sys.exit(0)
if collected:
    # Reverse since we scanned backwards, join all fragments
    print(" ".join(reversed(collected)))
' 2>/dev/null)

# Intermediate stop -- play working tick (suppressed in quiet mode)
if [ "$claude_response" = "__INTERMEDIATE__" ]; then
  echo "[$(date)] Intermediate stop detected" >> "$LOG"
  if [ "$MODE" != "quiet" ]; then
    echo "[$(date)] Playing working tick (intermediate)" >> "$LOG"
    curl -s -X POST "$SERVER/play-sound" -H "Content-Type: application/json" -d "{\"sound\":\"working\",\"session_id\":\"$session_id\"}" >/dev/null 2>&1 &
  else
    echo "[$(date)] Intermediate tick suppressed (quiet mode)" >> "$LOG"
  fi
  exit 0
fi

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
  echo "[$(date)] No TTS block found, playing error" >> "$LOG"
  curl -s -X POST "$SERVER/play-sound" -H "Content-Type: application/json" -d "{\"sound\":\"error\",\"session_id\":\"$session_id\"}" >/dev/null 2>&1 &
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
    curl -s -X POST "$SERVER/play-sound" -H "Content-Type: application/json" -d "{\"sound\":\"working\",\"session_id\":\"$session_id\"}" >/dev/null 2>&1 &
    ;;
  sound:done)
    echo "[$(date)] Playing done chime" >> "$LOG"
    curl -s -X POST "$SERVER/play-sound" -H "Content-Type: application/json" -d "{\"sound\":\"done\",\"session_id\":\"$session_id\"}" >/dev/null 2>&1 &
    ;;
  sound:attention)
    echo "[$(date)] Playing attention ping" >> "$LOG"
    curl -s -X POST "$SERVER/play-sound" -H "Content-Type: application/json" -d "{\"sound\":\"attention\",\"session_id\":\"$session_id\"}" >/dev/null 2>&1 &
    ;;
  speech)
    if [ -z "$content" ]; then
      echo "[$(date)] Speech weight but no content, playing done" >> "$LOG"
      curl -s -X POST "$SERVER/play-sound" -H "Content-Type: application/json" -d "{\"sound\":\"done\",\"session_id\":\"$session_id\"}" >/dev/null 2>&1 &
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
