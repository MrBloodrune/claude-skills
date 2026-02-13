#!/bin/bash
# Stops ongoing TTS playback when user submits a new prompt

echo "[$(date)] TTS Interrupt hook triggered" >> /tmp/kokoro-hook.log

if pkill kokoro-tts 2>/dev/null; then
  echo "[$(date)] Sent SIGTERM to kokoro-tts" >> /tmp/kokoro-hook.log
  sleep 0.1
  if pkill -9 kokoro-tts 2>/dev/null; then
    echo "[$(date)] Sent SIGKILL to kokoro-tts" >> /tmp/kokoro-hook.log
  fi
else
  echo "[$(date)] No kokoro-tts process was running" >> /tmp/kokoro-hook.log
fi

exit 0
