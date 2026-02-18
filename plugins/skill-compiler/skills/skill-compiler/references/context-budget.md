# Context Budget Reference

## MimiClaw ESP32-S3 Default (16KB)

The context buffer (`MIMI_CONTEXT_BUF_SIZE`) is a single contiguous allocation
from PSRAM that holds the entire system prompt. Everything competes for this
space.

### Buffer Layout

```
┌──────────────────────────────────────────────┐
│ Static system prompt          ~1,911 bytes   │
│  - Identity + tool descriptions              │
│  - Memory usage instructions                 │
│  - Skills section header                     │
├──────────────────────────────────────────────┤
│ Section headers               ~149 bytes     │
│  - ## Personality, ## User Info, etc.        │
├──────────────────────────────────────────────┤
│ SOUL.md + USER.md             ~500 bytes     │
│  - Bootstrap personality files               │
│  - Grows if user customizes                  │
├──────────────────────────────────────────────┤
│ Long-term memory (MEMORY.md)  ~2,000 bytes   │
│  - Grows as agent learns                     │
│  - Can be up to 4,096 bytes (tmp buf limit)  │
├──────────────────────────────────────────────┤
│ Recent daily notes            ~0-2,000 bytes │
│  - Last 3 days, variable                     │
│  - Shares the 4,096 byte tmp buffer          │
├──────────────────────────────────────────────┤
│ ▸ Skill summaries (.memory)   BUDGET HERE ◂  │
│  - All .memory content injected here         │
│  - Each prefixed with "- **Name**: "         │
│  - Plus "(read with: read_file path)\n"      │
├──────────────────────────────────────────────┤
│ [remaining space → wasted/truncated]         │
└──────────────────────────────────────────────┘
```

### Budget Calculation Formula

```
available_for_skills = MIMI_CONTEXT_BUF_SIZE - fixed_overhead

fixed_overhead = static_prompt    (1,911)
               + section_headers  (149)
               + soul_user        (500 est.)
               + memory           (2,048 est.)
               ≈ 4,608 bytes

Default: 16,384 - 4,608 = 11,776 bytes for skill summaries
```

### Per-Skill Prompt Overhead

Each skill injected into the prompt adds framing beyond the `.memory` content:

```
- **Skill Name**: <.memory content> (read with: read_file /spiffs/skills/name.md)\n
```

Overhead per skill: ~60 bytes + name length + path length.

### Scaling for Different Devices

| Context Buffer | Fixed Overhead | Skill Budget | Skills @ 300B | Skills @ 500B |
|----------------|----------------|-------------|---------------|---------------|
| 8 KB           | ~4,600         | ~3,500      | ~11           | ~7            |
| 16 KB (default)| ~4,600         | ~11,800     | ~39           | ~23           |
| 32 KB          | ~4,600         | ~28,100     | ~93           | ~56           |
| 64 KB          | ~4,600         | ~60,900     | ~203          | ~121          |

Increasing `MIMI_CONTEXT_BUF_SIZE` requires sufficient PSRAM. The ESP32-S3
with 8MB octal PSRAM can comfortably support 64KB or more.

### Token Estimation

Rough rule: 1 token ≈ 4 bytes for English text.

| Metric | Bytes | Tokens |
|--------|-------|--------|
| Default skill budget | 11,776 | ~2,944 |
| Typical .memory file | 300 | ~75 |
| Large .memory file | 500 | ~125 |
| Max on-demand .md | 8,000 | ~2,000 |

The on-demand `.md` files don't count against the prompt budget — they
consume LLM input tokens when loaded via `read_file` during a conversation
turn, which counts against the API's max token limit instead.

### Memory Growth Warning

The `fixed_overhead` estimate of ~4,600 bytes assumes modest MEMORY.md and
daily note sizes. As the agent accumulates memory, the overhead grows and
the skill budget shrinks. Monitor with:

```bash
# Check current memory file sizes on device
read_file /spiffs/memory/MEMORY.md
list_dir /spiffs/memory/daily/
```

If memory files grow beyond ~3KB, consider:
- Summarizing old MEMORY.md entries
- Pruning old daily notes
- Increasing `MIMI_CONTEXT_BUF_SIZE`
