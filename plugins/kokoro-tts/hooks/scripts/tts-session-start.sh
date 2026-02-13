#!/bin/bash
# Auto-start kokoro-tts-server if not already running

PORT="${KOKORO_PORT:-6789}"
SERVER="http://127.0.0.1:$PORT"
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}"
LOG="/tmp/kokoro-hook.log"

# Check if server is already healthy
if curl -sf "$SERVER/health" >/dev/null 2>&1; then
  echo "[$(date)] Kokoro TTS server already running" >> "$LOG"
  exit 0
fi

echo "[$(date)] Kokoro TTS server not running, starting..." >> "$LOG"

# Start server in background, detached from this shell
nohup uv run --project "$PLUGIN_DIR/server" python "$PLUGIN_DIR/server/kokoro_server.py" >> "$LOG" 2>&1 &
SERVER_PID=$!
echo "[$(date)] Started server process (PID $SERVER_PID)" >> "$LOG"

# Wait for server to become healthy (model loading takes ~2-5s)
for i in $(seq 1 15); do
  if curl -sf "$SERVER/health" >/dev/null 2>&1; then
    echo "[$(date)] Server healthy after ${i}s" >> "$LOG"
    exit 0
  fi
  sleep 1
done

echo "[$(date)] WARNING: Server did not become healthy within 15s" >> "$LOG"
exit 0
