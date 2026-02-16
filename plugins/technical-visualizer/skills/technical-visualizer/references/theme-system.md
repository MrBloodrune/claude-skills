# Theme System Reference

Complete CSS theming architecture for educational visualization pages. This document extracts the complete theme system from the ESP32 Peripherals Guide (PCB schematic aesthetic) and shows how to create variant themes using the FreeRTOS Guide (CRT terminal aesthetic) as an example.

---

## Section 1: PCB Schematic Theme (Default)

### Complete CSS Custom Properties

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

### Color System Explanation

**Four-tier alpha pattern** - Every accent color follows this structure:
- `--{color}` - Full intensity (100%) for text, strokes, primary elements
- `--{color}-dim` - Slightly darker (~80%) for borders, secondary elements
- `--{color}-glow` - 50% opacity for box-shadow, text-shadow glows
- `--{color}-faint` - 8-15% opacity for backgrounds, fills, tints

**Background scale** - Six levels from deepest to lightest:
1. `#060a12` - Deepest (code blocks, viz canvas)
2. `#0a0e18` - Modal background
3. `#0a0f1a` - Page background (--bg-primary)
4. `#0b1018` - Card background (--bg-card)
5. `#0d1220` - Secondary (--bg-secondary)
6. `#10172a` - Card hover (--bg-card-hover)

**Text scale** - Three levels:
- `--text-dim` (#475569) - Decorative prefixes, disabled elements
- `--text-secondary` (#94a3b8) - Summaries, secondary info, legends
- `--text-primary` (#e2e8f0) - Body text, main content

**PCB-specific tokens**:
- `--trace-color` - Ultra-faint copper for connection lines
- `--grid-color` - Barely visible copper for background grid
- `--pad-color` - Solder pad dots and decorative circles

**Accent colors** - Four semantic hues:
- **Copper** - Primary accent (PCB trace theme), titles, active states, primary actions
- **Green** - Success, running states, enabled indicators
- **Red** - Error, danger, locked states, warnings
- **Blue** - Secondary info, interactive elements, supplementary content

---

## Section 2: Typography

### Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### Complete Font Size Table

| Element | Size | Weight | Font | Line Height | Letter Spacing |
|---------|------|--------|------|-------------|----------------|
| Body base | 15px | 400 | Body | 1.7 | - |
| Hero title | clamp(32px, 6vw, 56px) | 600 | Mono | - | 3px |
| Hero subtitle | clamp(14px, 2vw, 18px) | 400 | Body | - | - |
| Hero tagline | 12px | 400 | Mono | - | 1px |
| Nav title | 14px | 600 | Mono | - | 2px |
| Nav section label | 10px | 400 | Mono | - | 2px |
| Nav links | 12px | 400 | Mono | - | - |
| Card index | 24px | 600 | Mono | - | - |
| Card title | 16px | 500 | Mono | - | - |
| Card pattern label | 10px | 400 | Mono | - | 1px |
| Card summary | 13px | 400 | Body | - | - |
| Category header | 11px | 400 | Mono | - | 3px |
| Content h3 | 14px | 500 | Mono | - | - |
| Content p | 14px | 400 | Body | 1.8 | - |
| Content li | 14px | 400 | Body | 1.8 | - |
| Code block | 13px | 400 | Mono | 1.6 | - |
| Viz label | 11px | 400 | Mono | - | - |
| Viz button | 11px | 400 | Mono | - | - |
| Deep dive button | 12px | 400 | Mono | - | - |
| Modal title | 13px | 400 | Mono | - | - |
| Modal h4 | 15px | 400 | Mono | - | - |
| Modal body | 14px | 400 | Body | 1.8 | - |
| Pin label | 10px | 400 | Mono | - | - |
| Silkscreen label | 10px | 400 | Mono | - | 1.5px |
| Footer | 12px | 400 | Mono | - | - |

### Two-Font System

**JetBrains Mono (Technical/UI)**
- All headings (hero title, card titles, h3)
- Navigation elements
- Buttons and controls
- Code blocks
- Labels and annotations
- Category headers
- Monospace data display

**Instrument Sans (Body/Content)**
- Body text paragraphs
- Card summaries
- List items
- Modal body content
- Descriptive text

### Text Transform Rules

Uppercase elements:
- Hero title
- Category headers
- Nav section labels
- Nav title
- Pattern labels
- Silkscreen labels
- Viz labels
- Stat labels
- Table headers

---

## Section 3: Visual Motifs

### Copper Grid Background

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

### Scanline Overlay

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.02) 2px,
    rgba(255, 255, 255, 0.02) 4px
  );
  opacity: 0.4;
}
```

### Solder Pad Dots

```css
.pad-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--copper);
  box-shadow: 0 0 4px var(--copper-glow);
}

.pad-dot.sm {
  width: 5px;
  height: 5px;
}
```

### Glow Effect Pattern

**Triple-layer text glow** (for hero titles, emphasized text):
```css
.hero-title {
  text-shadow:
    0 0 10px var(--copper-glow),
    0 0 30px var(--copper-glow),
    0 0 60px rgba(212, 146, 75, 0.2);
}
```

**Single-layer text glow** (for card titles, labels):
```css
.card-title {
  text-shadow: 0 0 8px var(--copper-faint);
}
```

**Box-shadow glow** (for buttons, active elements):
```css
.deep-dive-btn:hover {
  box-shadow:
    0 0 12px var(--blue-faint),
    0 0 24px rgba(96, 165, 250, 0.1);
}
```

### Code Block Styling

**Container**:
```css
.code-block {
  background: #060a12;
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

**Syntax highlighting classes**:
```css
.code-block .kw   { color: var(--blue); }           /* Keywords */
.code-block .fn   { color: var(--copper); }         /* Functions */
.code-block .str  { color: var(--green); }          /* Strings */
.code-block .cmt  { color: var(--text-dim); font-style: italic; } /* Comments */
.code-block .num  { color: #d19a66; }               /* Numbers */
.code-block .type { color: #e5c07b; }               /* Types */
.code-block .macro { color: #c678dd; }              /* Macros */
```

---

## Section 4: Base Reset & Globals

### Box-Sizing Reset

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

### Body Base Styles

```css
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

### Scrollbar Styling

```css
/* Firefox */
html {
  scrollbar-width: thin;
  scrollbar-color: var(--copper-dim) var(--bg-secondary);
}

/* Webkit */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--copper-dim);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--copper);
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

/* Manual toggle class */
body.reduce-motion *,
body.reduce-motion *::before,
body.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
```

### Selection Styling

```css
::selection {
  background: var(--copper-faint);
  color: var(--copper);
}
```

---

## Section 5: Theming Guide

### How to Create a Variant Theme

The theme system is designed for easy customization. To create a variant theme (like FreeRTOS CRT terminal aesthetic), you only need to swap specific tokens while keeping the structural patterns intact.

### FreeRTOS Theme Example: Side-by-Side Comparison

**What to change:**

| Aspect | PCB Theme | FreeRTOS Theme |
|--------|-----------|----------------|
| **Primary accent** | Copper (`#d4924b`) | Green (`#00ff41`) |
| **Secondary accent** | Green (`#4ade80`) | Cyan (`#00d4ff`) |
| **Tertiary accent** | Blue (`#60a5fa`) | Amber (`#ffb000`) |
| **Danger/error** | Red (`#ef4444`) | Red (`#ff3333`) |
| **Backgrounds** | Navy tinted (#0a0f1a, #0d1220) | Pure black (#0a0a0a, #111111) |
| **Display font** | JetBrains Mono | VT323 (pixel font) |
| **Body font** | Instrument Sans | IBM Plex Sans |
| **Grid color** | Copper-tinted (`#d4924b08`) | White-tinted (`#ffffff08`) |
| **Visual motif** | PCB copper grid | CRT scanlines |

**FreeRTOS `:root` Block:**

```css
:root {
  /* Backgrounds - pure blacks */
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --bg-card: #0d0d0d;
  --bg-card-hover: #141414;
  --bg-modal: #0c0c0c;

  /* Borders */
  --border-color: #1a1a1a;
  --border-glow: #00ff4130;

  /* Green (primary accent - terminal phosphor) */
  --green: #00ff41;
  --green-dim: #00cc33;
  --green-glow: #00ff4180;
  --green-faint: #00ff4115;

  /* Cyan (secondary/interactive) */
  --cyan: #00d4ff;
  --cyan-dim: #00a8cc;
  --cyan-glow: #00d4ff80;
  --cyan-faint: #00d4ff15;

  /* Amber (attention/warning) */
  --amber: #ffb000;
  --amber-dim: #cc8d00;
  --amber-glow: #ffb00080;
  --amber-faint: #ffb00015;

  /* Red (error/danger) */
  --red: #ff3333;
  --red-dim: #cc2929;
  --red-glow: #ff333380;

  /* Text */
  --text-primary: #d0d0d0;
  --text-secondary: #888888;
  --text-dim: #555555;

  /* Fonts */
  --font-display: 'VT323', monospace;
  --font-mono: 'Share Tech Mono', 'Courier New', monospace;
  --font-body: 'IBM Plex Sans', -apple-system, sans-serif;

  /* Layout (same) */
  --nav-width: 260px;
  --nav-collapsed: 48px;

  /* Transitions (same) */
  --transition-fast: 150ms ease;
  --transition-med: 300ms ease;
  --transition-slow: 500ms ease;

  /* CRT Theme Colors */
  --grid-color: #ffffff08;          /* White-tinted grid */
  --scanline-opacity: 0.03;

  /* Z-index (same) */
  --z-nav: 100;
  --z-modal-backdrop: 200;
  --z-modal: 201;
}
```

**FreeRTOS Background Motif (CRT Scanlines):**

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
  opacity: 0.5;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, var(--scanline-opacity)) 2px,
    rgba(255, 255, 255, var(--scanline-opacity)) 4px
  );
}
```

### What NOT to Change

Keep these structural aspects constant across all themes:

**Layout geometry**:
- `--nav-width: 280px`
- `--nav-collapsed: 48px`
- `--z-nav`, `--z-modal-backdrop`, `--z-modal` values
- Spacing values (padding, margin, gap)

**Transition speeds**:
- `--transition-fast: 150ms`
- `--transition-med: 300ms`
- `--transition-slow: 500ms`

**Interaction patterns**:
- Hover effects (keep border/glow pattern)
- Expand/collapse transitions
- Modal open/close animations
- Button active states

**Typography scale**:
- Font sizes (keep the entire table from Section 2)
- Line heights
- Letter spacing values
- Text transform rules

**Component structure**:
- Card layouts
- Visualization containers
- Modal structure
- Navigation hierarchy

### Theme Variants - Quick Reference

| Theme | Primary | Secondary | Tertiary | Display Font | Body Font | Motif |
|-------|---------|-----------|----------|--------------|-----------|-------|
| PCB Schematic | Copper | Green | Blue | JetBrains Mono | Instrument Sans | Grid + scanlines |
| CRT Terminal | Green | Cyan | Amber | VT323 | IBM Plex Sans | Heavy scanlines |
| Blueprint | Blue | Cyan | White | Roboto Mono | Inter | Blueprint grid |
| Oscilloscope | Green | Yellow | Orange | Share Tech Mono | Work Sans | Oscilloscope grid |

---

## Appendix: Additional Colors (Not in Variables)

These colors are hardcoded for specific visualization elements:

| Hex | Usage |
|-----|-------|
| `#d19a66` | Code syntax: numbers |
| `#e5c07b` | Code syntax: types |
| `#c678dd` | Code syntax: macros |
| `#98c379` | Code syntax: strings (alternate) |
| `#a78bfa` | Purple (boot sequence, FreeRTOS stages) |
| `#f472b6` | Pink (boot sequence, app_main stage) |
| `#e5b97a` | Light copper (flash cache visualization) |
| `#c69a5c` | Medium copper (library code visualization) |
| `rgba(212,146,75,0.05)` | Pin label background |
| `rgba(0,0,0,0.75)` | Modal backdrop |

---

**Document version:** 1.0
**Target line count:** ~250 lines
**Theme pattern:** Four-tier alpha (full, dim, glow, faint)
**Core principle:** Swap colors and fonts, keep structure constant
