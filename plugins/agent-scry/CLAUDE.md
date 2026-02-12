# AI Scry

Real-time observation dashboard for Claude Code agent swarms.

**Vault**: `~/Documents/rmv0/Technology/Dev/Projects/Tools/AI Scry.md`

## Stack

- Server: Plain Node.js (ESM, zero dependencies)
- Dashboard: Single HTML file with D3.js v7 (CDN)
- Data: Append-only JSONL files
- Telemetry: Claude Code hooks (PreToolUse, PostToolUse, SubagentStop, SessionStart)

## Architecture

See `docs/plans/2026-02-10-agent-observatory-design.md` for the full design.

Hook events → local server (localhost:7847) → SSE → browser dashboard with 3 panels:
1. Timeline (Gantt chart — agent lifespans and tool calls)
2. Sankey flow (prompt → decomposition → agents → outcomes)
3. Stats (tokens, cost, agents, duration, efficiency)

## Conventions

- No npm packages, no package.json, no TypeScript
- Server: `server/index.js` (<250 lines), `server/emit.js` (<150 lines)
- Dashboard: `dashboard/index.html` (single file, all JS/CSS inlined)
- Plugin manifest: `plugin.json` at project root
- Conventional commits: `feat(ai-scry):`, `fix(ai-scry):`, etc.
