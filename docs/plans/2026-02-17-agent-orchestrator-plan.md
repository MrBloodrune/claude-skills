# Agent Orchestrator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a three-tier orchestration plugin (Director/Manager/Worker) that coordinates multi-session work through tmux dispatch, event-driven communication via ai-scry JSONL, and composable domain skill consumption.

**Architecture:** Single plugin with two skills (director, manager), two agent personas, workflow/worker prompt templates, a skill registry, and monitoring scripts. Domain skills remain independent plugins consumed at runtime by Workers.

**Tech Stack:** Markdown (skills, agents, templates), JSON (registry, plugin manifest), Bash (scripts), Node.js one-liners (dispatch record manipulation)

**Design Doc:** `docs/plans/2026-02-17-agent-orchestrator-design.md`

---

### Task 1: Plugin Scaffold

**Files:**
- Create: `plugins/agent-orchestrator/.claude-plugin/plugin.json`
- Create: `plugins/agent-orchestrator/CLAUDE.md`

**Step 1: Create plugin.json**

```json
{
  "name": "agent-orchestrator",
  "version": "1.0.0",
  "description": "Three-tier Director/Manager/Worker orchestration for multi-session agent coordination with composable domain skills",
  "author": { "name": "MrBloodrune" },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "Apache-2.0",
  "keywords": ["orchestration", "agents", "tmux", "director", "manager", "worker", "multi-session"]
}
```

**Step 2: Create CLAUDE.md**

```markdown
# Agent Orchestrator

Three-tier orchestration plugin. See `docs/plans/2026-02-17-agent-orchestrator-design.md` for architecture.

## Structure
- `skills/orchestrator-director/` — Director operational playbook
- `skills/orchestrator-manager/` — Manager operational playbook
- `agents/` — Tier personas (identity only)
- `templates/` — Workflow and worker prompt templates
- `registry/` — Available domain skill manifest
- `scripts/` — Monitoring and session registration
```

**Step 3: Create directory structure**

Run: `mkdir -p plugins/agent-orchestrator/{.claude-plugin,skills/orchestrator-director,skills/orchestrator-manager,agents,templates/workflows,templates/worker-prompts,scripts,registry}`

**Step 4: Validate structure exists**

Run: `ls -R plugins/agent-orchestrator/`
Expected: All directories present

**Step 5: Commit**

```bash
git add plugins/agent-orchestrator/
git commit -m "feat(agent-orchestrator): scaffold plugin structure"
```

---

### Task 2: Skill Registry

**Files:**
- Create: `plugins/agent-orchestrator/registry/skills.json`

**Step 1: Create registry with known domain skills**

```json
{
  "description": "Available domain skills for worker dispatch. Add entries here when installing new domain skill plugins.",
  "skills": [
    {
      "name": "technical-visualizer",
      "plugin": "technical-visualizer",
      "type": "build",
      "output": "html",
      "description": "Interactive HTML visualizations for technical concepts with PCB schematic aesthetic, 15 visualization patterns"
    },
    {
      "name": "frontend-design",
      "plugin": "frontend-design",
      "type": "build",
      "output": "html",
      "description": "Production-grade frontend interfaces with high design quality, supports multi-page sites with index.html"
    }
  ]
}
```

**Step 2: Validate JSON is parseable**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('plugins/agent-orchestrator/registry/skills.json','utf8')).skills.length + ' skills registered')"`
Expected: `2 skills registered`

**Step 3: Commit**

```bash
git add plugins/agent-orchestrator/registry/skills.json
git commit -m "feat(agent-orchestrator): add skill registry with initial domain skills"
```

---

### Task 3: Agent Personas

**Files:**
- Create: `plugins/agent-orchestrator/agents/director.md`
- Create: `plugins/agent-orchestrator/agents/manager.md`

These are identity-only files. Short. No operational procedures (those go in skills).

**Step 1: Write Director persona**

```markdown
---
name: director
description: Use this agent for multi-session orchestrated work — building tutorials, educational guides, project documentation, or any task requiring decomposition across multiple agents and tmux sessions. Triggers on "orchestrate", "build tutorial", "create educational guide", "decompose project", or requests involving multi-agent coordination.

<example>
Context: User wants to create an interactive tutorial for a project
user: "Build an interactive tutorial for this SPI driver project"
assistant: "I'll use the director agent to orchestrate the tutorial creation across multiple sessions."
<commentary>
Multi-session orchestrated work. Director decomposes scope, dispatches managers via tmux, monitors completion.
</commentary>
</example>

model: inherit
color: green
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task"]
---

# Director — Tier 1 Coordinator

You are the Director. You coordinate, you never execute domain work.

## Identity

- You interact with the user to understand intent and resolve ambiguity
- You decompose scope into Manager-sized chunks
- You dispatch Managers via tmux sessions
- You monitor progress via check-manager.sh
- You report results and escalations to the user

## Boundaries

- **Never** invoke domain skills (technical-visualizer, frontend-design, etc.)
- **Never** write output files (HTML, assets)
- **Never** make content or design decisions
- **You may** spawn your own Worker subagents for research, summarization, and filtering to support your coordination duties
- **You may** use brainstorming and superpowers skills for workflow structuring

## Operational Playbook

Load skill: `orchestrator-director` for full procedures, templates, and dispatch protocol.
```

**Step 2: Write Manager persona**

```markdown
---
name: manager
description: Internal agent for the agent-orchestrator plugin. Not directly user-invocable. Dispatched by the Director into tmux sessions to atomize scoped tasks and dispatch Workers with domain skills.
model: inherit
color: blue
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task"]
---

# Manager — Tier 2 Executor

You are a Manager. You atomize and execute, you never interact with users or other Managers.

## Identity

- You receive a scoped task and a workflow template from the Director
- You break the task into atomic Worker-sized units
- You dispatch Workers with specific domain skill references
- You track artifact → worker agent ID mappings for debug-cycle resume
- You report completion and escalations via structured signals

## Boundaries

- **Never** interact with the user directly
- **Never** spawn other Managers or tmux sessions
- **Never** modify scope beyond what the Director assigned
- **Never** make architectural decisions — follow the workflow template
- **You may** dispatch Workers of any type (research, domain, validation)
- **You may** resume a previous Worker by agent ID for debug cycles on the same artifact

## Escalation Protocol

When blocked, write to escalation sidecar file — never improvise solutions outside your scope:
- `[CLARIFY]` — need information you don't have
- `[ESCALATE]` — worker failed twice on same task
- `[MISSING_SKILL]` — task requires a skill not in registry
- `[COMPLETE]` — all units finished

## Operational Playbook

Load skill: `orchestrator-manager` for full procedures, templates, and dispatch protocol.
```

**Step 3: Validate frontmatter parses**

Run: `head -5 plugins/agent-orchestrator/agents/director.md && head -5 plugins/agent-orchestrator/agents/manager.md`
Expected: YAML frontmatter with `---` delimiters, name field present

**Step 4: Commit**

```bash
git add plugins/agent-orchestrator/agents/
git commit -m "feat(agent-orchestrator): add director and manager agent personas"
```

---

### Task 4: Worker Prompt Templates

**Files:**
- Create: `plugins/agent-orchestrator/templates/worker-prompts/research-worker.md`
- Create: `plugins/agent-orchestrator/templates/worker-prompts/domain-worker.md`
- Create: `plugins/agent-orchestrator/templates/worker-prompts/validation-worker.md`

These are parameterized templates. Placeholders use `{variable}` syntax.

**Step 1: Write research worker template**

```markdown
# Research Worker

You are a research worker. You explore, summarize, and return findings. You do not create artifacts, modify files, or make decisions.

## Task

{task_description}

## Scope

Read only these files/directories:
{file_scope}

## Instructions

1. Explore the scoped files using Read, Grep, and Glob
2. Gather the specific information requested in the task
3. Summarize findings concisely (under 500 words)
4. If you cannot find the requested information, report what you searched and what was missing

## Output

Return your findings as structured text. Do not write files. Do not modify anything.

## Constraints

- Do not read files outside the provided scope
- Do not spawn subagents
- Do not use Write, Edit, or Bash tools
- If blocked, report the blocker and stop
```

**Step 2: Write domain worker template**

```markdown
# Domain Worker

You are a domain worker. You execute exactly one task using exactly one skill. You produce one artifact at the specified output path.

## Task

{task_description}

## Skill

Invoke this skill: `{skill_name}`

Follow the skill's instructions completely for the task described above.

## Input Context

{input_context}

## Source Files

Read these files for reference:
{source_files}

## Output Contract

- Write to: `{output_path}`
- Format: {output_format}
- Success criteria: {success_criteria}

## Constraints

- Invoke the specified skill via the Skill tool before starting work
- Do not read files outside the source files list
- Do not create files outside the output path
- Do not modify existing files unless the task explicitly requires it
- Do not spawn subagents
- Do not expand scope beyond the task description
- If blocked, report the error and stop — do not improvise
```

**Step 3: Write validation worker template**

```markdown
# Validation Worker

You are a validation worker. You verify artifacts meet specified criteria. You do not create or modify artifacts.

## Task

{task_description}

## Artifacts to Validate

{artifact_paths}

## Validation Criteria

{validation_criteria}

## Instructions

1. Read each artifact
2. Check against the provided criteria
3. Report pass/fail with specifics

## Output

Return a structured report:

```
Status: PASS | FAIL
Artifacts checked: [list]
Results:
  - {artifact}: PASS | FAIL — {detail}
Warnings: [any non-blocking issues]
```

## Constraints

- Do not modify any files
- Do not spawn subagents
- Do not use Write, Edit, or Bash tools
- Report findings only — do not attempt fixes
```

**Step 4: Commit**

```bash
git add plugins/agent-orchestrator/templates/worker-prompts/
git commit -m "feat(agent-orchestrator): add worker prompt templates (research, domain, validation)"
```

---

### Task 5: Workflow Templates

**Files:**
- Create: `plugins/agent-orchestrator/templates/workflows/research.md`
- Create: `plugins/agent-orchestrator/templates/workflows/build.md`
- Create: `plugins/agent-orchestrator/templates/workflows/validate.md`
- Create: `plugins/agent-orchestrator/templates/workflows/refactor.md`
- Create: `plugins/agent-orchestrator/templates/workflows/finalize.md`

**Step 1: Write research workflow**

```markdown
# Workflow: Research

**Use when:** Gathering and distilling information. No artifacts produced.

## Stages

1. **explore** — Dispatch research workers to scan the target scope. Each worker gets a specific question or area.
2. **summarize** — Dispatch a research worker to consolidate findings from explore stage into a structured summary.
3. **validate** — Dispatch a validation worker to cross-check the summary against source material for accuracy.

## Stage Details

### 1. explore
- Worker template: `research-worker.md`
- Parallelism: Yes — dispatch multiple workers for independent questions
- Output: Each worker returns text findings to Manager context

### 2. summarize
- Worker template: `research-worker.md`
- Input: Concatenated findings from explore stage
- Output: Structured summary (key concepts, relationships, gaps)

### 3. validate
- Worker template: `validation-worker.md`
- Input: Summary + original source file paths
- Criteria: "Does the summary accurately reflect the source material?"
- On FAIL: Return to summarize with corrections

## Completion

Report findings summary. No files written.
```

**Step 2: Write build workflow**

```markdown
# Workflow: Build

**Use when:** Producing artifacts (HTML pages, components, documentation).

## Stages

1. **research** — Understand the subject matter before building
2. **validate** — Confirm research is sufficient and accurate
3. **create** — Execute domain skill to produce the artifact
4. **test** — Verify artifact correctness
5. **debug** — Fix issues found in test (max 2 attempts, then escalate)

## Stage Details

### 1. research
- Worker template: `research-worker.md`
- Scope: Source files relevant to this build unit
- Output: Concept summary, key details, structure recommendations

### 2. validate
- Worker template: `validation-worker.md`
- Input: Research summary + source files
- Criteria: "Is the research complete enough to build the artifact?"
- On FAIL: Return to research with specific gaps identified

### 3. create
- Worker template: `domain-worker.md`
- Skill: From registry, matched to task type
- Input: Research summary + source files + output path
- Output: Artifact at specified path
- **Track agent ID** for potential debug-cycle resume

### 4. test
- Worker template: `validation-worker.md`
- Input: Created artifact path
- Criteria: File exists, content is well-formed, skill-specific checks (e.g., HTML renders, links resolve)
- On PASS: Proceed to completion
- On FAIL: Proceed to debug

### 5. debug
- **Resume original create worker** by agent ID if available
- Input: Test failure details + artifact path
- On success: Return to test stage
- On second failure: Escalate — `[ESCALATE] {task} failed: {failure details}`

## Completion

Report: artifact path, skill used, pass/fail status.
```

**Step 3: Write validate workflow**

```markdown
# Workflow: Validate

**Use when:** Verifying existing artifacts against requirements. No artifacts produced or modified.

## Stages

1. **check** — Read and analyze each artifact
2. **compare** — Cross-reference against requirements or source material
3. **report** — Produce structured validation report

## Stage Details

### 1. check
- Worker template: `validation-worker.md`
- Parallelism: Yes — one worker per artifact or artifact group
- Criteria: Structural integrity, format correctness, content present

### 2. compare
- Worker template: `validation-worker.md`
- Input: Check results + original requirements/decomposition
- Criteria: "Does the artifact set cover all required deliverables?"

### 3. report
- Worker template: `research-worker.md`
- Input: All check and compare results
- Output: Consolidated report with pass/fail per artifact, gaps, warnings

## Completion

Report validation results. No files modified.
```

**Step 4: Write refactor workflow**

```markdown
# Workflow: Refactor

**Use when:** Improving or updating existing artifacts.

## Stages

1. **analyze** — Understand current artifact state and what needs to change
2. **modify** — Apply changes via domain skill
3. **test** — Verify modifications didn't break anything

## Stage Details

### 1. analyze
- Worker template: `research-worker.md`
- Scope: Existing artifact + requirements for changes
- Output: Change plan — what to modify, what to preserve

### 2. modify
- Worker template: `domain-worker.md`
- Skill: Same skill that produced the original artifact
- Input: Existing artifact path + change plan
- **Track agent ID** for potential debug-cycle resume

### 3. test
- Worker template: `validation-worker.md`
- Criteria: Changes applied correctly, existing functionality preserved
- On FAIL: Resume modify worker with failure details (max 2 attempts, then escalate)

## Completion

Report: artifact path, changes applied, pass/fail status.
```

**Step 5: Write finalize workflow**

```markdown
# Workflow: Finalize

**Use when:** Quality gate on completed output. Dispatched as a dedicated Manager by the Director after all build Managers complete.

## Stages

1. **inventory** — Verify all expected files exist at output paths
2. **validate** — Check index.html links, page rendering, cross-references
3. **consistency** — Compare output against Director's original decomposition
4. **report** — Produce structured completion report

## Stage Details

### 1. inventory
- Worker template: `validation-worker.md`
- Input: Expected file list from Director's decomposition
- Criteria: Every expected file exists at its path
- Output: Present/missing file list

### 2. validate
- Worker template: `validation-worker.md`
- Parallelism: Yes — one worker per project directory
- Criteria: index.html links resolve to existing pages, pages are well-formed HTML
- On individual page FAIL: Dispatch domain worker to fix (one attempt), then note in report

### 3. consistency
- Worker template: `validation-worker.md`
- Input: Director's original decomposition + inventory results
- Criteria: "Was everything in the decomposition delivered?"
- Output: Coverage report — delivered, missing, extra

### 4. report
- Worker template: `research-worker.md`
- Input: All stage results
- Output: Structured completion report written to dispatch record:
  ```json
  {
    "pages_built": 4,
    "pages_failed": 0,
    "pages_fixed": 1,
    "warnings": ["register-map.html has no deep-dive modals"],
    "output_paths": ["~/projects/tutorials/spi-protocol/"],
    "status": "PASS"
  }
  ```

## Completion

Write report to dispatch record. Signal `[COMPLETE]` with summary.
```

**Step 6: Commit**

```bash
git add plugins/agent-orchestrator/templates/workflows/
git commit -m "feat(agent-orchestrator): add workflow templates (research, build, validate, refactor, finalize)"
```

---

### Task 6: Manager Dispatch Template

**Files:**
- Create: `plugins/agent-orchestrator/templates/manager-dispatch.md`

This is the template the Director uses to compose the full prompt sent to a Manager tmux session.

**Step 1: Write dispatch template**

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

**Step 2: Commit**

```bash
git add plugins/agent-orchestrator/templates/manager-dispatch.md
git commit -m "feat(agent-orchestrator): add manager dispatch prompt template"
```

---

### Task 7: Monitoring & Registration Scripts

**Files:**
- Create: `plugins/agent-orchestrator/scripts/check-manager.sh`
- Create: `plugins/agent-orchestrator/scripts/register-session.sh`

**Step 1: Write check-manager.sh**

```bash
#!/bin/bash
# check-manager.sh <tmux-session-name>
# Returns JSON status of a dispatched Manager session.
# Used by Director to monitor without pane capture.

set -euo pipefail

TMUX_NAME="${1:?Usage: check-manager.sh <tmux-session-name>}"
DISPATCH_DIR="$HOME/.claude/observatory/dispatch"
DISPATCH="$DISPATCH_DIR/$TMUX_NAME.json"
ESCALATIONS="$DISPATCH_DIR/$TMUX_NAME.escalations.jsonl"

if [ ! -f "$DISPATCH" ]; then
  echo '{"status":"not_found"}'
  exit 0
fi

STATUS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$DISPATCH','utf8')).status)")

case "$STATUS" in
  complete)
    cat "$DISPATCH"
    ;;
  running)
    JSONL=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$DISPATCH','utf8')).jsonl_path || '')")
    LAST_EVENT='null'
    if [ -n "$JSONL" ] && [ -f "$JSONL" ]; then
      LAST_EVENT=$(tail -1 "$JSONL" 2>/dev/null | node -e "
        let d='';
        process.stdin.on('data',c=>d+=c);
        process.stdin.on('end',()=>{
          try{const j=JSON.parse(d);console.log(JSON.stringify({event:j.event_type,tool:j.tool_name||'',ts:j.timestamp}))}
          catch(e){console.log('null')}
        })
      " 2>/dev/null || echo 'null')
    fi
    ESC_COUNT=0
    if [ -f "$ESCALATIONS" ]; then
      ESC_COUNT=$(wc -l < "$ESCALATIONS" | tr -d ' ')
    fi
    echo "{\"status\":\"running\",\"last_event\":$LAST_EVENT,\"escalations\":$ESC_COUNT}"
    ;;
  *)
    cat "$DISPATCH"
    ;;
esac
```

**Step 2: Write register-session.sh**

```bash
#!/bin/bash
# register-session.sh
# Called at Manager's SessionStart to link tmux session name → Claude session_id.
# Updates the dispatch record written by the Director.

set -euo pipefail

# Only run inside tmux
if [ -z "${TMUX:-}" ]; then
  exit 0
fi

TMUX_NAME=$(tmux display-message -p '#S')
DISPATCH_DIR="$HOME/.claude/observatory/dispatch"
DISPATCH_FILE="$DISPATCH_DIR/$TMUX_NAME.json"

# Only update if Director wrote a dispatch record for this session
if [ ! -f "$DISPATCH_FILE" ]; then
  exit 0
fi

node -e "
  const fs = require('fs');
  const f = '$DISPATCH_FILE';
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  d.session_id = process.env.CLAUDE_SESSION_ID || '';
  if (d.session_id) {
    d.jsonl_path = require('path').join(
      process.env.HOME, '.claude', 'observatory', 'sessions', d.session_id + '.jsonl'
    );
  }
  d.status = 'running';
  d.started_at = Date.now();
  fs.writeFileSync(f, JSON.stringify(d, null, 2));
"
```

**Step 3: Make scripts executable**

Run: `chmod +x plugins/agent-orchestrator/scripts/check-manager.sh plugins/agent-orchestrator/scripts/register-session.sh`

**Step 4: Test check-manager.sh with no dispatch record**

Run: `plugins/agent-orchestrator/scripts/check-manager.sh nonexistent-session`
Expected: `{"status":"not_found"}`

**Step 5: Commit**

```bash
git add plugins/agent-orchestrator/scripts/
git commit -m "feat(agent-orchestrator): add check-manager and register-session scripts"
```

---

### Task 8: Manager Skill

**Files:**
- Create: `plugins/agent-orchestrator/skills/orchestrator-manager/SKILL.md`

This is the Manager's full operational playbook. It's loaded into the Manager's tmux session context and defines every procedure the Manager follows.

**Step 1: Write the Manager skill**

Reference files while writing:
- `docs/plans/2026-02-17-agent-orchestrator-design.md` — Section 3 (Workflow Templates), Section 5 (Worker Dispatch)
- `plugins/agent-orchestrator/templates/workflows/*.md` — all workflow templates (Task 5)
- `plugins/agent-orchestrator/templates/worker-prompts/*.md` — all worker prompt templates (Task 4)

The skill must cover:
1. Atomization procedure — how to break a scoped task into worker units
2. Workflow template selection — which template for which task type
3. Worker dispatch protocol — how to compose and dispatch worker prompts using templates
4. Dependency identification and batch ordering
5. Agent ID tracking for debug-cycle resume
6. Escalation signal format and when to use each type
7. Stage execution rules (sequential stages, parallel workers within stages)
8. Completion reporting format

The skill should reference templates by relative path from plugin root: `templates/workflows/build.md`, `templates/worker-prompts/domain-worker.md`, etc.

The skill should include the worker prompt template content inline (since workers can't load skills from files) and explain how to fill the `{variable}` placeholders.

**Step 2: Validate frontmatter**

Run: `head -5 plugins/agent-orchestrator/skills/orchestrator-manager/SKILL.md`
Expected: Valid YAML frontmatter with name and description

**Step 3: Commit**

```bash
git add plugins/agent-orchestrator/skills/orchestrator-manager/
git commit -m "feat(agent-orchestrator): add manager operational skill"
```

---

### Task 9: Director Skill

**Files:**
- Create: `plugins/agent-orchestrator/skills/orchestrator-director/SKILL.md`

This is the Director's full operational playbook. It's loaded in the originating session and defines the complete Director workflow.

**Step 1: Write the Director skill**

Reference files while writing:
- `docs/plans/2026-02-17-agent-orchestrator-design.md` — Section 4 (Director Workflow), Section 3b (Event-Driven Communication), Section 6 (Output Structure)
- `plugins/agent-orchestrator/templates/manager-dispatch.md` — Manager dispatch template (Task 6)
- `plugins/agent-orchestrator/scripts/check-manager.sh` — Monitoring script (Task 7)
- `plugins/agent-orchestrator/registry/skills.json` — Skill registry (Task 2)
- `plugins/use-tmux/skills/use-tmux/SKILL.md` — tmux dispatch patterns to ingest

The skill must cover:
1. UNDERSTAND phase — user intent parsing, research worker dispatch, conflict resolution hard gate
2. DECOMPOSE phase — scope breakdown, skill registry consultation, dependency identification, user approval gate
3. DISPATCH phase — dispatch record creation, Manager prompt composition from template, tmux session launch (ingest use-tmux patterns: `load-buffer` + `paste-buffer`, `unset CLAUDECODE`, detached session first)
4. MONITOR phase — `check-manager.sh` usage, adaptive intervals, escalation handling, dependent chunk release
5. FINALIZE phase — finalization Manager dispatch, final report collection, user reporting
6. Output conventions — output root, per-project directories, index.html with manifest, discovery via glob
7. Director's own Worker usage — when and how to spawn research/filter/validate workers for coordination support

The skill should include the manager-dispatch.md template content inline and explain how to fill placeholders.

The skill should include the key use-tmux dispatch patterns inline (session creation, prompt delivery, `unset CLAUDECODE`) rather than referencing the use-tmux skill, so the Director doesn't need to load two skills.

**Step 2: Validate frontmatter**

Run: `head -5 plugins/agent-orchestrator/skills/orchestrator-director/SKILL.md`
Expected: Valid YAML frontmatter with name and description

**Step 3: Commit**

```bash
git add plugins/agent-orchestrator/skills/orchestrator-director/
git commit -m "feat(agent-orchestrator): add director operational skill"
```

---

### Task 10: Marketplace Registration

**Files:**
- Modify: `.claude-plugin/marketplace.json`

**Step 1: Read current marketplace.json**

Read: `.claude-plugin/marketplace.json`

**Step 2: Add agent-orchestrator entry to plugins array**

Add to the `plugins` array (alphabetical position):

```json
{
  "name": "agent-orchestrator",
  "description": "Three-tier Director/Manager/Worker orchestration for multi-session agent coordination with composable domain skills",
  "source": "./plugins/agent-orchestrator",
  "strict": false
}
```

**Step 3: Validate JSON**

Run: `node -e "const m=JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8'));const p=m.plugins.find(p=>p.name==='agent-orchestrator');console.log(p?'Found: '+p.description:'NOT FOUND')"`
Expected: `Found: Three-tier Director/Manager/Worker orchestration...`

**Step 4: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat(agent-orchestrator): register plugin in marketplace"
```

---

### Task 11: Plugin Validation

**Step 1: Run plugin-validator**

Use the `plugin-dev:plugin-validator` agent on `plugins/agent-orchestrator/` to verify:
- plugin.json is valid
- Skills have correct frontmatter
- Agents have correct frontmatter
- All referenced files exist
- Directory structure follows conventions

**Step 2: Fix any issues found**

Address validation findings and re-validate.

**Step 3: Final commit if fixes needed**

```bash
git add plugins/agent-orchestrator/
git commit -m "fix(agent-orchestrator): address plugin validation findings"
```

---

### Task 12: Integration Smoke Test

**Step 1: Verify skill triggers**

Confirm the Director skill's description triggers on expected phrases by reviewing the frontmatter.

**Step 2: Test check-manager.sh with a mock dispatch record**

```bash
mkdir -p ~/.claude/observatory/dispatch
echo '{"tmux_session":"test-mgr","status":"running","session_id":"","jsonl_path":""}' > ~/.claude/observatory/dispatch/test-mgr.json
plugins/agent-orchestrator/scripts/check-manager.sh test-mgr
rm ~/.claude/observatory/dispatch/test-mgr.json
```
Expected: `{"status":"running","last_event":null,"escalations":0}`

**Step 3: Test register-session.sh outside tmux**

Run: `plugins/agent-orchestrator/scripts/register-session.sh`
Expected: Silent exit (exits early when not in tmux)

**Step 4: Verify skill registry loads**

Run: `node -e "const r=JSON.parse(require('fs').readFileSync('plugins/agent-orchestrator/registry/skills.json','utf8'));r.skills.forEach(s=>console.log(s.name+' ('+s.type+') → '+s.output))"`
Expected:
```
technical-visualizer (build) → html
frontend-design (build) → html
```

**Step 5: Final commit**

```bash
git add -A plugins/agent-orchestrator/
git commit -m "chore(agent-orchestrator): integration smoke test validation"
```

---

## Task Dependencies

```
Task 1 (scaffold) ─┬─ Task 2 (registry)
                    ├─ Task 3 (personas)
                    ├─ Task 4 (worker templates)
                    ├─ Task 5 (workflows)
                    ├─ Task 6 (dispatch template)
                    └─ Task 7 (scripts)
                          │
Tasks 2-7 complete ──┬─ Task 8 (manager skill)
                     └─ Task 9 (director skill)
                          │
Tasks 8-9 complete ──── Task 10 (marketplace)
                          │
Task 10 complete ───┬── Task 11 (validation)
                    └── Task 12 (smoke test)
```

Tasks 2-7 are independent and can be executed in parallel after Task 1.
Tasks 8-9 can be executed in parallel after Tasks 2-7.
Tasks 11-12 can be executed in parallel after Task 10.

## Notes for Implementer

- **Tasks 8 and 9 are the heaviest.** The skills are the core deliverable — they contain the full operational playbooks. Budget most time here.
- **Task 9 (Director skill) should ingest use-tmux patterns inline** rather than referencing the skill. Read `plugins/use-tmux/skills/use-tmux/SKILL.md` for the dispatch protocol, session creation, prompt delivery, and monitoring patterns.
- **Worker prompt templates (Task 4) must be included inline in the Manager skill (Task 8)** since workers are subagents that can't read files from the plugin directory at runtime.
- **All template placeholders use `{variable}` syntax.** The skills explain how to fill them.
- **The output root path is configurable.** The Director skill should document how to set it (e.g., via CLAUDE.md or user prompt).
