# Infrastructure

Layout conventions, interaction patterns, and shared infrastructure for all technical visualizer pages. These ensure pages are visually combinable into collections.

## Page Structure

```
DOCTYPE html
├── head
│   ├── meta charset, viewport
│   ├── title: "[Topic] — Interactive Guide"
│   ├── Google Fonts links
│   └── style (ALL CSS inline)
└── body
    ├── nav.nav-sidebar (fixed, collapsible)
    │   ├── .nav-header (title + collapse toggle)
    │   ├── .nav-section-label (category name)
    │   └── ul.nav-links (pattern links)
    ├── button.mobile-nav-btn (hamburger, hidden on desktop)
    ├── main.main-content
    │   ├── section.hero
    │   ├── div.sections-container
    │   │   ├── div.category-header (per category)
    │   │   └── article.section-card (per pattern)
    │   └── footer
    └── template (modal content templates)
    └── script (ALL JS inline)
```

## Sidebar Navigation

- Fixed left, 280px expanded, 48px collapsed
- Glassmorphic edge (see theme spec)
- Category labels: uppercase mono, 10px
- Links: mono 12px, copper highlight on active
- Scroll-synced active state via `getBoundingClientRect()` at 120px threshold
- **CRITICAL:** `flex: none` on `.nav-links` — never `flex: 1` (causes section spread)
- Section label padding: `10px 16px 2px`
- Link padding: `5px 16px`
- List padding: `2px 0`

## Expandable Section Cards

```html
<article class="section-card" id="[pattern-id]">
  <div class="card-header" onclick="toggleCard(this)" role="button"
       tabindex="0" aria-expanded="false" aria-controls="[id]-body">
    <span class="card-index">[##]</span>
    <div class="card-info">
      <div class="card-pattern-label">[PATTERN TYPE]</div>
      <h3 class="card-title">[Title]</h3>
      <p class="card-summary">[One-line description]</p>
    </div>
    <span class="card-expand-icon">▶</span>
  </div>
  <div class="card-body" id="[id]-body">
    <div class="card-content">
      <!-- Explanation text -->
      <!-- Visualization container -->
      <!-- Code examples -->
      <!-- Deep dive buttons -->
    </div>
  </div>
</article>
```

Card expand: CSS `max-height` transition (0 → 8000px), icon rotates 0° → 90°.
Keyboard: Enter/Space toggles, managed in JS.

## Visualization Container

```html
<div class="viz-container">
  <div class="viz-header">
    <span class="viz-label">● [VIZ TITLE]</span>
    <div class="viz-controls">
      <button class="viz-btn" onclick="[name]Reset()">Reset</button>
      <button class="viz-btn active" id="[name]PlayBtn"
              onclick="[name]Toggle()">Pause</button>
    </div>
  </div>
  <div class="viz-canvas" id="[name]Viz">
    <!-- Visualization content -->
  </div>
</div>
```

Canvas background uses 20px trace grid.

## Modal System

Triggered by deep-dive buttons:
```html
<button class="deep-dive-btn" onclick="openModal('[template-id]')">
  ⌈ [Modal Title] ⌉
</button>
```

Modal templates stored as `<template>` elements at end of body.

Modal behavior:
- Opens with scale(0.92→1.0) + opacity transition
- Backdrop: blur(4px) + dark overlay
- Close via: X button, ESC key, backdrop click
- Terminal-style titlebar with three colored dots
- Body content scrollable

## Category Headers

```html
<div class="category-header">
  <span class="category-line"></span>
  <h2>[CATEGORY NAME]</h2>
  <span class="category-dot"></span>
</div>
```

Line is a decorative horizontal rule, dot is a copper accent circle.

## Motion Control

Two mechanisms:
1. **CSS media query:** `@media (prefers-reduced-motion: reduce)` forces all durations to 0.01ms
2. **Manual toggle:** Button at bottom of sidebar, sets `.reduce-motion` class on body, toggles `motionReduced` JS flag

All animation step functions MUST check `motionReduced` before proceeding.

## IntersectionObserver

```javascript
const vizObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = entry.target.id;
    if (entry.isIntersecting) {
      // Start animation: lastTime = 0; animId = requestAnimationFrame(step)
      // OR for setTimeout-based: start the phase cycle
    } else {
      // Stop: cancelAnimationFrame(animId) or clearTimeout(animId); animId = null
    }
  });
}, { threshold: 0.1 });

// Register each viz container
['vizId1', 'vizId2', ...].forEach(id => {
  const el = document.getElementById(id);
  if (el) vizObserver.observe(el);
});
```

## Responsive

Single breakpoint at 768px:
- Sidebar transforms off-screen, hamburger button appears
- Content margins removed
- Grid layouts collapse to single column
- Viz canvases become full-width

## Scroll-Synced Nav

```javascript
function updateActiveNav() {
  const sections = document.querySelectorAll('.section-card');
  sections.forEach(section => {
    const rect = section.getBoundingClientRect();
    const link = document.querySelector(`a[href="#${section.id}"]`);
    if (rect.top < 120 && rect.bottom > 120) {
      link?.classList.add('active');
    } else {
      link?.classList.remove('active');
    }
  });
}
window.addEventListener('scroll', updateActiveNav);
```

## Reduced Motion CSS

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
.reduce-motion *, .reduce-motion *::before, .reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
```

## Init Function

```javascript
function init() {
  // Build all visualizations
  [name1]Init();
  [name2]Init();
  // ...

  // Start scroll tracking
  updateActiveNav();

  // Register observers
  ['viz1', 'viz2', ...].forEach(id => {
    const el = document.getElementById(id);
    if (el) vizObserver.observe(el);
  });
}
document.addEventListener('DOMContentLoaded', init);
```
