---
name: tmux-dispatch
description: This skill should be used when the user asks to "run this in tmux", "launch a separate session", "dispatch to tmux", "parallel session in tmux", "spawn a tmux session", or wants to delegate work to a separate Claude instance running in tmux.
---

# tmux-dispatch

## Purpose & Ownership Model

Delegate long-running tasks (implementation plans, large refactors, multi-file migrations) to a separate Claude session running in a new Kitty window with tmux. The parent session dispatches work, then monitors progress through direct pane capture until the child completes.

**The child session owns all file operations.** Once you dispatch a task, the parent session must NOT read, write, or edit any files the child might be working on. Two sessions touching the same files causes conflicts -- edits overwrite each other, reads see stale state, and both sessions make bad decisions based on wrong data.

**Parent session role: dispatch and monitor only.**
- Launch the child, send it a prompt, then hands off.
- Monitor progress by capturing pane output at adaptive intervals.
- Detect completion, stalls, and failures through pane content analysis.
- Only after the child is done should you inspect results, review changes, or take further action on those files.

**Architecture:**
- **Parent session**: Your current Claude session (not in tmux). Dispatches, monitors via pane capture, and reviews after completion.
- **Child session**: Claude running inside tmux in a separate Kitty window. Owns all file operations until it finishes.
- **Communication**: Direct pane capture (`tmux capture-pane`). The parent reads the child's terminal output on each check cycle. No filesystem intermediaries, no sentinel files, no event logs.

There is **no automatic callback** into the parent session. You must actively capture pane output to track progress.

**Do NOT:**
- Read project files "to check how it's going" -- use pane capture instead.
- Make "small fixes" while the child is running.
- Start working on related files in the same project concurrently.

## Claude Code Prompt Suggestions

When the child session completes a response, Claude Code sometimes displays **suggestion text** in the input area (e.g., "proceed with remaining tasks"). This is **autocomplete** -- the child did not type it. There is no "self-prompting" mechanism. The suggestion sits inert until accepted.

To accept and submit a prompt suggestion from the parent:

```bash
tmux send-keys -t <name> Tab Enter
```

**Tab** accepts the autocomplete text. **Enter** submits it. Sending bare `Enter` without `Tab` submits an empty line and does nothing useful.

This is the most common cause of apparent stalls -- the child finished its work, a continuation suggestion appeared, and nobody accepted it.

## Launch Procedure

Follow these steps exactly. Each step matters -- shortcuts cause failures.

### Step 1: Create the tmux session in a new Kitty window

Create a detached tmux session, then attach it in a new Kitty window:

```bash
tmux new-session -d -s <name> -c <project_dir>
kitty sh -c "tmux attach -t <name>" &
```

- `<name>`: Short, descriptive (e.g., `meshstended`, `auth-refactor`).
- `<project_dir>`: Absolute path to the project root.
- **Must** create detached first, then attach in the new window.
- **Do NOT use `--single-instance`** -- it drops command args when an existing Kitty instance is running.
- **Must** use `sh -c "tmux attach -t <name>"`, not bare `tmux attach`.
- Verify creation with `tmux list-sessions`.

### Step 2: Launch interactive Claude

Start Claude interactively inside the new session. The `CLAUDECODE` env var must be unset first -- it's inherited from the parent and blocks nested launches:

```bash
tmux send-keys -t <name> "unset CLAUDECODE && claude --dangerously-skip-permissions" Enter && sleep 5 && tmux capture-pane -t <name> -p -S -10
```

**CRITICAL: NEVER use `claude -p`** -- it exits after one exchange. Follow-up questions go to zsh, not Claude.

The 5-second sleep gives Claude time to initialize. Look for the Claude Code banner (version, model, project path) in the captured output. If you see only a shell prompt, Claude failed to start -- check for errors and retry.

### Step 3: Send the prompt safely

Write the prompt to a temp file, load it into a tmux buffer, and paste it into the session:

```bash
# Write prompt to a temp file (avoids all shell escaping issues)
cat > /tmp/tmux-prompt-<name>.txt << 'PROMPT'
<your multi-line prompt here>
PROMPT

# Load into tmux buffer and paste into the session
tmux load-buffer /tmp/tmux-prompt-<name>.txt
tmux paste-buffer -t <name>
```

**CRITICAL: NEVER use `tmux send-keys` for multi-line text** -- it mangles quotes, parens, and special chars. The `load-buffer` + `paste-buffer` pattern is the only reliable method.

### Step 4: Submit the prompt and validate

Submit the pasted prompt and capture the pane to confirm it landed, in one command:

```bash
tmux send-keys -t <name> Enter && sleep 7 && tmux capture-pane -t <name> -p -S -50
```

Run this with `run_in_background: true` on the Bash tool. When the background task completes and you get notified, read the output.

**What to look for:** Confirm Claude is active -- tool output (Read, Write, Glob, Grep), thinking indicators, task creation, or any sign of work in progress. The key distinction is that the pane should NOT show just a bare shell prompt or the Claude input prompt with no activity.

**If the prompt didn't take** (pane still shows Claude's input prompt with no activity, or an error, or a bare shell):
1. Retry the `load-buffer` + `paste-buffer` sequence from Step 3
2. Submit with `send-keys Enter` again
3. Fire another `sleep 10 && tmux capture-pane` background check

**Maximum 2 retry attempts.** If the prompt still hasn't taken after 2 retries, alert the user -- something is wrong with the session.

**On success:** The child is confirmed active. Transition to Active Monitoring.

## Active Monitoring (Phase 2)

The parent continuously monitors using discrete one-shot background checks. Each check is a fresh decision point -- you reason about what the child is doing and decide when to check again.

### The monitoring cycle

1. **Reason** about what the child is doing based on the last pane capture.
2. **Consult the reference table** below to pick an appropriate sleep interval.
3. **Fire** a background check:
   ```bash
   sleep N && tmux capture-pane -t <name> -p -S -50
   ```
   Run with `run_in_background: true`.
4. **When notified**, read the result.
5. **Compare** to the previous capture (which you hold in conversation context).
6. **Assess** the situation and take the appropriate next step:
   - Progress is happening → fire another monitoring check (back to step 1).
   - Completion signals visible → transition to Completion & Review (Phase 3).
   - Output is identical to last capture → enter stall detection (see next section).

### Reference Table

| Signal in Pane | Suggested Interval | Rationale |
|---|---|---|
| Just dispatched, confirming prompt took | 10-15s | Quick validation cycle |
| Active file edits (Write/Edit tool output visible) | 30-45s | Rapid changes, check frequently |
| Running tests / build output scrolling | 60-120s | Let it finish, but catch failures |
| Long compile or install (npm, cargo, etc.) | 120-180s | Known slow operations |
| Subagent spawned (Task tool visible) | 90-120s | Subagents take time |
| Planning / reading files (Read/Glob output) | 45-60s | Moderate pace work |
| Conversation with user (AskUserQuestion visible) | 30s | Child might be blocked waiting for input |
| Prompt suggestion visible (text at input line after response ended) | 15-20s | Accept quickly -- child is ready to continue but waiting on suggestion acceptance |

### Adjustment guidance

- If there is significant new output since last check, the interval is about right -- maintain it.
- If there is a lot of new output and the pane has scrolled far past what you last saw, the interval was too long -- shorten the next one.
- If the output is nearly identical but the child is clearly still working (partial line, spinner character, or a tool call in progress), lengthen the interval slightly -- you're checking too often.
- After a stall is confirmed, drop to 15-20s intervals during diagnosis to get a clearer picture.

You hold the previous pane capture in conversation context and compare naturally. No hashing, no state files, no external tracking needed.

### Preserving State

After each pane capture, note a short summary of what the child was doing (e.g., "editing auth.rs", "running tests", "waiting at prompt") and the last 20-30 lines of output. When the next background check completes, compare against this summary. If intervening conversation has pushed the previous capture out of immediate context, the summary ensures you can still detect changes vs stalls.

## Stall Detection & Autonomous Triage

When pane output is identical across consecutive checks, the child may be stalled.

### Detection thresholds

- **1 identical capture**: NOT a stall. The child might be thinking, waiting for a slow operation, or mid-computation. Fire another check at the current interval.
- **2 consecutive identical captures** at the current interval: Potential stall. Shorten the interval and gather more data.
- **3 consecutive identical captures**: Confirmed stall. Begin triage.

**What counts as identical:** Two captures are identical if the visible text content is the same. Ignore cursor position, ANSI formatting codes, and timestamp differences in tool output footers. If you see any new text, a different tool call, a spinner character change, or a progress indicator update -- the captures are NOT identical.

### Triage sequence

Follow these steps in order when a stall is confirmed:

**1. Shorten interval.** Drop to 15s checks for a clearer picture of whether anything is changing.

**2. Diagnose.** Run these checks to understand the situation:

```bash
# Does the session still exist?
tmux has-session -t <name>

# Is Claude still running inside it?
pgrep -P $(tmux list-panes -t <name> -F '#{pane_pid}') -f "claude"
```

This tells you: **crashed** (no process) vs **hung** (process alive but no output).

**3. Attempt resolution** based on what you see:

- **Prompt suggestion visible** (child's response ended and text appears on the input line -- this is Claude Code's autocomplete, not user input) → accept, submit, and capture in one command: `tmux send-keys -t <name> Tab Enter && sleep 7 && tmux capture-pane -t <name> -p -S -50`. Tab accepts the suggestion, Enter submits it, then capture confirms it took. This is the most common stall cause.
- **Child waiting at a permission prompt or question** → send appropriate input via `tmux send-keys -t <name> "response" Enter`.
- **Child appears hung mid-output** (process alive, no new content) → send a gentle nudge: `tmux send-keys -t <name> Enter`.
- **Child process exited or session is dead** → skip to Completion & Review (Phase 3) and report what happened.

**4. Re-check.** Fire a 10-15s background check after any intervention to see if it worked.

**5. Escalate.** If 2-3 intervention attempts don't change the pane output, alert the user. Include the frozen pane output so they can see what state the child is in, and ask what to do.

Maximum 2-3 autonomous intervention attempts before escalating. Don't sit there poking at a dead session.

## Completion & Review (Phase 3)

### Detecting completion

Look for these signals in the pane capture:

- **Shell prompt returned** -- a `$` or `%` at the bottom of the output with no Claude activity above it.
- **Claude's exit message visible** -- the standard goodbye/exit text.
- **Explicit completion text** -- "task complete", a final commit message, or similar wrap-up output.

### Verification

Confirm with a process check:

```bash
pgrep -P $(tmux list-panes -t <name> -F '#{pane_pid}') -f "claude"
```

If no Claude process is found and a shell prompt is visible, the child is done.

### Post-completion validation

Launch a **code-reviewer subagent** to verify the work. The subagent compares what was actually done against the original prompt/plan that was dispatched.

Use the `Task` tool with `subagent_type: "superpowers:code-reviewer"` and provide it:

1. **The original prompt** -- read it back from `/tmp/tmux-prompt-<name>.txt` (the file written in Step 3).
2. **The git diff** -- run `git diff` or `git log --oneline -n 20` in the project directory to see what changed.
3. **Instructions** -- ask the reviewer to verify:
   - All items in the original plan were addressed
   - No work was left incomplete or skipped
   - Changes are consistent with the stated goals
   - No unrelated modifications were introduced

Example Task prompt:

```
Review the work done by a dispatched tmux session against its original plan.

Original plan (from /tmp/tmux-prompt-<name>.txt):
<paste or reference the file contents>

Check the git history and file changes in <project_dir> to verify:
1. Every item in the plan was completed
2. Nothing was left half-done or skipped
3. Changes match the plan's intent -- no scope creep or unrelated edits
4. Tests pass if applicable

Report: what was completed, what was missed (if anything), and any concerns.
```

**After the review completes**, report the findings to the user. If the reviewer flags gaps or issues, discuss next steps -- the user may want to dispatch a follow-up session or handle it in the current session.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `claude -p` | Use interactive `claude --dangerously-skip-permissions` |
| Using `send-keys` for the prompt | Use `load-buffer` + `paste-buffer` |
| Not waiting for Claude to init | `sleep 12` then capture pane to verify banner |
| Not unsetting `CLAUDECODE` | Prefix with `unset CLAUDECODE &&` -- inherited env blocks nested launches |
| Using `kitty --single-instance` | Drops command args when existing Kitty is running. Use `kitty sh -c "..."` instead |
| Reading/editing project files while child runs | Use pane capture to monitor. Only touch files after the child is done |
| Checking too frequently (under 10s) | Trust the reference table and let the child work. Over-polling adds no value |
| Ignoring identical captures | Track consecutive identical output -- 2 is a warning, 3 is a confirmed stall |
| Not verifying completion | Always check process status with `pgrep`, not just pane content |
| Skipping validation after completion | Always launch a code-reviewer subagent to verify the work matched the plan |
| Sending bare `Enter` to accept prompt suggestions | Suggestions need `Tab` then `Enter` -- Tab accepts the autocomplete, Enter submits. Bare Enter sends an empty line |

## Sending Follow-Up Messages

To reply when the spawned session asks a question or needs input:

```bash
# Write reply to temp file
echo "Your reply text here" > /tmp/tmux-reply.txt

# Paste, submit, and capture in one command
tmux load-buffer /tmp/tmux-reply.txt && tmux paste-buffer -t <name> && sleep 1 && tmux send-keys -t <name> Enter && sleep 5 && tmux capture-pane -t <name> -p -S -50
```
