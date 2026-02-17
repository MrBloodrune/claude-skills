---
name: ai-scry
description: Use when the user wants to "observe agents", "monitor sub-agents", "visualize agent work", "see what agents are doing", "check agent telemetry", or asks about agent hierarchy and dispatch visualization in Grafana.
---

# AI Scry — Telemetry Exporter

Captures Claude Code agent execution telemetry via hooks and exports as OTLP logs to Alloy → Loki → Grafana.

## How It Works

The plugin hooks automatically capture all 14 Claude Code lifecycle events:
- **SessionStart/End** → session boundaries
- **PreToolUse/PostToolUse** → every tool call with timing and tokens
- **SubagentStart/Stop** → agent hierarchy with parent-child linking
- **PostToolUseFailure** → error tracking
- **UserPromptSubmit, Stop, PreCompact, PermissionRequest, Notification, TaskCompleted, TeammateIdle**

Events are exported as OTLP logs to Alloy (127.0.0.1:4318) and always written locally as JSONL backup.

## Viewing Telemetry

Open Grafana → Claude Code folder → "AI Scry: Dispatch" dashboard.

Key panels:
- **Agent Dispatch Table** — all completed agents with duration, tokens, status
- **Agent Hierarchy** — node graph of parent→child agent relationships
- **Tool Timeline** — log stream of tool_start/tool_end events
- **Spawn Rate** — time series of Task tool invocations
- **Token Budget** — bar gauge of token consumption by agent
- **Tool Distribution** — pie chart of tool usage
- **Error Stream** — filtered tool_error events

## Querying in Explore

```logql
{service_name="ai-scry"} | json | event_type="agent_complete"
{service_name="ai-scry"} | json | event_type=~"tool_start|tool_end" | tool_name="Task"
{service_name="ai-scry"} | json | event_type="tool_error"
```

## Local JSONL Backup

All events are always written to `~/.claude/observatory/sessions/<session_id>.jsonl` regardless of Alloy availability.
