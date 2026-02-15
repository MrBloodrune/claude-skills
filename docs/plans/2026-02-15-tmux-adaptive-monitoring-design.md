# Tmux Adaptive Pane-Based Monitoring

**Date**: 2026-02-15
**Status**: Approved
**Plugin**: tmux-sessions

## Summary

Replace file-based polling (sentinel files, event logs, event watcher) with direct tmux pane capture and LLM-driven adaptive monitoring. The parent session reasons about what it sees in the child's pane, picks sleep intervals intelligently, and handles stalls autonomously before escalating.

## Core Architecture

### Approach: Skill-Driven Reasoning

The tmux-dispatch skill is the entire monitoring system. No scripts, no state files, no hooks writing monitoring data. The parent:

1. Captures the child's pane output via `tmux capture-pane`
2. Reasons about what the child is doing
3. Decides how long to sleep before the next check
4. Fires discrete one-shot `sleep N && tmux capture-pane -t <name> -p -S -50` with `run_in_background: true`
5. Processes each result as a fresh decision point

No file-based communication. Conversation context holds monitoring state naturally.

## Three-Phase Monitoring Lifecycle

### Phase 1: Dispatch & Validate (0-15s)

After sending the prompt to the child tmux pane:

1. Fire `sleep 10 && tmux capture-pane -t <name> -p -S -50` with `run_in_background: true`
2. On result: confirm Claude is active (tool output, thinking indicators -- not a bare shell prompt)
3. If prompt didn't take: retry the `load-buffer` + `paste-buffer` sequence, check again
4. Max 2 retry attempts before alerting the user

### Phase 2: Active Monitoring (ongoing)

Repeating cycle of discrete one-shot background checks:

1. Parent reasons about what the child is likely doing and picks a sleep duration
2. Fires `sleep N && tmux capture-pane -t <name> -p -S -50` with `run_in_background: true`
3. When the task notification comes back, parent reads the output
4. Parent assesses: progress, completion, or stall
5. Decides next action: fire another check (with adjusted interval), intervene, or proceed to Phase 3

### Phase 3: Completion & Review

Parent detects the child has finished (shell prompt returned, Claude exited, or explicit completion text). Launches code-reviewer subagent to validate the work, then reports results to the user.

## Adaptive Sleep Heuristic

The skill provides a reference table the parent consults when reasoning. These are guidelines, not hard rules -- the parent adjusts based on what it actually sees.

| Signal in Pane | Suggested Interval | Rationale |
|---|---|---|
| Just dispatched, confirming prompt took | 10-15s | Quick validation cycle |
| Active file edits (Write/Edit tool output visible) | 30-45s | Rapid changes, check frequently |
| Running tests / build output scrolling | 60-120s | Let it finish, but catch failures |
| Long compile or install (npm, cargo, etc.) | 120-180s | Known slow operations |
| Subagent spawned (Task tool visible) | 90-120s | Subagents take time |
| Planning / reading files (Read/Glob output) | 45-60s | Moderate pace work |
| Conversation with user (AskUserQuestion visible) | 30s | Child might be blocked waiting |

### Adjustment Rules

- Significant new output since last check: interval is about right, maintain
- Lots of new output (scrolled far past last seen): interval was too long, shorten
- Nearly identical but child clearly still working (spinner, partial output): lengthen slightly
- After stall confirmed: drop to 15-20s checks during diagnosis

The parent holds its previous capture in conversation context and compares naturally -- no hashing, no state files.

## Stall Detection & Autonomous Triage

### Detecting a Stall

- One identical capture: not a stall (child might be thinking or waiting for a slow operation)
- Two consecutive identical captures: potential stall
- Three consecutive identical captures: confirmed stall

### Triage Sequence

1. **Shorten interval** -- drop to 15s checks for a clearer picture
2. **Diagnose** -- check session existence (`tmux has-session -t <name>`), check process (`pgrep` against pane PID). Determines crashed vs hung.
3. **Attempt resolution** based on what's visible:
   - Child waiting at a permission prompt: send appropriate keystroke via `tmux send-keys`
   - Child appears hung mid-output: send a gentle nudge (Enter keypress)
   - Child process exited / session dead: skip to completion phase, report what happened
4. **Re-check** -- 10-15s check after any intervention
5. **Escalate** -- if 2-3 intervention attempts don't change the pane, alert user with frozen output and ask what to do

## Completion Detection

No sentinel files. Parent recognizes completion signals directly from pane content:

- Shell prompt returned (e.g., `$` or `%` at the end of output)
- Claude exit message visible
- Explicit "task complete" or similar text in output

Verified by process status check (`pgrep` against pane PID). If Claude process is gone and shell prompt is back, the child is done.

Post-completion: launch code-reviewer subagent to validate the work against the original plan (kept from current design).

## What Changes

### Removed

- `hooks/pre-tool-use.sh` -- no more event log files
- `hooks/stop.sh` -- no more sentinel `.done` file
- `scripts/event-watcher.sh` -- no more event watcher
- `~/.claude/tmux-events/` directory and all JSON event files
- `~/.claude/tmux-sessions/<name>.done` sentinel files
- The `while true` polling loop from the dispatch skill
- Event-watching sections from the status skill

### Kept

- `hooks/session-start.sh` -- session registration (parent can verify metadata)
- `hooks/session-end.sh` -- cleanup of session registration
- `hooks/hooks.json` -- updated to reference only the two remaining hooks
- `plugin.json` -- version bump

### Rewritten

- `skills/tmux-dispatch/SKILL.md` -- new monitoring architecture (6 sections below)
- `skills/tmux-status/SKILL.md` -- simplified to direct inspection reference card

## Revised Dispatch Skill Structure

### Section 1: Launch Procedure (mostly unchanged)

- Create detached tmux session
- Attach in new Kitty window
- Launch interactive Claude (unset CLAUDECODE, `--dangerously-skip-permissions`)
- Send prompt via `load-buffer` + `paste-buffer`, submit with Enter
- Existing rules: no `claude -p`, no `kitty --single-instance`, etc.

### Section 2: Validation Cycle

- Immediate post-dispatch check (10s sleep)
- Confirm Claude is active
- Retry paste-buffer if needed, max 2 attempts

### Section 3: Active Monitoring

- Reference table of signals to intervals
- Reason about each capture: what's the child doing, how much changed, next interval
- Discrete one-shot `sleep N && tmux capture-pane` background tasks
- Hold previous capture in context for comparison

### Section 4: Stall Detection & Triage

- 3-capture confirmation rule
- Autonomous triage steps
- 2-3 attempts then escalate

### Section 5: Completion Detection

- Recognize completion signals in pane output
- Verify via process status
- Launch code-reviewer subagent for validation
- Report results to user

### Section 6: Rules & Constraints

- Parent is monitor-only during child execution
- All monitoring via pane capture and process checks
- No file-based communication

## Revised Status Skill

Simplified to a quick reference card for manual spot-checks:

- `tmux capture-pane -t <name> -p -S -50` -- see current output
- `tmux has-session -t <name>` -- check session exists
- `pgrep -P $(tmux list-panes -t <name> -F '#{pane_pid}') -f "claude"` -- check Claude running
- `tmux list-sessions` -- list all sessions

No event files, no sentinel checks, no event watcher.
