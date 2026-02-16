# FreeRTOS Interactive Guide - Visual Analysis Report

**Source:** `/home/bloodrune/dev/projects/esp32/freertos-guide.html`
**Title:** FreeRTOS for ESP32 -- Interactive Guide
**Role:** Second reference for educational visualization patterns (alternative theming)

---

## 1. How It Differs from a Typical Educational Guide

This guide adopts a **CRT terminal / hacker aesthetic** that is fundamentally different from typical educational documentation. Where most guides use clean white/light backgrounds with blue accents, this one presents itself as a retro phosphor-green terminal interface on a near-black canvas.

Distinctive visual traits:
- **Scanline overlay** -- a full-screen `repeating-linear-gradient` pseudo-element simulates CRT scanlines across the entire viewport at z-index 9999
- **Grid background** -- subtle `#ffffff08` grid lines at 40px intervals give the impression of engineering graph paper or oscilloscope divisions
- **Phosphor glow effects** -- green text with layered `text-shadow` glows (10px, 30px, 60px spread) mimicking phosphor persistence
- **Flicker animation** -- the hero title has a subtle `hero-flicker` keyframe that drops opacity to 0.85/0.9 at the 97-99% mark, simulating CRT instability
- **VT323 display font** -- a pixel-style monospace font used for headers and indices, reinforcing the terminal feel
- **Collapsible sidebar navigation** -- fixed left panel with monospace nav links, collapsible to 48px icon-only width
- **Zero border-radius** -- almost everything uses `border-radius: 2px` (effectively sharp corners), matching the technical/utilitarian aesthetic

## 2. Color System

### Primary Palette

The color system uses **four semantic hues** on an extremely dark background:

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary accent | Green | `#00ff41` | Titles, active states, running indicators, primary glow |
| Secondary accent | Cyan | `#00d4ff` | Deep-dive buttons, secondary info, Core 0 headers |
| Warning/attention | Amber | `#ffb000` | H3 subheadings, blocked states, warnings, timers |
| Error/danger | Red | `#ff3333` | Locked states, suspended, errors, close buttons |

### Each hue has four variants:

| Variant | Green | Cyan | Amber | Red |
|---------|-------|------|-------|-----|
| Full | `#00ff41` | `#00d4ff` | `#ffb000` | `#ff3333` |
| Dim | `#00cc33` | `#00a8cc` | `#cc8d00` | `#cc2929` |
| Glow (50% alpha) | `#00ff4180` | `#00d4ff80` | `#ffb00080` | `#ff333380` |
| Faint (8% alpha) | `#00ff4115` | `#00d4ff15` | `#ffb00015` | n/a |

### Background layers (extremely dark):

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0a0a0a` | Page background |
| `--bg-secondary` | `#111111` | Sidebar, viz headers, modal titlebar |
| `--bg-card` | `#0d0d0d` | Section cards |
| `--bg-card-hover` | `#141414` | Card header hover state |
| `--bg-modal` | `#0c0c0c` | Modal background |
| Code block bg | `#080808` | Inline, hardcoded |

### Text hierarchy:

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#d0d0d0` | Body text |
| `--text-secondary` | `#888888` | Summaries, nav links, legends |
| `--text-dim` | `#555555` | Decorative prefixes, inactive elements |

### How it differs from other guides while maintaining quality:

- Other guides use **warm or cool tinted backgrounds** (navy, slate); this uses pure near-black neutral grays
- Other guides use **gradients for visual richness**; this uses **glow/shadow effects** for depth
- The green-on-black palette references terminal UIs and embedded development culture, making the theming contextually appropriate for an RTOS guide
- Despite the unusual palette, the information hierarchy is crystal clear: green = primary, amber = secondary/attention, cyan = interactive/supplementary, red = danger

## 3. Component Patterns

### Layout Components
1. **Fixed sidebar navigation** (`nav-sidebar`) -- collapsible, icon + label links, scroll-aware active highlighting, motion toggle control at bottom
2. **Hero section** -- centered title with triple-layer glow, subtitle in mono, tagline with terminal prompt prefix (`> `)
3. **Section cards** (`section-card`) -- accordion-style expandable articles with numbered indices (01-06)
4. **Footer** -- minimal, monospace, with external reference links

### Content Components
5. **Content blocks** (`content-block`) -- H3 with `//` prefix (code comment style), body paragraphs, styled lists with `>` bullet markers
6. **Code blocks** (`code-block`) -- syntax-highlighted C code with custom span classes (`.kw`, `.fn`, `.str`, `.cmt`, `.num`, `.type`, `.macro`)
7. **State diagram** -- inline CSS-only flow diagram with colored state nodes and arrow connectors
8. **Warning callouts** (`.warn`) -- amber left-border, amber-faint background, `WARNING:` prefix

### Interactive Components
9. **Deep-dive buttons** (`deep-dive-btn`) -- cyan-bordered buttons with bracket decorators (`[` `]`), open modals
10. **Modal system** -- backdrop + centered modal with macOS-style traffic light dots (red/amber/green), title bar, scrollable body, Escape to close
11. **Visualization containers** (`viz-container`) -- dark canvas with grid background, header bar with label + play/pause/reset controls
12. **Animation toggle** -- global motion reduce toggle affecting all animations

### Visualization Components
13. **Scheduler timeline** -- horizontal track rows per task, colored blocks showing running/ready/blocked states, animated cursor
14. **Queue data flow** -- producer/consumer actors with pipe container, colored queue items, status text
15. **Semaphore/mutex cycle** -- task boxes with state transitions (idle/holding/waiting), resource indicator (locked/free), connector line
16. **Timer timeline** -- one-shot and auto-reload tracks with fire-point indicators, sweeping cursor
17. **Event group bits** -- clickable 8-bit register display with named labels, waiter cards showing AND/OR conditions and BLOCKED/RUNNING state
18. **Dual-core view** -- two-column grid showing Core 0 and Core 1 task lists with active indicators, IPC annotation

## 4. Theming Approach

### Color Application Strategy

The guide uses a **semantic color mapping** where each hue serves a consistent functional role:

- **Green** -- primary state, success, active, enabled. Used for titles, running tasks, available resources, set bits, active nav items
- **Cyan** -- interactive elements, secondary information, system-level items. Used for deep-dive buttons, Core 0, producer tasks, one-shot timers
- **Amber** -- attention, warning, pending state. Used for H3 headers, blocked states, consumer tasks, timer cursors, warning callouts
- **Red** -- error, locked, danger. Used for suspended state, locked mutex, full/empty queue, close buttons, animation-off dot

### Glow as the primary visual effect

Instead of gradients or fills for emphasis, this guide uses **glow effects** (via `text-shadow` and `box-shadow`) as the primary way to draw attention:

```css
/* Example: hero title triple glow */
text-shadow:
  0 0 10px var(--green-glow),   /* tight inner */
  0 0 30px var(--green-glow),   /* medium spread */
  0 0 60px rgba(0, 255, 65, 0.3); /* wide ambient */
```

This creates a phosphor-like bloom effect that is thematically perfect for embedded systems content.

### Border-based interactivity

Hover and active states are communicated through:
- Border color transitions (dim to full hue)
- Faint background fills (`var(--*-faint)`)
- Box-shadow glow additions
- Never through background color changes to saturated tones

### Structural patterns shared with other guides:

- CSS custom properties for full theming
- Consistent state-to-color mapping
- Layered alpha variants (full, dim, glow, faint) for each hue
- Dark mode as the only mode (no light mode toggle needed)

## 5. Visualization Techniques

### A. Scheduler Timeline (CSS + JS animation)

**Type:** Horizontal Gantt-style timeline
**Technique:** Absolutely-positioned `div` blocks inside track containers, with a sweeping dotted cursor line. Uses `requestAnimationFrame` for smooth cursor movement.

Key details:
- Pre-computed 60-slot schedule based on priority simulation with periodic blocking
- Each task gets a horizontal track; colored blocks show when the task is running
- Cursor sweeps left-to-right, blocks appear progressively behind it
- Legend shows Running/Ready/Blocked with sample dots

### B. Queue Data Flow (CSS + setTimeout animation)

**Type:** Schematic producer-consumer flow
**Technique:** Flexbox layout with actor boxes, arrow separators, and a pipe container that dynamically adds/removes colored item squares.

Key details:
- 5-slot capacity, items numbered sequentially
- Phase-based animation: produce -> wait -> consume -> wait
- Status text updates on actors (Sending/Blocked/Received)
- Items are colored via a 5-color rotation array

### C. Semaphore/Mutex Cycle (CSS + setTimeout animation)

**Type:** State machine walkthrough
**Technique:** Pre-defined 8-phase state array cycling through idle/holding/waiting/free states. CSS class swaps drive visual transitions.

Key details:
- Two task boxes with state classes (idle/holding/waiting)
- Central resource indicator (LOCKED/UNLOCKED)
- Connector line that glows when active
- Pulsing amber glow animation on waiting tasks (`pulse-amber` keyframes)

### D. Timer Timeline (CSS + setTimeout animation)

**Type:** Horizontal timeline with fire points
**Technique:** Circular tick markers positioned along a timeline bar, with a sweeping cursor. Ticks light up (change color + add glow shadow) when the cursor passes them.

Key details:
- One-shot: single cyan tick at position 8/40
- Auto-reload: green ticks at every 6 positions
- `timer-fire` keyframes scale the tick up then back for a "fire" effect

### E. Event Group Bits (Interactive CSS + JS)

**Type:** Interactive bit register with dependent waiter display
**Technique:** Clickable bit cells that toggle state, with waiter cards that reactively compute AND/OR conditions.

Key details:
- 8 named bits (WIFI, MQTT, SENS, BLE, NTP, OTA, SD, ADC)
- Each bit is a clickable `role="switch"` element
- Three waiter tasks with different conditions (ALL/ANY + specific bit masks)
- Auto-animation toggles random bits, but user can click to override
- Waiter state updates immediately on any bit change

### F. Dual-Core Distribution (CSS + setTimeout animation)

**Type:** Two-column grid with active task indicators
**Technique:** Grid layout with task lists per core, active task highlighted with green border glow and status dot.

Key details:
- Core 0 tasks styled cyan, Core 1 tasks styled green
- Active task rotation with biases (WiFi dominates Core 0, app_main/Sensor dominate Core 1)
- IPC arrow annotation between cores with pulsing opacity animation

### Common visualization patterns:
- All visualizations use `IntersectionObserver` for lazy animation start/stop
- All have Reset and Play/Pause controls in a standardized viz-header bar
- All respect the global motion toggle
- All use CSS transitions for state changes, JS for timing

## 6. Popover/Details Patterns

### Expandable Section Cards (Accordion)

The guide does NOT use HTML `<details>/<summary>`. Instead it uses a custom JS accordion:

```html
<article class="section-card">
  <div class="card-header" onclick="toggleCard(this)" role="button" tabindex="0" aria-expanded="false">
    <!-- index, title, summary, expand icon -->
  </div>
  <div class="card-body">
    <div class="card-content"><!-- content --></div>
  </div>
</article>
```

**Mechanism:**
- `card-body` has `max-height: 0; overflow: hidden` by default
- `.expanded .card-body` gets `max-height: 8000px` with 500ms transition
- Expand icon rotates 90 degrees and changes color
- Keyboard support via keydown listener for Enter/Space
- `aria-expanded` attribute toggled for accessibility

### Modal Deep-Dives

Modal content is stored in a JS object (`modalContent`) as HTML strings keyed by ID.

```js
const modalContent = {
  'stack-sizing': `<h4>Stack Sizing for ESP32 Tasks</h4>...`,
  'priority-inversion': `<h4>Priority Inversion</h4>...`,
  // 13 total deep-dive entries
};
```

**Mechanism:**
- Backdrop: fixed overlay with `rgba(0,0,0,0.75)` + 4px blur
- Modal: fixed centered with scale transform animation (0.92 -> 1.0)
- macOS-style title bar with red/amber/green dots (purely decorative)
- Close via: X button, backdrop click, or Escape key
- Body is scrollable with max-height 85vh
- Contains same content-block styles (h4, p, ul with `>` markers, `.warn` callouts)

**Deep-dive topics (13 total):**
1. Stack Sizing Tips
2. Priority Selection Guide
3. Task Notifications
4. Queue Sets
5. Queues from ISR
6. Priority Inversion Explained
7. Recursive Mutexes
8. Semaphore vs Mutex
9. Timer Daemon Task Details
10. Timer IDs & Reuse
11. Event Group Sync
12. Events from ISR
13. Dual-Core Gotchas
14. IPC Mechanisms
15. Task Watchdog Timer

## 7. What It Shares with Good Educational Guides (Common Structural DNA)

1. **CSS custom properties for full theming** -- all colors, fonts, spacing, and timing defined as variables in `:root`
2. **Single-file self-contained HTML** -- no external dependencies beyond Google Fonts
3. **Semantic HTML structure** -- `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`, proper heading hierarchy
4. **Accessibility features** -- `role="button"`, `aria-expanded`, `aria-label`, `aria-modal`, `role="switch"`, `aria-checked`, keyboard navigation, focus-visible outlines
5. **Reduced motion support** -- `@media (prefers-reduced-motion)` plus manual toggle, all animations respect it
6. **Numbered section cards** -- expandable accordion with index numbers, titles, and summaries
7. **Progressive disclosure** -- content hidden by default, revealed on interaction
8. **Deep-dive modal pattern** -- supplementary content available on demand without leaving the page
9. **Interactive visualizations** -- animated diagrams that illustrate concepts, not just static images
10. **Visualization controls** -- consistent Play/Pause/Reset pattern across all animations
11. **IntersectionObserver lazy loading** -- animations only run when visible, saving resources
12. **Code blocks with syntax highlighting** -- manual span-based coloring matching IDE conventions
13. **Responsive design** -- mobile breakpoint at 768px, sidebar transforms to overlay, grid layouts collapse
14. **Three font tiers** -- display (VT323), monospace (Share Tech Mono), body (IBM Plex Sans)

## 8. What's Unique to This Guide

1. **CRT scanline overlay** -- a repeating-linear-gradient pseudo-element covering the entire viewport simulating CRT scan lines
2. **Grid paper background** -- subtle gridlines throughout giving an engineering/oscilloscope feel
3. **Phosphor glow aesthetic** -- triple-layer text-shadow on the hero title, single-layer glows on accent text
4. **Hero flicker animation** -- subtle opacity fluctuation at 97-99% of the keyframe cycle, not disruptive but subliminally atmospheric
5. **Code-comment H3 prefix** -- all H3 headings have a `//` prefix via CSS `::before`, resembling C-style comments
6. **Terminal-style list markers** -- `>` character as list bullet, matching command-line output
7. **Bracket-wrapped buttons** -- deep-dive buttons flanked by `[` and `]` via `::before`/`::after`, resembling hyperlinks in text-mode interfaces
8. **Traffic-light modal titlebar** -- three colored dots (red/amber/green) mimicking macOS window controls, purely decorative
9. **Dotted cursor on scheduler** -- the timeline cursor uses `border-left: 2px dotted` rather than a solid line, giving an oscilloscope trace feel
10. **Green scrollbar** -- custom `scrollbar-color: var(--green-dim) var(--bg-secondary)` matching the theme
11. **Pulsing amber glow** -- waiting/blocked tasks pulse with a `box-shadow` animation, drawing attention to contention
12. **IPC arrow pulse** -- the inter-core communication label fades in and out with `ipc-pulse` animation
13. **Contextually appropriate theming** -- the terminal/embedded aesthetic directly matches the subject matter (FreeRTOS, ESP32, C programming)

## 9. Full CSS Variable List

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --bg-card: #0d0d0d;
  --bg-card-hover: #141414;
  --bg-modal: #0c0c0c;

  /* Borders */
  --border-color: #1a1a1a;
  --border-glow: #00ff4130;

  /* Green (primary accent) */
  --green: #00ff41;
  --green-dim: #00cc33;
  --green-glow: #00ff4180;
  --green-faint: #00ff4115;

  /* Amber (warning/attention) */
  --amber: #ffb000;
  --amber-dim: #cc8d00;
  --amber-glow: #ffb00080;
  --amber-faint: #ffb00015;

  /* Cyan (interactive/secondary) */
  --cyan: #00d4ff;
  --cyan-dim: #00a8cc;
  --cyan-glow: #00d4ff80;
  --cyan-faint: #00d4ff15;

  /* Red (error/danger) */
  --red: #ff3333;
  --red-dim: #cc2929;
  --red-glow: #ff333380;

  /* Text */
  --text-primary: #d0d0d0;
  --text-secondary: #888888;
  --text-dim: #555555;

  /* Fonts */
  --font-mono: 'Share Tech Mono', 'Courier New', monospace;
  --font-display: 'VT323', monospace;
  --font-body: 'IBM Plex Sans', -apple-system, sans-serif;

  /* Layout */
  --nav-width: 260px;
  --nav-collapsed: 48px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-med: 300ms ease;
  --transition-slow: 500ms ease;

  /* Effects */
  --scanline-opacity: 0.03;
  --glow-spread: 8px;
  --grid-color: #ffffff08;

  /* Z-indices */
  --z-nav: 100;
  --z-modal-backdrop: 200;
  --z-modal: 201;
}
```

### Hardcoded colors (not in variables):

| Value | Usage |
|-------|-------|
| `#080808` | Code block and viz-canvas background |
| `#98c379` | String literal syntax highlight |
| `#d19a66` | Number literal syntax highlight |
| `#e5c07b` | Type name syntax highlight |
| `#c678dd` | Macro/preprocessor syntax highlight + queue item color |
| `#e06c75` | Queue item color (5th in rotation) |
| `rgba(0, 255, 65, 0.3)` | Hero title outermost glow layer |
| `rgba(255,51,51,0.1)` | Suspended state node background |
| `rgba(0,0,0,0.4)` | Queue pipe background |
| `rgba(0, 0, 0, 0.75)` | Modal backdrop |

---

## Summary: Key Patterns for Skill Development

This guide demonstrates that the **same structural patterns** (CSS variables, accordion cards, deep-dive modals, interactive visualizations with play/pause/reset, IntersectionObserver lazy loading, accessibility attributes) can be reskinned with a completely different visual identity while maintaining educational quality. The CRT/terminal theme is not just cosmetic -- it is contextually appropriate for embedded systems content, and every design choice reinforces that identity (scanlines, phosphor glows, code-comment prefixes, terminal list markers, bracket-wrapped buttons).

The core reusable patterns across both references:
1. CSS custom property theming with four-tier alpha variants per hue
2. Accordion section cards with numbered indices
3. Modal deep-dives with curated supplementary content
4. Visualization containers with standardized header/controls/canvas structure
5. IntersectionObserver-driven lazy animation lifecycle
6. Single-file self-contained HTML with no build step
7. Three-font typography system (display, mono, body)
8. Reduced-motion support at both media-query and toggle levels
