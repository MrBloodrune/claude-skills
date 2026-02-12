---
name: observe
description: Start the observatory dashboard and open it in a browser
---

Start the AI Scry observatory server and open the dashboard.

Steps:
1. Check if the server is already running by testing the health endpoint at `http://localhost:7847/api/health`
2. If NOT running, start it in the background as a detached process:
   ```bash
   nohup node ${CLAUDE_PLUGIN_ROOT}/server/index.js > /dev/null 2>&1 &
   ```
3. Wait 1 second for the server to start, then verify with the health endpoint
4. Open the dashboard in the browser:
   ```bash
   xdg-open http://localhost:7847
   ```
5. Report to the user: "Observatory dashboard is running at http://localhost:7847"
