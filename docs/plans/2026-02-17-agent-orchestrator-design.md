# Agent Orchestrator — Design Document

**Date:** 2026-02-17
**Status:** Approved
**Approach:** B — Orchestration plugin with composable worker skills

## Overview

A three-tier agent orchestration plugin for Claude Code. The orchestrator coordinates multi-session work through a Director → Manager → Worker hierarchy, where domain skills (technical-visualizer, frontend-design, etc.) are consumed at the Worker tier via runtime invocation. The system produces structured HTML output — interactive tutorials, educational guides, project documentation — with a machine-readable index convention for discovery and incremental updates.

The orchestration concern is fully separated from domain concerns. Adding new capabilities means installing a domain skill plugin and adding a registry entry. Zero orchestrator changes.

## Tier Architecture

### Director (originating session)

- **Role:** User interface, scope comprehension, high-level decomposition, dispatch
- **Skills:** brainstorming, orchestrator-director (operational playbook)
- **Spawns:** Manager tmux sessions, own Worker subagents (research/filtering only)
- **Context:** Maximum — full user intent + project state + skill registry
- **Never:** Invokes domain skills, writes output files, makes content decisions
- **Always:** Presents decomposition to user before dispatching, reports escalations, validates final output via finalization Manager

Director's own Workers (subagents, not tmux):
- Research: codebase exploration, summarization
- Filter: narrow scope, identify relevant files
- Validate: quick checks, answer questions

### Manager (tmux session, 1 per major scope)

- **Role:** Atomize Director's instructions, execute workflow templates, dispatch domain Workers
- **Skills:** orchestrator-manager (operational playbook)
- **Spawns:** Worker subagents only
- **Context:** Medium — scoped task + workflow template + relevant project subset
- **Never:** Interacts with user, spawns other Managers, modifies scope beyond what Director gave
- **Tracks:** `{artifact_path → last_worker_agent_id}` for debug-cycle resume

### Worker (subagent, 1 per atomic task)

- **Role:** Execute single task using one domain skill
- **Skills:** One domain skill per dispatch (invoked at runtime via Skill tool)
- **Spawns:** Nothing
- **Context:** Minimum — single task description + skill reference + file paths (~2000 token ceiling for injected context)
- **Never:** Spawns subagents, makes architectural decisions, expands scope, reads files outside whitelist, writes files outside output path

### Tier Boundaries

- **Director → Manager:** tmux dispatch (use-tmux patterns ingested into Director skill)
- **Director → own Workers:** Task tool subagents. Small, fast, disposable. Research/filtering only.
- **Manager → Workers:** Task tool subagents. One per atomic task. Each gets one skill reference + narrow file scope.
- **Workers → nothing:** Terminal nodes. Execute and return.

### Context Budget Enforcement

- Director prompt: Full user request + project manifest + skill registry. Heaviest context.
- Manager prompt: Task scope + workflow template + file list. No user conversation history, no other managers' tasks.
- Worker prompt: Task description + skill content + target file paths. No workflow context, no sibling awareness.

## Plugin Structure

```
plugins/agent-orchestrator/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── orchestrator-director/
│   │   └── SKILL.md              # Director operational playbook
│   │                               - conflict resolution procedure
│   │                               - decomposition methodology
│   │                               - dispatch protocol (ingests use-tmux patterns)
│   │                               - monitoring via check-manager.sh
│   │                               - escalation handling
│   │                               - brainstorming/superpowers references
│   │
│   └── orchestrator-manager/
│       └── SKILL.md              # Manager operational playbook
│                                   - atomization procedure
│                                   - workflow template selection
│                                   - worker dispatch protocol
│                                   - skill registry consumption
│                                   - escalation signal format
│                                   - stage execution rules
│                                   - dependency ordering
│                                   - agent resume rules
│
├── agents/
│   ├── director.md               # Persona only: identity, boundaries, tone
│   └── manager.md                # Persona only: identity, boundaries, tone
│
├── templates/
│   ├── workflows/
│   │   ├── research.md           # explore → summarize → validate
│   │   ├── build.md              # research → validate → create → test → debug
│   │   ├── validate.md           # check → compare → report
│   │   ├── refactor.md           # analyze → modify → test
│   │   └── finalize.md           # inventory → validate → consistency → report
│   │
│   ├── worker-prompts/
│   │   ├── research-worker.md    # Research subagent (Read/Grep/Glob only, no Skill)
│   │   ├── domain-worker.md      # Skill-executing worker (invokes one Skill)
│   │   └── validation-worker.md  # Verification subagent (reads and checks, no Skill)
│   │
│   └── manager-dispatch.md       # Template Director uses to compose Manager prompts
│
├── scripts/
│   ├── check-manager.sh          # Lightweight status check via dispatch records + JSONL
│   └── register-session.sh       # Manager SessionStart: links tmux name → session_id
│
├── registry/
│   └── skills.json               # Manifest of available domain skills
│
└── CLAUDE.md
```

### Component Separation

- **Agent `.md`** = Identity only. Who am I? What's my role? What don't I do? Short.
- **Skill `SKILL.md`** = Full operational playbook. Procedures, examples, templates, ingested patterns. Loaded into context when the tier activates.
- **Templates** = Parameterized documents. Skills point to templates for specific procedures.

Director skill loaded in originating session. Manager skill injected into tmux session prompt at dispatch time. Each tier loads only its own skill.

## Workflow Templates

### Template Structure

Each template defines stages executed in order. Each stage maps to one or more worker dispatches.

| Template | Stages | Use When |
|----------|--------|----------|
| **research** | explore → summarize → validate | Director needs information gathered and distilled |
| **build** | research → validate → create → test → debug | Producing an artifact (HTML page, component) |
| **validate** | check → compare → report | Verifying existing output against requirements |
| **refactor** | analyze → modify → test | Improving or updating existing artifacts |
| **finalize** | inventory → validate → consistency → report | Quality gate on completed output |

### Stage Rules

- Each stage = one or more worker dispatches
- A stage MUST complete before the next begins
- If debug fails twice, escalate to Director
- Create stage MUST include: skill reference, output path, input context from research

### Manager Execution Flow

```
Manager receives task + workflow template
    │
    ├─ 1. Parse task into atomic units
    │
    ├─ 2. For each unit, assign workflow template
    │
    ├─ 3. Execute units (parallel batches for independent, sequential for dependent)
    │
    ├─ 4. Per unit, per stage:
    │     ├─ Compose worker prompt from template
    │     ├─ Fill: {task}, {skill}, {files}, {output_path}, {context}
    │     ├─ Dispatch worker subagent
    │     └─ Collect result, feed into next stage
    │
    └─ 5. On completion: report summary
```

### Dependency Handling

Manager identifies dependencies during atomization. Independent units dispatch in parallel batches. Dependent units (e.g., index.html depends on all pages) wait for prerequisites.

### Worker Resume Rule

```
- New task, new artifact     → fresh worker
- Fix/debug on same artifact → resume original worker (by agent ID)
- Original worker unavailable → fresh worker with narrower context
```

Manager tracks `{artifact_path → last_worker_agent_id}` during execution. When a test stage finds an issue, the Manager resumes the original builder if possible. Falls back gracefully to fresh dispatch.

## Event-Driven Tier Communication

### Problem with Pane Capture

Pane capture is expensive (50 lines of raw text into context), non-deterministic (requires pattern matching), and requires interval guessing. We replace it with structured, event-driven communication using ai-scry's JSONL infrastructure.

### Three-Layer Communication

**Layer 1: Registration (Director → filesystem)**

Director writes a dispatch record when dispatching a Manager:

```
~/.claude/observatory/dispatch/<tmux-session-name>.json
{
  "tmux_session": "spi-tutorial-mgr",
  "task_scope": "Build SPI protocol tutorial",
  "dispatched_at": 1739800000000,
  "status": "dispatched",
  "output_paths": ["~/projects/tutorials/spi-protocol/"],
  "workflow": "build"
}
```

**Layer 2: Session Linking (Manager SessionStart)**

`register-session.sh` runs at Manager's SessionStart. If `$TMUX` is set, writes Claude session_id back into dispatch record:

```bash
TMUX_NAME=$(tmux display-message -p '#S')
DISPATCH_FILE="$HOME/.claude/observatory/dispatch/${TMUX_NAME}.json"
if [ -f "$DISPATCH_FILE" ]; then
  node -e "
    const f = '$DISPATCH_FILE';
    const d = JSON.parse(require('fs').readFileSync(f));
    d.session_id = process.env.CLAUDE_SESSION_ID;
    d.jsonl_path = '$HOME/.claude/observatory/sessions/' + d.session_id + '.jsonl';
    d.status = 'running';
    require('fs').writeFileSync(f, JSON.stringify(d, null, 2));
  "
fi
```

**Layer 3: Completion Signal (Manager Stop/SessionEnd)**

Manager's stop hook writes completion marker to dispatch record. Sets `status: "complete"` and `completed_at` timestamp.

### Director Monitoring

`check-manager.sh` replaces pane capture:

- Input: tmux session name
- Output: single JSON object with status + last event + escalation count
- Cost: `test -f` + `tail -1` on JSONL vs 50 lines of raw terminal text
- Fallback: pane capture available if script returns unexpected results

### Escalation Signals

Manager writes escalations to sidecar file:

```
~/.claude/observatory/dispatch/<tmux-session-name>.escalations.jsonl
{"type":"CLARIFY","message":"Need SPI clock polarity info","timestamp":...}
{"type":"ESCALATE","message":"timing-diagram worker failed twice","timestamp":...}
{"type":"MISSING_SKILL","message":"Need api-documenter skill","timestamp":...}
{"type":"COMPLETE","message":"All 4 pages built, 0 failures","timestamp":...}
```

Director checks this alongside dispatch status. Structured, deterministic.

## Director Workflow

```
User invokes /agent-orchestrator
    │
    ├─ 1. UNDERSTAND
    │     ├─ Parse user intent
    │     ├─ Spawn research workers: project structure, existing output
    │     ├─ CONFLICT CHECK:
    │     │   ├─ Compare findings across research workers
    │     │   ├─ Flag contradictions
    │     │   ├─ If conflicts → present to user with options
    │     │   └─ Hard gate: resolve before proceeding
    │     ├─ Synthesize: confirmed scope, resolved assumptions
    │     └─ Clarify remaining ambiguity with user
    │
    ├─ 2. DECOMPOSE
    │     ├─ Break scope into Manager-sized chunks
    │     ├─ Consult skills.json registry for available capabilities
    │     ├─ Assign: chunk → skill mapping
    │     ├─ Identify dependencies between chunks
    │     └─ Present decomposition to user for approval
    │
    ├─ 3. DISPATCH
    │     ├─ For each chunk (respecting dependency order):
    │     │   ├─ Write dispatch record
    │     │   ├─ Compose Manager prompt from manager-dispatch.md template
    │     │   └─ Dispatch via use-tmux patterns
    │     ├─ Independent chunks: dispatch in parallel
    │     └─ Dependent chunks: hold until prerequisites complete
    │
    ├─ 4. MONITOR
    │     ├─ Run check-manager.sh per active Manager
    │     ├─ Handle escalations (CLARIFY, MISSING_SKILL, ESCALATE)
    │     ├─ On Manager completion:
    │     │   ├─ Dispatch next dependent chunk if any
    │     │   └─ Spawn validation worker to spot-check output
    │     └─ Continue until all build Managers complete
    │
    └─ 5. FINALIZE
          ├─ Dispatch finalization Manager (uses finalize.md workflow)
          ├─ Monitor via check-manager.sh
          ├─ On completion: read final report from dispatch record
          ├─ If issues: report to user, optionally re-dispatch
          └─ If clean: report success, clean up dispatch records
```

## Worker Dispatch & Skill Consumption

### Worker Prompt Composition

Manager composes worker prompts from templates with these fields:

- **Identity:** Fixed constraint block (no spawning, no scope expansion)
- **Task:** Specific atomic task description
- **Skill reference:** Skill name to invoke via Skill tool at runtime (domain-worker only)
- **Input context:** Source file paths + research summary (minimal, ~2000 token ceiling)
- **Output contract:** Exact file path, format, success criteria
- **Constraints:** File whitelist (read), output path (write), error-and-stop policy

### Skill Consumption Flow

Domain workers invoke skills at runtime, not at prompt composition time:

1. Worker starts, reads task + constraints
2. Invokes Skill tool with provided skill name
3. Skill content loads into worker's context
4. Worker follows skill instructions with the provided task
5. Writes output to specified path
6. Reports completion

### Adding New Capabilities

1. Install the domain skill plugin
2. Add entry to `registry/skills.json`:

```json
{
  "name": "api-documenter",
  "plugin": "api-documenter",
  "type": "build",
  "output": "html",
  "description": "API reference documentation with interactive examples"
}
```

Zero orchestrator changes required.

## Output Structure

### Directory Layout

```
{output_root}/
├── {project-name}/
│   ├── index.html          # Entry point (human + machine readable)
│   ├── pages/              # Topic pages
│   │   └── {topic}.html
│   └── assets/             # Shared assets
└── {another-project}/
    ├── index.html
    └── pages/
```

Output root is configurable. Paths flow down from Director → Manager → Worker. Workers never decide where to write.

### Index Convention

Each `index.html` includes a machine-readable manifest:

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

Director's research workers discover existing state by globbing `{output_root}/*/index.html` and extracting manifest JSON. This enables incremental updates — add a page to an existing project without rebuilding everything.

### Build Responsibility

| Artifact | Built By | Dispatched By |
|----------|----------|---------------|
| Topic pages | Domain workers | Build Manager |
| index.html | Frontend-design worker | Finalization Manager |
| Manifest JSON | Same worker as index.html | Finalization Manager |
| Assets | Workers as needed | Build Manager |

### Multi-Directory Support

A single Manager can hand workers output paths across multiple project directories. The finalization Manager receives the full set of affected directories to update each index.html.

## Finalization Manager

Dedicated Manager role with its own workflow template (`finalize.md`):

### Stages

1. **Inventory** — Verify all expected files exist at output paths
2. **Validate** — Check index.html links resolve, pages render, cross-references work
3. **Consistency** — Compare output against Director's original decomposition (was everything delivered?)
4. **Report** — Produce structured completion report written to dispatch record

### Escalation

- Missing files → report which Manager/chunk failed
- Broken links → attempt fix via worker dispatch
- Gaps vs decomposition → escalate to Director with specifics
- Clean → write final report, signal complete
