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

Every response MUST end with a `TTS_RESPONSE` block. No exceptions -- even for silent responses. A missing TTS_RESPONSE block triggers the error sound (not speech).

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

Use this table. Find the situation that matches, use that weight.

| Situation | Weight | Speech example |
|-----------|--------|----------------|
| Reading files, grepping, globbing | `silent` | -- |
| Mid-loop between tool calls, no conclusion yet | `silent` | -- |
| File written or edited | `sound:done` | -- |
| Task step completed, nothing to report | `sound:done` | -- |
| Search completed, found what was needed | `sound:done` | -- |
| Web search or web fetch initiated | `speech` | "Searching for the latest docs on that." |
| Sub-agent dispatched | `speech` | "Dispatching an agent to review the tests." |
| Task completed with results to report | `speech` | "Done. Found three issues, details in the text." |
| Error, blocker, or unexpected failure | `speech` | "Hit a permission error on that container." |
| Asking the user a question | `speech` | The question itself |
| Answering a user question | `speech` | The answer |
| Greeting or casual exchange | `speech` | Natural response |
| Background task finished | `sound:done` | -- |
| Plan presented for approval | `speech` | "Plan's ready for your review." |

If your situation isn't listed, pick the closest match. When uncertain between two weights, pick the lower one.

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

1. Read 4 source files -> `silent` (x4, mid-loop exploration)
2. Find the root cause, explain it -> `speech`: "Found it. There's a race condition in the session handler."

### Workflow: Refactor

User asks to refactor a function.

1. Read the file -> `silent`
2. Edit the function -> `sound:done`
3. Run tests -> `silent` (waiting for results)
4. Tests pass, report back -> `speech`: "Refactored and tests pass."

### Workflow: Research with sub-agent

User asks to search for something broad.

1. Dispatch explore agent -> `speech`: "Dispatching an agent to search the codebase."
2. Agent returns, summarize findings -> `speech`: "Found it in three files, details below."

### Workflow: Multi-file edit

User asks to rename a variable across files.

1. Edit file A -> `sound:done`
2. Edit file B -> `sound:done`
3. Edit file C -> `sound:done`
4. All done, confirm -> `speech`: "Renamed across all three files."

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
