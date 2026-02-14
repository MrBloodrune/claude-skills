#!/bin/bash
set -euo pipefail
# tmux-sessions: Poll for events from a dispatched session and print summaries.
# Exits automatically when a stop event is detected.
#
# Usage: event-watcher.sh <session-name> [interval_seconds]

SESSION_NAME="${1:?Usage: event-watcher.sh <session-name> [interval_seconds]}"
INTERVAL="${2:-30}"
EVENTS_DIR="$HOME/.claude/tmux-events"

declare -A seen=()

format_time() {
    date -d "@$1" +"%H:%M:%S" 2>/dev/null || date +"%H:%M:%S"
}

scan_events() {
    [ -d "$EVENTS_DIR" ] || return 0

    for f in "$EVENTS_DIR"/*.json; do
        [ -f "$f" ] || continue
        basename=$(basename "$f")

        # Skip already reported
        [ -n "${seen[$basename]:-}" ] && continue

        # Filter to our session
        name=$(jq -r '.session_name // empty' "$f" 2>/dev/null)
        [ "$name" != "$SESSION_NAME" ] && continue

        seen[$basename]=1

        event=$(jq -r '.event // empty' "$f" 2>/dev/null)
        ts=$(jq -r '.timestamp // empty' "$f" 2>/dev/null)
        time_str=$(format_time "$ts")

        case "$event" in
            tool_use)
                tool=$(jq -r '.tool // "?"' "$f" 2>/dev/null)
                summary=$(jq -r '.input_summary // ""' "$f" 2>/dev/null)
                if [ -n "$summary" ]; then
                    echo "[$time_str] $tool: $summary"
                else
                    echo "[$time_str] $tool"
                fi
                ;;
            permission)
                tool=$(jq -r '.tool // "unknown"' "$f" 2>/dev/null)
                echo "[$time_str] PERMISSION NEEDED: Claude needs your permission to use $tool"
                ;;
            stop)
                reason=$(jq -r '.reason // "unknown"' "$f" 2>/dev/null)
                echo "[$time_str] STOPPED: $reason"
                return 1  # Signal to exit
                ;;
            *)
                echo "[$time_str] $event"
                ;;
        esac
    done

    return 0
}

echo "Watching events for session: $SESSION_NAME (poll every ${INTERVAL}s)"

while true; do
    if ! scan_events; then
        echo "Session stopped. Watcher exiting."
        exit 0
    fi
    sleep "$INTERVAL"
done
