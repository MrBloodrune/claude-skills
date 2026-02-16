# ESP32 Peripherals Guide - Exhaustive Analysis Report

Complete extraction of every pattern, technique, CSS approach, and structural decision from the gold-standard educational visualization page at `/home/bloodrune/dev/projects/esp32/esp32-peripherals-guide.html`.

---

## 1. Document Structure

### HTML Skeleton
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Topic} — Interactive Guide</title>
  <!-- Google Fonts preconnect -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>/* All CSS inline */</style>
</head>
<body>
  <!-- Mobile nav button (fixed) -->
  <button class="mobile-nav-btn">...</button>

  <!-- Navigation Sidebar (fixed left) -->
  <nav class="nav-sidebar" aria-label="Main navigation">...</nav>

  <!-- Modal backdrop + Modal (fixed, hidden by default) -->
  <div class="modal-backdrop" id="modalBackdrop">...</div>
  <div class="modal" id="modal" role="dialog" aria-modal="true">...</div>

  <!-- Main Content (margin-left offsets for sidebar) -->
  <main class="main-content">
    <!-- Hero Section -->
    <section class="hero grid-bg" id="hero">...</section>

    <!-- Sections Container -->
    <div class="sections-container">
      <!-- Category Headers divide sections into groups -->
      <div class="category-header">Category Name<span class="pad-dot"></span></div>

      <!-- Section Cards (one per topic, numbered 01-15) -->
      <article class="section-card" id="section-id">
        <div class="card-header" onclick="toggleCard(this)">...</div>
        <div class="card-body">
          <div class="card-content">
            <!-- Content blocks, visualizations, code, deep dive buttons -->
          </div>
        </div>
      </article>
      <!-- ... repeat ... -->
    </div>

    <!-- Footer -->
    <footer class="site-footer">...</footer>
  </main>

  <!-- Deep Dive Modal Templates (hidden <template> elements) -->
  <template id="pwm-modal">...</template>
  <template id="spi-modal">...</template>
  <!-- ... one per section ... -->

  <script>/* All JavaScript inline */</script>
</body>
</html>
```

### Content Organization Hierarchy
1. **Hero** - Title, subtitle, tagline
2. **Category Headers** - Group related sections (4 categories: "Timing & Sequential", "State & Flow", "Structural", "Data Patterns")
3. **Section Cards** - 15 expandable cards, each containing:
   - Card header (index number, pattern label, title, summary, expand icon)
   - Card body (content blocks, visualization, code block, deep-dive button)
4. **Footer** - Attribution line

### Section Card Internal Structure
Each card follows this exact pattern:
```
card-header
  card-index (01-15)
  card-info
    card-pattern-label (visualization type name, e.g. "Playhead / Sweep")
    card-title (h2)
    card-summary (p)
  card-expand-icon (triangle)
card-body
  card-content
    content-block (explanatory text with h3 + paragraphs)
    viz-container (the interactive visualization)
      viz-header (label + play/pause/reset controls)
      viz-canvas (the actual visualization)
    content-block (code example with h3 + code-block)
    deep-dive-btn (opens modal)
```

---

## 2. CSS Architecture

### CSS Custom Properties (Complete)
```css
:root {
  /* Background Colors */
  --bg-primary: #0a0f1a;        /* Main page background */
  --bg-secondary: #0d1220;      /* Secondary panels, headers */
  --bg-card: #0b1018;           /* Card backgrounds */
  --bg-card-hover: #10172a;     /* Card hover state */
  --bg-modal: #0a0e18;          /* Modal background */

  /* Borders */
  --border-color: #1a2540;      /* Standard border */
  --border-glow: #d4924b30;     /* Copper glow border (30% opacity) */

  /* Copper (Primary accent - PCB trace color) */
  --copper: #d4924b;            /* Primary copper */
  --copper-dim: #b07a3a;        /* Dimmed copper */
  --copper-glow: #d4924b80;     /* Copper glow (50% opacity) */
  --copper-faint: #d4924b15;    /* Copper background tint (8% opacity) */

  /* Green (Success, active states) */
  --green: #4ade80;
  --green-dim: #38b866;
  --green-glow: #4ade8080;
  --green-faint: #4ade8015;

  /* Red (Error, warning states) */
  --red: #ef4444;
  --red-dim: #cc2929;
  --red-glow: #ef444480;
  --red-faint: #ef444415;

  /* Blue (Secondary accent, info) */
  --blue: #60a5fa;
  --blue-dim: #4b8bdb;
  --blue-glow: #60a5fa80;
  --blue-faint: #60a5fa15;

  /* Text */
  --text-primary: #e2e8f0;      /* Main text */
  --text-secondary: #94a3b8;    /* Secondary text */
  --text-dim: #475569;          /* Dim/disabled text */

  /* Fonts */
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  --font-body: 'Instrument Sans', -apple-system, sans-serif;

  /* Layout */
  --nav-width: 280px;
  --nav-collapsed: 48px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-med: 300ms ease;
  --transition-slow: 500ms ease;

  /* PCB Theme Colors */
  --trace-color: #d4924b12;     /* Very faint copper for traces */
  --grid-color: #d4924b08;      /* Ultra-faint copper for grid */
  --pad-color: #d4924b30;       /* Solder pad color */

  /* Z-index Scale */
  --z-nav: 100;
  --z-modal-backdrop: 200;
  --z-modal: 201;
}
```

### Color System Pattern
Every accent color follows a 4-tier pattern:
- `--{color}` - Full intensity for text/strokes
- `--{color}-dim` - Slightly darker, for borders/secondary elements
- `--{color}-glow` - 50% opacity, for box-shadow/text-shadow glows
- `--{color}-faint` - 8-15% opacity, for backgrounds/fills

Additional colors used in code blocks and visualizations:
- `#d19a66` - Numbers in code
- `#e5c07b` - Types in code
- `#c678dd` - Macros in code
- `#a78bfa` - Purple (used in boot sequence)
- `#f472b6` - Pink (used in boot sequence)
- `#e5b97a` - Light copper variant
- `#c69a5c` - Medium copper variant

### Reset & Base
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--copper-dim) var(--bg-secondary);
}

body {
  font-family: var(--font-body);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.7;
  font-size: 15px;
  overflow-x: hidden;
  min-height: 100vh;
}
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
/* Also supports a manual toggle via body class */
body.reduce-motion *, body.reduce-motion *::before, body.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
```

---

## 3. Component Patterns

### 3.1 Navigation Sidebar
- **Position**: Fixed left, full height
- **Width**: 280px (collapses to 48px)
- **Background**: `rgba(10, 15, 26, 0.92)` with `backdrop-filter: blur(12px)`
- **Border**: `1px solid rgba(212, 146, 75, 0.15)` (subtle copper tint)
- **Shadow**: `1px 0 12px rgba(212, 146, 75, 0.06), inset -1px 0 0 rgba(255, 255, 255, 0.04)`
- **Sections**: nav-section-label groups (10px, mono, uppercase, letter-spacing: 2px)
- **Links**: flex with icon + label, `border-left: 2px solid transparent`, hover shows copper
- **Active indicator**: `border-left-color: var(--copper)` + copper background
- **Collapse**: Width transitions, labels fade via opacity
- **Controls**: Motion toggle button at bottom with green/red dot indicator

### 3.2 Hero Section
- **Padding**: 100px top, 48px sides, 80px bottom
- **Background**: Grid pattern via `::before` pseudo-element + radial gradient center glow
- **Chip element**: `border: 2px solid var(--copper)`, with `::before/::after` solder pad dots (6px circles)
- **Title**: Mono font, `clamp(32px, 6vw, 56px)`, uppercase, triple text-shadow glow, `copper-pulse` animation
- **Subtitle**: Body font, `clamp(14px, 2vw, 18px)`, secondary text color
- **Tagline**: Mono font, 12px, green with glow, bordered, `::before` adds `// ` prefix in dim

### 3.3 Section Cards
- **Background**: `var(--bg-card)`
- **Border**: `1px solid var(--border-color)`, `border-radius: 2px`
- **Left accent bar**: `::before` pseudo-element, 3px wide, copper, `opacity: 0` -> 1 on hover/expanded
- **Hover**: `border-color: var(--copper-dim)`, `box-shadow: 0 0 12px var(--copper-faint)`
- **Expand/collapse**: `max-height: 0` -> `8000px` with `transition: max-height 500ms ease`

### 3.4 Card Header
- **Layout**: Flex, gap 16px, padding 20px 24px
- **Index**: Mono, 24px, 600 weight, copper-dim, text-shadow glow
- **Pattern label**: Mono, 10px, blue, uppercase, letter-spacing 1px
- **Title**: Mono, 16px, 500 weight, copper with faint text-shadow
- **Summary**: 13px, secondary text
- **Expand icon**: Triangle (&#9654;), rotates 90deg on expand

### 3.5 Category Headers
- **Font**: Mono, 11px, copper, uppercase, letter-spacing 3px
- **Layout**: Flex with `::before` line (24px copper line with glow) and pad-dot (auto margin-left)
- **Separator**: `border-bottom: 1px solid var(--border-color)`, margin-bottom 16px

### 3.6 Content Blocks
- **Heading (h3)**: Mono, 14px, 500 weight, copper with text-shadow, `::before` adds 6px copper dot
- **Paragraphs**: 14px, line-height 1.8, primary text, margin-bottom 12px
- **Lists**: No list-style, `::before` adds diamond character (`\25C6`) in copper-dim, positioned absolute

### 3.7 Visualization Container
```
viz-container
  viz-header (flex, justify-content: space-between)
    viz-label (mono, 11px, dim, uppercase, has ::before dot)
    viz-controls (flex, gap 8px)
      viz-btn (mono, 11px, bordered, copper on hover/active)
  viz-canvas (grid background, min-height 200px, padding 24px)
    [specific visualization content]
```
- **Container**: `background: #060a12`, bordered, `border-radius: 2px`
- **Header**: `background: var(--bg-secondary)`, bordered bottom
- **Canvas**: Grid pattern background (20px grid), dark background

### 3.8 Deep Dive Buttons
- **Style**: Inline-flex, blue border + text, mono 12px, `border-radius: 2px`
- **Pseudo-elements**: `::before` adds `[`, `::after` adds `]` in dim text
- **Hover**: Blue faint background, box-shadow glow, enhanced text-shadow

### 3.9 Pad Dots (Solder Pad Decoration)
```css
.pad-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--copper);
  box-shadow: 0 0 4px var(--copper-glow);
}
.pad-dot.sm { width: 5px; height: 5px; }
```

### 3.10 Pin Labels
```css
.pin-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--copper);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px solid var(--copper-faint);
  border-radius: 1px;
  background: rgba(212,146,75,0.05);
}
/* Has ::before with 4px copper dot */
```

### 3.11 Silkscreen Labels
```css
.silkscreen {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-dim);
}
```

---

## 4. Modal / Popover System

### Structure
```html
<div class="modal-backdrop" id="modalBackdrop" onclick="closeModal()"></div>
<div class="modal" id="modal" role="dialog" aria-modal="true">
  <div class="modal-titlebar">
    <div class="modal-dots"><span></span><span></span><span></span></div>
    <span class="modal-title-text">Deep Dive</span>
    <button class="modal-close">&times;</button>
  </div>
  <div class="modal-body" id="modalBody"></div>
</div>
```

### Modal Styling
- **Backdrop**: Fixed, `background: rgba(0, 0, 0, 0.75)`, `backdrop-filter: blur(4px)`, z-index 200
- **Modal**: Fixed center, `width: min(720px, 90vw)`, `max-height: 85vh`
- **Background**: `var(--bg-modal)`, `border: 1px solid var(--copper-dim)`
- **Shadow**: `0 0 30px var(--copper-faint), 0 0 60px rgba(0,0,0,0.8)`
- **Animation**: `transform: scale(0.92)` -> `scale(1)`, opacity 0 -> 1

### Titlebar (Terminal-style)
- Background: `var(--bg-secondary)`, bordered bottom
- **Traffic light dots**: Three 10px circles - red, copper, green (mimicking macOS window controls)
- Title text: Mono, 13px, secondary color
- Close button: dim -> red on hover

### Modal Body Content
- h4: Mono, copper, 15px
- p/li: 14px, line-height 1.8
- Lists: Same diamond marker as content blocks
- `.warn` block: `border-left: 3px solid var(--red)`, red faint background, `::before` adds "NOTE: " in red mono

### Content Source
Modal content is stored in `<template>` elements (one per section). The `openModal(templateId)` function clones the template content into the modal body.

### Close Behavior
- Click backdrop
- Click close button
- Press Escape key

---

## 5. Details/Summary Expandable Sections

The page does NOT use native `<details>/<summary>`. Instead it uses a custom expand/collapse system:

### Card Expand/Collapse
```css
.card-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--transition-slow); /* 500ms ease */
}
.section-card.expanded .card-body {
  max-height: 8000px;
}
```
- Toggle is via JavaScript `toggleCard()` which adds/removes `.expanded` class
- ARIA attributes: `aria-expanded` on header, `aria-controls` linking to body id

### Memory Map Sub-regions
```css
.memmap-sub {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s;
}
.memmap-sub.expanded {
  max-height: 400px;
}
```
- Accordion behavior: clicking one region closes others first

### Tree Hierarchy
```css
.tree-children {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s;
}
.tree-children.open { max-height: 2000px; }
```
- Toggle arrow rotates 90deg when open

### Packet Anatomy Expand
```css
.packet-expand {
  display: none;
}
.packet-expand.visible { display: block; }
```
- Click field to show byte-level breakdown below

---

## 6. Visualization Patterns (15 Total)

### Pattern 1: Playhead/Sweep (PWM)
- **Type**: Animated horizontal sweep with trailing blocks
- **Structure**: Multiple channels stacked vertically, each with label + track + cursor
- **Animation**: `requestAnimationFrame` loop, position 0->1, blocks rendered as divs with colored backgrounds
- **Colors**: Per-channel (`#60a5fa`, `#4ade80`, `#d4924b`)
- **PWM blocks**: HIGH = full opacity (0.85), LOW = faint (0.15)
- **Cursor**: 2px wide, copper with glow box-shadow
- **Time scale**: Labels at 0, T/4, T/2, 3T/4, T

### Pattern 2: Sequence Diagram (SPI)
- **Type**: Phased sequence with stepping animation
- **Structure**: 4 signal rows (CS, CLK, MOSI, MISO) + phase labels
- **Phase data**: Array of objects `{ name, cs, clk, mosi, miso, dur }`
- **Rendering**: Segments colored based on signal state (HIGH = color+40% opacity, LOW = dark)
- **Active phase**: Highlighted with copper-faint background
- **Step interval**: 600ms per phase

### Pattern 3: Waveform Trace (I2C)
- **Type**: Canvas-drawn waveforms with cursor line
- **Structure**: Two canvas elements (SCL, SDA) + phase bar
- **Drawing**: Canvas 2D context, step waveforms (high/low), dashed cursor line
- **Colors**: SCL = copper, SDA = green
- **Phase bar**: Tags that highlight active phase
- **Resolution**: Canvas width * 2 for retina

### Pattern 4: Gantt Timeline (Boot)
- **Type**: Horizontal bars with sweep cursor
- **Structure**: Rows with label + track + positioned bar
- **Bar positioning**: `left: (start/max * 100)%`, `width: ((end-start)/max * 100)%`
- **Animation**: Cursor sweeps left to right, bars "reveal" (opacity 0.3 -> 0.9) as cursor passes
- **Colors**: Per-stage (red, copper, blue, purple, green, pink)
- **Time axis**: Labels at key timestamps
- **Display**: Current millisecond counter

### Pattern 5: State Machine (WiFi FSM)
- **Type**: Positioned nodes with SVG connecting lines
- **Structure**: Absolute-positioned div nodes + SVG overlay for edges
- **Node styling**: Bordered boxes, `.active` gets green glow + animation
- **Error state**: Red variant of active glow
- **Edges**: SVG lines with arrowhead markers (defs)
- **Active edge**: Green stroke + drop-shadow filter
- **Event log**: Text display at bottom showing current event
- **Scenario**: Predefined sequence of state transitions with durations

### Pattern 6: Ring Buffer (UART)
- **Type**: SVG circular layout with animated pointers
- **Structure**: SVG viewBox 260x260, rects arranged in circle, text labels
- **Cells**: 16 cells around circle, colored by state (occupied = green, overflow = red)
- **Pointers**: W (write/head) and R (read/tail) labels positioned at angles
- **Stats panel**: Side panel with stat rows (Head, Tail, Used, Status) + fill bar
- **Animation**: setTimeout-based, random write/read pattern with occasional bursts

### Pattern 7: Lock Cycle (Flash WEL)
- **Type**: Component diagram with state cycling
- **Structure**: Two boxes (Application, Flash Controller) connected by arrow
- **Arrow**: Text label changes per phase (idle, WREN, ack, WRITE, done, NACK)
- **WEL indicator**: Bit display (0/1) with label (PROTECTED/WRITABLE)
- **Phase log**: Text display at bottom
- **States**: active (green), rejected (red), normal
- **Animation**: setTimeout-based, cycles through 7 phases

### Pattern 8: Bit Register (GPIO)
- **Type**: Interactive clickable bit boxes with preview
- **Structure**: Row of 8 bit boxes (MSB first) + preview panel
- **Bit boxes**: 48x40px, click to toggle, `.set` gets copper highlight
- **Labels**: Bit number above, function label below
- **Preview**: Pin graphic (circle with directional symbol) + mode/pull/drive/interrupt readouts
- **Auto mode**: Random bit toggling on timer

### Pattern 9: Memory Map
- **Type**: Vertical stacked regions with expandable sub-regions
- **Structure**: memmap-region rows with addr + color bar + info, expandable memmap-sub sections
- **Regions**: Address column (mono, 10px), colored bar (16px wide), name + size
- **Hover tooltip**: Positioned above region, shows address range
- **Sub-regions**: Indented rows with colored dots
- **Accordion**: One region expanded at a time

### Pattern 10: Tree/Hierarchy (IDF Components)
- **Type**: Collapsible file tree with dependency highlighting
- **Structure**: Nested divs with tree lines via `::before` pseudo-elements
- **Icons**: Folder (copper), File (dim), Managed (blue) with emoji icons
- **Toggle**: Triangle rotates 90deg, children container max-height toggles
- **Highlighting**: Click leaf file to show dependencies, name gets copper background
- **Lines**: Vertical lines via `::before` on tree-node, horizontal lines via `::before` on tree-item

### Pattern 11: Block Diagram (System Architecture)
- **Type**: Grid-positioned blocks with SVG connection lines and animated pulses
- **Structure**: CSS Grid (6 cols x 5 rows) for block positioning, SVG overlay for lines
- **Blocks**: Grid-column/row placement, click to highlight connections
- **Connection lines**: SVG lines drawn between block centers, colored by bus type
- **Pulse animation**: Random circles traveling along connection lines
- **Selection**: Click block -> connected blocks highlighted, others dimmed (opacity 0.25)
- **Legend**: APB (copper), AHB (blue), Direct (green)

### Pattern 12: Split-Core (Dual Core)
- **Type**: Two parallel lanes with scrolling task blocks
- **Structure**: Two flex columns with lane headers + task elements
- **Tasks**: Absolutely positioned, scroll downward, removed when out of view
- **Task types**: WiFi (blue variants), ADC (green variants) with different opacities
- **Shared memory**: Dashed border element that "flashes" copper on cross-core access
- **Spawn rates**: WiFi every 0.8s, ADC every 0.5s (faster)

### Pattern 13: ADC Gauge
- **Type**: SVG arc gauge with animated needle
- **Structure**: SVG arcs for zones, tick marks, labels, needle line, readout panel
- **Zones**: Safe (green, 0-1V), Normal (copper, 1-2.5V), Danger (red, 2.5-3.3V)
- **Needle**: SVG line from center pivot, smoothly interpolated toward target
- **Threshold marker**: Dashed red line at 3.0V
- **Readout**: Large voltage number + raw ADC value
- **Signal**: Sine wave + random noise for realistic sensor simulation

### Pattern 14: Packet Anatomy (BLE)
- **Type**: Horizontal byte-field diagram with tooltips
- **Structure**: Flex container of packet-field divs, proportional widths based on byte count
- **Fields**: Background + border colored per field type, flex: byteCount
- **Tooltips**: Positioned above field, appear on hover (opacity transition)
- **Click expand**: Shows byte-level grid below with individual hex bytes
- **Colors**: Preamble (gray), Access (blue), Header (light blue), AdvA (green), Data (copper), CRC (red)

### Pattern 15: Truth Table (GPIO Matrix)
- **Type**: Interactive table with dropdowns and SVG pinout diagram
- **Structure**: Table with select dropdowns + SVG chip diagram
- **Conflict detection**: Duplicate pin assignments highlighted in red
- **Table**: Mono font, copper header with 2px border, hover highlight
- **Select styling**: Dark background, bordered, mono font
- **Pinout**: SVG rectangle with pin rectangles on left/right, assigned pins highlighted

---

## 7. Interactive Elements

### Hover Effects
- **Cards**: Border color change + box-shadow glow + left accent bar appearance
- **Nav links**: Color change + background + left border
- **Buttons**: Border color + text color transitions
- **Table rows**: Copper-faint background
- **Packet fields**: `filter: brightness(1.3)` + inset box-shadow
- **Tree items**: Subtle white background tint
- **Block components**: Copper border + background + glow

### Transitions
All transitions use CSS vars for consistency:
- **Fast (150ms)**: Color changes, border color, background, opacity
- **Medium (300ms)**: Width, transform, visibility
- **Slow (500ms)**: max-height (expand/collapse)

### Click Behaviors
- **Card headers**: Toggle expanded state, rotate expand icon
- **Deep dive buttons**: Open modal with template content
- **GPIO bits**: Toggle individual bits, update preview
- **Memory map regions**: Accordion expand sub-regions
- **Tree folders**: Toggle children visibility
- **Tree files**: Highlight and show dependency info
- **Block diagram components**: Highlight connections, dim unrelated
- **Packet fields**: Toggle byte-level expansion below
- **Truth table selects**: Reassign pins, detect conflicts, update pinout SVG

### Animation Control Pattern
Every visualization follows this control pattern:
```javascript
let playing = true;
let animId = null;
let lastTime = 0;

function toggle() {
  playing = !playing;
  btn.textContent = playing ? 'Pause' : 'Play';
  btn.classList.toggle('active', playing);
}

function reset() {
  position = 0;
  lastTime = 0;
  render();
}

function step(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  if (playing && !motionReduced) {
    // Update state
  }
  render();
  animId = requestAnimationFrame(step);
}
```

### IntersectionObserver
Animations only run when visible:
```javascript
const vizObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Start animation
    } else {
      // Stop animation (cancelAnimationFrame or clearTimeout)
    }
  });
}, { threshold: 0.1 });
```

---

## 8. Typography

### Font Families
- **Body**: `'Instrument Sans', -apple-system, sans-serif` - Clean, modern sans-serif
- **Mono**: `'JetBrains Mono', 'Courier New', monospace` - Technical/code font

### Font Sizes (Exhaustive)
| Element | Size | Weight | Font |
|---------|------|--------|------|
| Body base | 15px | 400 | Body |
| Hero title | clamp(32px, 6vw, 56px) | 600 | Mono |
| Hero subtitle | clamp(14px, 2vw, 18px) | 400 | Body |
| Hero tagline | 12px | 400 | Mono |
| Nav title | 14px | 600 | Mono |
| Nav section label | 10px | 400 | Mono |
| Nav links | 12px | 400 | Mono |
| Card index | 24px | 600 | Mono |
| Card title | 16px | 500 | Mono |
| Card pattern label | 10px | 400 | Mono |
| Card summary | 13px | 400 | Body |
| Content h3 | 14px | 500 | Mono |
| Content p | 14px | 400 | Body |
| Content li | 14px | 400 | Body |
| Code block | 13px | 400 | Mono |
| Viz label | 11px | 400 | Mono |
| Viz button | 11px | 400 | Mono |
| Silkscreen label | 10px | 400 | Mono |
| Pin label | 10px | 400 | Mono |
| Category header | 11px | 400 | Mono |
| Deep dive button | 12px | 400 | Mono |
| Modal title | 13px | 400 | Mono |
| Modal h4 | 15px | 400 | Mono |
| Modal body | 14px | 400 | Body |
| Gauge readout val | 24px | 600 | Mono |
| Gauge readout label | 10px | 400 | Mono |
| Phase tags | 9-10px | 400 | Mono |
| Time labels | 9px | 400 | Mono |
| Footer | 12px | 400 | Mono |

### Line Heights
- Body: 1.7
- Content p: 1.8
- Modal body: 1.8
- Code blocks: 1.6
- Tree: 1
- Bit labels: 1.2

### Letter Spacing
- Nav title: 2px
- Nav section labels: 2px
- Category headers: 3px
- Hero title: 3px
- Silkscreen labels: 1.5px
- Pin labels: (none specified)
- Pattern labels: 1px
- Hero tagline: 1px
- Stat labels: 1px
- Phase tags: 1px
- Table headers: 1px

### Text Transforms
- Uppercase: Nav title, nav section labels, category headers, hero title, silkscreen, pattern labels, stat labels, bit labels, table headers, viz labels, arrow text

---

## 9. Color System (Full Palette)

### Primary Background Scale
```
#060a12  - Deepest (code blocks, viz canvas)
#0a0e18  - Modal background
#0a0f1a  - Page background (--bg-primary)
#0b1018  - Card background (--bg-card)
#0d1220  - Secondary (--bg-secondary)
#10172a  - Card hover (--bg-card-hover)
```

### Copper Scale (Primary Accent)
```
#d4924b15 - Copper faint (8% - backgrounds)
#d4924b12 - Trace color
#d4924b08 - Grid color
#d4924b30 - Pad color / border glow
rgba(212,146,75,0.05) - Pin label bg
#d4924b80 - Copper glow (50% - shadows)
#b07a3a   - Copper dim (borders, secondary)
#d4924b   - Copper (text, icons, primary)
```

### Green Scale
```
#4ade8015 - Green faint
#4ade8080 - Green glow
#38b866   - Green dim
#4ade80   - Green
```

### Red Scale
```
#ef444415 - Red faint
#ef444480 - Red glow
#cc2929   - Red dim
#ef4444   - Red
```

### Blue Scale
```
#60a5fa15 - Blue faint
#60a5fa80 - Blue glow
#4b8bdb   - Blue dim
#60a5fa   - Blue
```

### Text Scale
```
#475569 - Text dim
#94a3b8 - Text secondary
#e2e8f0 - Text primary
```

### Additional Visualization Colors
```
#d19a66 - Code: numbers
#e5c07b - Code: types
#c678dd - Code: macros
#a78bfa - Purple (FreeRTOS stage)
#f472b6 - Pink (app_main stage)
#e5b97a - Light copper (flash cache)
#c69a5c - Medium copper (library code)
```

---

## 10. Spacing/Layout System

### Page Layout
- Sidebar: 280px fixed left
- Main content: `margin-left: var(--nav-width)`
- Max content width: 1100px (sections-container)
- Container padding: 48px sides, 32px horizontal, 80px bottom

### Section Card Spacing
- Cards gap: 20px (flex column)
- Card header padding: 20px 24px
- Card content padding: 0 24px 32px (top comes from border-top)
- Content block margin-top: 24px

### Visualization Spacing
- Viz container margin: 20px 0
- Viz canvas padding: 24px (some override to 16px or 12px)
- Viz header padding: 8px 16px

### Common Padding Values
```
4px  - Small gaps (list items, phase tags)
6px  - Tag padding, stat row padding
8px  - Button padding, nav section labels, tree items
10px - Memory map addr padding
12px - Content gaps, warn blocks, legend
16px - Nav header, viz canvas, code blocks
20px - Card header
24px - Content block margin, card content padding, viz canvas
32px - Card content bottom padding, footer
48px - Sections container side padding
```

### Common Gap Values
```
2px  - Phase track gaps
4px  - Bit boxes, sub-region dots, byte grids
6px  - Modal dots, gantt rows
8px  - Content h3 icon gap, nav controls, viz controls, tree items
10px - PWM channel labels, SPI labels, gantt labels
12px - Card header, memmap info items, ring stats, gauge readout
16px - Card header gap, truth table, block grid
20px - Sections gap
24px - Content block, gauge readout
40px - Lock component spacing
48px - Ring buffer layout, sections container padding
```

---

## 11. Icon/Badge System

### Navigation Icons (Unicode)
Each nav link has a `nav-icon` span with a Unicode character:
```
&#9632;  ■  Overview
&#9080;  ⍸  PWM Generation
&#8644;  ⇄  SPI Transaction
&#8767;  ∿  I2C Communication
&#9654;  ▶  Boot Sequence
&#9673;  ◉  WiFi State Machine
&#9900;  ⚬  UART Ring Buffer
&#9888;  ⚠  Flash Write Lock
&#9638;  ▦  GPIO Register
&#9618;  ▒  Memory Map
&#9776;  ☰  IDF Components
&#9635;  ▣  Block Diagram
&#9646;  ▮  Dual Core
&#9685;  ◕  ADC Gauge
&#9643;  ▫  BLE Packet
&#9638;  ▦  GPIO Truth Table
```

### Decorative Elements
- **Pad dots**: 8px copper circles with glow (used as section terminators)
- **Diamond bullets**: `\25C6` character for list items
- **Card expand icon**: `&#9654;` (triangle) that rotates 90deg
- **Tree toggles**: `\u25B6` (triangle) that rotates 90deg
- **Memory expand icon**: `&#9654;` that rotates 90deg

### Tree File Icons (Emoji)
- Directory: `\uD83D\uDCC1` (folder emoji)
- File: `\uD83D\uDCC4` (page emoji)
- Managed package: `\uD83D\uDCE6` (package emoji)

### Status Indicators
- **Motion toggle**: Green/red dot (8px circle)
- **WEL bit**: Bordered box showing 0/1, green glow when set
- **GPIO bit boxes**: 48x40px boxes, copper when set
- **Ring buffer cells**: Green when occupied, red on overflow

---

## 12. Code Block Styling

### Container
```css
.code-block {
  background: #060a12;          /* Darkest background */
  border: 1px solid var(--border-color);
  border-radius: 2px;
  padding: 16px;
  margin: 12px 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
}
```

### Syntax Highlighting Classes
```css
.code-block .kw   { color: var(--blue); }      /* Keywords: #60a5fa */
.code-block .fn   { color: var(--copper); }     /* Functions: #d4924b */
.code-block .str  { color: var(--green); }      /* Strings: #4ade80 */
.code-block .cmt  { color: var(--text-dim); font-style: italic; }  /* Comments: #475569 */
.code-block .num  { color: #d19a66; }           /* Numbers */
.code-block .type { color: #e5c07b; }           /* Types */
.code-block .macro { color: #c678dd; }          /* Macros */
```

### Usage Pattern
Code is written as pre-formatted text with inline `<span>` elements for syntax highlighting:
```html
<div class="code-block"><span class="cmt">// Comment</span>
<span class="type">ledc_timer_config_t</span> timer = {
    .<span class="fn">speed_mode</span> = <span class="macro">LEDC_LOW_SPEED_MODE</span>,
    .<span class="fn">freq_hz</span>    = <span class="num">5000</span>,
};</div>
```

No `<pre>` or `<code>` wrapper needed - whitespace is preserved by the div's content.

---

## 13. Navigation

### Sidebar Navigation
- **Scroll tracking**: `updateActiveNav()` on scroll (passive listener), finds current section by offsetTop
- **Active state**: `border-left-color: var(--copper)` + copper background
- **Smooth scrolling**: `html { scroll-behavior: smooth; }` + anchor links
- **Collapse**: Toggle class adds `.collapsed`, width transitions, labels fade
- **Mobile**: Slides from left via `transform: translateX(-100%)` -> `translateX(0)`

### Section Linking
- Each section card has a unique `id` attribute
- Nav links use `href="#section-id"`
- Hero section has `id="hero"`

### Keyboard Navigation
- Card headers have `tabindex="0"` and respond to Enter/Space
- Escape closes modal
- Focus management: Modal close button receives focus when modal opens

---

## 14. Responsive Design

### Single Breakpoint
```css
@media (max-width: 768px) {
  .nav-sidebar {
    transform: translateX(-100%);   /* Hidden off-screen */
    width: var(--nav-width);        /* Full width when open */
  }
  .nav-sidebar.mobile-open {
    transform: translateX(0);       /* Slide in */
  }
  .main-content {
    margin-left: 0 !important;     /* Full width */
  }
  .mobile-nav-btn {
    display: flex !important;       /* Show hamburger */
  }
  .hero { padding: 60px 24px 48px; }
  .sections-container { padding: 24px 16px 48px; }
  .card-header { padding: 16px; }
  .card-content { padding: 0 16px 24px; }
  .pwm-label, .spi-label, .i2c-label, .gantt-label {
    font-size: 9px;
    width: 60px;
  }
  .fsm-viz { min-height: 350px; }
}
```

### Mobile Navigation Button
```css
.mobile-nav-btn {
  display: none;                    /* Hidden on desktop */
  position: fixed;
  top: 12px; left: 12px;
  z-index: 101;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--copper);
  width: 36px; height: 36px;
  border-radius: 2px;
}
```

### Fluid Typography
- Hero title: `clamp(32px, 6vw, 56px)`
- Hero subtitle: `clamp(14px, 2vw, 18px)`

### Modal Sizing
- Width: `min(720px, 90vw)` - responsive by default
- Max height: `85vh`

---

## 15. Best Practices & Techniques

### PCB Schematic Aesthetic
The entire page is themed as a PCB/schematic diagram:
1. **Copper grid background**: `body::before` creates a 40px grid pattern using `linear-gradient` in both directions
2. **Silkscreen overlay**: `body::after` adds subtle horizontal scan lines
3. **Solder pad dots**: Small copper circles with glow used as decorative elements
4. **Trace-like borders**: Thin copper lines with glow effects
5. **Chip element**: The hero title is wrapped in a bordered box with pseudo-element solder pads

### Background Grid Pattern
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(var(--grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.6;
}
```

### Performance Optimization
- **IntersectionObserver**: Animations only run when their container is in viewport (threshold: 0.1)
- **requestAnimationFrame**: All continuous animations use rAF with delta-time
- **setTimeout for discrete steps**: Used for non-continuous animations (ring buffer, lock cycle)
- **Canvas for waveforms**: I2C uses canvas 2D context (faster than SVG for real-time drawing)
- **Resize handler**: Only re-renders I2C canvas and block diagram lines

### Accessibility
- `aria-label` on all buttons
- `aria-expanded` on card headers
- `aria-controls` linking headers to bodies
- `role="button"` and `tabindex="0"` on card headers
- `role="dialog"` and `aria-modal="true"` on modal
- Keyboard support: Enter/Space for card toggle, Escape for modal close
- `prefers-reduced-motion` media query support
- Manual motion toggle with `.reduce-motion` body class

### Animation Architecture
- **Global `motionReduced` flag**: Checked by all animation loops
- **Per-visualization play state**: Each viz has its own `playing` boolean
- **Consistent control UI**: Every viz has Play/Pause + Reset buttons
- **Delta-time based**: All animations use `(timestamp - lastTime) / 1000` for frame-independent speed
- **Speed constants**: Named constants like `PWM_SPEED = 0.15`, `I2C_SPEED = 0.08`

### No Dependencies
- Zero external JavaScript libraries
- Zero CSS frameworks
- Only external dependency: Google Fonts (Instrument Sans + JetBrains Mono)
- All SVG generated inline or via JavaScript DOM manipulation
- All animations implemented from scratch

### Glow Effect Pattern
The page consistently uses a three-layer glow technique:
```css
text-shadow:
  0 0 10px var(--copper-glow),     /* Inner glow */
  0 0 30px var(--copper-glow),     /* Medium spread */
  0 0 60px rgba(212, 146, 75, 0.2); /* Wide ambient */
```
And for box elements:
```css
box-shadow: 0 0 12px var(--copper-faint);        /* Subtle glow */
box-shadow: 0 0 16px var(--green-faint), 0 0 32px rgba(74,222,128,0.1); /* Active state */
```

### Modal Content via Templates
Using `<template>` elements for modal content is clean because:
- Content is not rendered in the DOM
- No hidden div overhead
- Template innerHTML can be cloned into modal body
- Each section's deep-dive content is self-contained

### Data-Driven Visualizations
All visualizations are driven by data arrays:
```javascript
// Phases defined as data
const spiPhases = [
  { name: 'IDLE', cs: 'H', clk: 'L', mosi: '-', miso: '-', dur: 1 },
  // ...
];

// Components defined as data
const BLOCK_COMPONENTS = [
  { id: 'cpu0', label: 'CPU0\nXtensa LX6', col: '1/3', row: '1/2' },
  // ...
];

// Connections defined as data
const BLOCK_CONNECTIONS = [
  { from: 'cpu0', to: 'sram', bus: 'ahb' },
  // ...
];
```

### SVG Generation Approaches
1. **Inline SVG with viewBox**: Used for ring buffer, gauge, pinout (scalable)
2. **Dynamic SVG creation**: Used for FSM edges, block diagram connections (via `document.createElementNS`)
3. **Canvas 2D**: Used for I2C waveforms (performance-critical real-time drawing)
4. **HTML divs**: Used for PWM blocks, SPI segments, Gantt bars (simpler cases)

### State Management
Each visualization manages its own state with module-level variables:
```javascript
let pwmPlaying = true;
let pwmAnimId = null;
let pwmPosition = 0;       // 0-1 normalized progress
let pwmLastTime = 0;        // Timestamp for delta calculation
const PWM_SPEED = 0.15;    // Units per second
```

### Initialization Pattern
```javascript
function init() {
  // Build all static UIs
  spiRenderInit();
  bootRenderInit();
  wifiRenderInit();
  // etc.

  // Set up IntersectionObserver for all viz containers
  ['pwmViz', 'spiViz', ...].forEach(id => {
    vizObserver.observe(document.getElementById(id));
  });

  // Active nav tracking
  updateActiveNav();

  // Resize handling
  window.addEventListener('resize', () => {
    i2cRender();
    blockDrawLines();
  });
}

document.addEventListener('DOMContentLoaded', init);
```

---

## Summary Statistics

- **Total file size**: 5382 lines
- **CSS**: ~2086 lines (lines 10-2086)
- **HTML**: ~1283 lines (lines 2088-3368, including templates)
- **JavaScript**: ~2013 lines (lines 3369-5380)
- **Sections**: 15 interactive cards
- **Category groups**: 4
- **Visualization types**: 15 unique patterns
- **Modal templates**: 15
- **CSS variables**: 32
- **Animations**: 11 using requestAnimationFrame, 4 using setTimeout
- **Color palette**: 4 primary accent colors (copper, green, red, blue), each with 4 variants
- **Breakpoints**: 1 (768px)
- **External dependencies**: 1 (Google Fonts)
