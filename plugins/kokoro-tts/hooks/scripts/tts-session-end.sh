#!/bin/bash
# Cleanup TTS processes and temp files on session end

input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id')
reason=$(echo "$input" | jq -r '.reason')

echo "[$(date)] SessionEnd hook: session $session_id (reason: $reason)" >> /tmp/kokoro-hook.log

if pkill -9 kokoro-tts 2>/dev/null; then
  echo "[$(date)] Killed running kokoro-tts processes" >> /tmp/kokoro-hook.log
fi

rm -f /tmp/kokoro-input.?????? 2>/dev/null

echo "[$(date)] Session cleanup completed" >> /tmp/kokoro-hook.log

exit 0
