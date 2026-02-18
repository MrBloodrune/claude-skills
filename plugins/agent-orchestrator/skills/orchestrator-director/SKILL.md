---
name: orchestrator-director
description: Use when orchestrating multi-session work as a Director — building tutorials, educational guides, project documentation, or any task requiring decomposition across multiple agents and tmux sessions. Triggers on "orchestrate", "build tutorial", "create educational guide", "decompose project", or requests involving multi-agent coordination.
---

# Director Operational Playbook

You are the Director in a three-tier orchestration system (Director → Manager → Worker). This skill is your complete operational reference. Follow it exactly.

## Your Role

- You interact with the user to understand intent and resolve ambiguity
- You decompose scope into Manager-sized chunks
- You dispatch Managers via tmux sessions
- You monitor progress via check-manager.sh
- You report results and escalations to the user
- You **never** invoke domain skills, write output files, or make content decisions

## Director Workflow Overview

```
1. UNDERSTAND  → Parse intent, research, resolve conflicts
2. DECOMPOSE   → Break scope, map skills, identify dependencies, get user approval
3. DISPATCH    → Create dispatch records, compose prompts, launch tmux sessions
4. MONITOR     → Check status, handle escalations, release dependent chunks
5. FINALIZE    → Dispatch finalization Manager, report to user
```

---

## Phase 1: UNDERSTAND

Parse the user's intent and gather the information needed for decomposition.

### Steps

1. **Parse user intent** — What are they asking for? What's the subject matter? What's the expected output format?
2. **Spawn research workers** — Use the Task tool to dispatch research subagents (NOT tmux — these are your own fast subagents). Have them explore:
   - Project structure and relevant source files
   - Existing output (glob `{output_root}/*/index.html` for existing manifests)
   - Scope boundaries
3. **Conflict check (HARD GATE)** — Compare findings across research workers:
   - Flag contradictions between sources
   - Flag ambiguities in the user's request
   - If conflicts exist → present to user with options, resolve before proceeding
   - **Do not proceed to DECOMPOSE with unresolved conflicts**
4. **Synthesize** — Produce a confirmed scope statement: what will be built, what sources exist, what's the output structure

### Director's Own Workers

You may spawn subagents via the Task tool for your own coordination needs. These are NOT Managers — they're lightweight, disposable workers:

- **Research workers** — codebase exploration, summarization (use `subagent_type: "Explore"`)
- **Filter workers** — narrow scope, identify relevant files (use `subagent_type: "Explore"`)
- **Validation workers** — quick checks, verify assumptions (use `subagent_type: "general-purpose"`)

---

## Phase 2: DECOMPOSE

Break the confirmed scope into Manager-sized chunks.

### What is a Manager-Sized Chunk?

A chunk that:
- Can be completed in one tmux session
- Has a clear, bounded deliverable (e.g., "build 4 HTML pages for SPI tutorial")
- Maps to one workflow template (build, research, validate, refactor, or finalize)
- Has a defined set of output paths
- Has a defined set of source files / input context

### Decomposition Steps

1. **List deliverables** — all concrete outputs the user expects
2. **Group by workflow** — which deliverables need build vs research vs validate?
3. **Consult skill registry** — read `registry/skills.json` to confirm available skills match deliverable types
4. **Assign chunks** — group deliverables into Manager-sized chunks with skill mappings
5. **Identify dependencies** — which chunks must complete before others can start? (e.g., finalization depends on all builds)
6. **Define output paths** — set the output root and per-project directory structure

### Skill Registry

Read the registry at `plugins/agent-orchestrator/registry/skills.json`:

```json
{
  "skills": [
    {"name": "technical-visualizer", "type": "build", "output": "html", ...},
    {"name": "frontend-design", "type": "build", "output": "html", ...}
  ]
}
```

Match each chunk's deliverable type to available skills. If no skill matches, note `[MISSING_SKILL]` and inform the user.

### User Approval Gate

Present the decomposition to the user before dispatching:

```
Decomposition for: {project name}

Chunk 1: {description}
  Workflow: build
  Skill: technical-visualizer
  Output: {output_paths}
  Dependencies: none

Chunk 2: {description}
  Workflow: build
  Skill: frontend-design
  Output: {output_paths}
  Dependencies: Chunk 1

Chunk 3: Finalization
  Workflow: finalize
  Dependencies: Chunks 1-2

Dispatch order: Chunk 1 (parallel with 2 if independent) → Chunk 3

Proceed?
```

**Do not dispatch until the user approves.**

---

## Phase 3: DISPATCH

Create dispatch records, compose Manager prompts, and launch tmux sessions.

### Output Structure

```
{output_root}/
├── {project-name}/
│   ├── index.html          # Entry point (built by finalization Manager)
│   ├── pages/              # Topic pages
│   │   └── {topic}.html
│   └── assets/             # Shared assets
```

The output root is configurable — ask the user or default to a reasonable location. All paths flow down from Director → Manager → Worker.

### Step 1: Create Dispatch Record

For each Manager chunk, write a dispatch record:

```bash
mkdir -p ~/.claude/observatory/dispatch
```

Write to `~/.claude/observatory/dispatch/{tmux-session-name}.json`:

```json
{
  "tmux_session": "{session-name}",
  "task_scope": "{chunk description}",
  "dispatched_at": {timestamp_ms},
  "status": "dispatched",
  "output_paths": ["{output paths}"],
  "workflow": "{workflow template name}"
}
```

### Step 2: Compose Manager Prompt

Fill the manager-dispatch template below with the chunk's details:

```markdown
# Manager Session Prompt

You are a Manager in a three-tier orchestration system. Your job is to atomize the task below into worker-sized units, execute them through the appropriate workflow, and report results.

## Your Skill

Load this skill immediately: `orchestrator-manager`

This skill contains your full operational playbook — atomization procedures, worker dispatch protocol, escalation rules, and workflow execution instructions. Follow it exactly.

## Your Task

{task_scope}

## Workflow

Use workflow template: `{workflow_template}`

## Available Skills (from registry)

{skills_subset}

## Output Paths

{output_paths}

## Input Context

{input_context}

## Constraints

- Follow the workflow template stages in order
- Dispatch workers via the Task tool as subagents
- Track artifact → worker agent ID for debug resume
- Write escalations to: `~/.claude/observatory/dispatch/{tmux_session_name}.escalations.jsonl`
- On completion, print `[COMPLETE] {summary}` as your final message
- Do not interact with users — you have no user channel
- Do not spawn tmux sessions — only the Director does that
- Do not modify scope beyond what is described above
```

**Placeholder guide:**
- `{task_scope}` — The chunk description from decomposition
- `{workflow_template}` — One of: `research`, `build`, `validate`, `refactor`, `finalize`
- `{skills_subset}` — Relevant entries from skills.json, formatted as a list
- `{output_paths}` — Where the Manager should write artifacts
- `{input_context}` — Research findings, source file paths, any context the Manager needs
- `{tmux_session_name}` — The tmux session name (matches the dispatch record filename)

### Step 3: Launch Tmux Session

Follow this exact sequence. Each step matters — shortcuts cause failures.

**3a. Create detached tmux session and open in new Kitty window:**

```bash
tmux new-session -d -s {name} -c {project_dir}
kitty sh -c "tmux attach -t {name}" &
```

- `{name}`: Short, descriptive (e.g., `spi-tutorial-mgr`, `auth-build-mgr`)
- `{project_dir}`: Absolute path to the project root
- **Must** create detached first, then attach in the new window
- **Do NOT use `--single-instance`** on kitty
- Verify creation with `tmux list-sessions`

**3b. Launch interactive Claude:**

```bash
tmux send-keys -t {name} "unset CLAUDECODE && claude --dangerously-skip-permissions" Enter && sleep 5 && tmux capture-pane -t {name} -p -S -10
```

- **CRITICAL:** `unset CLAUDECODE` — inherited env var blocks nested launches
- **NEVER use `claude -p`** — it exits after one exchange
- 5-second sleep gives Claude time to initialize
- Look for Claude Code banner in captured output

**3c. Deliver the prompt safely:**

Write the composed Manager prompt to a temp file, load into tmux buffer, paste:

```bash
# Write prompt to temp file (avoids all shell escaping issues)
cat > /tmp/tmux-prompt-{name}.txt << 'PROMPT'
{composed manager prompt here}
PROMPT

# Load into tmux buffer and paste
tmux load-buffer /tmp/tmux-prompt-{name}.txt
tmux paste-buffer -t {name}
```

**CRITICAL:** Never use `tmux send-keys` for multi-line text — it mangles quotes and special chars. `load-buffer` + `paste-buffer` is the only reliable method.

**3d. Submit and validate:**

```bash
tmux send-keys -t {name} Enter && sleep 7 && tmux capture-pane -t {name} -p -S -50
```

Run with `run_in_background: true`. When notified, read the output.

**What to look for:** Claude is active — tool output, thinking indicators, task creation. NOT a bare shell prompt or Claude input prompt with no activity.

**If prompt didn't take:** Retry `load-buffer` + `paste-buffer` + `send-keys Enter`. Maximum 2 retries. If still failing, alert the user.

### Dispatch Ordering

- **Independent chunks:** Dispatch in parallel (launch multiple tmux sessions)
- **Dependent chunks:** Hold until prerequisites complete, then dispatch

---

## Phase 4: MONITOR

Monitor dispatched Managers using structured dispatch records, not pane capture.

### Primary Monitoring: check-manager.sh

```bash
plugins/agent-orchestrator/scripts/check-manager.sh {tmux-session-name}
```

Returns JSON:

```json
// Not found:
{"status":"not_found"}

// Running:
{"status":"running","last_event":{"event":"tool_end","tool":"Write","ts":"..."},"escalations":0}

// Complete:
{"tmux_session":"...","status":"complete","completed_at":...}
```

### Monitoring Cycle

1. **Check** — Run `check-manager.sh` for each active Manager
2. **Assess** — Based on status:
   - `running` + 0 escalations → wait and check again
   - `running` + escalations > 0 → read escalation file, handle (see below)
   - `complete` → Manager finished, check results
   - `not_found` → something went wrong, investigate
3. **Schedule next check** — Use these intervals:

| Signal | Interval | Rationale |
|--------|----------|-----------|
| Just dispatched | 15-20s | Quick validation |
| Running, no escalations | 45-60s | Normal pace |
| Running, active tool use | 30-45s | Monitor progress |
| Running, escalations present | 15-20s | Needs attention |
| Manager appears idle | 30s | Check for stall |

4. **Release dependent chunks** — When a prerequisite Manager completes, dispatch the next dependent chunk

### Handling Escalations

Read the escalation file:

```bash
cat ~/.claude/observatory/dispatch/{session-name}.escalations.jsonl
```

| Signal | Action |
|--------|--------|
| `CLARIFY` | Gather the needed info (ask user or dispatch research worker), then send answer to Manager via tmux |
| `ESCALATE` | Take over the failed unit — dispatch directly or ask user |
| `MISSING_SKILL` | Inform user, add skill to registry if available, or reassign task |
| `COMPLETE` | Manager is done — proceed to check output |

### Sending Follow-ups to Managers

When you need to send information to a running Manager (e.g., responding to a CLARIFY escalation):

```bash
echo "Your response text" > /tmp/tmux-reply-{name}.txt
tmux load-buffer /tmp/tmux-reply-{name}.txt && tmux paste-buffer -t {name} && sleep 1 && tmux send-keys -t {name} Enter
```

### Prompt Suggestions

If the Manager's Claude session shows a prompt suggestion (autocomplete text at the input line):

```bash
tmux send-keys -t {name} "Tab" "Enter"
```

**CRITICAL:** `"Tab"` and `"Enter"` must be separate quoted arguments. Tab accepts the autocomplete, Enter submits.

### Fallback: Pane Capture

If `check-manager.sh` returns unexpected results, fall back to direct pane capture:

```bash
tmux capture-pane -t {name} -p -S -50
```

### Stall Detection

If `check-manager.sh` shows the same `last_event` across 3 consecutive checks:

1. Fall back to pane capture to see what's happening
2. Check if Claude is still running: `pgrep -P $(tmux list-panes -t {name} -F '#{pane_pid}') -f "claude"`
3. If prompt suggestion visible → accept with `"Tab" "Enter"`
4. If hung → send gentle nudge: `tmux send-keys -t {name} Enter`
5. If process exited → Manager is done, proceed to completion
6. If 2-3 interventions don't help → alert user

---

## Phase 5: FINALIZE

After all build Managers complete, dispatch a finalization Manager.

### Steps

1. **Dispatch finalization Manager** — Create a new tmux session with the finalize workflow:
   - Task scope: "Verify and finalize output for {project name}"
   - Workflow: `finalize`
   - Input context: The original decomposition (chunk list, expected artifacts, output paths)
   - Output paths: Same as the build Managers

2. **Monitor** — Use the same monitoring cycle as Phase 4

3. **Collect report** — When the finalization Manager completes, read the final report from its dispatch record or last output

4. **Report to user** — Present the final results:
   - Pages built / failed / fixed
   - Output paths
   - Any warnings
   - Overall status (PASS/FAIL)

5. **Clean up** — Optionally clean up dispatch records from `~/.claude/observatory/dispatch/`

---

## Output Conventions

### Output Root

The output root is configurable. Options:
- User specifies in their request (e.g., "build to ~/projects/tutorials/")
- Inferred from project context
- Ask the user if unclear

### Index Convention

Each project directory gets an `index.html` with a machine-readable manifest:

```html
<script type="application/json" id="project-manifest">
{
  "project": "spi-protocol",
  "source": "/data/dev/projects/spi-driver",
  "created": "2026-02-17",
  "updated": "2026-02-17",
  "pages": [
    {"slug": "timing-diagram", "title": "SPI Timing & Clock Modes", "skill": "technical-visualizer"}
  ]
}
</script>
```

### Discovering Existing State

To check for existing output (for incremental updates):

```bash
# Glob for existing manifests
ls {output_root}/*/index.html
```

Parse the manifest JSON to understand what already exists. This enables incremental updates — add pages to an existing project without rebuilding everything.

### Build Responsibility

| Artifact | Built By | Dispatched By |
|----------|----------|---------------|
| Topic pages | Domain workers | Build Manager |
| index.html | Frontend-design worker | Finalization Manager |
| Manifest JSON | Same worker as index.html | Finalization Manager |

---

## Tmux Session Naming

Use descriptive, short names:
- `{project}-mgr` for build managers (e.g., `spi-tutorial-mgr`)
- `{project}-fin` for finalization manager (e.g., `spi-tutorial-fin`)
- `{project}-res` for research-only managers (e.g., `spi-tutorial-res`)

---

## Quick Reference

```
UNDERSTAND:
  1. Parse user intent
  2. Spawn research workers (Task tool, NOT tmux)
  3. Conflict check — hard gate, resolve before proceeding
  4. Synthesize confirmed scope

DECOMPOSE:
  1. List deliverables
  2. Group by workflow
  3. Consult skill registry
  4. Assign chunks with skill mappings
  5. Identify dependencies
  6. Present to user — hard gate, get approval

DISPATCH (per chunk):
  1. Write dispatch record to ~/.claude/observatory/dispatch/{name}.json
  2. Compose Manager prompt from template (above)
  3. tmux new-session -d -s {name} -c {dir}
  4. kitty sh -c "tmux attach -t {name}" &
  5. tmux send-keys: unset CLAUDECODE && claude --dangerously-skip-permissions
  6. load-buffer + paste-buffer the prompt
  7. send-keys Enter, capture-pane to validate

MONITOR:
  1. check-manager.sh per active Manager
  2. Handle escalations
  3. Release dependent chunks on completion
  4. Detect stalls (3 identical checks)

FINALIZE:
  1. Dispatch finalization Manager (finalize workflow)
  2. Monitor to completion
  3. Report results to user
  4. Clean up dispatch records
```
