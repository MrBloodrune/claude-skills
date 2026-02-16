# Technical Visualizer Skill Rewrite — Design Document

**Date:** 2026-02-16
**Status:** Approved
**Scope:** Full rewrite of the technical-visualizer skill plugin

## Context

The technical-visualizer skill generates single-file interactive educational HTML pages with embedded visualizations. The current skill (v1) captured ~40% of the patterns from two gold-standard references (ESP32 Peripherals Guide, FreeRTOS Guide) and produced a subpar output when used to generate a firmware-architecture page.

### Root Causes of Failure

1. **No multi-chunk protocol** — pages generated in passes lost CSS/HTML coherence between chunks
2. **Incomplete pattern implementations** — 60% of the 15 visualization patterns lacked copy-paste-ready code
3. **No content architecture guidance** — the skill described HOW to build but not WHAT to build or WHY
4. **Missing anti-patterns** — common generation failures (Unicode icons, inline styles, dead JS) were undocumented
5. **No reference implementation** — nothing showing "this is what the output should look like"
6. **No interaction pattern specs** — modals, popovers, progressive disclosure were mentioned but not specified

### Analysis Reports

- `docs/plans/peripherals-guide-analysis.md` — Gold standard extraction (5382 lines, 15 viz patterns)
- `docs/plans/freertos-guide-analysis.md` — Theme variation analysis (CRT terminal aesthetic)
- `docs/plans/firmware-architecture-failure-analysis.md` — Failure mode catalog
- `docs/plans/skill-comparison-analysis.md` — Current skill vs Anthropic frontend-design skill

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reference material | Both: full reference page + per-pattern examples | Maximum output quality |
| Page size handling | Multi-chunk protocol | Pages routinely exceed 3500 lines |
| Rewrite scope | Full rewrite from scratch | Current structure has fundamental gaps |
| Default theme | PCB schematic, with theming guide | Gold standard is PCB; FreeRTOS proves theme swapping works |
| Content structure | Structured template | Opinionated page template reduces variance |
| Architecture | Layered reference files | Selective context loading per generation step |

## File Structure

```
plugins/technical-visualizer/
  .claude-plugin/plugin.json
  skills/technical-visualizer/
    SKILL.md                              (~200 lines)
    references/
      page-architecture.md                (~300 lines)
      theme-system.md                     (~250 lines)
      chunk-protocol.md                   (~150 lines)
      pattern-catalog.md                  (~400 lines)
      interaction-patterns.md             (~200 lines)
      reference-implementation.html       (~1000 lines)
      known-anti-patterns.md              (~80 lines)
```

**Total:** ~2580 lines across 8 reference + 1 hub file.

## File Specifications

### SKILL.md — Hub (Principle-Driven)

Identity frame, pre-flight analysis, pattern selection decision tree, 5-step generation process, anti-pattern anchors, hard rules.

**Key innovation vs current skill:** Adds a topic analysis framework BEFORE pattern selection. Forces Claude to: identify 4-8 subtopics, classify each as timing/state/structural/data, map content density per section, then select patterns. This prevents the "throw random patterns at the page" failure.

**Anthropic frontend-design alignment:**
- Identity framing ("you are building an interactive educational guide")
- Anti-patterns MORE specific than positive guidance (names exact failure modes)
- Extremes as anchors (the reference HTML is the floor, not the ceiling)
- Variance mandate (theming guide encourages visual differentiation per topic)

### page-architecture.md — Page Template

Defines the required page structure:

1. **Hero** (required) — Chip-element title, subtitle, tagline, stat row, overview visualization
2. **Category groups** (3-5) — Category headers grouping sections by topic area
3. **Section cards** (4-8) — Numbered, expandable, each containing:
   - Header: SVG expand icon + index + pattern label + title + summary
   - Body: `//`-prefixed H3 headers, explanation prose, 1-2 visualizations, code block, deep-dive button(s)
4. **Templates** — One `<template>` element per section requiring a deep dive
5. **Sidebar** — Auto-generated from card titles, glassmorphic blur, collapse toggle, scroll tracking
6. **Footer** — Pad dots, reference links, motion toggle

Includes complete DOM tree skeleton and content flow specification.

### theme-system.md — CSS Variables + Theming

**PCB Schematic default:**
- 4 semantic accent colors: copper (#d4924b), green (#4ade80), red (#ef4444), blue (#60a5fa)
- Each with 4 variants: base, dim, glow (50% alpha), faint (8% alpha)
- Background scale: 6 levels from #060a12 (deepest) to #10172a (card hover)
- Text scale: dim (#475569), secondary (#94a3b8), primary (#e2e8f0)
- Typography: JetBrains Mono (UI/code) + Instrument Sans (body), complete size table
- Spacing: 4/8/12/16/20/24/32/48px system
- Transitions: fast (150ms), medium (300ms), slow (500ms)
- Visual motifs: 40px copper grid, scanline overlay, solder pad dots, glow box-shadows

**Theming guide:**
- How to swap accent colors (FreeRTOS example: copper→green, green→cyan, red→red, blue→amber)
- How to swap fonts (JetBrains→VT323, Instrument Sans→IBM Plex Sans)
- How to swap motifs (PCB grid→graph paper, scanlines→CRT scanlines)
- What NOT to change: layout geometry, spacing system, transition speeds, interaction patterns

### chunk-protocol.md — Multi-Chunk Generation

For pages exceeding single-response capacity (~3500 lines):

**Chunk 1: Foundation**
- Complete `<!DOCTYPE html>` through closing `</style>`
- ALL CSS must be in this chunk — no adding styles later
- Checkpoint: verify all class names from page-architecture.md exist

**Chunk 2: Skeleton**
- `<body>` through sidebar + hero + category headers + empty card shells
- All IDs that JS will reference must be established here
- Checkpoint: verify all IDs match the plan

**Chunk 3-N: Section Groups**
- 2-3 complete sections per chunk
- Each section: `<article>` with card-header + card-body + visualizations + deep-dive buttons
- Checkpoint: verify all CSS classes used exist in Chunk 1

**Chunk N+1: Templates**
- All `<template>` elements for modal content
- Checkpoint: verify each template has a corresponding trigger button

**Chunk N+2: JavaScript**
- Complete `<script>` block with init function, IntersectionObserver, event delegation
- Checkpoint: verify all element IDs referenced in JS exist in HTML

**Validation rules:**
- CSS class inventory must be consistent across all chunks
- No inline styles unless they're computed values (e.g., SVG coordinates)
- All section cards must use identical markup structure
- DOM ID registry: track all IDs in a comment at the top of the JS chunk

### pattern-catalog.md — 15 Visualization Patterns

Each pattern includes complete, copy-paste-ready code:

| # | Pattern | Category | Animation |
|---|---------|----------|-----------|
| 1 | Playhead/Sweep | Timing | rAF continuous |
| 2 | Sequence Diagram | Timing | setTimeout discrete |
| 3 | Waveform Trace | Timing | rAF + Canvas 2D |
| 4 | Gantt Timeline | Timing | rAF sweep + positioned blocks |
| 5 | State Machine | State | setTimeout discrete |
| 6 | Pipeline/FIFO | State | setTimeout discrete |
| 7 | Lock Cycle | State | setTimeout discrete |
| 8 | Bit Register | State | User-driven (click) |
| 9 | Memory Map | Structural | No animation (click expand) |
| 10 | Tree/Hierarchy | Structural | No animation (click toggle) |
| 11 | Block Diagram | Structural | rAF pulse on connections |
| 12 | Split-Core | Structural | setTimeout alternating |
| 13 | Live Gauge | Data | rAF continuous |
| 14 | Packet Anatomy | Data | Hover-driven tooltips |
| 15 | Truth Table | Data | User-driven (select/click) |

Per pattern: HTML structure, CSS classes (using theme variables), JavaScript (animation loop, IntersectionObserver registration, play/pause/reset handlers), data configuration example.

### interaction-patterns.md — Interactive Layer

**Card expand/collapse:**
- `max-height: 0` → `max-height: 8000px` with 500ms transition
- SVG chevron rotation (0 → 90deg)
- `aria-expanded` toggle, keyboard Enter/Space support

**Deep-dive buttons:**
- Pill-shaped, grouped in a row, copper/cyan border
- Each linked to a `<template>` by data-attribute
- Click clones template innerHTML into modal body

**Modal system:**
- Backdrop: fixed, rgba(0,0,0,0.7), backdrop-filter blur(4px)
- Modal: min(720px, 90vw) width, max-height 85vh, scale(0.92)→1 entrance
- Title bar with colored dots (decorative) + close button
- ESC key, backdrop click, X button all close
- Focus trap: close button receives focus on open

**Visualization controls:**
- Standardized viz-header: label (left) + button group (right)
- Play/Pause toggle + Reset button
- Speed control (optional) via dropdown
- All buttons use `aria-label`

**Accessibility:**
- Every interactive element: `role`, `tabindex`, `aria-*`
- `prefers-reduced-motion` + manual toggle with `.reduce-motion` body class
- Focus-visible outlines using theme accent color
- Semantic HTML: `<article>`, `<nav>`, `<main>`, `<footer>`

### reference-implementation.html — Working Gold Standard

A distilled 3-section page extracted from the peripherals guide. Contains:

- Complete CSS with all theme variables and component styles
- Hero section with chip-element title and stat row
- Sidebar with scroll tracking and collapse
- 3 section cards:
  - **Card 1:** Timing pattern (Playhead/Sweep with PWM visualization)
  - **Card 2:** State pattern (State Machine with WiFi FSM)
  - **Card 3:** Data pattern (Bit Register with GPIO)
- 3 modal templates with deep-dive content
- Complete JavaScript with IntersectionObserver, rAF loops, event delegation
- Responsive breakpoint at 768px
- Full accessibility

This file is the "if in doubt, make it look like this" reference.

### known-anti-patterns.md — Failure Catalog

Documented from the firmware-architecture failure analysis:

1. **Unicode icons** — NEVER use Unicode triangles/arrows for expand icons. Use inline SVG with rotation transform.
2. **Inline styles** — NEVER use `style=""` attributes when a CSS class exists. Only inline styles are computed values (SVG positions, canvas dimensions).
3. **Dead JavaScript** — NEVER write an IIFE targeting DOM elements from another section. Each section's JS must be self-contained or use the global init pattern.
4. **Orphaned CSS classes** — NEVER reference CSS classes in HTML that don't exist in the stylesheet. Generate CSS FIRST, then HTML.
5. **Inconsistent card structure** — NEVER change card markup between sections. All cards use identical structure.
6. **Missing modals** — NEVER use deep-dive buttons without corresponding `<template>` elements.
7. **Missing controls** — NEVER create animated visualizations without play/pause/reset.
8. **setInterval** — NEVER use `setInterval` for animations. Use `requestAnimationFrame` with delta-time for continuous motion, `setTimeout` for discrete state machines.
9. **Unstyled tables** — NEVER generate `<table>` without the `.data-table` class and full styling.
10. **Mixed generation approaches** — NEVER mix inline styles and CSS classes for the same property across sections.

## Implementation Approach

Full rewrite. Delete all existing reference files and SKILL.md. Replace with the new file structure. The reference-implementation.html will be distilled from the peripherals guide (not copied verbatim — reduced to the essential 3-section structure).

## Validation

After implementation, validate by:
1. Running the plugin-dev:plugin-validator agent
2. Running the plugin-dev:skill-reviewer agent
3. Testing the skill by generating a new educational page on a fresh topic
