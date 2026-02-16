# Technical Visualizer Skill Rewrite — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the technical-visualizer skill from scratch so every generated page matches the quality of the ESP32 peripherals guide.

**Architecture:** Full rewrite with principle-driven SKILL.md hub, distilled reference implementation HTML, 4 pattern files with complete code, content architecture guide, theme system, multi-chunk protocol, and anti-patterns catalog. All existing reference files are replaced.

**Tech Stack:** Markdown skill files, single-file HTML reference implementation (vanilla JS/CSS)

**Gold standard source:** `/home/bloodrune/dev/projects/esp32/esp32-peripherals-guide.html`
**Theme variation source:** `/home/bloodrune/dev/projects/esp32/freertos-guide.html`
**Failed output (anti-pattern source):** `/home/bloodrune/dev/projects/esp32/dog/firmware-architecture.html`
**Current skill location:** `/data/dev/skills/claude-skills/plugins/technical-visualizer/skills/technical-visualizer/`

---

## Task 1: Extract Reference Implementation from Gold Standard

**Files:**
- Create: `references/reference-implementation.html`

**Step 1: Read the gold standard**

Read the full `esp32-peripherals-guide.html` (5382 lines). Understand the complete structure: CSS custom properties, all class definitions, JS architecture.

**Step 2: Distill into a reference implementation**

Create a working HTML page (~1000 lines) that contains:

**CSS (complete):** Copy ALL CSS from the gold standard verbatim. This includes:
- All `:root` custom properties (lines 12-51 of gold standard)
- Reset & base styles
- Reduced motion rules
- Copper trace grid background (`body::before`)
- Sidebar styles (`.nav-sidebar`, `.nav-header`, `.nav-links`, `.nav-section-label`, `.nav-controls`, `.motion-toggle`)
- Card styles (`.section-card`, `.card-header`, `.card-index`, `.card-info`, `.card-pattern-label`, `.card-title`, `.card-summary`, `.card-expand-icon`, `.card-body`, `.card-content`)
- Category header styles (`.category-header`, `.pad-dot`)
- Viz container styles (`.viz-container`, `.viz-header`, `.viz-label`, `.viz-controls`, `.viz-btn`, `.viz-canvas`)
- Content block styles (`.content-block`)
- Deep dive button styles (`.deep-dive-btn`)
- Modal styles (`.modal-backdrop`, `.modal`, `.modal-titlebar`, `.modal-dots`, `.modal-title-text`, `.modal-close`, `.modal-body`)
- Code block styles (`.code-block`, syntax highlighting classes)
- Data table styles (`.data-table`)
- Hero styles (`.hero`, `.hero-content`, `.hero-chip`, `.hero-title`, `.hero-subtitle`, `.hero-tagline`)
- Footer styles
- Mobile hamburger button (`.mobile-nav-btn`)
- Responsive breakpoint (768px)
- ALL utility classes used in the gold standard

**HTML (3 cards):** Include:
1. Hero section with title, subtitle, tagline
2. Sidebar with navigation, section labels, motion toggle
3. Modal backdrop + modal container
4. Category header
5. Card 1: PWM (Playhead/Sweep pattern) — complete card with header, body, viz container, content block, code block, deep dive button
6. Card 2: WiFi FSM (State Machine pattern) — complete card demonstrating setTimeout-based animation
7. Card 3: BLE Packet (Packet Anatomy pattern) — complete card demonstrating interactive hover pattern
8. One `<template>` element for the PWM modal
9. Footer

**JavaScript (complete):** Include:
- `toggleCard()` with keyboard support (Enter/Space)
- `openModal()` / `closeModal()` with template cloning
- ESC key handler for modal
- `toggleMotion()` for reduced motion toggle
- `updateActiveNav()` scroll-synced sidebar
- `IntersectionObserver` setup
- PWM animation (rAF + delta-time, complete `pwmInit/Step/Render/Toggle/Reset`)
- WiFi FSM animation (setTimeout phase-based, complete `wifiInit/Step/Toggle/Reset`)
- BLE Packet interaction (hover/click handlers, complete `packetInit`)
- `DOMContentLoaded` init function
- Mobile sidebar toggle

**CRITICAL:** This must be a real, working HTML page that opens in a browser and looks correct. Copy code from the gold standard — do not rewrite it. The purpose is to give Claude a complete, verified example to reference.

**Step 3: Add comments marking structural sections**

Add HTML comments at key boundaries:
```html
<!-- ===== HERO SECTION ===== -->
<!-- ===== SIDEBAR NAVIGATION ===== -->
<!-- ===== MODAL SYSTEM ===== -->
<!-- ===== CARD: Timing Pattern (Playhead/Sweep) ===== -->
<!-- ===== CARD: State Pattern (State Machine) ===== -->
<!-- ===== CARD: Data Pattern (Packet Anatomy) ===== -->
<!-- ===== TEMPLATE: Modal Content ===== -->
<!-- ===== FOOTER ===== -->
<!-- ===== JAVASCRIPT ===== -->
```

**Step 4: Validate**

Open the file in a browser. Verify:
- Hero renders with copper trace grid background
- Sidebar shows navigation with section labels
- All 3 cards expand/collapse with chevron rotation
- PWM animation plays with cursor leading blocks
- WiFi FSM cycles through states
- BLE packet fields respond to hover
- Deep dive button opens modal with template content
- ESC closes modal
- Motion toggle disables animations
- Responsive at 768px breakpoint

**Step 5: Commit**

```bash
git add references/reference-implementation.html
git commit -m "feat(technical-visualizer): add distilled reference implementation"
```

---

## Task 2: Write SKILL.md Hub

**Files:**
- Rewrite: `SKILL.md`

**Step 1: Read Anthropic's frontend-design skill for structural inspiration**

Read `/home/bloodrune/.claude/plugins/cache/claude-plugins-official/frontend-design/2cd88e7947b7/skills/frontend-design/SKILL.md` (42 lines). Note the structure: identity framing, principle bullets, anti-pattern anchors, extreme language.

**Step 2: Write the new SKILL.md**

Structure (~150 lines):

```markdown
---
name: Technical Visualizer
description: >-
  Trigger on "educational website", "interactive guide", "technical visualization",
  "interactive tutorial", "visualization page", "visual explainer", "animated diagram",
  "educational page", "technical education". Creates single-file interactive HTML pages
  with animated visualizations for technical topics.
---

# Technical Visualizer

You are building an interactive educational guide. Every page is a self-contained
teaching tool — a single HTML file with embedded visualizations that make abstract
concepts tangible. The reader should understand through seeing and interacting,
not just reading.

## Design Principles

- **Progressive disclosure.** Card header shows what it is. Card body explains and
  demonstrates. Modal goes deep. Never dump everything at once.
- **Animation as pedagogy.** Every animation teaches. A PWM sweep shows duty cycle.
  A state machine replay shows transitions. If the animation doesn't teach, remove it.
- **Consistency through convention.** Every card uses the same markup. Every viz
  container has the same controls. Every modal opens the same way. Variation is in
  content, never in structure.
- **Accessibility by default.** ARIA labels, keyboard navigation, reduced motion
  support. Not an afterthought — baked in from the start.

## Process

1. **Identify the topic** — What technical subject needs visual explanation?
2. **Read content-architecture.md** — Understand the page template and pedagogical flow
3. **Select 4-8 patterns** from the catalog below that fit the topic's concepts
4. **Read the relevant pattern files** for complete implementation code
5. **Read theme-system.md** for CSS variables and visual motifs
6. **Read reference-implementation.html** — This is your canonical example. Match its
   structure, class names, and conventions exactly.
7. **Generate the page** — Single-response if <3500 lines, otherwise follow multi-chunk-protocol.md
8. **Validate against anti-patterns.md** — Check every item before shipping

## Pattern Catalog

[Same 15-pattern table from current SKILL.md, organized by category]

## Hard Rules

- Single HTML file. All CSS and JS inline. No frameworks.
- No external dependencies except Google Fonts (JetBrains Mono + Instrument Sans).
- CSS custom properties for ALL theme values — never hardcode colors.
- `requestAnimationFrame` with delta-time for smooth motion. NEVER `setInterval`.
- `setTimeout` only for discrete state machines. Must check `motionReduced` flag.
- `IntersectionObserver` at 0.1 threshold starts/stops all animations.
- ARIA labels on all interactive elements. Keyboard Enter/Space on cards. ESC closes modals.
- `prefers-reduced-motion` media query + manual toggle button.
- Every card uses identical markup structure. No exceptions.
- Every viz container has header (label + controls) + canvas.
- All JS functions: `[name]Init()`, `[name]Step()`, `[name]Render()`, `[name]Toggle()`, `[name]Reset()`.
- SVG chevron for card expand icon. NEVER Unicode characters for icons.
- Copy CSS class names from reference-implementation.html. NEVER invent new class names
  when one already exists in the reference.

## NEVER

These are the most common failure modes. Violating any of these produces broken output:

1. NEVER use Unicode characters for icons (▶, ▼, etc.) — use SVG or HTML entities from the reference
2. NEVER use inline styles when a CSS class exists in the theme
3. NEVER reference CSS classes that aren't defined in the stylesheet
4. NEVER change card structure between sections — all cards use identical markup
5. NEVER create a visualization IIFE that targets DOM elements from a different section
6. NEVER skip the modal system for content that needs deep dives
7. NEVER omit play/pause/reset controls on animated visualizations
8. NEVER use `setInterval` for animations
```

**Step 3: Commit**

```bash
git add SKILL.md
git commit -m "feat(technical-visualizer): rewrite SKILL.md as principle-driven hub"
```

---

## Task 3: Write content-architecture.md

**Files:**
- Create: `references/content-architecture.md`

**Step 1: Analyze the gold standard's content structure**

Read the gold standard HTML to extract the pedagogical pattern:
- Hero: title + subtitle + tagline (no visualization in hero, just decorative chip)
- 15 cards organized into 4 categories
- Each card: 2-3 paragraphs of explanation, then visualization, then code example, then deep dive button
- Modals: Extended explanation with additional context, formulas, tables

**Step 2: Write content-architecture.md (~120 lines)**

Cover:
1. **Page template** — Required sections in order: hero, category headers, topic cards, footer
2. **Hero section** — Title (topic name), subtitle (scope descriptor), tagline (what the guide teaches). No visualization in hero — it's a title card.
3. **Topic cards (4-8 per page)** — Each card must have:
   - Card header: 2-digit index, pattern type label (uppercase), title, 1-line summary
   - Card body content blocks: explanation text (2-3 paragraphs introducing the concept), then visualization, then optional code example, then deep dive button
   - Content block headings use `<h3>` inside `.content-block` divs
4. **Pedagogical flow per card**: Explain what it is → Show the concept visually → Provide implementation code → Offer deep dive for advanced details
5. **Category headers** — Group cards by pattern type. Use category-header with pad-dot.
6. **Modals** — One `<template>` per card that has a deep dive button. Template ID matches `[card-id]-modal`. Modal content: extended explanation, formulas, comparison tables, additional context the main card doesn't have room for.
7. **Sidebar** — One nav link per card, grouped by category with section labels. Overview link at top. Motion toggle at bottom.
8. **Footer** — References, resources, metadata about the guide.
9. **Content density** — Each card's explanation text should be 80-150 words. Enough to explain the concept, not a textbook. The visualization does the heavy lifting.
10. **Code examples** — Use `.code-block` div with manual syntax highlighting spans (`<span class="cmt">`, `<span class="fn">`, `<span class="type">`, `<span class="macro">`, `<span class="num">`, `<span class="str">`). No `<pre><code>` tags.

**Step 3: Commit**

```bash
git add references/content-architecture.md
git commit -m "feat(technical-visualizer): add content architecture guide"
```

---

## Task 4: Rewrite theme-system.md

**Files:**
- Rewrite: `references/theme-system.md` (currently `theme-pcb-schematic.md`)

**Step 1: Read current theme-pcb-schematic.md**

Already read — it's 218 lines covering CSS variables, color semantics, visual motifs, sidebar, modal, code blocks.

**Step 2: Rewrite as theme-system.md (~200 lines)**

Keep all the PCB schematic content (it's excellent). Add:

1. **Rename** to `theme-system.md` to reflect it covers theming, not just one theme
2. **PCB Schematic (Default)** section — All current CSS variables, motifs, typography. This stays the complete default. Copy the exact `:root` block from the gold standard.
3. **Creating a New Theme** section — Step-by-step guide using FreeRTOS terminal theme as example:
   - Step 1: Choose a palette (4 semantic colors x 4 variants = 16 vars)
   - Step 2: Choose fonts (1 monospace + 1 body)
   - Step 3: Choose visual motifs (background pattern, glow style, border treatment)
   - Step 4: Show the FreeRTOS example: green phosphor (#00ff41), VT323 font, CRT scanlines
   - Include the FreeRTOS `:root` block as a complete alternative example
4. **Color Semantics** — Keep the current table. Add: "These roles are stable across all themes. A theme changes the specific hues, not the semantic roles."
5. **Complete CSS Class Reference** — List every CSS class used in the reference implementation with a one-line description. This is the authoritative list. If a class isn't here, it shouldn't be used.

**Step 3: Delete old file, commit**

```bash
git rm references/theme-pcb-schematic.md
git add references/theme-system.md
git commit -m "feat(technical-visualizer): rewrite theme as theme-system with theming guide"
```

---

## Task 5: Rewrite pattern-timing.md

**Files:**
- Rewrite: `references/pattern-timing.md`

**Step 1: Extract complete implementations from gold standard**

Read the gold standard's JavaScript for patterns 1-4:
- PWM (Playhead/Sweep): Find `pwmInit`, `pwmStep`, `pwmRender`, `pwmToggle`, `pwmReset`
- SPI (Sequence Diagram): Find `spiInit`, `spiStep`, `spiRender`, `spiToggle`, `spiReset`
- I2C (Waveform Trace): Find `i2cInit`, `i2cStep`, `i2cRender`, `i2cToggle`, `i2cReset`
- Boot (Gantt Timeline): Find `bootInit`, `bootStep`, `bootRender`, `bootToggle`, `bootReset`

Also extract:
- Complete HTML for each card's viz container and content
- Complete CSS for each pattern's specific classes (`.pwm-viz`, `.pwm-channel`, `.pwm-track`, `.pwm-blocks`, `.pwm-cursor`, etc.)

**Step 2: Write pattern-timing.md (~300 lines)**

For each of the 4 patterns, provide:

```markdown
## 1. Playhead/Sweep

**Use when:** State changes over time — scheduling, PWM, signals, bus transactions.

**Animation:** `requestAnimationFrame` with delta-time. Cursor is a float that leads.
Completed blocks trail behind as static DOM elements.

### HTML
[Complete card body HTML from gold standard — viz container with controls, content blocks]

### CSS
[Complete CSS for .pwm-viz, .pwm-channel, .pwm-track, .pwm-blocks, .pwm-cursor, .pwm-label, .duty, .pwm-time-scale classes]

### JavaScript
[Complete pwmInit(), pwmStep(), pwmRender(), pwmToggle(), pwmReset() functions]

### Variations
- Multiple tracks: Add more .pwm-channel divs
- Different speeds: Modify SPEED constant
- Different patterns: Change the duty cycle array
```

**CRITICAL:** Copy code directly from the gold standard. Do not simplify, abbreviate, or "clean up" the implementations. The goal is verified, working code.

**Step 3: Commit**

```bash
git add references/pattern-timing.md
git commit -m "feat(technical-visualizer): rewrite timing patterns with complete code"
```

---

## Task 6: Rewrite pattern-state.md

**Files:**
- Rewrite: `references/pattern-state.md`

**Step 1: Extract complete implementations from gold standard**

Read the gold standard's JavaScript for patterns 5-8:
- WiFi FSM (State Machine): `wifiInit`, `wifiStep`, etc.
- UART Ring (Pipeline/FIFO): `ringInit`, `ringStep`, etc.
- Flash Lock (Lock Cycle): `lockInit`, `lockStep`, etc.
- GPIO Register (Bit Register): `gpioInit`, `gpioToggleBit`, etc.

Also extract complete HTML and CSS for each.

**Step 2: Write pattern-state.md (~300 lines)**

Same structure as pattern-timing.md. For each pattern:
- Use When
- Animation approach
- Complete HTML
- Complete CSS
- Complete JavaScript
- Variations

**CRITICAL:** The State Machine pattern has a known issue (SVG arrow tangles with >4 nodes). Document the mitigation strategies in the pattern file: curved paths, offset parallel arrows, layout that minimizes crossing.

**Step 3: Commit**

```bash
git add references/pattern-state.md
git commit -m "feat(technical-visualizer): rewrite state patterns with complete code"
```

---

## Task 7: Rewrite pattern-structural.md

**Files:**
- Rewrite: `references/pattern-structural.md`

**Step 1: Extract complete implementations from gold standard**

Read the gold standard's JavaScript for patterns 9-12:
- Memory Map: `memInit`, click handlers
- IDF Tree: `treeInit`, expand/collapse handlers
- Block Diagram: `blockInit`, `blockStep`, pulse animation
- Split Core: `splitInit`, `splitStep`, lane animations

Also extract complete HTML and CSS for each.

**Step 2: Write pattern-structural.md (~300 lines)**

Same structure. The Block Diagram pattern needs special attention:
- SVG overlay for connection lines
- Pulse animation along paths
- `resize` event handler for recalculating SVG positions
- Click-to-highlight with dimming unrelated blocks

The Memory Map and Tree patterns are interactive-only (no animation loop), so document the click handler patterns clearly.

**Step 3: Commit**

```bash
git add references/pattern-structural.md
git commit -m "feat(technical-visualizer): rewrite structural patterns with complete code"
```

---

## Task 8: Rewrite pattern-data.md

**Files:**
- Rewrite: `references/pattern-data.md`

**Step 1: Extract complete implementations from gold standard**

Read the gold standard's JavaScript for patterns 13-15:
- ADC Gauge: `gaugeInit`, `gaugeStep`, SVG arc rendering
- BLE Packet: `packetInit`, hover/click handlers
- GPIO Truth Table: `truthInit`, dropdown handlers, conflict detection

Also extract complete HTML and CSS for each.

**Step 2: Write pattern-data.md (~300 lines)**

Same structure. The Packet Anatomy pattern needs:
- Complete field data structure
- Hover tooltip positioning logic
- Click-to-expand per-byte breakdown
- Field width calculation (proportional to byte count)

The Truth Table pattern needs:
- Styled dropdown implementation matching theme
- Conflict detection logic with visual highlighting
- Optional chip pinout diagram

**Step 3: Commit**

```bash
git add references/pattern-data.md
git commit -m "feat(technical-visualizer): rewrite data patterns with complete code"
```

---

## Task 9: Write multi-chunk-protocol.md

**Files:**
- Create: `references/multi-chunk-protocol.md`

**Step 1: Analyze the firmware-architecture failure**

Read `/home/bloodrune/dev/projects/esp32/dog/firmware-architecture.html`. Identify every point where chunk boundaries caused inconsistency:
- CSS classes referenced but not defined (defined in a different chunk)
- Card structure changing between sections (different chunk wrote different markup)
- Dead JavaScript (IIFE targeting elements from another chunk)
- Inline styles overriding missing CSS classes

**Step 2: Write multi-chunk-protocol.md (~100 lines)**

```markdown
# Multi-Chunk Generation Protocol

Use this when a page will exceed ~3500 lines (more than 8 complex cards with
visualizations). For pages with 4-6 cards, generate in a single response.

## Chunk Order

### Chunk 1: Foundation (~800-1200 lines)

Generate the complete page skeleton:
- Full `<!DOCTYPE html>` through closing `</style>` — ALL CSS must be in this chunk
- Hero section
- Sidebar with all navigation links (you must know all card titles before starting)
- Modal backdrop and modal container
- Category headers
- First 2-3 card articles (complete with HTML + viz containers)
- Do NOT close `</main>`, `</body>`, or `</html>`

### Chunks 2-N: Content Sections (~600-900 lines each)

Each chunk adds 2-3 complete card articles:
- Start with the next `<article class="section-card">` — no preamble
- Include complete card HTML with all viz containers and content blocks
- Do NOT add any `<style>` tags — all CSS was in Chunk 1
- Do NOT close structural tags (`</main>`, `</body>`, `</html>`)

### Final Chunk: Assembly (~400-800 lines)

Close the page:
- Any remaining card articles
- Close `</div>` for sections-container
- Footer
- All `<template>` elements for modals
- Opening `<script>` tag
- ALL JavaScript (complete)
- Close `</script>`, `</body>`, `</html>`

## Validation Checkpoints

Between each chunk, verify:

1. **CSS Class Inventory:** List every CSS class used in the chunk. Verify each
   exists in the Chunk 1 stylesheet. If any are missing, add them to a running
   "needs CSS" list and add them before closing the `</style>` tag. If Chunk 1 is
   already generated, STOP and regenerate from Chunk 1.

2. **DOM ID Registry:** Track every `id` attribute. Verify no duplicates across
   chunks. Every `id` referenced in JavaScript must exist in some chunk's HTML.

3. **Card Structure Check:** Every `<article class="section-card">` must have
   identical structure: card-header (with card-index, card-info [card-pattern-label,
   card-title, card-summary], card-expand-icon) + card-body (with card-content).

4. **Template Registry:** For every deep-dive-btn `onclick="openModal('X-modal')"`,
   verify a `<template id="X-modal">` exists or will exist in the final chunk.

## Rules

- ALL CSS goes in Chunk 1. No exceptions. No inline `<style>` in later chunks.
- ALL JavaScript goes in the Final Chunk. No inline `<script>` in earlier chunks.
- Card markup structure is identical across ALL chunks.
- If you realize mid-generation that you need a CSS class that doesn't exist,
  you MUST restart from Chunk 1.
- Never use inline styles as a workaround for missing CSS classes.
```

**Step 3: Commit**

```bash
git add references/multi-chunk-protocol.md
git commit -m "feat(technical-visualizer): add multi-chunk generation protocol"
```

---

## Task 10: Write anti-patterns.md

**Files:**
- Create: `references/anti-patterns.md`

**Step 1: Catalog all failure modes from the firmware-architecture output**

Read the failed output and the analysis at `docs/plans/firmware-architecture-failure-analysis.md` (if it exists). Document every concrete failure.

**Step 2: Write anti-patterns.md (~80 lines)**

```markdown
# Anti-Patterns

Every item here was found in a real failed output. Check each one before shipping.

## Structural

1. **Mixed card markup.** Sections 01-07 used one card structure, 08-09 used a
   different one. All cards MUST use identical markup from the reference implementation.

2. **Inline styles replacing CSS classes.** Sections 01-03 used inline
   `style="background: ..."` instead of CSS classes. NEVER use inline styles when
   a class exists.

3. **Missing CSS classes.** The following classes were used in HTML but never defined
   in CSS: `data-table`, `legend`, `legend-item`, `legend-line`, `packet-viz`,
   `pf-name`, `pf-size`, `pf-bits`, `card-info`. Always verify every class exists.

## Icons & Typography

4. **Unicode expand icons.** Used `▶` triangle character instead of the SVG/HTML
   entity chevron from the reference. Unicode renders inconsistently across platforms.
   Use the reference implementation's expand icon exactly.

5. **Missing Google Fonts link.** Forgot to include the `<link>` tags for JetBrains
   Mono and Instrument Sans. Page falls back to system fonts.

## JavaScript

6. **Dead IIFE code.** The main script contained an immediately-invoked function
   that targeted DOM elements (`networkViz`, `stackCanvas`) that don't exist in the
   HTML. This happens when JavaScript is written for a planned section that was later
   restructured.

7. **No IntersectionObserver registration.** Animations were initialized but never
   registered with IntersectionObserver, so they either never start or run off-screen
   wasting CPU.

8. **setInterval for animation.** Used `setInterval(render, 16)` instead of
   `requestAnimationFrame`. This produces jerky animation and doesn't respect
   tab visibility.

## Content

9. **Unstyled data tables.** 6+ HTML tables had no styling because the `data-table`
   CSS class was never defined. Tables must use the `.data-table` class from the
   theme system.

10. **No modals.** Deep dive content was put directly in the card body instead of
    using the `<template>` + modal system. This makes cards too long and breaks
    progressive disclosure.

11. **No code examples.** Technical guide pages should include implementation
    code blocks showing how to use the concept in practice.
```

**Step 3: Commit**

```bash
git add references/anti-patterns.md
git commit -m "feat(technical-visualizer): add anti-patterns catalog from failure analysis"
```

---

## Task 11: Delete Old Files and Update infrastructure.md

**Files:**
- Delete: `references/infrastructure.md` (replaced by content-architecture.md + reference-implementation.html)
- Delete: `references/known-issues.md` (replaced by anti-patterns.md)
- Delete: `references/theme-pcb-schematic.md` (replaced by theme-system.md in Task 4)

**Step 1: Verify new files cover all content from old files**

Read content-architecture.md, anti-patterns.md, and theme-system.md. Verify that every piece of information from the old infrastructure.md and known-issues.md is captured in the new files. If anything is missing, add it to the appropriate new file.

Check specifically:
- Sidebar flex:none rule → must be in theme-system.md CSS class reference
- Sidebar spacing values → must be in theme-system.md
- IntersectionObserver setup → must be in SKILL.md hard rules
- Scroll-synced nav code → must be in reference-implementation.html
- Playhead cursor/block sync issue → must be in anti-patterns.md or pattern-timing.md
- FSM arrow tangles → must be in pattern-state.md
- Single-file size limits → must be in multi-chunk-protocol.md
- Backdrop filter prefix → must be in theme-system.md

**Step 2: Delete old files**

```bash
git rm references/infrastructure.md references/known-issues.md
```

Note: `theme-pcb-schematic.md` should already be deleted in Task 4. If not, delete it here.

**Step 3: Commit**

```bash
git add -A references/
git commit -m "chore(technical-visualizer): remove superseded reference files"
```

---

## Task 12: Bump Plugin Version

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Step 1: Update version and description**

Change version from `1.0.0` to `2.0.0` (major version bump for full rewrite).

Update description to reflect new capabilities:
```json
{
  "name": "technical-visualizer",
  "version": "2.0.0",
  "description": "Interactive educational visualization builder with 15 animation patterns, PCB schematic aesthetic, multi-chunk generation protocol, and complete reference implementation. Produces single-file HTML pages with progressive disclosure, embedded visualizations, and full accessibility.",
  "author": { "name": "MrBloodrune" },
  "repository": "https://github.com/MrBloodrune/claude-skills",
  "license": "Apache-2.0",
  "keywords": ["visualization", "educational", "interactive", "technical", "embedded", "pcb", "schematic", "animation"]
}
```

**Step 2: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "chore(technical-visualizer): bump to v2.0.0 for full rewrite"
```

---

## Task 13: Validate with Plugin Validator and Skill Reviewer

**Step 1: Run plugin-dev:plugin-validator**

Validate the complete plugin structure. Check:
- plugin.json is valid
- All files referenced in SKILL.md exist
- No orphaned files
- Skill description triggers are appropriate

**Step 2: Run plugin-dev:skill-reviewer**

Review SKILL.md quality:
- Triggering effectiveness
- Completeness of instructions
- Pattern coverage
- Anti-pattern specificity

**Step 3: Fix any issues found**

Address validation and review feedback. Bump version to 2.0.1 if fixes are needed.

**Step 4: Final commit**

```bash
git add -A plugins/technical-visualizer/
git commit -m "fix(technical-visualizer): address validation feedback"
```

---

## Execution Notes

- **Task 1 is the most critical.** The reference implementation is the foundation everything else builds on. It must be a real, working HTML page extracted from the gold standard.
- **Tasks 5-8 (pattern files) can be parallelized** — they're independent of each other.
- **Task 11 must come after Tasks 3, 4, and 10** — need to verify new files cover old content before deleting.
- **Task 12 must come last** — version bump signals the rewrite is complete.
- **Use Opus 4.6 agents** for Tasks 1, 5, 6, 7, 8 — these require reading the 5400-line gold standard and extracting complete code.
