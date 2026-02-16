---
name: Technical Visualizer
description: >-
  Trigger on "educational website", "interactive guide", "technical visualization",
  "interactive tutorial", "visualization page", "visual explainer", "animated diagram",
  "educational page", "technical education". Creates single-file interactive HTML pages
  with animated visualizations for technical topics. Uses PCB schematic aesthetic with
  15 reusable visualization patterns.
---

# Technical Visualizer

Build interactive single-file HTML educational pages for technical topics. Every page uses the PCB schematic aesthetic, follows strict animation rules, and selects from 15 validated visualization patterns.

## Process

1. **Identify the topic** — What technical subject needs visual explanation?
2. **Select patterns** — Pick 4-8 patterns from the catalog that fit the topic's concepts
3. **Read references** — Load `theme-pcb-schematic.md` for CSS, relevant `pattern-*.md` files for implementation details, and `infrastructure.md` for layout
4. **Generate page** — Single HTML file, all CSS/JS inline, no frameworks
5. **Check known issues** — Read `known-issues.md` before finalizing

## Pattern Catalog

### Timing & Sequential
Use for anything with time progression, signal behavior, or ordered events.

| # | Pattern | Use When | Animation |
|---|---------|----------|-----------|
| 1 | Playhead/Sweep | Showing state changes over time (PWM, scheduling, signals) | requestAnimationFrame, float cursor leads, blocks trail |
| 2 | Sequence Diagram | Ordered message passing (SPI, I2C, TCP, IPC) | requestAnimationFrame, phase-based reveal |
| 3 | Waveform Trace | Signal values HIGH/LOW over time (GPIO, clock, data lines) | requestAnimationFrame, progressive reveal behind cursor |
| 4 | Gantt Timeline | Parallel activities with duration (boot sequences, DMA, pipelines) | requestAnimationFrame, playhead with ms scale |

### State & Flow
Use for state machines, data movement, resource management.

| # | Pattern | Use When | Animation |
|---|---------|----------|-----------|
| 5 | State Machine | FSM visualization (WiFi states, protocol states, task lifecycle) | setTimeout phase-based, auto-play scenario |
| 6 | Pipeline/FIFO | Data flowing through stages (queues, ring buffers, packet processing) | setTimeout phase-based, pointer advancement |
| 7 | Lock Cycle | Resource contention (mutexes, flash protection, semaphores) | setTimeout phase-based, acquire/release sequence |
| 8 | Bit Register | Toggleable flags with side effects (GPIO config, status registers) | Interactive click, optional auto-mode with setTimeout |

### Structural
Use for architecture, memory layout, component relationships.

| # | Pattern | Use When | Animation |
|---|---------|----------|-----------|
| 9 | Memory Map | Address ranges (flash partitions, RAM layout, peripheral registers) | Interactive click-to-expand, no animation |
| 10 | Tree/Hierarchy | Parent-child relationships (file trees, component deps, device trees) | Interactive expand/collapse, no animation |
| 11 | Block Diagram | System architecture with data flow (SoC internals, bus topology) | requestAnimationFrame, animated pulses along connections |
| 12 | Split-Core | Parallel processing (multi-core, pipeline stages, SIMD) | requestAnimationFrame, independent lane items |

### Data
Use for values, packet structures, configuration mappings.

| # | Pattern | Use When | Animation |
|---|---------|----------|-----------|
| 13 | Live Gauge/Meter | Single value with range/thresholds (ADC, battery, signal strength) | requestAnimationFrame, smooth needle/bar |
| 14 | Packet Anatomy | Byte-field structure (BLE, Ethernet, MQTT, USB frames) | Interactive hover/click, no animation |
| 15 | Truth Table | Input→output mappings with conflict detection (GPIO mux, logic, decode) | Interactive dropdowns, no animation |

## Hard Rules

These are non-negotiable. Every page must follow them.

### Animation
- **Smooth motion:** `requestAnimationFrame` with delta-time: `(timestamp - lastTime) / 1000 * speed`. NEVER `setTimeout` for continuous movement.
- **Playhead pattern:** Cursor position is a float. Cursor visually LEADS. Active block's right edge TRAILS the cursor, growing in real-time. Completed blocks are static DOM elements. The cursor and new content must NOT appear in the same render frame at the same position — the cursor must always be ahead.
- **Phase-based:** `setTimeout` is OK for discrete state machines (lock cycles, FSM transitions, ring buffer steps). Must check `motionReduced` flag.
- **Interactive patterns:** Click/hover driven, no animation loop needed.
- **Frame independence:** Always use delta-time. Never count frames.

### Lifecycle
- `IntersectionObserver` with 0.1 threshold starts/stops all animations when containers enter/exit viewport.
- `prefers-reduced-motion` media query + manual toggle button.
- ARIA labels on all interactive elements. Keyboard support (Enter/Space) on expandable cards. ESC closes modals.

### Naming
All JS functions follow: `[name]Init()`, `[name]Step(timestamp)`, `[name]Render()`, `[name]Toggle()`, `[name]Reset()`.
State vars: `[name]AnimId`, `[name]LastTime`, `[name]Playing`.

### Output
- Single HTML file. All CSS and JS inline.
- No external dependencies except Google Fonts.
- Vanilla JS only — no frameworks.
- CSS custom properties for all theme values.
- Mobile responsive, optimized for desktop.

## Theme

Read `references/theme-pcb-schematic.md` for the complete CSS variable spec. Key points:
- Dark navy background with copper trace grid
- Copper/gold primary, signal green active, warm red error, cool blue data
- JetBrains Mono for code, Instrument Sans for body
- Glassmorphic sidebar edge (92% opacity, backdrop-blur)
- Terminal-style modal windows with colored titlebar dots

## Layout

Read `references/infrastructure.md` for the full layout spec. Key points:
- Fixed collapsible sidebar with category grouping, `flex: none` on nav-links
- Expandable section cards: index number, pattern label, title, summary
- Viz container: header bar (label + play/pause/reset) + canvas area
- Deep dive buttons trigger modal popouts
- Category headers with decorative line + dot accent

## Before Shipping

- Check `references/known-issues.md` for gotchas
- Verify all animations use correct approach (rAF vs setTimeout)
- Test playhead patterns: cursor must visually lead content
- Confirm IntersectionObserver registration for all animated patterns
- Confirm modals close with ESC, backdrop click, and X button
