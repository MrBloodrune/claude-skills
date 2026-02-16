# Theme: PCB Schematic

Complete CSS variable specification for the PCB/EDA schematic aesthetic. These values are locked — use them exactly as specified for visual consistency across all pages in a collection.

## Google Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
```

## CSS Custom Properties

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0f1a;
  --bg-secondary: #0d1220;
  --bg-card: #0b1018;
  --bg-card-hover: #10172a;
  --bg-modal: #0a0e18;

  /* Borders */
  --border-color: #1a2540;
  --border-glow: #d4924b30;

  /* Copper (primary accent) */
  --copper: #d4924b;
  --copper-dim: #b07a3a;
  --copper-glow: #d4924b80;
  --copper-faint: #d4924b15;

  /* Signal Green (active/success) */
  --green: #4ade80;
  --green-dim: #38b866;
  --green-glow: #4ade8080;
  --green-faint: #4ade8015;

  /* Warm Red (error/blocked) */
  --red: #ef4444;
  --red-dim: #cc2929;
  --red-glow: #ef444480;
  --red-faint: #ef444415;

  /* Cool Blue (data/info) */
  --blue: #60a5fa;
  --blue-dim: #4b8bdb;
  --blue-glow: #60a5fa80;
  --blue-faint: #60a5fa15;

  /* Text */
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-dim: #475569;

  /* Typography */
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  --font-body: 'Instrument Sans', -apple-system, sans-serif;

  /* Layout */
  --nav-width: 280px;
  --nav-collapsed: 48px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-med: 300ms ease;
  --transition-slow: 500ms ease;

  /* PCB Motifs */
  --trace-color: #d4924b12;
  --grid-color: #d4924b08;
  --pad-color: #d4924b30;

  /* Z-index layers */
  --z-nav: 100;
  --z-modal-backdrop: 200;
  --z-modal: 201;
}
```

## Color Semantics

| Color | Role | Use For |
|-------|------|---------|
| Copper | Primary accent | Borders, active states, traces, links, highlights |
| Green | Active/success | Running states, connected, enabled, valid |
| Red | Error/blocked | Errors, conflicts, blocked, overflow, danger zones |
| Blue | Data/info | Data flow, information, cool accents, system items |

Each color has four variants:
- **Base** (`--copper`): Primary use, text, borders
- **Dim** (`--copper-dim`): Subdued version for secondary elements
- **Glow** (`--copper-glow`): 50% alpha for box-shadow and text-shadow effects
- **Faint** (`--copper-faint`): ~8% alpha for backgrounds and hover fills

## Typography

- **Body text:** `var(--font-body)` (Instrument Sans), 15px, line-height 1.7
- **Code/labels:** `var(--font-mono)` (JetBrains Mono), various sizes
- **Section labels:** Mono, 10px, uppercase, letter-spacing 2px, `--text-dim`
- **Card titles:** Mono, 18px, weight 500, `--copper`
- **Pattern labels:** Mono, 10px, uppercase, letter-spacing 1.5px, `--green`
- **Index numbers:** Mono, 32px, weight 300, `--text-dim`

## Visual Motifs

### Copper Trace Grid (background pattern)
```css
background-image:
  linear-gradient(var(--grid-color) 1px, transparent 1px),
  linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
background-size: 40px 40px;
```

For visualization canvases, use 20px grid:
```css
background-size: 20px 20px;
```

### Solder Pad Dots
Small copper circles at junctions and corners:
```css
.pad {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--copper);
  box-shadow: 0 0 4px var(--copper-glow);
}
```

### Silkscreen Labels
Component reference designators styled as PCB silkscreen:
```css
.silkscreen {
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-dim);
}
```

### Component Boxes
Schematic-style component containers:
```css
.component-box {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-card);
  padding: 12px 16px;
  /* Pin stubs on edges as pseudo-elements */
}
```

## Sidebar Glassmorphism

```css
.nav-sidebar {
  background: rgba(10, 15, 26, 0.92);
  border-right: 1px solid rgba(212, 146, 75, 0.15);
  box-shadow: 1px 0 12px rgba(212, 146, 75, 0.06),
              inset -1px 0 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

## Modal Windows

Terminal-style with colored titlebar dots:
```css
.modal {
  background: var(--bg-modal);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}
.modal-titlebar {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
/* Three colored dots: red, amber, green */
.modal-dots span:nth-child(1) { background: var(--red); }
.modal-dots span:nth-child(2) { background: var(--copper); }
.modal-dots span:nth-child(3) { background: var(--green); }
```

Entry animation: scale(0.92) → scale(1.0) with opacity 0 → 1, 200ms ease-out.
Backdrop: rgba(0, 0, 0, 0.6) with backdrop-filter: blur(4px).

## Code Blocks

```css
.code-block {
  background: #080c14;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
}
```

Syntax highlighting colors:
- Keywords: `var(--blue)` (if, for, return, const)
- Functions: `var(--copper)` (function names, method calls)
- Strings: `var(--green)` (quoted strings)
- Comments: `var(--text-dim)` italic
- Numbers: `#e89b6e` (numeric literals)
- Types: `#e6c87a` (type names, structs)
- Macros/defines: `#c678dd` (preprocessor, attributes)
