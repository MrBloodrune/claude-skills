#!/bin/bash
# complete-session.sh
# Called at Manager's Stop/SessionEnd to mark the dispatch record as complete.
# Enables event-driven completion detection by the Director via check-manager.sh.

set -euo pipefail

# Only run inside tmux
if [ -z "${TMUX:-}" ]; then
  exit 0
fi

TMUX_NAME=$(tmux display-message -p '#S')
DISPATCH_DIR="$HOME/.claude/observatory/dispatch"
DISPATCH_FILE="$DISPATCH_DIR/$TMUX_NAME.json"

# Only update if a dispatch record exists for this session
if [ ! -f "$DISPATCH_FILE" ]; then
  exit 0
fi

node -e "
  const fs = require('fs');
  const f = '$DISPATCH_FILE';
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  d.status = 'complete';
  d.completed_at = Date.now();
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
"
