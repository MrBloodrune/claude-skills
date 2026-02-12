---
name: observe-stop
description: Stop the observatory server
---

Stop the AI Scry observatory server.

Steps:
1. Read the PID from `~/.claude/observatory/server.pid`
2. If the PID file exists, kill the process:
   ```bash
   kill $(cat ~/.claude/observatory/server.pid) 2>/dev/null
   ```
3. Remove the PID file:
   ```bash
   rm -f ~/.claude/observatory/server.pid
   ```
4. Report to the user: "Observatory server stopped."
5. If the PID file does not exist, report: "Observatory server is not running."
