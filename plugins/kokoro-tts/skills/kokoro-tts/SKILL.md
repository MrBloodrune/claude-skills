---
name: kokoro-tts
description: Governs all Claude Code voice output. Defines TTS_RESPONSE format with weighted communication -- speech, sounds, or silence per response. The AI selects a weight for each response; a user-set verbosity mode caps the maximum. Every response MUST include a TTS_RESPONSE block. Always active.
---

# Kokoro TTS — Weighted Communication

## Two-Channel Communication

The user receives every response through two independent channels:

1. **Text (on screen)** -- Full technical detail. Write normally, no concessions for voice.
2. **Voice (spoken aloud)** -- Weighted output: speech, a sound effect, or silence.

The voice channel is the **primary engagement interface**. The user is listening, not reading. The text is supplementary reference.

## TTS_RESPONSE Format

Every response MUST end with a `TTS_RESPONSE` block. No exceptions -- even for silent responses. If you omit it, the hook plays a fallback coin sound (broken response).

### Speech (spoken aloud)

```
<!-- TTS_RESPONSE weight="speech"
Spoken content here.
TTS_RESPONSE -->
```

### Sound effect (no text content needed)

```
<!-- TTS_RESPONSE weight="sound:done" -->
```

### Silent (no output at all)

```
<!-- TTS_RESPONSE weight="silent" -->
```

## Weights

| Weight | When to use | Output |
|--------|------------|--------|
| `speech` | The response has something worth saying aloud | TTS speaks the content |
| `sound:done` | A step completed, nothing meaningful to say | Short completion chime |
| `sound:attention` | Something needs user awareness soon | Distinct attention ping |
| `sound:working` | Mid-iteration pulse, acknowledging progress | Soft tick |
| `silent` | Nothing to communicate audibly | No output |

## Choosing a Weight

Follow this decision tree for every response:

1. **Is there something the user needs to hear?** (question, result, explanation, error) -> `speech`
2. **Did a task or step just complete?** -> `sound:done`
3. **Does the user need to act or look at something?** -> `sound:attention`
4. **Are you mid-iteration and just acknowledging a tool result?** -> `sound:working`
5. **Is this a tool-heavy loop where audio would pile up?** -> `silent`

### Self-Adjustment Rules

- During tool-heavy iteration loops (multiple tool calls before a real conclusion): use `sound:working` or `silent`
- Background or stacked task completions: cap at `sound:done` regardless of mode
- When uncertain between two weights: pick the lower one
- The AI can always drop below the ceiling -- never rise above it

## Verbosity Modes

The user sets a mode via `KOKORO_MODE` env var. This is a **ceiling**, not a target.

| Mode | Ceiling | Speech limit | Description |
|------|---------|-------------|-------------|
| `quiet` | `silent` only | n/a | Deep focus, no interruptions |
| `ambient` | `sound:attention` | n/a | Sounds only, no speech |
| `brief` | `speech` | 1 sentence max | Normal working **(default)** |
| `conversational` | `speech` | 2-4 sentences | Active collaboration |
| `verbose` | `speech` | Full detail | Pair programming, teaching |

The hook enforces the ceiling automatically (downgrades weight if it exceeds the mode). Speech sentence limits are your responsibility -- the hook cannot count sentences.

### Mode Switching

The user can say "go quiet", "go verbose", "ambient mode", etc. When they do:
- Acknowledge in text
- Immediately apply the new ceiling to your weight selection for the rest of the session
- Mode is session-scoped -- it resets on restart unless set in env

## Speech Content Rules

These apply only when `weight="speech"`:

### Content Guidelines

- **brief mode**: 1 short sentence. Outcome + next action if any. "Done, tests pass." / "Which endpoint?" / "Fixed the race condition."
- **conversational mode**: 2-4 sentences. Enough for context and explanation.
- **verbose mode**: Full spoken detail. Explain reasoning, tradeoffs, what you did and why.

### Forbidden in Speech Content

- URLs, file paths, variable names, code syntax, technical constants
- Em dashes, smart quotes, unicode symbols, or any non-ASCII characters
- Hedging, padding, or filler phrases
- Repetition of the full technical response

### Required

- ASCII only -- plain hyphens, straight quotes, basic punctuation
- Plain English descriptions (e.g., "the config file" not the path)
- Conversational tone -- like a coworker giving a brief status update

## Examples

### Good

```
<!-- TTS_RESPONSE weight="speech"
Done. The backup job is pinned to the correct node now.
TTS_RESPONSE -->
```

```
<!-- TTS_RESPONSE weight="sound:done" -->
```

```
<!-- TTS_RESPONSE weight="sound:working" -->
```

```
<!-- TTS_RESPONSE weight="silent" -->
```

```
<!-- TTS_RESPONSE weight="speech"
I found three containers over their memory limit and one with a stale mount. Details are in the text.
TTS_RESPONSE -->
```

### Bad

Speech with technical content:
```
<!-- TTS_RESPONSE weight="speech"
I updated /etc/sysctl.d/99-network-perf.conf to set net.core.rmem_max to 16777216.
TTS_RESPONSE -->
```

Speech with unicode (causes garbled audio):
```
<!-- TTS_RESPONSE weight="speech"
Done — the config is updated.
TTS_RESPONSE -->
```

Missing block entirely (causes coin fallback -- broken):
```
(no TTS_RESPONSE block)
```

## Backward Compatibility

Legacy `TTS_SUMMARY` blocks still work -- the hook treats them as `weight="speech"`. But new responses should always use `TTS_RESPONSE`.

## Environment

- **Engine**: kokoro-onnx (Kokoro-82M ONNX, fully local, no cloud)
- **Server**: Persistent HTTP on `127.0.0.1:6789` (auto-started by SessionStart hook)
- **Voice**: `KOKORO_VOICE` env var (default: `af_sky`)
- **Speed**: `KOKORO_SPEED` env var (default: `1.0`)
- **Port**: `KOKORO_PORT` env var (default: `6789`)
- **Mode**: `KOKORO_MODE` env var (default: `brief`)
- **Log**: `/tmp/kokoro-hook.log`

## Troubleshooting

If the user reports no audio:
1. Check if `TTS_RESPONSE` block was included
2. Server health: `curl http://127.0.0.1:6789/health`
3. Log: `tail -20 /tmp/kokoro-hook.log`
4. Direct test: `curl -X POST http://127.0.0.1:6789/speak -H "Content-Type: application/json" -d '{"text":"test","session_id":"t1"}'`

If garbled audio: check log for non-ASCII characters in speech content. Replace with plain ASCII.
