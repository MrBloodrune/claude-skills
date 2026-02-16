# Technical Visualizer Skill Rewrite Design

**Date:** 2026-02-16
**Status:** Approved
**Scope:** Full rewrite of the technical-visualizer skill

## Context

The current skill produces output at ~55-60% of the gold standard (ESP32 peripherals guide). Root causes: incomplete pattern documentation, missing CSS classes, no multi-chunk protocol, no content architecture guidance, ~60% of patterns lack implementation-ready code.

### Reference Materials

- **Gold standard:** `esp32-peripherals-guide.html` (5382 lines, 15 viz patterns, complete PCB schematic aesthetic)
- **Theme variation:** `freertos-guide.html` (2535 lines, terminal/CRT theme, proves structural patterns work across aesthetics)
- **Failed output:** `firmware-architecture.html` (~55-60% quality, multi-chunk inconsistency, missing CSS, broken icons)
- **Structural inspiration:** Anthropic `frontend-design` skill (42 lines, principle-driven, strong anti-patterns)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reference material | Full reference page + pattern examples | Maximum coverage for Claude to learn from |
| Page size strategy | Multi-chunk protocol | Handles large pages without losing consistency |
| Rewrite scope | Full rewrite | Current structure has too many inherited gaps |
| Theming | PCB default, themeable | Opinionated default with documented swap path |
| Content structure | Structured template | Consistent output quality across topics |

## File Structure

```
skills/technical-visualizer/
├── SKILL.md                          (~150 lines) Principle-driven hub
├── references/
│   ├── reference-implementation.html (~1000 lines) Distilled gold standard
│   ├── content-architecture.md       (~120 lines) Page template + pedagogy
│   ├── theme-system.md               (~200 lines) PCB default + theming guide
│   ├── pattern-timing.md             (~300 lines) Patterns 1-4, complete code
│   ├── pattern-state.md              (~300 lines) Patterns 5-8, complete code
│   ├── pattern-structural.md         (~300 lines) Patterns 9-12, complete code
│   ├── pattern-data.md               (~300 lines) Patterns 13-15, complete code
│   ├── multi-chunk-protocol.md       (~100 lines) Chunking rules + validation
│   └── anti-patterns.md              (~80 lines)  Documented failure modes
```

**Total:** ~2850 lines across 10 files.

## SKILL.md

Anthropic-style principle-driven hub:

1. **Identity Frame** -- "You are building an interactive educational guide. Every page is a self-contained teaching tool with embedded visualizations that make abstract concepts tangible."
2. **Design Principles** -- Progressive disclosure, animation as pedagogy, consistency through convention, accessibility by default
3. **Process** -- Identify topic -> Read content-architecture -> Select patterns -> Read relevant pattern files -> Read theme-system -> Generate (single or multi-chunk) -> Validate against anti-patterns
4. **Pattern Catalog Table** -- All 15 patterns with "Use When" and reference file link
5. **Hard Rules** -- Single HTML file, no external deps except Google Fonts, all CSS/JS inline, ARIA + keyboard + reduced-motion
6. **Anti-Pattern Anchors** -- Top 5 failure modes as NEVER rules

## Reference Implementation

Distilled from the peripherals guide. A real, working HTML page:

- **Hero section** -- Title, subtitle, overview Block Diagram visualization
- **Sidebar** -- Navigation from card titles, glassmorphic blur, collapse toggle
- **3 topic cards** demonstrating different viz types:
  - Card 1: Timing pattern (Playhead/Sweep) with play/pause/reset
  - Card 2: State pattern (State Machine) with step controls
  - Card 3: Data pattern (Packet Anatomy) with hover interactions
- **Modal system** -- `<template>` elements, scale entrance animation, backdrop blur, ESC close
- **Footer** -- References and metadata
- **Complete CSS** -- All custom properties (~50 vars), responsive breakpoints, accessibility
- **Complete JS** -- IntersectionObserver, rAF loop, event delegation

## Content Architecture

Structured page template:

- **Hero** (required): Title, subtitle, 1 overview visualization, brief intro
- **Topic Cards** (4-8 per page): Header (icon + title + SVG chevron toggle), Body (2-3 paragraphs + 1-2 visualizations + optional data table), Modal trigger ("Deep Dive" button)
- **Modals** (1 per card as needed): Extended explanation, additional visualizations, code examples
- **Sidebar**: Auto-generated from card titles, sticky, collapses on mobile
- **Footer**: References, further reading, metadata
- **Pedagogical flow**: Explain concept -> show static diagram -> animate behavior -> let user interact

## Theme System

PCB schematic as complete default:

- **Color system**: 4 semantic roles (primary/success/danger/accent) x 4 variants (base/dim/glow/faint) = 16 color variables
- **Typography**: Dual font (JetBrains Mono for UI/code + Instrument Sans for body)
- **Visual motifs**: Background grid, copper glows, scanline overlay, solder pad dots
- **Swap guide**: How to create a new theme by changing ~20 CSS variables + motif patterns (FreeRTOS terminal example)

## Pattern Files

4 files covering 15 patterns. Per pattern:

- **When to use** (1-2 sentences)
- **HTML structure** (complete, copy-paste ready)
- **CSS** (scoped to pattern classes)
- **JavaScript** (complete animation with rAF/setTimeout, IntersectionObserver, controls)
- **Variations** (1-2 alternate configurations)

All patterns use standardized viz container: header bar (label + controls) + canvas area (20px grid background).

### Pattern Catalog

| # | Pattern | File | Animation |
|---|---------|------|-----------|
| 1 | Playhead / Sweep | pattern-timing | rAF continuous |
| 2 | Sequence Diagram | pattern-timing | setTimeout stepped |
| 3 | Waveform Trace | pattern-timing | rAF continuous |
| 4 | Gantt Timeline | pattern-timing | rAF continuous |
| 5 | State Machine | pattern-state | setTimeout stepped |
| 6 | Pipeline / FIFO | pattern-state | rAF continuous |
| 7 | Lock Cycle | pattern-state | setTimeout stepped |
| 8 | Bit Register | pattern-state | setTimeout stepped |
| 9 | Memory Map | pattern-structural | Static + hover |
| 10 | Tree / Hierarchy | pattern-structural | Static + expand |
| 11 | Block Diagram | pattern-structural | Static + hover |
| 12 | Split-Core | pattern-structural | rAF continuous |
| 13 | Live Gauge | pattern-data | rAF continuous |
| 14 | Packet Anatomy | pattern-data | Static + hover |
| 15 | Truth Table | pattern-data | Static + toggle |

## Multi-Chunk Protocol

For pages exceeding ~3500 lines:

1. **Chunk 1: Foundation** -- Complete `<head>`, all CSS, hero section, sidebar skeleton
2. **Chunks 2-N: Content** -- 2-3 cards per chunk with complete HTML + scoped JS
3. **Final Chunk: Assembly** -- Footer, `<template>` modals, main JS (IntersectionObserver, event delegation, global state)
4. **Validation checkpoints** between chunks: CSS class inventory, DOM ID registry, JS function registry

## Anti-Patterns

From firmware-architecture failure analysis:

1. NEVER use Unicode characters for icons (use SVG)
2. NEVER use inline styles when a CSS class exists in the theme
3. NEVER create a visualization IIFE targeting DOM elements from a different section
4. NEVER reference CSS classes that aren't defined in the stylesheet
5. NEVER change card structure mid-page (all cards use identical markup)
6. NEVER skip the modal system for deep-dive content
7. NEVER omit play/pause/reset controls on animated visualizations
8. NEVER use setInterval for animations (use requestAnimationFrame with delta-time)
