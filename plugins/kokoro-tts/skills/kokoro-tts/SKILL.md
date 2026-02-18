---
name: kokoro-tts
description: Governs all Claude Code voice output. Every response MUST include a TTS_RESPONSE block with speech content. The default is ALWAYS speech. Sound effects and silence are rare exceptions for mid-tool-loop responses only. Always active.
---

# Kokoro TTS — Weighted Communication

## Two-Channel Communication

The user receives every response through two independent channels:

1. **Text (on screen)** -- Full technical detail. Write normally, no concessions for voice.
2. **Voice (spoken aloud)** -- The primary channel. The user is listening, not reading.

**The default is speech.** Every response should speak unless you are in the middle of a tool-calling loop with more calls to make before you have anything to report.

## TTS_RESPONSE Format

Every response MUST end with a `TTS_RESPONSE` block. No exceptions -- even for silent responses. A missing TTS_RESPONSE block triggers the error sound (not speech).

### Speech (spoken aloud) — THE DEFAULT

```
<!-- TTS_RESPONSE weight="speech"
Spoken content here.
TTS_RESPONSE -->
```

### Sound effect (rare — mid-loop acknowledgment only)

```
<!-- TTS_RESPONSE weight="sound:done" -->
```

### Silent (rare — deep in a tool loop, nothing to say yet)

```
<!-- TTS_RESPONSE weight="silent" -->
```

## Weight Selection — Speech First

**Speech is the default.** Use it unless one of the specific exceptions below applies.

### Use `speech` for (this covers MOST responses):

- Answering any user question or greeting
- Reporting what you found, what you did, or what happened
- Completing a task or step with results
- Errors, blockers, or unexpected failures
- Asking the user a question
- Dispatching a sub-agent or starting a search
- Presenting a plan or options
- Any response where you are done with tool calls for now

### Use `sound:done` ONLY for:

- A file edit that is one of several in a batch (not the last one)
- An intermediate step where you will speak on the next response

### Use `silent` ONLY for:

- You are mid-loop reading files and have more reads queued
- You just received a tool result and are immediately making another tool call

**When uncertain, use speech.** The bias is always toward speaking, never toward silence.

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

### Workflow: Bug investigation

User asks to investigate a bug.

1. Read 4 source files -> `silent` (mid-loop, more reads to do)
2. Find the root cause, explain it -> `speech`: "Found it. There's a race condition in the session handler."

### Workflow: Refactor

User asks to refactor a function.

1. Read the file -> `silent` (about to edit)
2. Edit the function -> `speech`: "Refactored the function."
3. Run tests, they pass -> `speech`: "Tests pass."

### Workflow: Multi-file edit

User asks to rename a variable across files.

1. Edit file A -> `sound:done` (batch, not last)
2. Edit file B -> `sound:done` (batch, not last)
3. Edit file C, all done -> `speech`: "Renamed across all three files."

### Format reference

Speech:
```
<!-- TTS_RESPONSE weight="speech"
Done. The backup job is pinned to the correct node now.
TTS_RESPONSE -->
```

Sound:
```
<!-- TTS_RESPONSE weight="sound:done" -->
```

Silent:
```
<!-- TTS_RESPONSE weight="silent" -->
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
