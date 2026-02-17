#!/bin/bash
# check-manager.sh <tmux-session-name>
# Returns JSON status of a dispatched Manager session.
# Used by Director to monitor without pane capture.

set -euo pipefail

TMUX_NAME="${1:?Usage: check-manager.sh <tmux-session-name>}"
DISPATCH_DIR="$HOME/.claude/observatory/dispatch"
DISPATCH="$DISPATCH_DIR/$TMUX_NAME.json"
ESCALATIONS="$DISPATCH_DIR/$TMUX_NAME.escalations.jsonl"

if [ ! -f "$DISPATCH" ]; then
  echo '{"status":"not_found"}'
  exit 0
fi

STATUS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$DISPATCH','utf8')).status)")

case "$STATUS" in
  complete)
    cat "$DISPATCH"
    ;;
  running)
    JSONL=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$DISPATCH','utf8')).jsonl_path || '')")
    LAST_EVENT='null'
    if [ -n "$JSONL" ] && [ -f "$JSONL" ]; then
      LAST_EVENT=$(tail -1 "$JSONL" 2>/dev/null | node -e "
        let d='';
        process.stdin.on('data',c=>d+=c);
        process.stdin.on('end',()=>{
          try{const j=JSON.parse(d);console.log(JSON.stringify({event:j.event_type,tool:j.tool_name||'',ts:j.timestamp}))}
          catch(e){console.log('null')}
        })
      " 2>/dev/null || echo 'null')
    fi
    ESC_COUNT=0
    if [ -f "$ESCALATIONS" ]; then
      ESC_COUNT=$(wc -l < "$ESCALATIONS" | tr -d ' ')
    fi
    echo "{\"status\":\"running\",\"last_event\":$LAST_EVENT,\"escalations\":$ESC_COUNT}"
    ;;
  *)
    cat "$DISPATCH"
    ;;
esac
