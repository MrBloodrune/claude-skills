#!/bin/bash
# Toggle Kokoro TTS mute state. Bind to a global hotkey.
# When muting, also interrupts any active playback immediately.

MUTE_FILE="${XDG_RUNTIME_DIR:-/tmp}/kokoro-muted"
PORT="${KOKORO_PORT:-6789}"

if [ -f "$MUTE_FILE" ]; then
  rm "$MUTE_FILE"
  notify-send -t 1500 -u low "Kokoro TTS" "Unmuted"
else
  touch "$MUTE_FILE"
  # Interrupt any active playback
  curl -sf -X POST "http://127.0.0.1:$PORT/interrupt-all" >/dev/null 2>&1
  notify-send -t 1500 -u low "Kokoro TTS" "Muted"
fi
