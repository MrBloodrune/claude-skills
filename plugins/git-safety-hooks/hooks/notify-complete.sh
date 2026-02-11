#!/bin/bash
# Desktop notification on task completion via notify-send (Hyprland/Wayland)

MESSAGE="${CLAUDE_NOTIFICATION:-Task complete}"

notify-send \
  --app-name="Claude Code" \
  --urgency=normal \
  --expire-time=5000 \
  "$MESSAGE"
