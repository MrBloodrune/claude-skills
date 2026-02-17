#!/bin/bash
# register-session.sh
# Called at Manager's SessionStart to link tmux session name → Claude session_id.
# Updates the dispatch record written by the Director.

set -euo pipefail

# Only run inside tmux
if [ -z "${TMUX:-}" ]; then
  exit 0
fi

TMUX_NAME=$(tmux display-message -p '#S')
DISPATCH_DIR="$HOME/.claude/observatory/dispatch"
DISPATCH_FILE="$DISPATCH_DIR/$TMUX_NAME.json"

# Only update if Director wrote a dispatch record for this session
if [ ! -f "$DISPATCH_FILE" ]; then
  exit 0
fi

node -e "
  const fs = require('fs');
  const f = '$DISPATCH_FILE';
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  d.session_id = process.env.CLAUDE_SESSION_ID || '';
  if (d.session_id) {
    d.jsonl_path = require('path').join(
      process.env.HOME, '.claude', 'observatory', 'sessions', d.session_id + '.jsonl'
    );
  }
  d.status = 'running';
  d.started_at = Date.now();
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
"
