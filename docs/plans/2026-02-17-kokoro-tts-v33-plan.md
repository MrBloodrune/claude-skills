# Kokoro TTS v3.3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add working ticks on intermediate stops, tighten speech conciseness, and clean up dead dependencies.

**Architecture:** Three targeted edits to existing files. The Stop hook's transcript parser changes from silently exiting on intermediate stops to outputting a marker that triggers `sound:working`. The SKILL.md gets tighter brief-mode guidance. Server cleanup removes unused librosa and fixes deprecated asyncio calls.

**Tech Stack:** Bash (hook scripts), Python (server), Markdown (skill)

---

### Task 1: Modify transcript parser to signal intermediate stops

**Files:**
- Modify: `plugins/kokoro-tts/hooks/scripts/tts-stop.sh:91-92`

**Step 1: Edit the inline Python in tts-stop.sh**

Change the intermediate stop handler from `sys.exit(0)` to printing a marker. Replace these two lines (91-92 inside the inline Python):

```python
if last_assistant_has_tool_use:
    sys.exit(0)
```

With:

```python
if last_assistant_has_tool_use:
    print("__INTERMEDIATE__")
    sys.exit(0)
```

This outputs a special string instead of empty output, so the bash script can distinguish "intermediate stop" from "no response found."

**Step 2: Add intermediate stop routing in tts-stop.sh**

After the `claude_response` extraction (line 96), add a check before the existing empty-response check (line 98). Insert between line 97 and 98:

```bash
# Intermediate stop -- play working tick if mode allows
if [ "$claude_response" = "__INTERMEDIATE__" ]; then
  echo "[$(date)] Intermediate stop detected" >> "$LOG"
  w_rank=$(weight_rank "sound:working")
  m_ceil=$(mode_ceiling "$MODE")
  if [ "$w_rank" -le "$m_ceil" ]; then
    echo "[$(date)] Playing working tick (intermediate)" >> "$LOG"
    curl -s -X POST "$SERVER/play-sound" -H "Content-Type: application/json" -d "{\"sound\":\"working\",\"session_id\":\"$session_id\"}" >/dev/null 2>&1 &
  else
    echo "[$(date)] Intermediate tick suppressed (mode=$MODE)" >> "$LOG"
  fi
  exit 0
fi
```

**Problem:** The `weight_rank` and `mode_ceiling` functions are defined later in the file (lines 149-170). The intermediate check needs to happen before those functions exist.

**Solution:** Move the intermediate check to AFTER the function definitions but BEFORE the weight parsing. Actually, simpler: just inline the ceiling check. In `quiet` mode the ceiling is 0, `sound:working` rank is 1, so it gets suppressed. In all other modes (ambient=3, brief=4, etc.), rank 1 is below ceiling.

Revised approach — keep it simple. Replace the insertion with:

```bash
# Intermediate stop -- play working tick (suppressed in quiet mode)
if [ "$claude_response" = "__INTERMEDIATE__" ]; then
  echo "[$(date)] Intermediate stop detected" >> "$LOG"
  if [ "$MODE" != "quiet" ]; then
    echo "[$(date)] Playing working tick (intermediate)" >> "$LOG"
    curl -s -X POST "$SERVER/play-sound" -H "Content-Type: application/json" -d "{\"sound\":\"working\",\"session_id\":\"$session_id\"}" >/dev/null 2>&1 &
  else
    echo "[$(date)] Intermediate tick suppressed (quiet mode)" >> "$LOG"
  fi
  exit 0
fi
```

This is cleaner — no dependency on functions defined later. `quiet` is the only mode that should suppress working ticks.

**Step 3: Verify the change manually**

Test by checking the log after a multi-tool response:
```bash
tail -20 /tmp/kokoro-hook.log
```

Expected: Lines showing `Intermediate stop detected` and `Playing working tick` between tool batches.

**Step 4: Commit**

```bash
git add plugins/kokoro-tts/hooks/scripts/tts-stop.sh
git commit -m "feat(kokoro-tts): add working ticks on intermediate stops"
```

---

### Task 2: Tighten speech conciseness in SKILL.md

**Files:**
- Modify: `plugins/kokoro-tts/skills/kokoro-tts/SKILL.md:93-97`

**Step 1: Update the Content Guidelines section**

Replace the current brief mode guidance (line 95):

```markdown
- **brief mode**: 1 short sentence. Outcome + next action if any. "Done, tests pass." / "Which endpoint?" / "Fixed the race condition."
```

With:

```markdown
- **brief mode**: Ultra-compact. For simple confirmations, use 3-6 words: "Done, tests pass." / "Fixed." / "Three files updated." Reserve a full sentence only when context is needed: errors, questions, or summaries of findings.
```

**Step 2: Commit**

```bash
git add plugins/kokoro-tts/skills/kokoro-tts/SKILL.md
git commit -m "docs(kokoro-tts): tighten brief mode speech to 3-6 words for simple confirmations"
```

---

### Task 3: Remove librosa dependency

**Files:**
- Modify: `plugins/kokoro-tts/server/pyproject.toml:12`

**Step 1: Remove librosa from dependencies**

Delete line 12 (`"librosa>=0.10.0",`) from the dependencies list.

The dependencies should be:
```toml
dependencies = [
    "aiohttp>=3.9.0",
    "kokoro-onnx>=0.4.0",
    "sounddevice>=0.4.6",
    "numpy>=1.24.0",
    "mistune>=3.0.0",
]
```

**Step 2: Regenerate lockfile**

```bash
cd plugins/kokoro-tts/server && uv lock
```

Expected: `uv.lock` regenerated without librosa or its transitive dependencies.

**Step 3: Verify server still starts**

```bash
curl -sf http://127.0.0.1:6789/health
```

Expected: `{"status": "ok", ...}` — server is already running and doesn't use librosa.

**Step 4: Commit**

```bash
git add plugins/kokoro-tts/server/pyproject.toml plugins/kokoro-tts/server/uv.lock
git commit -m "chore(kokoro-tts): remove unused librosa dependency"
```

---

### Task 4: Fix deprecated asyncio API

**Files:**
- Modify: `plugins/kokoro-tts/server/kokoro_server.py:154,284`

**Step 1: Replace deprecated calls**

Line 154 in `_play_stream`:
```python
            loop = asyncio.get_event_loop()
```
Change to:
```python
            loop = asyncio.get_running_loop()
```

Line 284 in `handle_play_sound`:
```python
        loop = asyncio.get_event_loop()
```
Change to:
```python
        loop = asyncio.get_running_loop()
```

**Step 2: Commit**

```bash
git add plugins/kokoro-tts/server/kokoro_server.py
git commit -m "fix(kokoro-tts): replace deprecated asyncio.get_event_loop with get_running_loop"
```

---

### Task 5: Bump version and final commit

**Files:**
- Modify: `plugins/kokoro-tts/.claude-plugin/plugin.json:4`

**Step 1: Bump version**

Change version from `"3.2.1"` to `"3.3.0"`.

**Step 2: Commit**

```bash
git add plugins/kokoro-tts/.claude-plugin/plugin.json
git commit -m "chore(kokoro-tts): bump to v3.3.0 for intermediate ticks and conciseness"
```

---

### Verification

After all tasks, verify:

1. **Working ticks**: Start a new Claude session, ask it to do multi-tool work (e.g., "read these 5 files and summarize them"). Listen for subtle working ticks between tool batches.

2. **Quiet mode suppression**: Set `KOKORO_MODE=quiet` in settings, repeat. Should be total silence.

3. **Speech conciseness**: Ask Claude to make a simple edit. The spoken response should be 3-6 words in brief mode.

4. **Server health**: `curl http://127.0.0.1:6789/health` still returns OK.
