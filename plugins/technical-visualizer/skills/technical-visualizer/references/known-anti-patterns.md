# Known Anti-Patterns

Concrete failures extracted from firmware-architecture-failure-analysis.md. Each entry shows **what went wrong** and **what to do instead**.

---

## 1. HTML Structure

### Inconsistent Section Element Types
**Wrong:** Sections 1-7 use `<article class="section-card">`, sections 8-9 use `<div class="section-card">`
**Fix:** All sections use `<article>` — semantic consistency across multi-chunk generation

### Inconsistent Card Header HTML
**Wrong:** Sections 1-7 have `card-index > card-meta > card-pattern-label|card-title|card-summary > expand-icon`. Sections 8-9 flatten `card-pattern-label` as sibling
**Fix:** Lock header structure in a template fragment — enforce across all chunks

### Modals as Regular DOM Elements
**Wrong:** Modals are `<div>` siblings inside `<main>`, always in DOM and visible to screen readers
**Fix:** Modals use `<template>` elements at end of `<body>`, instantiated on open

### Missing ARIA on Later Sections
**Wrong:** Sections 1-7 have `aria-expanded="false"` on headers, sections 8-9 inconsistent
**Fix:** Validate ARIA attributes on all interactive elements before finalizing chunk

---

## 2. CSS

### Duplicate Variable Sets
**Wrong:** `:root` defines both `--blue` and `--accent-blue` (alias) pointing to same value
**Fix:** Define variables once — if aliases needed, document reasoning and ensure consistency

### Orphaned CSS Classes
**Wrong:** `.desc-text` used in modal HTML but no CSS rule defined — falls back to browser defaults
**Fix:** Grep stylesheet for all classes used in HTML before writing final output

### Inline Styles in Modals
**Wrong:** Modal content uses `style="font-family:var(--font-mono);font-size:14px;color:var(--text-primary);"`
**Fix:** All styling via CSS classes — inline styles only for dynamic JS-computed values

### No Intermediate Breakpoint
**Wrong:** Only 768px breakpoint exists — awkward layout between 769px-1200px
**Fix:** Add 1024px breakpoint for tablet-sized viewports (sidebar width adjustment)

### Missing Table Scroll Wrapper
**Wrong:** 11-column truth table overflows on narrow viewports — no horizontal scroll container
**Fix:** Wrap wide tables in `<div class="table-scroll">` with `overflow-x: auto`

---

## 3. JavaScript

### Dead IIFE Blocks
**Wrong:** Animation init code wrapped in IIFE but never called, or called after DOM destroyed
**Fix:** Use event delegation and avoid IIFEs — prefer named functions with clear lifecycle

### setInterval Without Cleanup
**Wrong:** Animation loops use `setInterval` but never `clearInterval` on section collapse
**Fix:** Use phase-based `setTimeout` pattern — cancel on collapse/navigation

### DOM References to Nonexistent Elements
**Wrong:** `document.querySelector('#modal-packet-deep-dive')` but no trigger button exists
**Fix:** Generate trigger buttons for all modals — validate selectors before finalizing

---

## 4. Icons & Typography

### Unicode Triangles Instead of SVG
**Wrong:** Section 1-7 expand icons use text `▶` character, section 8-9 use `<img>` SVG chevron
**Fix:** All expand icons use consistent SVG chevron with rotate transform

### Unstyled Tables
**Wrong:** State config table has 10px font-size on mobile but no cell padding, border, or hover state refinement
**Fix:** Tables have base style + mobile override (font-size, padding, sticky header)

### Truncated Field Labels
**Wrong:** Packet anatomy cells show "Packe", "ground_", "tempera" — cell width insufficient
**Fix:** Use `font-size: clamp(9px, 1vw, 12px)` + `min-width` on cells, abbreviate long names

---

## 5. Interactions

### Missing Deep-Dive Buttons
**Wrong:** Sections 1-7 have modals defined but zero trigger buttons — only section 8 has one
**Fix:** Generate pill-button group at bottom of every section with modal deep-dive triggers

### No Popovers Anywhere
**Wrong:** Diagram components have no click/hover popovers — only CSS-only tooltips on packet fields
**Fix:** Implement popover pattern on block diagram nodes, memory regions, table rows

### No Auto-Play on Animations
**Wrong:** Ring buffer animation starts IDLE with manual play button — no IntersectionObserver
**Fix:** Use IntersectionObserver to auto-play animations when scrolled into view (unless prefers-reduced-motion)

### Cursor Pointer With No Action
**Wrong:** State table rows have `cursor: pointer` but clicking produces no expansion
**Fix:** Either implement expandable row detail or remove cursor style

---

## 6. Multi-Chunk Coherence

### CSS-HTML Mismatch Across Chunks
**Wrong:** CSS defines `.conn-pulse` but SVG connections lack the class — no animated data flow
**Fix:** Cross-reference CSS classes with HTML after each chunk — flag unused classes

### Structural Divergence in Later Sections
**Wrong:** Section 8-9 card structure differs from 1-7 — suggests separate generation pass
**Fix:** Lock component templates early — validate structure consistency in final assembly

### Proportional vs Non-Proportional Visualizations
**Wrong:** Memory map shows "~4.3 MB (53.75%)" and "128 KB (1.56%)" with equal-height bars
**Fix:** Proportional bars must use flex-basis or height percentage — document units

---

## 7. Content Patterns (vs Gold Standard)

### No Code Examples
**Wrong:** Zero standalone code blocks with syntax highlighting — only inline monospace
**Fix:** Every section referencing API/config has formatted code example with `// comment` headers

### No `// Comment-Style` Section Headers
**Wrong:** Generic `<h4>` elements instead of monospace `// How X Works` style
**Fix:** Explanation sections use `<h4 class="code-header">// Topic</h4>` pattern

### No Badge/Tag System
**Wrong:** Inline text like "CLIENT-only" or "PSRAM" — hard to scan
**Fix:** Use `<span class="badge badge-client">CLIENT</span>` badges for scannability
