---
name: kokoro-tts
description: This skill governs all Claude Code responses. It MUST be active at all times. It defines the TTS_SUMMARY output format that is spoken aloud to the user via a persistent local Kokoro TTS server. Every response without a TTS_SUMMARY block is a silent, broken response. This skill should be loaded on every session start and applies universally.
---

# Kokoro TTS Voice Output

## Purpose

The user receives Claude's responses through two channels:

1. **Voice (primary)** -- A concise spoken summary delivered via local TTS after every response.
2. **Text (supplementary)** -- The full written response displayed on screen for reference.

The voice channel is the **primary engagement interface**. The user is listening, not reading. A response without voice output is a broken response.

## How It Works

A persistent HTTP server (`kokoro-tts-server`) keeps the Kokoro ONNX model loaded in memory (~500MB). Hooks send HTTP requests to the server instead of spawning a CLI process per request, eliminating the 2-3 second model loading delay.

- **SessionStart** hook auto-starts the server if not running
- **Stop** hook extracts `TTS_SUMMARY` and sends it to `POST /speak`
- **UserPromptSubmit** hook sends `POST /interrupt` to stop current audio
- **SessionEnd** hook sends `POST /cleanup` to release session tracking

## Output Format

Every response MUST end with this exact structure:

```
<!-- TTS_SUMMARY
Spoken content here.
TTS_SUMMARY -->
```

There are zero exceptions. Confirmations, short answers, error reports, clarifying questions -- all require the block.

## TTS_SUMMARY Rules

### Content

- 1-3 short sentences. Say what happened and what the result is.
- Conversational tone -- like a coworker giving a brief status update.
- Cover the gist and outcome, not the full technical detail.
- Match tone to context: casual for simple tasks, clear and direct for complex ones.

### Forbidden in TTS_SUMMARY

- URLs, file paths, variable names, code syntax, technical constants
- Em dashes, smart quotes, unicode symbols, or any non-ASCII characters
- Hedging, padding, or filler phrases
- Repetition of the full technical response

### Required

- Plain ASCII punctuation only (hyphens, straight quotes, periods, commas)
- Plain English descriptions (e.g., "the config file" not the path)
- Present in every single response with no exceptions

## Relationship to Text Response

The text response is written normally -- full technical detail, tables, diagrams, code blocks, whatever the task requires. Do not shorten, simplify, or alter the text response to accommodate TTS. The two channels are independent:

- **Text**: Complete, detailed, technical. Written for reading and reference.
- **Voice**: Concise, conversational, plain English. Spoken for awareness.

## Examples

Good TTS_SUMMARY:
```
<!-- TTS_SUMMARY
Done. The backup job is pinned to the correct node now and the config looks clean.
TTS_SUMMARY -->
```

```
<!-- TTS_SUMMARY
I found the bug -- it was a race condition in the session handler. Fixed it and the tests pass.
TTS_SUMMARY -->
```

```
<!-- TTS_SUMMARY
Here's what I found. Three containers are using more memory than allocated, and one has a stale mount. Details are in the text above.
TTS_SUMMARY -->
```

Bad TTS_SUMMARY (too long, too technical):
```
<!-- TTS_SUMMARY
I updated the /etc/sysctl.d/99-network-perf.conf file to set net.core.rmem_max to 16777216 and net.core.wmem_max to 16777216, then reloaded with sysctl --system.
TTS_SUMMARY -->
```

Bad TTS_SUMMARY (unicode characters):
```
<!-- TTS_SUMMARY
Done — the config is updated and everything's working.
TTS_SUMMARY -->
```
The em dash above will produce garbled audio. Use a plain hyphen or rephrase.

## Environment

- **Engine**: kokoro-onnx (Kokoro-82M ONNX, fully local, no cloud)
- **Server**: Persistent HTTP server on `127.0.0.1:6789` (auto-started by SessionStart hook)
- **Voice**: Configurable via `KOKORO_VOICE` env var (default: `af_sky`)
- **Speed**: Configurable via `KOKORO_SPEED` env var (default: `1.0`)
- **Port**: Configurable via `KOKORO_PORT` env var (default: `6789`)
- **Models**: `~/.local/share/kokoro-tts/` (downloaded separately)
- **Audio**: PipeWire/PulseAudio, routed to user's preferred output device
- **Log**: `/tmp/kokoro-hook.log` for debugging
- **Prerequisites**: `uv`, `jq`, `curl` must be installed; model files downloaded to `~/.local/share/kokoro-tts/`

## Setup

1. Download model files:
   ```
   mkdir -p ~/.local/share/kokoro-tts
   cd ~/.local/share/kokoro-tts
   wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
   wget https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
   ```
2. Install the plugin in Claude Code
3. The server starts automatically on first session

## Troubleshooting

If the user reports no audio:
1. Check if `TTS_SUMMARY` block was included in the response
2. Check server health: `curl http://127.0.0.1:6789/health`
3. Check the log: `tail -20 /tmp/kokoro-hook.log`
4. Test directly: `curl -X POST http://127.0.0.1:6789/speak -H "Content-Type: application/json" -d '{"text":"test","session_id":"t1"}'`

If the user reports garbled audio at the start of playback, check the log for non-ASCII characters in the summary content. Replace em dashes, smart quotes, and unicode with plain ASCII equivalents.

For advanced users, the server can be managed as a systemd user service for guaranteed uptime across sessions.
