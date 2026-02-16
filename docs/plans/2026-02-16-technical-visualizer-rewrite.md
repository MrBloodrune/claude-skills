# Technical Visualizer Skill Rewrite — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full rewrite of the technical-visualizer skill with layered reference architecture, multi-chunk protocol, and working reference implementation.

**Architecture:** Principle-driven SKILL.md hub + 7 reference files (page architecture, theme system, chunk protocol, pattern catalog, interaction patterns, reference HTML, anti-patterns). PCB schematic default theme with theming guide. All 15 visualization patterns get complete, copy-paste-ready code.

**Tech Stack:** Markdown skill files, HTML/CSS/JS reference implementation, Claude Code plugin system.

**Source material:**
- Gold standard: `/home/bloodrune/dev/projects/esp32/esp32-peripherals-guide.html` (5382 lines)
- Theme variation: `/home/bloodrune/dev/projects/esp32/freertos-guide.html` (2535 lines)
- Failed output: `/home/bloodrune/dev/projects/esp32/dog/firmware-architecture.html`
- Analysis reports: `docs/plans/peripherals-guide-analysis.md`, `docs/plans/freertos-guide-analysis.md`, `docs/plans/firmware-architecture-failure-analysis.md`, `docs/plans/skill-comparison-analysis.md`
- Design doc: `docs/plans/2026-02-16-technical-visualizer-rewrite-design.md`

---

### Task 1: Delete existing reference files

**Files:**
- Delete: `plugins/technical-visualizer/skills/technical-visualizer/references/theme-pcb-schematic.md`
- Delete: `plugins/technical-visualizer/skills/technical-visualizer/references/infrastructure.md`
- Delete: `plugins/technical-visualizer/skills/technical-visualizer/references/pattern-timing.md`
- Delete: `plugins/technical-visualizer/skills/technical-visualizer/references/pattern-state.md`
- Delete: `plugins/technical-visualizer/skills/technical-visualizer/references/pattern-structural.md`
- Delete: `plugins/technical-visualizer/skills/technical-visualizer/references/pattern-data.md`
- Delete: `plugins/technical-visualizer/skills/technical-visualizer/references/known-issues.md`

**Step 1: Remove all existing reference files**

```bash
rm plugins/technical-visualizer/skills/technical-visualizer/references/*.md
```

**Step 2: Commit**

```bash
git add -u plugins/technical-visualizer/skills/technical-visualizer/references/
git commit -m "chore(technical-visualizer): remove old reference files before rewrite"
```

---

### Task 2: Write known-anti-patterns.md

No dependencies. This file captures every failure mode from the firmware-architecture analysis.

**Files:**
- Create: `plugins/technical-visualizer/skills/technical-visualizer/references/known-anti-patterns.md`
- Reference: `docs/plans/firmware-architecture-failure-analysis.md`

**Step 1: Write the anti-patterns file**

Read `docs/plans/firmware-architecture-failure-analysis.md` thoroughly. Extract every failure mode into a categorized anti-pattern list. Each anti-pattern must have:
- A short name
- What went wrong (concrete example from the failed output)
- What to do instead (concrete fix)

Categories:
1. **HTML Structure** — `<div>` vs `<article>`, inconsistent card headers, missing semantic elements
2. **CSS** — Orphaned classes, duplicate variables/aliases, inline styles, missing responsive handling
3. **JavaScript** — Dead IIFEs, `setInterval` usage, DOM references to nonexistent elements
4. **Icons & Typography** — Unicode triangles instead of SVG, unstyled tables, truncated labels
5. **Interactions** — Missing deep-dive buttons, missing popovers, missing play/pause/reset controls
6. **Multi-chunk Coherence** — Sections 1-7 vs 8-9 structural divergence, CSS-HTML mismatch

Target: ~80-100 lines.

**Step 2: Commit**

```bash
git add plugins/technical-visualizer/skills/technical-visualizer/references/known-anti-patterns.md
git commit -m "feat(technical-visualizer): add anti-patterns reference from failure analysis"
```

---

### Task 3: Write theme-system.md

Foundation file. All other files reference these CSS variables.

**Files:**
- Create: `plugins/technical-visualizer/skills/technical-visualizer/references/theme-system.md`
- Reference: `docs/plans/peripherals-guide-analysis.md` (sections 2, 9, 10)
- Reference: `docs/plans/freertos-guide-analysis.md` (sections 2, 4, 9)

**Step 1: Write the theme file**

Extract the COMPLETE CSS variable system from the peripherals guide analysis. The file must contain:

**Section 1: PCB Schematic Theme (Default)**
- Complete `:root` block with ALL CSS custom properties (copy exactly from peripherals-guide-analysis.md section 2)
- Color system explanation: 4 accents (copper, green, red, blue) × 4 variants (base, dim, glow, faint)
- Background scale: 6 levels from `#060a12` to `#10172a`
- Text scale: dim, secondary, primary
- Border tokens, PCB-specific tokens (trace, grid, pad)
- Z-index scale, transition speeds, layout vars

**Section 2: Typography**
- Google Fonts import snippet
- Complete font-size table (extract ALL sizes from peripherals-guide-analysis.md section 8)
- Line-height values, letter-spacing values, text-transform rules
- Two-font system: JetBrains Mono (UI/code) + Instrument Sans (body)

**Section 3: Visual Motifs**
- Copper grid background CSS (`body::before` with `linear-gradient`)
- Scanline overlay CSS (`body::after`)
- Solder pad dots CSS (`.pad-dot`)
- Glow effect pattern (triple-layer text-shadow, box-shadow)
- Code block styling with syntax highlight classes (`.kw`, `.fn`, `.str`, `.cmt`, `.num`, `.type`, `.macro`)

**Section 4: Base Reset & Globals**
- Box-sizing reset
- Body base styles
- Scrollbar styling
- `prefers-reduced-motion` + `.reduce-motion` body class
- `::selection` styling

**Section 5: Theming Guide**
- How to create a variant theme
- Use FreeRTOS as worked example: swap copper→green, green→cyan, red→red, blue→amber
- Swap fonts: JetBrains→VT323, Instrument Sans→IBM Plex Sans
- Swap motifs: PCB grid→graph paper, scanlines→CRT scanlines
- What NOT to change: layout geometry, spacing, transitions, interactions
- Show the FreeRTOS `:root` block side-by-side

Target: ~250 lines.

**Step 2: Commit**

```bash
git add plugins/technical-visualizer/skills/technical-visualizer/references/theme-system.md
git commit -m "feat(technical-visualizer): add complete theme system with PCB default and theming guide"
```

---

### Task 4: Write page-architecture.md

Defines the page template. Depends on theme-system.md for variable names.

**Files:**
- Create: `plugins/technical-visualizer/skills/technical-visualizer/references/page-architecture.md`
- Reference: `docs/plans/peripherals-guide-analysis.md` (sections 1, 3, 10, 13, 14)

**Step 1: Write the page architecture file**

**Section 1: Page Template**
- Complete HTML skeleton from `<!DOCTYPE html>` through `</html>` showing every required element
- Copy the exact skeleton from peripherals-guide-analysis.md section 1
- Annotate each element with its purpose

**Section 2: Hero Section**
- Complete HTML for hero with chip-element title, subtitle, tagline, stat row
- Complete CSS for hero (padding, background, chip element, title glow, responsive)
- Stat row structure: 3 items with value + label

**Section 3: Sidebar Navigation**
- Complete HTML for sidebar: nav-header, nav-sections with links, motion toggle
- Complete CSS for sidebar: fixed positioning, glassmorphic blur, active states, collapse
- JavaScript for scroll tracking, collapse toggle, mobile menu
- Responsive behavior at 768px

**Section 4: Section Cards**
- Complete HTML for a section card (article > card-header + card-body)
- Card header structure: index, card-info (pattern-label, title, summary), expand icon (SVG, NOT Unicode)
- Card body structure: card-content containing content-blocks, viz-containers, code-blocks, deep-dive buttons
- Complete CSS for cards: background, borders, hover, left accent bar, expand/collapse
- Category header HTML and CSS

**Section 5: Content Blocks**
- H3 with `//` prefix decoration and copper dot `::before`
- Paragraph styling (14px, line-height 1.8)
- List styling (diamond bullets via `::before`)
- Warning callout blocks (`.warn`)
- Data tables (`.data-table`)

**Section 6: Footer**
- Complete HTML: pad dots, reference links, copyright
- Complete CSS: padding, border, text styling

**Section 7: Responsive Design**
- 768px breakpoint rules
- Mobile nav button HTML and CSS
- Fluid typography: `clamp()` values for hero
- Modal responsive: `min(720px, 90vw)`

**Section 8: Initialization Pattern**
- `DOMContentLoaded` → `init()` function structure
- IntersectionObserver setup for all viz containers
- Scroll listener for active nav
- Resize handler for canvas/SVG elements

Target: ~300 lines.

**Step 2: Commit**

```bash
git add plugins/technical-visualizer/skills/technical-visualizer/references/page-architecture.md
git commit -m "feat(technical-visualizer): add page architecture with complete structural specs"
```

---

### Task 5: Write interaction-patterns.md

Covers modals, popovers, progressive disclosure, controls, accessibility.

**Files:**
- Create: `plugins/technical-visualizer/skills/technical-visualizer/references/interaction-patterns.md`
- Reference: `docs/plans/peripherals-guide-analysis.md` (sections 3.7, 3.8, 5, 6, 15)

**Step 1: Write the interaction patterns file**

**Section 1: Card Expand/Collapse**
- Complete JavaScript for `toggleCard(header)` function
- Max-height transition technique (0 → 8000px, 500ms ease)
- SVG chevron rotation (0 → 90deg)
- `aria-expanded` toggle
- Keyboard handler: Enter/Space on `card-header[tabindex="0"]`

**Section 2: Deep-Dive Buttons**
- HTML: `<button class="deep-dive-btn" data-modal="section-id">Topic Name</button>`
- CSS: blue border, mono 12px, bracket decorators (`::before [`, `::after ]`), hover glow
- Button group layout for multiple deep-dives per section
- Event delegation: single click handler on document

**Section 3: Modal System**
- HTML structure: backdrop div + modal div with title-bar + body + close button
- `<template>` element pattern: one `<template id="section-modal">` per section at end of body
- JavaScript: `openModal(templateId)` clones template innerHTML into modal body
- Close: ESC key, backdrop click, X button
- Entry animation: `scale(0.92) → scale(1)` with opacity 0→1, 300ms
- Title bar: 3 colored dots (decorative) + title text + close button
- Focus management: close button receives focus on open
- Body scroll lock: `overflow: hidden` on body while modal open
- Complete CSS for backdrop (fixed, rgba(0,0,0,0.7), backdrop-filter blur(4px))
- Complete CSS for modal (min(720px,90vw), max-height 85vh, overflow-y auto)

**Section 4: Visualization Controls**
- Standardized viz-header HTML: label (left) + button group (right)
- Play/Pause toggle button with `aria-label`
- Reset button with `aria-label`
- Speed control (optional): select dropdown
- Complete CSS for viz-header, viz-btn
- JavaScript pattern: each viz has `[name]Toggle()` and `[name]Reset()` functions

**Section 5: Accessibility Checklist**
- Every `card-header`: `role="button"`, `tabindex="0"`, `aria-expanded`, `aria-controls`
- Every modal: `role="dialog"`, `aria-modal="true"`, `aria-label`
- Every viz button: `aria-label` describing action
- Every interactive bit/cell: `role="switch"` or `role="checkbox"`, `aria-checked`
- Focus-visible outlines: `outline: 2px solid var(--copper)`, `outline-offset: 2px`
- Semantic HTML: `<article>` for cards, `<nav>` for sidebar, `<main>` for content, `<footer>`
- Skip-to-content link (hidden, visible on focus)

Target: ~200 lines.

**Step 2: Commit**

```bash
git add plugins/technical-visualizer/skills/technical-visualizer/references/interaction-patterns.md
git commit -m "feat(technical-visualizer): add interaction patterns (modals, controls, accessibility)"
```

---

### Task 6: Write pattern-catalog.md

The largest file. All 15 visualization patterns with complete code.

**Files:**
- Create: `plugins/technical-visualizer/skills/technical-visualizer/references/pattern-catalog.md`
- Reference: `/home/bloodrune/dev/projects/esp32/esp32-peripherals-guide.html` (extract actual code)
- Reference: `docs/plans/peripherals-guide-analysis.md` (all pattern sections)

**Step 1: Write the pattern catalog**

Read the FULL peripherals guide HTML file to extract actual working code for each pattern. Each pattern entry MUST include:

1. **Header**: Pattern name, category, animation type
2. **When to use**: 1-2 sentences
3. **HTML structure**: Complete, copy-paste-ready (using theme CSS variables)
4. **CSS**: All classes specific to this pattern (referencing theme variables)
5. **JavaScript**: Complete animation code with:
   - State variables (`[name]Playing`, `[name]AnimId`, `[name]LastTime`)
   - Init function (`[name]Init()`)
   - Step/render function (`[name]Step(timestamp)`)
   - Toggle function (`[name]Toggle()`)
   - Reset function (`[name]Reset()`)
   - IntersectionObserver callback
   - Play/pause/reset button handlers
6. **Data configuration**: How to customize the pattern for different content

**Pattern list:**

| # | Pattern | Source in peripherals guide | Animation type |
|---|---------|---------------------------|----------------|
| 1 | Playhead/Sweep | PWM section | rAF continuous — float cursor leads, blocks trail |
| 2 | Sequence Diagram | SPI section | setTimeout discrete — phase array stepping |
| 3 | Waveform Trace | I2C section | rAF + Canvas 2D — progressive line drawing |
| 4 | Gantt Timeline | Boot section | rAF sweep — positioned bars with cursor |
| 5 | State Machine | WiFi FSM section | setTimeout discrete — node highlighting + edge pulses |
| 6 | Pipeline/FIFO | UART Ring Buffer section | setTimeout discrete — produce/consume with pointer math |
| 7 | Lock Cycle | Flash WEL section | setTimeout discrete — component state cycling |
| 8 | Bit Register | GPIO section | User-driven click — toggleable bit cells |
| 9 | Memory Map | Memory Map section | Interactive — click-to-expand stacked regions |
| 10 | Tree/Hierarchy | IDF Components section | Interactive — collapsible file tree |
| 11 | Block Diagram | Block Diagram section | rAF pulse — CSS grid with SVG connection lines |
| 12 | Split-Core | Dual Core section | setTimeout — parallel scrolling lanes |
| 13 | Live Gauge | ADC section | rAF continuous — SVG arc with animated needle |
| 14 | Packet Anatomy | BLE Packet section | Hover-driven — horizontal byte fields with tooltips |
| 15 | Truth Table | GPIO Truth Table section | User-driven — select inputs, computed outputs with SVG pinout |

**Critical extraction notes:**
- For each pattern, find the actual working code in `esp32-peripherals-guide.html`
- Extract the HTML structure from the section card body
- Extract the CSS classes from the `<style>` block
- Extract the JavaScript functions from the `<script>` block
- Generalize: replace ESP32-specific variable names with generic placeholders
- Keep the exact animation mechanics (timing, easing, delta-time math)
- Preserve the standardized viz-container wrapper around every visualization

Target: ~400 lines (compressed — show structure + key code, not every CSS property).

**Step 2: Commit**

```bash
git add plugins/technical-visualizer/skills/technical-visualizer/references/pattern-catalog.md
git commit -m "feat(technical-visualizer): add complete pattern catalog with 15 visualization patterns"
```

---

### Task 7: Write chunk-protocol.md

Defines multi-chunk generation rules.

**Files:**
- Create: `plugins/technical-visualizer/skills/technical-visualizer/references/chunk-protocol.md`

**Step 1: Write the chunk protocol**

**Section 1: When to Use Multi-Chunk**
- Single-response target: pages with 4-5 sections (~2000-3500 lines)
- Multi-chunk required: pages with 6+ sections or complex visualizations (~3500+ lines)

**Section 2: Chunk Sequence**

| Chunk | Contents | Checkpoint |
|-------|----------|------------|
| 1: Foundation | `<!DOCTYPE>` through `</style>` — ALL CSS, ALL variables | Verify every class name from page-architecture exists |
| 2: Skeleton | `<body>` through sidebar + hero + category headers + empty card shells | Verify all IDs that JS will reference are established |
| 3-N: Sections | 2-3 complete section cards per chunk | Verify all CSS classes used exist in Chunk 1 |
| N+1: Templates | All `<template>` elements for modals | Verify each template has a trigger button |
| N+2: JavaScript | Complete `<script>` block | Verify all DOM IDs referenced exist in HTML |

**Section 3: Consistency Rules**
- CSS FIRST: All styles must be in Chunk 1. No adding CSS in later chunks.
- DOM ID registry: Maintain a comment listing all IDs at the top of the JS chunk
- Class inventory: Every class used in HTML must appear in the CSS
- Card structure: ALL cards use identical markup. No variation between chunks.
- SVG icons: Use the SAME SVG expand icon across all cards (not Unicode in some, SVG in others)
- Variable usage: Use CSS custom property names, never raw hex values in HTML
- Template elements: Always at end of `<body>`, never inside `<main>`

**Section 4: Chunk Boundaries**
- Never split a section card across chunks
- Never split CSS across chunks
- Never split the `<script>` block across chunks
- Each chunk must produce valid HTML that could theoretically render (even if incomplete)

**Section 5: Validation Checklist (Run Between Chunks)**
```
[ ] All CSS class names in this chunk exist in Chunk 1's stylesheet
[ ] All element IDs in this chunk are unique and not duplicated from prior chunks
[ ] Card structure matches the template exactly (article > card-header > card-body > card-content)
[ ] Expand icons use SVG, not Unicode
[ ] No inline style attributes (except computed SVG coordinates)
[ ] Deep-dive buttons have data-modal attributes matching template IDs
[ ] Viz containers have viz-header with label + control buttons
```

Target: ~100-150 lines.

**Step 2: Commit**

```bash
git add plugins/technical-visualizer/skills/technical-visualizer/references/chunk-protocol.md
git commit -m "feat(technical-visualizer): add multi-chunk generation protocol"
```

---

### Task 8: Write reference-implementation.html

The most critical file. A working 3-section page distilled from the peripherals guide.

**Files:**
- Create: `plugins/technical-visualizer/skills/technical-visualizer/references/reference-implementation.html`
- Reference: `/home/bloodrune/dev/projects/esp32/esp32-peripherals-guide.html` (source)
- Reference: All analysis reports

**Step 1: Create the distilled reference page**

Read the full `esp32-peripherals-guide.html`. Extract and distill a working 3-section page that demonstrates:

**Requirements:**
1. Complete `<head>` with Google Fonts import
2. Complete CSS with ALL theme variables and ALL component styles (even if only 3 sections use them — the CSS must be the full template)
3. Mobile nav button
4. Sidebar with 3 nav links, collapse toggle, motion toggle
5. Modal backdrop and modal container
6. Hero section with:
   - Chip-element title wrapper with solder pad decorations
   - Subtitle and tagline
   - Grid background + radial glow
7. Category header
8. **Section Card 1: Timing pattern** — Playhead/Sweep visualization
   - Card header with SVG expand icon, index "01", pattern label, title, summary
   - Card body with explanation content-block, viz-container with play/pause/reset, code-block with syntax highlighting
   - Deep-dive button
9. **Section Card 2: State pattern** — State Machine visualization
   - Same card structure as Card 1
   - Different visualization type (positioned nodes with SVG edges)
   - Deep-dive button
10. **Section Card 3: Data pattern** — Bit Register visualization
    - Same card structure as Cards 1-2
    - Interactive (click-driven, no animation loop)
    - Deep-dive button
11. 3 `<template>` elements with modal content for each section
12. Footer with pad dots and references
13. Complete JavaScript:
    - `init()` function
    - IntersectionObserver setup
    - Card toggle function
    - Modal open/close functions
    - Scroll tracking for active nav
    - All 3 visualization implementations
    - Resize handler
    - Reduced motion toggle
14. Responsive styles at 768px breakpoint
15. Full ARIA attributes and keyboard support

**Critical constraints:**
- Must be a WORKING page — open in browser and it renders correctly
- Must use the PCB schematic theme
- Must demonstrate the EXACT card structure that all generated pages should follow
- All 3 visualizations must animate correctly
- All 3 modals must open/close correctly
- Sidebar must collapse/expand and track scroll position
- Reduced motion toggle must work

**Approach:** Don't copy 5382 lines. Extract the CSS + 3 representative sections + their JS. Generalize the content slightly (keep the ESP32 topic — it's real and demonstrates the patterns well). Target ~800-1000 lines.

**Step 2: Open in browser and visually verify**

Use Playwright to open the file and take a screenshot. Verify:
- Hero renders with glow effects
- Cards expand/collapse
- Visualizations animate
- Modal opens from deep-dive button
- Sidebar tracks scroll

**Step 3: Commit**

```bash
git add plugins/technical-visualizer/skills/technical-visualizer/references/reference-implementation.html
git commit -m "feat(technical-visualizer): add working 3-section reference implementation"
```

---

### Task 9: Rewrite SKILL.md

The hub file. References all other files. Written last because it needs to accurately reference the contents of all reference files.

**Files:**
- Modify: `plugins/technical-visualizer/skills/technical-visualizer/SKILL.md`
- Reference: All newly created reference files
- Reference: `docs/plans/2026-02-16-technical-visualizer-rewrite-design.md`

**Step 1: Write the new SKILL.md**

Structure:

```markdown
---
name: Technical Visualizer
description: >-
  [trigger phrases + description]
---

# Technical Visualizer

## Identity
[2-3 sentences: "You are building an interactive educational visualization..."]

## Pre-Flight: Topic Analysis
[Decision framework BEFORE pattern selection]
1. Break topic into 4-8 subtopics
2. Classify each: timing, state, structural, or data
3. Map content density: which subtopics need deep-dives?
4. Select patterns from catalog below

## Pattern Catalog
[Table: #, Pattern, Category, Use When, Animation]
[15 rows — one per pattern]
[After table: "Read `references/pattern-catalog.md` for complete implementation code."]

## Generation Process

### Step 1: Theme
Read `references/theme-system.md`. Generate complete CSS.

### Step 2: Page Structure
Read `references/page-architecture.md`. Generate hero, sidebar, card shells, footer.

### Step 3: Content & Visualizations
Read `references/pattern-catalog.md` for selected patterns.
Read `references/interaction-patterns.md` for modals, controls, accessibility.
Generate section content with visualizations.

### Step 4: Templates & JavaScript
Generate `<template>` elements for all deep-dive modals.
Generate complete `<script>` block with init, observers, event handlers.

### Step 5: Validate
Check against `references/known-anti-patterns.md`.
Run the checklist below.

### Multi-Chunk Pages
If the page exceeds ~3500 lines, follow `references/chunk-protocol.md`.

## Reference Implementation
`references/reference-implementation.html` is a working 3-section page.
Open it in a browser to see exactly what the output should look like.
When in doubt about structure, style, or behavior — match this file.

## Hard Rules
[Same proven rules from current SKILL.md — rAF, delta-time, IntersectionObserver, ARIA, etc.]

## NEVER (Anti-Pattern Anchors)
1. NEVER use Unicode characters for expand icons — use SVG
2. NEVER use inline styles when a CSS class exists
3. NEVER generate CSS class aliases — use the theme variable names directly
4. NEVER change card structure between sections
5. NEVER skip deep-dive buttons on any section
[Full list: see `references/known-anti-patterns.md`]

## Before Shipping
[ ] All animations use rAF+delta-time (continuous) or setTimeout (discrete)
[ ] IntersectionObserver registered for every animated visualization
[ ] Every card has identical markup structure
[ ] Every section has at least one deep-dive button with working modal
[ ] All CSS classes used in HTML exist in the stylesheet
[ ] ESC closes modals, Enter/Space toggles cards, all buttons have aria-label
[ ] Reduced motion toggle works
[ ] Page renders correctly at 768px and 1440px
```

Target: ~150-200 lines.

**Step 2: Commit**

```bash
git add plugins/technical-visualizer/skills/technical-visualizer/SKILL.md
git commit -m "feat(technical-visualizer): rewrite SKILL.md with principle-driven hub architecture"
```

---

### Task 10: Update plugin.json version

**Files:**
- Modify: `plugins/technical-visualizer/.claude-plugin/plugin.json`

**Step 1: Bump version**

Change version from `1.0.0` to `2.0.0` (major version bump — full rewrite).

**Step 2: Commit**

```bash
git add plugins/technical-visualizer/.claude-plugin/plugin.json
git commit -m "chore(technical-visualizer): bump to v2.0.0 for full skill rewrite"
```

---

### Task 11: Validate with plugin-validator

**Step 1: Run plugin-dev:plugin-validator agent**

Validate the complete plugin structure: plugin.json schema, skill file structure, reference file existence, YAML frontmatter.

**Step 2: Fix any issues found**

**Step 3: Commit fixes if needed**

---

### Task 12: Review with skill-reviewer

**Step 1: Run plugin-dev:skill-reviewer agent**

Review the skill for quality: trigger phrase coverage, description clarity, reference file completeness, best practice adherence.

**Step 2: Fix any issues found**

**Step 3: Commit fixes if needed**

---

### Task 13: Visual verification of reference implementation

**Step 1: Open reference-implementation.html in browser**

Use Playwright to navigate to the file served via local HTTP server.

**Step 2: Take screenshots and verify**

- Hero renders with copper glow and grid background
- Sidebar navigation works (click links, verify scroll tracking)
- Card expand/collapse with SVG icon rotation
- Playhead visualization animates correctly
- State machine visualization steps through states
- Bit register responds to clicks
- Deep-dive button opens modal with content
- Modal closes with ESC, backdrop click, X button
- Responsive: resize to 768px, verify mobile layout
- Reduced motion toggle stops animations

**Step 3: Fix any visual or behavioral issues**

**Step 4: Final commit**

```bash
git add -A plugins/technical-visualizer/
git commit -m "fix(technical-visualizer): visual verification fixes"
```

---

## Execution Notes

- **Tasks 2-7 can be parallelized** — they are independent reference files (except pattern-catalog benefits from theme-system being written first for variable name consistency)
- **Task 8 (reference HTML) should run after Tasks 3-6** — it needs the specs to be finalized
- **Task 9 (SKILL.md) runs last** — it references all other files
- **Tasks 11-13 are sequential validation**
- Each task should be delegated to an Opus subagent with the full context of: the design doc, the relevant analysis reports, and the source HTML files
- The pattern-catalog (Task 6) is the largest and most critical — it requires reading the full 5382-line peripherals guide to extract working code
