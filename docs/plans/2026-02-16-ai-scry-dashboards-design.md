# AI Scry Dashboard Redesign

**Date:** 2026-02-16
**Status:** Approved

## Context

The existing AI Scry: Dispatch dashboard provides aggregate stats (session stats, agent dispatch table, tool distribution). We need two new dashboards that provide **drill-down** views:

1. **Session Explorer** — filter by session_id, see the full session chain
2. **Prompt Explorer** — browse all prompts, click one to see its causal chain

Plus a **discovery set** of hierarchy visualization panels (node graph, flame graph, waterfall) to evaluate which best represents parent-child agent relationships.

## Data Model

All data lives in Loki via OTLP ingestion from `ai-scry` hooks. Key event types:

| Event | Key Fields | Relationships |
|-------|-----------|---------------|
| `session_start` | session_id, cwd, source, model, transcript_path | Root of session chain |
| `user_prompt` | session_id, prompt_text, timestamp | Scopes causal windows |
| `tool_start` | session_id, tool_name, agent_id, agent_label | Links to agent |
| `tool_end` | session_id, tool_name, agent_id, duration_ms, has_error | Pairs with tool_start |
| `agent_start` | session_id, agent_id, agent_type | Sub-agent spawn |
| `agent_complete` | session_id, agent_id, parent_agent_id, agent_label, task_description, model, duration_ms | Back-links to parent |
| `tool_error` | session_id, tool_name, error | Error events |

Common LogQL base: `{service_name="ai-scry"} | json`

## Dashboard 1: Session Explorer

**UID:** `ai-scry-sessions`
**Folder:** Claude Code

### Variables

| Name | Type | Query | Display |
|------|------|-------|---------|
| `session_id` | query | `{service_name="ai-scry"} \| json \| event_type="session_start"` | `$cwd — $timestamp` label, value=session_id |

### Panels

**Row 1: Session Summary** (y=0, h=4)

| Panel | Type | Width | Query |
|-------|------|-------|-------|
| Session Stats | stat | 24 | 3 targets: count agents, tools, errors filtered by `$session_id` |

**Row 2: Agent Hierarchy** (y=4, h=14)

| Panel | Type | Width | Query |
|-------|------|-------|-------|
| Agent Tree | nodeGraph | 12 | agent_complete events → transform to nodes/edges frames |
| Agent Dispatch Table | table | 12 | agent_complete events with extractFields, organize transforms |

Node graph requires two data frames:
- **Nodes:** id=agent_id, title=agent_label, subtitle=task_description, mainStat=duration_ms
- **Edges:** id=auto, source=parent_agent_id, target=agent_id

Transform chain: extractFields → organize (rename) → frame naming via `renameByRegex` or `prepareTimeSeries`

**Row 3: Timeline** (y=18, h=10)

| Panel | Type | Width | Query |
|-------|------|-------|-------|
| Tool Timeline | logs | 16 | tool_start/tool_end for session |
| Spawn Rate | timeseries (bars) | 8 | count_over_time Task spawns per interval |

**Row 4: Errors** (y=28, h=8)

| Panel | Type | Width | Query |
|-------|------|-------|-------|
| Tool Distribution | piechart | 12 | sum by tool_name for session |
| Error Stream | logs | 12 | tool_error events for session |

## Dashboard 2: Prompt Explorer

**UID:** `ai-scry-prompts`
**Folder:** Claude Code

### Variables

| Name | Type | Source |
|------|------|--------|
| `prompt_id` | textbox (hidden) | Set by table data link click |
| `prompt_ts` | textbox (hidden) | Prompt timestamp, set by click |
| `prompt_session` | textbox (hidden) | Session ID of selected prompt |

### Panels

**Row 1: Prompt Browser** (y=0, h=12)

| Panel | Type | Width | Query |
|-------|------|-------|-------|
| All Prompts | table | 24 | `{service_name="ai-scry"} \| json \| event_type="user_prompt"` |

Columns: Time, Project (cwd last segment), Session (truncated), Prompt (truncated to 120 chars)

Table data link on click: sets `prompt_id`, `prompt_ts`, `prompt_session` variables.

**Row 2: Prompt Detail** (y=12, h=6, collapsed by default — expands when prompt selected)

| Panel | Type | Width | Query |
|-------|------|-------|-------|
| Prompt Text | text/logs | 16 | Single user_prompt by id |
| Prompt Stats | stat | 8 | Count tools, agents, errors between this prompt and next |

**Row 3: Causal Chain** (y=18, h=14)

| Panel | Type | Width | Query |
|-------|------|-------|-------|
| Event Stream | table | 14 | All events between prompt_ts and next prompt, ordered by time |
| Agent Work | table/nodeGraph | 10 | agent_complete events in the prompt window |

### Prompt-to-Next-Prompt Windowing

The "causal window" for a prompt = `[prompt.timestamp, next_prompt.timestamp)` within the same session.

In LogQL this is achieved by time-range filtering:
```
{service_name="ai-scry", session_id="$prompt_session"} | json | __timestamp_ms__ >= $prompt_ts | __timestamp_ms__ < $next_prompt_ts
```

The `$next_prompt_ts` is computed client-side: the Prompt Browser table includes the next prompt's timestamp as a hidden column (using a LogQL query that returns timestamps of sequential user_prompt events).

## Discovery: Hierarchy Visualization Experiments

These panels will be built and evaluated. Not all will survive.

### 1. Node Graph (agent tree)
- **Feasibility:** Medium. Grafana nodeGraph needs separate nodes/edges frames. Loki returns flat logs. Need transform chain to split into two frames.
- **Approach:** Two queries in same panel — one for nodes (agent_complete with id, label, stats), one for edges (agent_complete with parent→child). Use `renameByRegex` transform to set frame names.
- **Placement:** Session Explorer row 2

### 2. Flame Graph (agent hierarchy)
- **Feasibility:** Hard. Requires `level`, `value`, `label`, `self` in DFS order. Loki can't compute DFS natively.
- **Approach A:** Grafana transforms — extractFields, then compute level from parent chain depth. Limited by transform capabilities.
- **Approach B:** Add `/api/flamegraph` endpoint to exporter that reads JSONL and serves pre-computed profile data.
- **Decision:** Attempt transforms first. If it doesn't work cleanly, skip for v1.
- **Placement:** Session Explorer row 2 (if viable, replace or supplement node graph)

### 3. State Timeline (agent lifespans)
- **Feasibility:** High. Grafana state timeline panel shows horizontal bars. Pair agent_start and agent_complete timestamps.
- **Approach:** Two queries (start/complete), use transforms to create duration spans per agent_id.
- **Placement:** Session Explorer row 2

### 4. Tool Waterfall (per-prompt)
- **Feasibility:** High. Table with tool_name, duration bar, agent_id. Simple extractFields + organize.
- **Placement:** Prompt Explorer row 3

## Non-Goals

- Custom Grafana plugins (keep everything native panels + transforms)
- Real-time streaming updates (10s refresh is sufficient)
- Cross-host aggregation (single host for now)

## Technical Notes

- Grafana 12.3.1, Loki backend, datasource uid: `loki`
- All queries use `{service_name="ai-scry"} | json` as base
- Dashboard JSON files stored in `plugins/ai-scry/grafana/`
- Push to Grafana via `POST /api/dashboards/db` with `overwrite: true`
