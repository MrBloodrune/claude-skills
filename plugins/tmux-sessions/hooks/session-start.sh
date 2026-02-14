#!/bin/bash
set -euo pipefail
# tmux-sessions: Register this Claude session if running inside tmux.
# No-op if $TMUX is unset. Writes session metadata to ~/.claude/tmux-sessions/.

[ -z "$TMUX" ] && exit 0

input=$(cat)

SESSIONS_DIR="$HOME/.claude/tmux-sessions"
mkdir -p "$SESSIONS_DIR"

tmux_session=$(tmux display-message -p '#S' 2>/dev/null)
tmux_pane=$(tmux display-message -p '#{pane_id}' 2>/dev/null)
project_dir=$(echo "$input" | jq -r '.cwd // empty' 2>/dev/null)
transcript=$(echo "$input" | jq -r '.transcript_path // empty' 2>/dev/null)

if [ -n "$transcript" ]; then
    session_hash=$(echo -n "$transcript" | md5sum | awk '{print $1}')
else
    session_hash=$(echo -n "${tmux_session}_${tmux_pane}_$$" | md5sum | awk '{print $1}')
fi

jq -n \
  --arg hash "$session_hash" \
  --arg name "$tmux_session" \
  --arg pane "$tmux_pane" \
  --arg project "$project_dir" \
  --arg transcript "$transcript" \
  --argjson started "$(date +%s)" \
  --argjson pid "$$" \
  '{session_hash: $hash, session_name: $name, pane: $pane, project: $project, transcript: $transcript, started: $started, pid: $pid}' \
  > "$SESSIONS_DIR/${session_hash}.json"
