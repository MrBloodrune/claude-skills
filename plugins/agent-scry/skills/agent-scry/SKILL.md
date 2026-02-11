---
name: agent-scry
description: Use when the user wants to "observe agents", "start observatory", "watch agent swarm", "monitor sub-agents", "visualize agent work", "see what agents are doing", or asks about real-time agent telemetry and visualization.
---

# Agent Scry — Observatory Dashboard

Real-time observation dashboard for Claude Code agent swarms. Captures execution telemetry via hooks and renders a 3-panel visualization.

## Starting the Observatory

1. Start the server (if not already running):
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/server/index.js &
   ```
2. Wait 1 second, verify with health check:
   ```bash
   curl -s http://localhost:7847/api/health
   ```
3. Open dashboard in browser:
   ```bash
   xdg-open http://localhost:7847
   ```
4. Tell the user: "Observatory is live at http://localhost:7847 — all agent activity in this session will appear in real-time."

## How It Works

The plugin hooks automatically capture:
- **SessionStart** → creates session tracking
- **PreToolUse** → logs every tool call start, detects agent spawns
- **PostToolUse** → logs tool completions with token counts
- **SubagentStop** → logs agent completions with status

Events stream via SSE to the dashboard which renders:
- **Timeline**: Gantt chart of agent lifespans and tool calls
- **Sankey Flow**: Prompt → Decomposition → Agents → Outcomes
- **Stats**: Tokens, cost, agents, duration, efficiency with sparklines

## Stopping

```bash
kill $(cat ~/.claude/observatory/server.pid) 2>/dev/null
rm -f ~/.claude/observatory/server.pid
```

## Testing with Mock Data

```bash
node ${CLAUDE_PLUGIN_ROOT}/test/mock-swarm.js
```
