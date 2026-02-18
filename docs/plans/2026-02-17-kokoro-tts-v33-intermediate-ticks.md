# Kokoro TTS v3.3 — Intermediate Ticks & Conciseness

**Date**: 2026-02-17
**Status**: Approved

## Problem

Two gaps in the current voice workflow:

1. **Total silence during tool-heavy work.** The Stop hook fires on every assistant turn boundary, but the transcript parser (`tts-stop.sh` line 92) silently exits when the last assistant entry has `tool_use`. This means multi-tool-call turns produce zero audio — no working ticks, no pulse, nothing. The user has no auditory signal that work is happening.

2. **Speech slightly too wordy on short responses.** In `brief` mode, the skill allows up to 1 sentence, but short confirmations ("file edited", "test passed") sometimes get inflated into full sentences when a few words would suffice.

Additionally, two cleanup items:
- `librosa>=0.10.0` declared in `pyproject.toml` but never imported (heavy dead dependency)
- `asyncio.get_event_loop()` deprecated since Python 3.10; should be `asyncio.get_running_loop()`

## Approach

Minimal fix — three targeted edits, no new hooks, no new architecture. Uses existing infrastructure.

### 1. Intermediate Stop Working Ticks

**File**: `plugins/kokoro-tts/hooks/scripts/tts-stop.sh`

In the inline Python transcript parser (lines 84-92), change the intermediate stop behavior:

**Current** (line 91-92):
```python
if last_assistant_has_tool_use:
    sys.exit(0)
```

**New**: Instead of exiting, output a special marker so the bash script knows this is an intermediate stop. The bash routing section then plays `sound:working` (subject to mode ceiling — `quiet` mode still gets silence).

This gives the user a subtle audio pulse between tool batches without per-tool sound spam.

### 2. Tighter Speech Guidance in SKILL.md

**File**: `plugins/kokoro-tts/skills/kokoro-tts/SKILL.md`

Add a conciseness rule to the Content Guidelines section:

- **brief mode**: If the action is a simple confirmation (edit done, test passed, search found results), use 3-6 words: "Done, tests pass." / "Fixed." / "Three files updated."
- Reserve full sentences for responses that carry context: errors, questions, multi-part summaries.

### 3. Cleanup

**File**: `plugins/kokoro-tts/server/pyproject.toml`
- Remove `librosa>=0.10.0` from dependencies

**File**: `plugins/kokoro-tts/server/kokoro_server.py`
- Line 154: `asyncio.get_event_loop()` → `asyncio.get_running_loop()`
- Line 284: `asyncio.get_event_loop()` → `asyncio.get_running_loop()`

### 4. Version Bump

**File**: `plugins/kokoro-tts/.claude-plugin/plugin.json`
- Bump version from `3.2.1` to `3.3.0` (minor — new behavior)

## Non-Changes

- No PreToolUse or PostToolUse hooks added
- No new sound assets or sound types
- No volume tuning (server volume parameter stays available for future use)
- No changes to server endpoints, interrupt mechanism, or session tracking
- No changes to CLAUDE.md (already delegates to skill)

## Research Context

Survey of 15+ Claude Code audio projects (see research notes) confirmed:
- Our weight-based routing system is unique — no other project has this granularity
- Intermediate audio feedback (ticks/pulses) during work is a common pattern across projects
- Audio fatigue is real — grouped ticks (not per-tool) is the right restraint level
- The `async: true` hook flag exists but is unnecessary here since the Stop hook already handles timing
