# Technical Visualizer — Design Document

**Date:** 2026-02-15
**Status:** Approved
**Plugin:** `technical-visualizer`
**Location:** `plugins/technical-visualizer/`

## Purpose

A pattern-catalog skill for building interactive educational websites about technical topics. Captures implementation-level best practices so output is uniform, repeatable, and combinable into collections. Pages generated at different times look like they belong together.

## Scope

- **Domain:** Technical education only (CS, embedded, networking, protocols)
- **Aesthetic:** PCB/EDA schematic theme (single theme to start, expandable later)
- **Output:** Single-file HTML pages with interactive visualizations
- **Approach:** Pattern catalog with hard implementation rules, not templates

## What It Is NOT

- Not a template or skeleton generator
- Not a general-purpose frontend skill
- Not aesthetic guidance (the aesthetic is decided — PCB schematic)

## Reference Implementations

Two validated examples built during design:
- `/data/dev/projects/esp32/freertos-guide.html` — Oscilloscope theme, 6 patterns
- `/data/dev/projects/esp32/esp32-peripherals-guide.html` — PCB theme, 15 patterns

## Pattern Catalog (15 Patterns)

### Timing & Sequential
1. **Playhead/Sweep** — Time-driven state with cursor revealing history
2. **Sequence Diagram** — Ordered message passing between entities
3. **Waveform Trace** — Signal values over time (HIGH/LOW)
4. **Gantt Timeline** — Parallel activities with duration bars

### State & Flow
5. **State Machine** — Nodes + transitions, active state highlighted
6. **Pipeline/FIFO** — Items flowing through stages
7. **Lock Cycle** — Resource contention with acquire/release
8. **Bit Register** — Toggleable bit flags with dependent logic

### Structural
9. **Memory Map** — Address ranges with labeled regions
10. **Tree/Hierarchy** — Parent-child with expand/collapse
11. **Block Diagram** — Components with data flow arrows
12. **Split-Core** — Parallel processing lanes

### Data
13. **Live Gauge/Meter** — Single value with thresholds
14. **Packet Anatomy** — Labeled byte fields in a frame
15. **Truth Table** — Input/output combinations with conflict detection

## Implementation Rules (Non-Negotiable)

| Rule | Detail |
|------|--------|
| Smooth animation | `requestAnimationFrame` + delta-time. Never `setTimeout` for continuous motion. |
| Playhead pattern | Float position. Cursor leads. Active block trails. Completed blocks static. |
| Phase-based | `setTimeout` OK for discrete state machines. Must check `motionReduced`. |
| Interactive | Click/hover driven, no animation loop. Memory map, tree, packet, truth table. |
| Frame independence | `(timestamp - lastTime) / 1000 * speed`. Never frame-count based. |
| Observer lifecycle | IntersectionObserver starts/stops animations offscreen. |
| Naming convention | `[name]Step`, `[name]Toggle`, `[name]Reset`, `[name]Render`, `[name]Init` |

## Theme: PCB Schematic

- **Background:** `#0a0f1a`, secondary `#0d1220`
- **Primary:** Copper `#d4924b`
- **Signal green:** `#4ade80`
- **Warm red:** `#ef4444`
- **Cool blue:** `#60a5fa`
- **Text:** `#e2e8f0` / `#94a3b8` / `#475569`
- **Fonts:** JetBrains Mono (code), Instrument Sans (body)
- **Sidebar:** Glassmorphic edge, 92% opacity, backdrop-blur 12px
- **Motifs:** Copper trace grid, solder pads, silkscreen labels, component boxes

## Layout Conventions

- Fixed collapsible sidebar with category grouping
- Expandable cards: index number, pattern label, title, summary
- Viz container: header bar (label + controls) + canvas
- Deep dive → modal popouts (terminal titlebar, scale-up, backdrop blur)
- Category headers with decorative line + dot

## Known Issues

- FSM arrows tangle with >4 cross-connected nodes
- Sidebar `flex: 1` on nav-links causes section spread — use `flex: none`
- Playhead cursor/block sync — cursor position must lead block render position
- Single-file 15 patterns ≈ 190KB — chunk into 5-pattern pages for large collections

## Future Expansion

- Additional themes as `theme-*.md` files
- Pattern additions into existing category reference files
- Known issues grows as we iterate
