# Kokoro TTS v3 — Weighted Communication

## Problem

The current kokoro-tts plugin has binary output: speak the TTS_SUMMARY or play a fallback sound. This creates two pain points:

1. **Background/stacked task completions** trigger speech that piles up — the AI talks unprompted through 5-6 queued responses
2. **Tool-heavy iterations** produce speech at every stop point even when there's nothing meaningful to say
3. **No middle ground** — the AI can either talk or be silent, with no way to acknowledge without words

## Design

### TTS_RESPONSE Block (replaces TTS_SUMMARY)

```
<!-- TTS_RESPONSE weight="speech"
Concise spoken content here.
TTS_RESPONSE -->
```

```
<!-- TTS_RESPONSE weight="sound:done" -->
```

```
<!-- TTS_RESPONSE weight="silent" -->
```

### Weights

| Weight | Meaning | Output |
|--------|---------|--------|
| `speech` | Worth saying aloud | TTS speaks the content |
| `sound:done` | Step completed, not worth words | Short completion chime |
| `sound:attention` | Something needs user awareness soon | Distinct attention tone |
| `sound:working` | Iteration in progress, just a pulse | Subtle tick |
| `silent` | Nothing to communicate | No output |

Content text is only required for `speech`. Sound weights ignore any content. Backward compatibility: bare `<!-- TTS_SUMMARY ... TTS_SUMMARY -->` blocks are treated as `weight="speech"`.

### Verbosity Modes (User Ceiling)

| Mode | Allows | Description |
|------|--------|-------------|
| **quiet** | `silent` only | Deep focus, don't interrupt |
| **ambient** | `silent`, `sound:*` | Sounds only, no speech |
| **brief** | all weights, speech 1 sentence max | Normal working (default) |
| **conversational** | all weights, speech 2-4 sentences | Active collaboration |
| **verbose** | all weights, full detail spoken | Pair programming, teaching |

Default mode: `brief`. Set via `KOKORO_MODE` env var or switchable mid-session.

### AI Self-Adjustment Rules

- AI can drop below the user's ceiling, never rise above it
- During tool-heavy iteration loops: drop to `sound:working` or `silent`
- Background/stacked task completions: cap at `sound:done` regardless of ceiling
- AI can suggest escalation in the text response but voice output stays within ceiling
- The AI chooses the weight; the hook enforces the ceiling

### Stop Hook Logic

1. Extract `TTS_RESPONSE` block from last assistant text message (skip tool-call-only messages)
2. Parse `weight` attribute
3. Read current mode from `KOKORO_MODE` env var (default: `brief`)
4. If weight exceeds mode ceiling: downgrade to highest allowed weight
5. Route:
   - `speech` → send text to server `POST /speak`
   - `sound:done` → `paplay done.wav`
   - `sound:attention` → `paplay attention.wav`
   - `sound:working` → `paplay working.wav`
   - `silent` → no output
6. Legacy `TTS_SUMMARY` blocks → treat as `weight="speech"`

### Sound Assets

New assets needed:
- `done.wav` — short completion chime (~0.3s)
- `attention.wav` — distinct ping, slightly urgent (~0.5s)
- `working.wav` — minimal tick/pulse (~0.2s)

Existing assets retained:
- `error.wav` — server health check failure
- `coin.wav` — legacy fallback (missing/malformed block)

### Skill Changes

The skill file teaches the AI:
- New `TTS_RESPONSE` format with weight selection guidelines
- When to pick each weight (decision tree)
- Mode awareness: respect the user's ceiling
- Background task detection heuristics
- Backward compatibility with `TTS_SUMMARY`

### CLAUDE.md / Settings Integration

- `KOKORO_MODE` env var in settings.json (default: `brief`)
- User can say "go quiet" / "go verbose" etc. — AI updates its behavior for the session
- Mode is session-scoped, not persisted across restarts unless set in env

### What Stays the Same

- Server architecture (persistent HTTP on 127.0.0.1:6789)
- All server endpoints (`/speak`, `/interrupt`, `/interrupt-all`, `/cleanup`, `/health`)
- SessionStart, UserPromptSubmit, SessionEnd hooks — unchanged
- Voice/speed/port env vars — unchanged
- Model files and dependencies — unchanged
