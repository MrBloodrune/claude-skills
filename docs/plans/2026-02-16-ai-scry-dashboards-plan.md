# AI Scry Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build two new Grafana dashboards — Session Explorer (drill into a session chain) and Prompt Explorer (browse prompts, see causal chains) — plus hierarchy visualization experiments.

**Architecture:** Pure Grafana dashboard JSON pushed via API. All data from Loki `{service_name="ai-scry"} | json`. Variables drive filtering. No backend changes needed.

**Tech Stack:** Grafana 12.3.1, Loki, LogQL, dashboard JSON, `curl` for API push

---

### Task 1: Session Explorer — Scaffold with Variable + Stats

**Files:**
- Create: `plugins/ai-scry/grafana/ai-scry-sessions.json`

**Step 1: Create the dashboard JSON scaffold**

Create `plugins/ai-scry/grafana/ai-scry-sessions.json` with:
- `uid`: `"ai-scry-sessions"`, title: `"AI Scry: Session Explorer"`
- Tags: `["claude-code", "ai-scry", "sessions"]`
- Templating variable `session_id`:
  - Type: `"query"`, datasource Loki
  - Query: `label_values({service_name="ai-scry"}, session_id)`
  - This uses Loki's built-in label_values to populate the dropdown
  - Include "All" option for unfiltered view
- Session Stats panel (stat, y=0, h=4, w=24):
  - 3 targets filtered by `session_id=~"$session_id"`:
    - Agents: `sum(count_over_time({service_name="ai-scry", session_id=~"$session_id"} | json | event_type="agent_complete" [$__range]))`
    - Tools: `sum(count_over_time({service_name="ai-scry", session_id=~"$session_id"} | json | event_type="tool_start" [$__range]))`
    - Errors: `sum(count_over_time({service_name="ai-scry", session_id=~"$session_id"} | json | event_type="tool_error" [$__range]))`
  - Use same stat panel config as existing dispatch dashboard

**Step 2: Push to Grafana and verify**

```bash
curl -sk -X POST "https://grafana.mrbloodrune.dev/api/dashboards/db" \
  -H "Content-Type: application/json" \
  -u "admin:osrsbest" \
  -d "$(jq -n --argjson dash "$(cat plugins/ai-scry/grafana/ai-scry-sessions.json)" \
    '{dashboard: $dash, folderUid: "claude-code", overwrite: true}')"
```

Expected: `{"status": "success"}`, dashboard visible at `/d/ai-scry-sessions/`. Session dropdown should list session UUIDs. Selecting one should filter the stat panel.

**Step 3: Commit**

```bash
git add plugins/ai-scry/grafana/ai-scry-sessions.json
git commit -m "feat(ai-scry): scaffold Session Explorer dashboard with variable and stats"
```

---

### Task 2: Session Explorer — Agent Dispatch Table

**Files:**
- Modify: `plugins/ai-scry/grafana/ai-scry-sessions.json`

**Step 1: Add Agent Dispatch Table panel**

Add a table panel (y=4, h=12, w=24):
- Query: `{service_name="ai-scry", session_id=~"$session_id"} | json | event_type="agent_complete"`
- Transforms: `extractFields` (source: Line, format: json) → `organize` (exclude Line/id/labels/tsNs, rename agent_id→"Agent ID", parent_agent_id→"Parent", agent_label→"Type", task_description→"Task", model→"Model", duration_ms→"Duration", tokens_in→"Tokens In")
- Field overrides: Task column width 300, Duration unit ms
- Sort by Time descending

**Step 2: Push and verify**

Push to Grafana. Select a session with agents (e.g. `54ffc8bf-9be3-4f8b-9836-03477e5e1846`). Table should show agent rows with Type, Task, Parent columns populated.

**Step 3: Commit**

```bash
git add plugins/ai-scry/grafana/ai-scry-sessions.json
git commit -m "feat(ai-scry): add agent dispatch table to Session Explorer"
```

---

### Task 3: Session Explorer — Node Graph (Discovery)

**Files:**
- Modify: `plugins/ai-scry/grafana/ai-scry-sessions.json`

**Step 1: Add Node Graph panel**

Add a nodeGraph panel (y=16, h=14, w=12):
- **Query A (Nodes):** `{service_name="ai-scry", session_id=~"$session_id"} | json | event_type="agent_complete"` with `refId: "nodes"`
- **Query B (Edges):** Same query with `refId: "edges"`
- Transforms:
  1. `extractFields` on both queries (source: Line, format: json)
  2. `filterByRefId` to split — nodes frame gets organize with `id=agent_id, title=agent_label, subtitle=task_description, mainStat=duration_ms`
  3. Edges frame gets organize with `id` (auto-generated), `source=parent_agent_id, target=agent_id`
  4. `configFromData` or frame meta to tag as nodes/edges

Note: This is experimental. nodeGraph from Loki requires tricky transforms. If the transform chain doesn't produce valid node/edge frames, fall back to just the table.

**Step 2: Push and verify**

Push to Grafana. Check if the node graph renders with agents as nodes and parent-child relationships as edges. If it shows "No data" or errors, document what went wrong and skip to Task 4.

**Step 3: Commit (even if experimental)**

```bash
git add plugins/ai-scry/grafana/ai-scry-sessions.json
git commit -m "feat(ai-scry): add experimental node graph to Session Explorer"
```

---

### Task 4: Session Explorer — Timeline + Distribution Panels

**Files:**
- Modify: `plugins/ai-scry/grafana/ai-scry-sessions.json`

**Step 1: Add remaining panels**

Add 4 panels:

1. **Tool Timeline** (logs, y=30, h=10, w=16):
   - `{service_name="ai-scry", session_id=~"$session_id"} | json | event_type=~"tool_start|tool_end"`
   - Options: showTime, wrapLogMessage, prettifyLogMessage, enableLogDetails, sortOrder Descending

2. **Spawn Rate** (timeseries bars, y=30, h=10, w=8):
   - `sum(count_over_time({service_name="ai-scry", session_id=~"$session_id"} | json | event_type="tool_start" | tool_name="Task" [$__interval]))`
   - drawStyle bars, fillOpacity 60

3. **Tool Distribution** (piechart, y=40, h=10, w=12):
   - `sum by (tool_name) (count_over_time({service_name="ai-scry", session_id=~"$session_id"} | json | event_type="tool_start" [$__range]))`
   - Donut, table legend with value+percent

4. **Error Stream** (logs, y=40, h=10, w=12):
   - `{service_name="ai-scry", session_id=~"$session_id"} | json | event_type="tool_error"`

**Step 2: Push and verify**

All panels should filter by the selected session_id variable. With "All" selected, shows aggregate. With a specific session, scoped to that session.

**Step 3: Commit**

```bash
git add plugins/ai-scry/grafana/ai-scry-sessions.json
git commit -m "feat(ai-scry): add timeline, distribution, and error panels to Session Explorer"
```

---

### Task 5: Prompt Explorer — Scaffold with Prompt Browser Table

**Files:**
- Create: `plugins/ai-scry/grafana/ai-scry-prompts.json`

**Step 1: Create dashboard JSON**

Create `plugins/ai-scry/grafana/ai-scry-prompts.json` with:
- `uid`: `"ai-scry-prompts"`, title: `"AI Scry: Prompt Explorer"`
- Tags: `["claude-code", "ai-scry", "prompts"]`
- Hidden variables: `prompt_id` (textbox, default empty), `prompt_ts` (textbox), `next_prompt_ts` (textbox), `prompt_session` (textbox)
- **Prompt Browser** table (y=0, h=14, w=24):
  - Query: `{service_name="ai-scry"} | json | event_type="user_prompt"`
  - Transforms:
    1. `extractFields` (source: Line, format: json)
    2. `organize`: exclude Line/labels/tsNs/agent_id/event_type, rename prompt_text→"Prompt", session_id→"Session", cwd→"Project"
  - Field overrides: Prompt column width 500, Session column width 120 (truncate)
  - Data links on the table row: link to same dashboard with `var-prompt_id=${__data.fields.id}&var-prompt_ts=${__data.fields.timestamp}&var-prompt_session=${__data.fields.session_id}`
  - Sort by Time descending

**Step 2: Push and verify**

Push to Grafana. Table should show all prompts across sessions with Time, Project, Session, Prompt columns. Clicking a row should update URL with prompt variables.

**Step 3: Commit**

```bash
git add plugins/ai-scry/grafana/ai-scry-prompts.json
git commit -m "feat(ai-scry): scaffold Prompt Explorer with prompt browser table"
```

---

### Task 6: Prompt Explorer — Prompt Detail + Stats

**Files:**
- Modify: `plugins/ai-scry/grafana/ai-scry-prompts.json`

**Step 1: Add Prompt Detail row**

Add panels that activate when `prompt_id` is set (non-empty):

1. **Prompt Text** (logs, y=14, h=6, w=16):
   - Query: `{service_name="ai-scry", session_id=~"$prompt_session"} | json | event_type="user_prompt" | id="$prompt_id"`
   - Options: showTime, wrapLogMessage, prettifyLogMessage
   - Note: Only renders when `$prompt_id` is non-empty

2. **Prompt Stats** (stat, y=14, h=6, w=8):
   - 3 targets scoped by session + time window between `$prompt_ts` and `$next_prompt_ts`:
     - Tools: count tool_start events in window
     - Agents: count agent_complete events in window
     - Errors: count tool_error events in window
   - If `$next_prompt_ts` is empty, use `$__to` as upper bound

**Step 2: Push and verify**

Click a prompt in the browser. The detail row should show the full prompt text and stats for what that prompt triggered.

**Step 3: Commit**

```bash
git add plugins/ai-scry/grafana/ai-scry-prompts.json
git commit -m "feat(ai-scry): add prompt detail and stats panels"
```

---

### Task 7: Prompt Explorer — Causal Chain Panels

**Files:**
- Modify: `plugins/ai-scry/grafana/ai-scry-prompts.json`

**Step 1: Add Causal Chain row**

1. **Event Stream** (table, y=20, h=14, w=14):
   - Query: `{service_name="ai-scry", session_id=~"$prompt_session"} | json | event_type=~"tool_start|tool_end|agent_start|agent_complete"`
   - Time-windowed: use `$prompt_ts` and `$next_prompt_ts` via the dashboard time range or LogQL timestamp filters
   - Transforms: extractFields → organize (show: Time, event_type, tool_name, agent_id, agent_label, tool_response_summary)
   - Sort by Time ascending (causal order)

2. **Agent Work** (table, y=20, h=14, w=10):
   - Query: `{service_name="ai-scry", session_id=~"$prompt_session"} | json | event_type="agent_complete"`
   - Same time window
   - Transforms: extractFields → organize (show: agent_label as Type, task_description as Task, model as Model, parent_agent_id as Parent)

**Step 2: Push and verify**

Select a prompt that triggered sub-agents. The event stream should show the full causal chain in order. Agent work should list the agents spawned during that prompt's window.

**Step 3: Commit**

```bash
git add plugins/ai-scry/grafana/ai-scry-prompts.json
git commit -m "feat(ai-scry): add causal chain and agent work panels"
```

---

### Task 8: Discovery — State Timeline Panel

**Files:**
- Modify: `plugins/ai-scry/grafana/ai-scry-sessions.json`

**Step 1: Add State Timeline panel**

Add a state timeline panel to Session Explorer (y=16, h=8, w=12, beside or replacing node graph):
- Query A: `{service_name="ai-scry", session_id=~"$session_id"} | json | event_type="agent_start"` with legendFormat `{{agent_type}}`
- Query B: `{service_name="ai-scry", session_id=~"$session_id"} | json | event_type="agent_complete"` with legendFormat `{{agent_label}}`
- The state timeline should show horizontal bars per agent_id, colored by agent_type
- This may need transforms to merge start/complete into state changes

Note: State timeline from Loki logs is experimental. If it doesn't produce meaningful bars, try a standard timeseries with range annotations instead.

**Step 2: Push and verify**

Check if agents appear as horizontal spans. Document what works and what doesn't.

**Step 3: Commit**

```bash
git add plugins/ai-scry/grafana/ai-scry-sessions.json
git commit -m "feat(ai-scry): add experimental state timeline to Session Explorer"
```

---

### Task 9: Discovery — Flame Graph Attempt

**Files:**
- Modify: `plugins/ai-scry/grafana/ai-scry-sessions.json`

**Step 1: Attempt flame graph panel**

Add a flamegraph panel to Session Explorer:
- Query: `{service_name="ai-scry", session_id=~"$session_id"} | json | event_type="agent_complete"`
- Transforms needed to produce: `level` (number), `value` (number), `label` (string), `self` (number)
  - `level`: 0 for agents where parent_agent_id="ag_main", 1 for sub-sub-agents, etc.
  - `value`: tool count or duration_ms
  - `label`: agent_label + task_description
  - `self`: value minus children's value

This is the hardest panel. Grafana transforms likely can't compute tree depth from parent pointers. Try:
1. `extractFields` → `organize` → manual level assignment via `calculateField` if available
2. If transforms can't do it, document the limitation and skip

**Step 2: Push and evaluate**

If it renders, great. If not, remove the panel and note in the commit that flame graph needs a backend preprocessing endpoint.

**Step 3: Commit**

```bash
git add plugins/ai-scry/grafana/ai-scry-sessions.json
git commit -m "feat(ai-scry): attempt flame graph panel (discovery)"
```

---

### Task 10: Final Polish + Cross-Links

**Files:**
- Modify: `plugins/ai-scry/grafana/ai-scry-sessions.json`
- Modify: `plugins/ai-scry/grafana/ai-scry-prompts.json`
- Modify: `plugins/ai-scry/grafana/ai-scry-dispatch.json`

**Step 1: Add dashboard cross-links**

Add `links` array to all 3 dashboards so you can navigate between them:
```json
"links": [
  { "title": "Dispatch", "url": "/d/ai-scry-dispatch/", "type": "link" },
  { "title": "Sessions", "url": "/d/ai-scry-sessions/", "type": "link" },
  { "title": "Prompts", "url": "/d/ai-scry-prompts/", "type": "link" }
]
```

**Step 2: Remove failed experiments**

Review any panels that showed "No data" or rendered poorly. Remove them from the JSON. Keep only panels that actually work.

**Step 3: Push all 3 dashboards and verify navigation**

Push all dashboards. Verify cross-links work. Verify all panels render with real data.

**Step 4: Commit**

```bash
git add plugins/ai-scry/grafana/
git commit -m "feat(ai-scry): add cross-links and polish all dashboards"
```
