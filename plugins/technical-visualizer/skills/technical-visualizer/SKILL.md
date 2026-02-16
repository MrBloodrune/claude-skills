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

## Identity

You are building an interactive educational visualization page. Your output is a single self-contained HTML file that teaches a technical topic through animated diagrams, interactive controls, and progressive disclosure. Every page follows the PCB schematic aesthetic by default, uses validated animation patterns, and meets accessibility standards. The reference implementation at `references/reference-implementation.html` is the quality floor, not the ceiling.

## Pre-Flight: Topic Analysis

Before selecting patterns or writing code, analyze the topic:

1. **Break the topic into 4-8 subtopics** — these become section cards
2. **Classify each subtopic:**
   - *Timing* — has time progression, signals, ordered events
   - *State* — has state machines, data flow, resource management
   - *Structural* — has architecture, memory layout, hierarchies
   - *Data* — has values, packet structures, configuration mappings
3. **Map content density** — which subtopics need deep-dive modals?
4. **Select patterns** from the catalog below, one per subtopic
5. **Group subtopics into 3-5 categories** — these become category headers

## Pattern Catalog

| # | Pattern | Category | Use When | Animation |
|---|---------|----------|----------|-----------|
| 1 | Playhead/Sweep | Timing | State changes over time (PWM, scheduling, signals) | rAF continuous |
| 2 | Sequence Diagram | Timing | Ordered message passing (SPI, I2C, TCP, IPC) | setTimeout discrete |
| 3 | Waveform Trace | Timing | Signal values over time (GPIO, clock, data lines) | rAF + Canvas 2D |
| 4 | Gantt Timeline | Timing | Parallel activities with duration (boot, DMA, pipelines) | rAF sweep |
| 5 | State Machine | State | FSM visualization (protocol states, task lifecycle) | setTimeout discrete |
| 6 | Pipeline/FIFO | State | Data flowing through stages (queues, ring buffers) | setTimeout discrete |
| 7 | Lock Cycle | State | Resource contention (mutexes, semaphores, flash protection) | setTimeout discrete |
| 8 | Bit Register | State | Toggleable flags with side effects (config registers) | User-driven click |
| 9 | Memory Map | Structural | Address ranges (flash partitions, RAM layout) | Click-to-expand |
| 10 | Tree/Hierarchy | Structural | Parent-child relationships (file trees, component deps) | Click expand/collapse |
| 11 | Block Diagram | Structural | System architecture with data flow (SoC, bus topology) | rAF pulse on connections |
| 12 | Split-Core | Structural | Parallel processing (multi-core, pipeline stages) | setTimeout alternating |
| 13 | Live Gauge | Data | Single value with range/thresholds (ADC, battery, signal) | rAF continuous |
| 14 | Packet Anatomy | Data | Byte-field structure (BLE, Ethernet, MQTT, USB) | Hover-driven tooltips |
| 15 | Truth Table | Data | Input-output mappings with conflict detection (mux, logic) | User-driven select |

Read `references/pattern-catalog.md` for complete, copy-paste-ready implementation code for every pattern.

## Generation Process

### Step 1: Theme

Read `references/theme-system.md`. Generate the complete `:root` CSS block with all custom properties. Apply visual motifs (grid background, scanlines, pad dots). For non-default themes, follow the theming guide in that file.

### Step 2: Page Structure

Read `references/page-architecture.md`. Generate:
- Hero section with chip-element title, subtitle, tagline, stat row
- Sidebar navigation with scroll tracking, collapse toggle, motion toggle
- Category headers grouping section cards
- Section card shells with consistent markup
- Footer with pad dots and references
- Modal backdrop and container

### Step 3: Content and Visualizations

Read `references/pattern-catalog.md` for each selected pattern's implementation.
Read `references/interaction-patterns.md` for modals, controls, and accessibility specs.

For each section card, generate:
- Card header: SVG expand icon, index, pattern label, title, summary
- Card body: explanation content-block, viz-container with controls, code-block with syntax highlighting
- Deep-dive button linked to a `<template>` modal

### Step 4: Templates and JavaScript

Generate `<template>` elements at end of `<body>` for all deep-dive modals.
Generate complete `<script>` block with:
- `init()` function called on DOMContentLoaded
- IntersectionObserver for every animated viz container
- Card toggle, modal open/close, scroll tracking
- All visualization implementations
- Resize handler, reduced motion toggle

### Step 5: Validate

Check against `references/known-anti-patterns.md`.
Run the checklist at the bottom of this file.

### Multi-Chunk Pages

If the page exceeds ~3500 lines (6+ sections with complex visualizations), follow `references/chunk-protocol.md` for the multi-chunk generation sequence and inter-chunk validation rules.

## Reference Implementation

`references/reference-implementation.html` is a working 3-section page demonstrating:
- Playhead/Sweep (timing), State Machine (state), Bit Register (data)
- Complete theme, sidebar, modals, footer, responsive layout, accessibility

Open it in a browser to see exactly what the output should look like. When in doubt about structure, style, or behavior — match this file.

## Hard Rules

### Animation
- **Continuous motion:** `requestAnimationFrame` with delta-time: `(timestamp - lastTime) / 1000 * speed`. NEVER `setTimeout` for continuous movement.
- **Discrete state machines:** `setTimeout` is correct for FSM transitions, lock cycles, ring buffer steps. Must check `motionReduced` flag.
- **Interactive patterns:** Click/hover driven, no animation loop needed.
- **Frame independence:** Always use delta-time. Never count frames.

### Lifecycle
- `IntersectionObserver` (threshold 0.1) starts/stops all animations on viewport enter/exit.
- `prefers-reduced-motion` media query + manual toggle button with `.reduce-motion` body class.
- All buttons have `aria-label`. Keyboard support: Enter/Space on cards, ESC closes modals.

### Naming Convention
Functions: `[name]Init()`, `[name]Step(timestamp)`, `[name]Toggle()`, `[name]Reset()`.
State vars: `[name]AnimId`, `[name]LastTime`, `[name]Playing`.

### Output
- Single HTML file. All CSS and JS inline.
- No external dependencies except Google Fonts.
- Vanilla JS only. No frameworks.
- CSS custom properties for all theme values.
- Responsive at 768px breakpoint.

## NEVER

1. NEVER use Unicode characters for expand icons — use inline SVG with rotation transform
2. NEVER use `style=""` attributes when a CSS class exists — only computed values (SVG positions) may be inline
3. NEVER generate CSS class aliases or duplicate variable names — use theme variables directly
4. NEVER change card markup structure between sections — all cards are identical
5. NEVER skip deep-dive buttons on any section — every section has at least one
6. NEVER place modals inside `<main>` — use `<template>` elements at end of `<body>`
7. NEVER use `setInterval` for animations — rAF for continuous, setTimeout for discrete
8. NEVER generate `<table>` without `.data-table` class and full styling
9. NEVER mix inline styles and CSS classes for the same property across sections
10. NEVER write JavaScript targeting DOM elements from another section's chunk

Full failure catalog: `references/known-anti-patterns.md`

## Before Shipping

```
[ ] All animations use rAF+delta-time (continuous) or setTimeout (discrete)
[ ] IntersectionObserver registered for every animated visualization
[ ] Every card has identical markup structure (article > card-header > card-body > card-content)
[ ] Every section has at least one deep-dive button with working modal
[ ] All CSS classes used in HTML exist in the stylesheet
[ ] ESC closes modals, Enter/Space toggles cards, all buttons have aria-label
[ ] Reduced motion toggle works (both CSS media query and manual button)
[ ] Page renders correctly at 768px and 1440px
[ ] Expand icons are SVG, not Unicode
[ ] No orphaned CSS classes or dead JavaScript
```
