# Tmux Adaptive Pane-Based Monitoring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace file-based polling in tmux-sessions with direct pane capture and LLM-driven adaptive monitoring via discrete one-shot background checks.

**Architecture:** The parent session fires `sleep N && tmux capture-pane` as background Bash tasks, reads results when notified, reasons about what the child is doing, and decides the next interval. No sentinel files, no event logs, no monitoring scripts. The skill text is the entire monitoring system.

**Tech Stack:** Bash (tmux commands), Claude Code skills (markdown), plugin hooks (JSON)

**Design doc:** `docs/plans/2026-02-15-tmux-adaptive-monitoring-design.md`

---

### Task 1: Remove file-based monitoring infrastructure

**Files:**
- Delete: `plugins/tmux-sessions/hooks/stop.sh`
- Delete: `plugins/tmux-sessions/hooks/pre-tool-use.sh`
- Delete: `plugins/tmux-sessions/scripts/event-watcher.sh`

**Step 1: Delete the three files**

```bash
rm plugins/tmux-sessions/hooks/stop.sh
rm plugins/tmux-sessions/hooks/pre-tool-use.sh
rm plugins/tmux-sessions/scripts/event-watcher.sh
```

**Step 2: Remove the scripts directory if empty**

```bash
rmdir plugins/tmux-sessions/scripts
```

**Step 3: Commit**

```bash
git add -u plugins/tmux-sessions/hooks/stop.sh plugins/tmux-sessions/hooks/pre-tool-use.sh plugins/tmux-sessions/scripts/event-watcher.sh
git commit -m "refactor(tmux-sessions): remove file-based monitoring hooks and event watcher

Remove stop.sh (sentinel files), pre-tool-use.sh (event logs),
and event-watcher.sh. Monitoring moves to direct pane capture."
```

---

### Task 2: Update hooks.json to remove deleted hooks

**Files:**
- Modify: `plugins/tmux-sessions/hooks/hooks.json`

**Step 1: Rewrite hooks.json**

Remove the `Stop` and `PreToolUse` entries. Keep only `SessionStart` and `SessionEnd`:

```json
{
  "description": "tmux-sessions hooks — registers Claude sessions running in tmux",
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh", "timeout": 5 }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-end.sh", "timeout": 5 }] }
    ]
  }
}
```

**Step 2: Verify JSON is valid**

```bash
jq . plugins/tmux-sessions/hooks/hooks.json
```

Expected: pretty-printed JSON, no errors.

**Step 3: Commit**

```bash
git add plugins/tmux-sessions/hooks/hooks.json
git commit -m "refactor(tmux-sessions): strip Stop and PreToolUse hooks from hooks.json"
```

---

### Task 3: Update plugin.json

**Files:**
- Modify: `plugins/tmux-sessions/.claude-plugin/plugin.json`

**Step 1: Update version and description**

Change version from `"0.4.1"` to `"0.5.0"` and update description:

```json
{
  "name": "tmux-sessions",
  "version": "0.5.0",
  "description": "Spawn, manage, and monitor interactive Claude sessions in tmux with adaptive pane-based monitoring",
  "author": { "name": "MrBloodrune" },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "Apache-2.0",
  "keywords": ["tmux", "sessions", "dispatch", "parallel", "monitoring"],
  "hooks": "./hooks/hooks.json"
}
```

**Step 2: Commit**

```bash
git add plugins/tmux-sessions/.claude-plugin/plugin.json
git commit -m "chore(tmux-sessions): bump to v0.5.0 for adaptive monitoring"
```

---

### Task 4: Rewrite tmux-dispatch skill

This is the core task. The skill must teach the parent the full monitoring lifecycle.

**Files:**
- Modify: `plugins/tmux-sessions/skills/tmux-dispatch/SKILL.md`

**Step 1: Write the new skill**

Replace the entire file. The new skill has 6 sections:

1. **Purpose & Ownership Model** — same ownership rules (parent is monitor-only), but updated to reference pane capture instead of file-based communication.

2. **Launch Procedure** — Steps 1-4 unchanged (create tmux session, launch Claude, send prompt via load-buffer, submit with Enter). Remove Step 5's reference to "start background polling". Remove Steps 6-7 entirely (sentinel polling, event watcher). Keep the follow-up messages section.

3. **Validation Cycle** (new) — After submitting the prompt:
   - Fire `sleep 10 && tmux capture-pane -t <name> -p -S -50` with `run_in_background: true`
   - On result: confirm Claude is active (tool output, thinking indicators, not bare shell prompt)
   - If prompt didn't take: retry paste-buffer, check again
   - Max 2 retries before alerting user
   - On success: transition to active monitoring

4. **Active Monitoring** (new) — The reference table:

   | Signal in Pane | Suggested Interval | Rationale |
   |---|---|---|
   | Just dispatched, confirming prompt took | 10-15s | Quick validation cycle |
   | Active file edits (Write/Edit tool output visible) | 30-45s | Rapid changes, check frequently |
   | Running tests / build output scrolling | 60-120s | Let it finish, but catch failures |
   | Long compile or install (npm, cargo, etc.) | 120-180s | Known slow operations |
   | Subagent spawned (Task tool visible) | 90-120s | Subagents take time |
   | Planning / reading files (Read/Glob output) | 45-60s | Moderate pace work |
   | Conversation with user (AskUserQuestion visible) | 30s | Child might be blocked waiting |

   Instructions:
   - Reason about what the child is doing based on pane content
   - Compare to previous capture (held in conversation context)
   - Pick an interval from the reference table, adjust based on how much changed
   - Fire `sleep N && tmux capture-pane -t <name> -p -S -50` with `run_in_background: true`
   - When result comes back, assess and repeat

   Adjustment guidance:
   - Significant new output → interval is right, maintain
   - Lots of new output (scrolled far) → too long, shorten
   - Nearly identical but still working → lengthen slightly
   - After stall confirmed → drop to 15-20s during diagnosis

5. **Stall Detection & Triage** (new):
   - 1 identical capture: not a stall
   - 2 consecutive identical: potential stall
   - 3 consecutive identical: confirmed stall
   - Triage sequence:
     1. Shorten to 15s checks
     2. Diagnose: `tmux has-session -t <name>`, `pgrep -P $(tmux list-panes -t <name> -F '#{pane_pid}') -f "claude"`
     3. Attempt resolution: nudge via `tmux send-keys`, or skip to completion if process dead
     4. Re-check at 10-15s
     5. Escalate after 2-3 failed attempts — show frozen output, ask user

6. **Completion & Review**:
   - Detect completion: shell prompt returned, Claude exit message, process no longer running
   - Verify: `pgrep` against pane PID
   - Launch code-reviewer subagent (same as current Step 8 — keep the Task tool example with `subagent_type: "superpowers:code-reviewer"`)
   - Report results to user

Keep **Common Mistakes** table (updated: remove sentinel-related rows, add monitoring-related guidance). Keep **Sending Follow-Up Messages** section unchanged.

**Step 2: Read the file back and verify it has all 6 sections**

Verify the headings: Purpose, Launch Procedure, Validation Cycle, Active Monitoring, Stall Detection, Completion & Review.

**Step 3: Commit**

```bash
git add plugins/tmux-sessions/skills/tmux-dispatch/SKILL.md
git commit -m "feat(tmux-sessions): rewrite dispatch skill with adaptive pane-based monitoring

Three-phase lifecycle: validate, monitor, complete. Adaptive sleep
intervals via reference table and LLM reasoning. Autonomous stall
triage. No file-based polling."
```

---

### Task 5: Rewrite tmux-status skill

**Files:**
- Modify: `plugins/tmux-sessions/skills/tmux-status/SKILL.md`

**Step 1: Write the simplified skill**

Replace the entire file. The new status skill is a concise reference card:

- **Purpose**: Quick manual spot-checks on dispatched sessions.
- **Is it done?**: `pgrep` against pane PID + pane capture. No sentinel file.
- **What's it doing?**: `tmux capture-pane -t <name> -p -S -50`
- **Session exists?**: `tmux has-session -t <name>`
- **List sessions**: `tmux list-sessions`
- **Active registrations**: Loop over `~/.claude/tmux-sessions/*.json` (from session-start hook)

Remove: all event file references, event watcher invocation, sentinel file checks, event format documentation, cleanup commands for event files.

**Step 2: Read back and verify no references to sentinel files, event files, or event-watcher.sh**

```bash
grep -i "sentinel\|event\|watcher\|\.done\|tmux-events" plugins/tmux-sessions/skills/tmux-status/SKILL.md
```

Expected: no matches.

**Step 3: Commit**

```bash
git add plugins/tmux-sessions/skills/tmux-status/SKILL.md
git commit -m "refactor(tmux-sessions): simplify status skill to direct pane inspection

Remove all event file, sentinel, and event-watcher references.
Status is now a reference card for pane capture and process checks."
```

---

### Task 6: Final verification

**Step 1: Check no remaining references to removed infrastructure**

Search the entire plugin for stale references:

```bash
grep -r "sentinel\|\.done\|tmux-events\|event-watcher\|pre-tool-use\|stop\.sh" plugins/tmux-sessions/
```

Expected: no matches.

**Step 2: Verify plugin file structure**

```bash
find plugins/tmux-sessions/ -type f | sort
```

Expected:
```
plugins/tmux-sessions/.claude-plugin/plugin.json
plugins/tmux-sessions/hooks/hooks.json
plugins/tmux-sessions/hooks/session-end.sh
plugins/tmux-sessions/hooks/session-start.sh
plugins/tmux-sessions/skills/tmux-dispatch/SKILL.md
plugins/tmux-sessions/skills/tmux-status/SKILL.md
```

**Step 3: Validate hooks.json**

```bash
jq . plugins/tmux-sessions/hooks/hooks.json
```

Expected: valid JSON with only SessionStart and SessionEnd.

**Step 4: Validate plugin.json**

```bash
jq . plugins/tmux-sessions/.claude-plugin/plugin.json
```

Expected: version 0.5.0, updated description.

**Step 5: Review git log**

```bash
git log --oneline -5
```

Expected: 5 commits matching Tasks 1-5.
