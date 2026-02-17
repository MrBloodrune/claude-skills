# AI Scry

Agent telemetry exporter for Claude Code — captures hook events as OTLP logs.

**Vault**: `~/Documents/rmv0/Technology/Dev/Projects/Tools/AI Scry.md`

## Stack

- Exporter: Plain Node.js (ESM, zero dependencies)
- Transport: OTLP/HTTP → Alloy (127.0.0.1:4318) → Loki → Grafana
- Local backup: Append-only JSONL files (~/.claude/observatory/sessions/)
- Telemetry: Claude Code hooks (14 hooks — all available hook types)

## Architecture

Hook events → `exporter.js` → OTLP POST to Alloy → Loki → Grafana dashboard

Each hook invocation runs `exporter.js` with the event type as argv[2]. The exporter:
1. Builds a structured event from the hook payload
2. Converts to OTLP `ExportLogsServiceRequest` JSON
3. Writes JSONL locally (always) + POSTs to Alloy (fire-and-settle)

Agent hierarchy tracking uses pending/resolved file pairs in `~/.claude/observatory/` to match `tool_start` (Task spawn) with `agent_complete` (SubagentStop).

## Conventions

- No npm packages, no package.json, no TypeScript
- Exporter: `server/exporter.js`, task extraction: `server/tasks.js`
- Plugin manifest: `plugin.json` at project root
- Conventional commits: `feat(ai-scry):`, `fix(ai-scry):`, etc.
