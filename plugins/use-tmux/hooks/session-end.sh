#!/bin/bash
set -euo pipefail
# use-tmux: Clean up session registration on exit.

[ -z "${TMUX:-}" ] && exit 0

input=$(cat)

SESSIONS_DIR="$HOME/.claude/tmux-sessions"

transcript=$(echo "$input" | jq -r '.transcript_path // empty' 2>/dev/null)
if [ -n "$transcript" ]; then
    session_hash=$(echo -n "$transcript" | md5sum | awk '{print $1}')
    rm -f "$SESSIONS_DIR/${session_hash}.json"
fi
