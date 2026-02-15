# Kokoro TTS v3 — Weighted Communication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace binary speak/silence TTS with a weighted communication system where the AI chooses speech, sounds, or silence per response, governed by a user-set verbosity mode ceiling.

**Architecture:** The Stop hook parses a new `TTS_RESPONSE` block with a `weight` attribute, compares it against the user's `KOKORO_MODE` ceiling, and routes to speech (server), sound (paplay), or silence. The skill teaches weight selection. Backward compatible with legacy `TTS_SUMMARY`.

**Tech Stack:** Bash (hooks), Python (transcript extraction), WAV assets, existing kokoro-tts-server (unchanged)

**Design doc:** `docs/plans/2026-02-15-kokoro-tts-v3-weighted-communication.md`

---

### Task 1: Generate Sound Assets

**Files:**
- Create: `plugins/kokoro-tts/assets/done.wav`
- Create: `plugins/kokoro-tts/assets/attention.wav`
- Create: `plugins/kokoro-tts/assets/working.wav`

**Step 1: Generate the three WAV files using sox**

```bash
# done.wav — short major-third chime, pleasant completion feel (~0.3s)
sox -n plugins/kokoro-tts/assets/done.wav synth 0.15 sine 880 synth 0.15 sine 1100 fade 0 0.3 0.1 vol 0.4

# attention.wav — two-tone ping, slightly urgent (~0.4s)
sox -n plugins/kokoro-tts/assets/attention.wav synth 0.2 sine 1200 synth 0.2 sine 1500 fade 0 0.4 0.1 vol 0.5

# working.wav — single soft tick (~0.15s)
sox -n plugins/kokoro-tts/assets/working.wav synth 0.1 sine 600 fade 0 0.15 0.05 vol 0.25
```

Note: These are starting points. If `sox` isn't installed, use `pip install soundfile numpy` and generate with a Python script. Tune the frequencies/durations by ear -- they should be distinct from each other and from the existing `coin.wav` and `error.wav`. The key constraint: short, unobtrusive, clearly different from speech.

**Step 2: Test each sound plays correctly**

```bash
paplay plugins/kokoro-tts/assets/done.wav
paplay plugins/kokoro-tts/assets/attention.wav
paplay plugins/kokoro-tts/assets/working.wav
```

Expected: Three distinct short sounds, all audible but not jarring.

**Step 3: Commit**

```bash
git add plugins/kokoro-tts/assets/done.wav plugins/kokoro-tts/assets/attention.wav plugins/kokoro-tts/assets/working.wav
git commit -m "feat(kokoro-tts): add sound assets for weighted communication"
```

---

### Task 2: Rewrite Stop Hook with Weight Routing

**Files:**
- Modify: `plugins/kokoro-tts/hooks/scripts/tts-stop.sh` (full rewrite)

**Step 1: Write the new tts-stop.sh**

The script must:
1. Extract last assistant text from transcript (Python, skip tool-call-only messages — already fixed earlier this session)
2. Parse `TTS_RESPONSE` block: extract `weight` attribute and content
3. Fall back: if `TTS_SUMMARY` block found instead, treat as `weight="speech"`
4. Read `KOKORO_MODE` env var (default: `brief`)
5. Apply ceiling: if weight exceeds mode, downgrade
6. Route to speech/sound/silence

Weight hierarchy (lowest to highest):
```
silent < sound:working < sound:done < sound:attention < speech
```

Mode ceilings:
```
quiet    -> silent
ambient  -> sound:attention (all sounds allowed, no speech)
brief    -> speech (1 sentence — enforced by skill, not hook)
conversational -> speech
verbose  -> speech
```

The hook enforces: if weight > ceiling, downgrade to ceiling's max. Speech sentence limits are enforced by the skill, not the hook.

```bash
#!/bin/bash
# Kokoro TTS v3 — weighted communication router
# Parses TTS_RESPONSE weight, applies KOKORO_MODE ceiling, routes to speech/sound/silence

VOICE="${KOKORO_VOICE:-af_sky}"
SPEED="${KOKORO_SPEED:-1.0}"
PORT="${KOKORO_PORT:-6789}"
MODE="${KOKORO_MODE:-brief}"
SERVER="http://127.0.0.1:$PORT"
LOG="/tmp/kokoro-hook.log"
ASSETS_DIR="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(dirname "$0")")")}/assets"

echo "[$(date)] Kokoro TTS hook triggered (mode=$MODE)" >> "$LOG"

input=$(cat)

if ! echo "$input" | jq -e . >/dev/null 2>&1; then
  echo "[$(date)] Invalid JSON input, exiting" >> "$LOG"
  exit 0
fi

transcript_path=$(echo "$input" | jq -r '.transcript_path')
transcript_path="${transcript_path/#\~/$HOME}"

if [ ! -f "$transcript_path" ]; then
  echo "[$(date)] Transcript file not found: $transcript_path" >> "$LOG"
  exit 0
fi

session_id=$(echo "$transcript_path" | md5sum | awk '{print $1}')

# Health check
if ! curl -sf --max-time 1 "$SERVER/health" >/dev/null 2>&1; then
  echo "[$(date)] ERROR: Kokoro server not responding" >> "$LOG"
  paplay "$ASSETS_DIR/error.wav" 2>/dev/null &
  exit 0
fi

# Extract last assistant text response (skip tool-call-only messages)
claude_response=$(tac "$transcript_path" | python3 -c '
import sys, json
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        obj = json.loads(line)
    except:
        continue
    if obj.get("type") != "assistant":
        continue
    texts = [c["text"] for c in obj.get("message", {}).get("content", []) if c.get("type") == "text" and c.get("text", "").strip()]
    if texts:
        print(" ".join(texts))
        break
' 2>/dev/null)

if [ -z "$claude_response" ]; then
  echo "[$(date)] No response found" >> "$LOG"
  exit 0
fi

# Parse TTS_RESPONSE or legacy TTS_SUMMARY
# Priority: TTS_RESPONSE (new format) > TTS_SUMMARY (legacy)
parsed=$(echo "$claude_response" | python3 -c '
import sys, re

text = sys.stdin.read()

# Try TTS_RESPONSE (new format) — find last occurrence
matches = list(re.finditer(r"<!--\s*TTS_RESPONSE\s+weight=\"([^\"]+)\"[^>]*?(?:-->|(?:\n([\s\S]*?)\nTTS_RESPONSE\s*-->))", text))
if matches:
    m = matches[-1]
    weight = m.group(1)
    content = (m.group(2) or "").strip()
    print(f"weight={weight}")
    if content:
        print(f"content={content}")
    sys.exit(0)

# Try legacy TTS_SUMMARY — find last occurrence
matches = list(re.finditer(r"<!--\s*TTS_SUMMARY\s*\n([\s\S]*?)\nTTS_SUMMARY\s*-->", text))
if matches:
    content = matches[-1].group(1).strip()
    if content:
        print("weight=speech")
        print(f"content={content}")
        sys.exit(0)

# Nothing found
print("weight=none")
' 2>/dev/null)

weight=$(echo "$parsed" | head -1 | sed 's/^weight=//')
content=$(echo "$parsed" | tail -n +2 | sed 's/^content=//')

echo "[$(date)] Parsed: weight=$weight content_len=${#content}" >> "$LOG"

if [ "$weight" = "none" ]; then
  echo "[$(date)] No TTS block found, playing coin" >> "$LOG"
  paplay "$ASSETS_DIR/coin.wav" 2>/dev/null &
  exit 0
fi

# Weight hierarchy for ceiling comparison
weight_rank() {
  case "$1" in
    silent)          echo 0 ;;
    sound:working)   echo 1 ;;
    sound:done)      echo 2 ;;
    sound:attention) echo 3 ;;
    speech)          echo 4 ;;
    *)               echo 0 ;;
  esac
}

# Mode ceiling (max allowed weight)
mode_ceiling() {
  case "$1" in
    quiet)          echo 0 ;;  # silent only
    ambient)        echo 3 ;;  # up to sound:attention
    brief)          echo 4 ;;  # up to speech
    conversational) echo 4 ;;  # up to speech
    verbose)        echo 4 ;;  # up to speech
    *)              echo 4 ;;  # default: brief
  esac
}

w_rank=$(weight_rank "$weight")
m_ceil=$(mode_ceiling "$MODE")

# Downgrade if weight exceeds ceiling
if [ "$w_rank" -gt "$m_ceil" ]; then
  case "$m_ceil" in
    0) weight="silent" ;;
    1) weight="sound:working" ;;
    2) weight="sound:done" ;;
    3) weight="sound:attention" ;;
  esac
  echo "[$(date)] Downgraded to $weight (mode=$MODE ceiling=$m_ceil)" >> "$LOG"
fi

# Route
case "$weight" in
  silent)
    echo "[$(date)] Silent — no output" >> "$LOG"
    ;;
  sound:working)
    echo "[$(date)] Playing working tick" >> "$LOG"
    paplay "$ASSETS_DIR/working.wav" 2>/dev/null &
    ;;
  sound:done)
    echo "[$(date)] Playing done chime" >> "$LOG"
    paplay "$ASSETS_DIR/done.wav" 2>/dev/null &
    ;;
  sound:attention)
    echo "[$(date)] Playing attention ping" >> "$LOG"
    paplay "$ASSETS_DIR/attention.wav" 2>/dev/null &
    ;;
  speech)
    if [ -z "$content" ]; then
      echo "[$(date)] Speech weight but no content, playing done" >> "$LOG"
      paplay "$ASSETS_DIR/done.wav" 2>/dev/null &
    else
      preview="${content:0:40}"
      echo "[$(date)] Speaking: \"${preview}...\" (${#content} chars)" >> "$LOG"
      response=$(curl -s -X POST "$SERVER/speak" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg t "$content" --arg s "$session_id" \
          --arg v "$VOICE" --argjson sp "$SPEED" \
          '{text:$t, session_id:$s, voice:$v, speed:$sp}')" \
        2>&1)
      status=$(echo "$response" | jq -r '.status' 2>/dev/null)
      echo "[$(date)] Server response: $status" >> "$LOG"
    fi
    ;;
esac

exit 0
```

**Step 2: Verify bash syntax**

```bash
bash -n plugins/kokoro-tts/hooks/scripts/tts-stop.sh && echo "Syntax OK"
```

Expected: `Syntax OK`

**Step 3: Manual test with current transcript**

Run the extraction + parsing portion against the live transcript to verify it handles the current `TTS_SUMMARY` format as legacy fallback. This is a read-only test — just verify the parsed output.

**Step 4: Commit**

```bash
git add plugins/kokoro-tts/hooks/scripts/tts-stop.sh
git commit -m "feat(kokoro-tts): rewrite stop hook with weight routing and mode ceiling"
```

---

### Task 3: Rewrite the Skill File

**Files:**
- Modify: `plugins/kokoro-tts/skills/kokoro-tts/SKILL.md` (full rewrite)

**Step 1: Write the new SKILL.md**

Key sections:
1. **Purpose** — two-channel communication (voice + text), now with weighted output
2. **TTS_RESPONSE format** — the new block with weight attribute, examples of each weight
3. **Weight selection guide** — decision tree for when to use each weight
4. **Verbosity modes** — table of modes, explain ceiling concept
5. **Self-adjustment rules** — when to drop below ceiling, background task handling
6. **Content rules** — same ASCII-only, no-paths rules from current skill, applied only to speech weight
7. **Mode switching** — how user can say "go quiet" / "talk more"
8. **Examples** — good and bad examples for each weight
9. **Backward compatibility** — mention legacy TTS_SUMMARY still works

The description frontmatter should reflect the broader scope: not just TTS output format, but the AI's communication behavior including when to speak, when to use sounds, and when to stay silent.

Important: The skill must make clear that `TTS_RESPONSE` is required on EVERY response (even if `weight="silent"`), because the hook uses its absence to detect a broken response (coin fallback).

**Step 2: Commit**

```bash
git add plugins/kokoro-tts/skills/kokoro-tts/SKILL.md
git commit -m "feat(kokoro-tts): rewrite skill for weighted communication v3"
```

---

### Task 4: Update CLAUDE.md TTS Section

**Files:**
- Modify: `~/.claude/CLAUDE.md` (TTS Voice Output section, lines ~46-82)

**Step 1: Replace the TTS Voice Output section**

Update to reference the new `TTS_RESPONSE` format with weights. Keep the section concise — the skill has the full detail. CLAUDE.md just needs:
- New block format with `weight` attribute
- Brief mention of weight options (speech, sound:done, sound:attention, sound:working, silent)
- The tiered length guide (updated to reference modes)
- Same ASCII-only content rules for speech weight
- Note that every response needs a `TTS_RESPONSE` block
- Backward compat: `TTS_SUMMARY` still works as `weight="speech"`

**Step 2: Commit**

```bash
git add ~/.claude/CLAUDE.md
git commit -m "docs: update CLAUDE.md TTS section for weighted communication v3"
```

---

### Task 5: Update plugin.json Version

**Files:**
- Modify: `plugins/kokoro-tts/plugin.json`

**Step 1: Bump version to 3.0.0 and update description**

```json
{
  "name": "kokoro-tts",
  "description": "Weighted voice communication for Claude Code — speech, sounds, and silence via persistent Kokoro TTS server",
  "version": "3.0.0",
  "author": {
    "name": "MrBloodrune"
  },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "Apache-2.0",
  "keywords": ["tts", "voice", "kokoro", "audio", "accessibility", "speech", "sounds", "communication"],
  "hooks": "./hooks/hooks.json"
}
```

**Step 2: Commit**

```bash
git add plugins/kokoro-tts/plugin.json
git commit -m "chore(kokoro-tts): bump to v3.0.0 for weighted communication"
```

---

### Task 6: Integration Test

**Step 1: Restart Claude Code session to pick up new cached plugin**

**Step 2: Verify hook loads**

Check system-reminder for `SessionStart:startup hook success`.

**Step 3: Test each weight manually**

Send responses with each weight type and verify:
- `weight="speech"` — TTS server speaks
- `weight="sound:done"` — done.wav plays
- `weight="sound:attention"` — attention.wav plays
- `weight="sound:working"` — working.wav plays
- `weight="silent"` — no output
- Legacy `TTS_SUMMARY` — treated as speech

**Step 4: Test mode ceiling**

Set `KOKORO_MODE=ambient` in settings.json env, restart, verify speech gets downgraded to sound.

**Step 5: Test backward compatibility**

Verify a response with old `TTS_SUMMARY` format still speaks correctly.
