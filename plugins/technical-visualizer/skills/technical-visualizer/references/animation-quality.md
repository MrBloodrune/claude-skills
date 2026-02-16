# Animation Quality Patterns

Cross-cutting motion techniques that make visualizations feel smooth and organic. These apply on top of the 15 visualization patterns — every animated pattern should use the relevant techniques from this file.

---

## 1. Exponential Smoothing (Lerp)

The single most important technique for smooth value-tracking animations. Instead of snapping to a target, the current value chases the target with diminishing speed.

```js
// Per-frame in rAF step function:
currentValue += (targetValue - currentValue) * Math.min(1, dt * SMOOTH_FACTOR);
```

**`SMOOTH_FACTOR` guide:**
| Factor | Feel | Use Case |
|--------|------|----------|
| 4 | Sluggish, heavy | Large physical objects, slow gauges |
| 8 | Natural, responsive | Gauge needles, cursor followers, value displays |
| 12 | Snappy, reactive | UI element positions, highlight transitions |
| 20+ | Near-instant | Micro-adjustments, barely visible smoothing |

**The `Math.min(1, dt * factor)` is critical** — it clamps the lerp fraction to [0, 1], making it frame-rate independent. Without the clamp, low frame rates produce jumps > 100%.

**When to use:** Any animation where a visual element tracks a changing target value — gauge needles, progress indicators, follower elements, interpolated positions.

**When NOT to use:** Playhead sweeps at constant velocity (use `position += SPEED * dt` instead).

### Complete Example: Smooth Gauge Needle

```js
let gaugeCurrentAngle = -135;
let gaugeTargetAngle = -135;
let gaugeTime = 0;

function gaugeStep(timestamp) {
  if (!gaugeLastTime) gaugeLastTime = timestamp;
  const dt = (timestamp - gaugeLastTime) / 1000;
  gaugeLastTime = timestamp;

  if (gaugePlaying && !motionReduced) {
    gaugeTime += dt;
    // Simulated signal: sine wave + sensor noise
    const sineVal = Math.sin(gaugeTime * 0.8) * 0.5 + 0.5;
    const noise = (Math.random() - 0.5) * 0.08;
    const voltage = 0.3 + sineVal * 2.8 + noise;
    const clamped = Math.max(0, Math.min(3.3, voltage));
    gaugeTargetAngle = GAUGE_MIN_ANGLE + (clamped / 3.3) * (GAUGE_MAX_ANGLE - GAUGE_MIN_ANGLE);

    // Exponential smoothing — needle chases target
    gaugeCurrentAngle += (gaugeTargetAngle - gaugeCurrentAngle) * Math.min(1, dt * 8);
  }

  gaugeRender();
  gaugeAnimId = requestAnimationFrame(gaugeStep);
}
```

---

## 2. Progressive Reveal

Elements start in a dim/hidden state and transition to full visibility as a playhead or time cursor passes their position. Creates the "filling in" effect.

### CSS Foundation

```css
.gantt-bar {
  opacity: 0.3;
  transition: opacity 0.3s ease;
}
.gantt-bar.revealed {
  opacity: 0.9;
}
```

### JS Pattern

```js
function render() {
  const currentUnit = position * MAX_UNITS;
  stages.forEach((stage, i) => {
    const bar = document.getElementById('bar' + i);
    bar.classList.toggle('revealed', currentUnit >= stage.start);
  });
}
```

**Key principles:**
- Dim state should still be visible (opacity 0.2–0.4), not invisible
- Use CSS transitions for the reveal, not JS — smoother and GPU-composited
- The playhead position determines reveal, not time elapsed — ensures consistency at any speed
- Works for bars, blocks, segments, labels — anything the cursor passes

### Variant: Waveform Progressive Draw (Canvas)

For Canvas 2D waveforms, draw only up to the cursor position:

```js
function drawWave(canvasId, values, cursorFrac) {
  const cursorX = cursorFrac * canvas.width;
  ctx.beginPath();
  let x = 0, first = true;
  values.forEach(v => {
    const segW = (v.len / totalLen) * canvas.width;
    const y = v.val ? highY : lowY;
    if (x > cursorX) return; // Stop drawing past cursor
    const endX = Math.min(x + segW, cursorX);
    if (first) { ctx.moveTo(x, y); first = false; }
    else ctx.lineTo(x, y);
    ctx.lineTo(endX, y);
    x += segW;
  });
  ctx.stroke();
}
```

---

## 3. Probabilistic Spawning

For particle systems, data flow pulses, and task waterfall animations — spawn elements based on probability per second, not fixed timers.

```js
// In rAF step function:
if (Math.random() < dt * SPAWNS_PER_SECOND) {
  spawnParticle();
}
```

**Why this works:** `dt` is typically ~0.016s (60fps). `dt * 3` gives ~4.8% chance per frame, averaging 3 spawns per second regardless of frame rate.

| Rate | Average Gap | Feel |
|------|------------|------|
| 1 | 1000ms | Occasional, stately |
| 3 | 333ms | Steady flow |
| 5 | 200ms | Active, busy |
| 10 | 100ms | Dense stream |

### Complete Example: Data Flow Pulses

```js
let pulses = [];
const PULSE_SPEED = 0.8; // fraction per second (0 to 1)
const SPAWN_RATE = 3;    // spawns per second

function step(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (playing && !motionReduced) {
    // Probabilistic spawn
    if (Math.random() < dt * SPAWN_RATE) {
      const connIdx = Math.floor(Math.random() * CONNECTIONS.length);
      pulses.push({ connIdx, t: 0 });
    }

    // Advance all pulses
    pulses.forEach(p => { p.t += PULSE_SPEED * dt; });

    // Cull completed
    pulses = pulses.filter(p => p.t <= 1);
  }

  render();
  animId = requestAnimationFrame(step);
}

function render() {
  pulses.forEach(p => {
    const conn = CONNECTIONS[p.connIdx];
    // Linear interpolation along connection line
    const cx = conn.x1 + (conn.x2 - conn.x1) * p.t;
    const cy = conn.y1 + (conn.y2 - conn.y1) * p.t;
    // Position SVG circle or DOM element at (cx, cy)
  });
}
```

---

## 4. CSS Transition Tiers

Every state change that modifies visual properties must use CSS transitions, not JS-driven animation. Map properties to the correct timing tier:

### Tier Definitions

```css
--transition-fast: 150ms ease;  /* Micro-interactions */
--transition-med:  300ms ease;  /* State changes */
--transition-slow: 500ms ease;  /* Layout shifts */
```

### Property-to-Tier Mapping

| Tier | Duration | Properties | Examples |
|------|----------|-----------|----------|
| **Fast** | 150ms | `color`, `background`, `border-color`, `opacity` (hover), `filter` | Button hover, link color, bit toggle, tooltip show |
| **Medium** | 300ms | `transform`, `box-shadow`, `stroke`, `fill`, `opacity` (state) | Modal scale, FSM node glow, icon rotate, edge highlight |
| **Slow** | 500ms | `max-height`, `width` (layout) | Card expand/collapse, sidebar collapse, accordion |

### Application Pattern

```css
/* Fast: hover-level micro-interactions */
.packet-field { transition: filter var(--transition-fast), background var(--transition-fast); }
.nav-link { transition: color var(--transition-fast), background var(--transition-fast); }
.gpio-bit-box { transition: all 0.15s; }

/* Medium: state changes with visual weight */
.fsm-node { transition: all 0.3s; }
.fsm-svg line { transition: stroke 0.3s, stroke-width 0.3s; }
.modal { transition: opacity var(--transition-med), transform var(--transition-med); }
.block-component { transition: all 0.2s; }

/* Slow: layout reflows */
.card-body { transition: max-height var(--transition-slow); }
.tree-children { transition: max-height 0.3s; }
.memmap-sub { transition: max-height 0.3s; }
```

### Rules

1. **Never animate without a transition** — raw class toggles cause jarring snaps
2. **Use `all` sparingly** — list specific properties when possible for performance
3. **Hover transitions are always Fast tier** — users expect immediate feedback
4. **State transitions are Medium tier** — enough time to perceive the change
5. **Layout changes are Slow tier** — gives content time to reflow visually

---

## 5. Randomized Timer Jitter

For `setTimeout`-based discrete animations (ring buffer, lock cycle, GPIO auto-toggle), add random jitter to prevent mechanical-feeling cadence.

```js
// Instead of:
timerId = setTimeout(stepForward, 600);

// Use:
timerId = setTimeout(stepForward, 400 + Math.random() * 300);
// Range: 400-700ms, average 550ms
```

### Jitter Ranges by Pattern Type

| Pattern | Base (ms) | Jitter (ms) | Range | Feel |
|---------|-----------|-------------|-------|------|
| Ring buffer ops | 400 | 300 | 400-700 | Irregular I/O |
| Lock cycle phases | 1200 | 300 | 1200-1500 | Deliberate protocol |
| Auto bit toggle | 600 | 800 | 600-1400 | Random hardware events |
| Scenario step | 1500 | 500 | 1500-2000 | Natural observation pace |

### Reset Behavior

On reset, also randomize the first delay slightly to avoid synchronization with other timers:

```js
function reset() {
  clearTimeout(timerId);
  // ... reset state ...
  if (playing) {
    timerId = setTimeout(stepForward, 200 + Math.random() * 200);
  }
}
```

---

## 6. Canvas HiDPI Rendering

All Canvas 2D visualizations must render at 2x resolution for sharp output on HiDPI displays.

```js
function setupCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * 2;   // 2x internal resolution
  canvas.height = rect.height * 2;
  const ctx = canvas.getContext('2d');
  // CSS keeps display at 1x:
  // canvas { width: 100%; height: 100%; display: block; }
  return ctx;
}
```

**Rules:**
- Set `canvas.width/height` to 2x the CSS display size
- All drawing coordinates use the 2x coordinate space
- Scale `lineWidth` proportionally (use 2.5 instead of 1.25)
- Call `setupCanvas()` on init AND on window resize
- The parent CSS `canvas { width: 100%; height: 100%; }` handles the downscale

### Resize Handler

```js
window.addEventListener('resize', () => {
  // Re-setup canvases on resize
  if (document.getElementById('waveCanvas')) {
    waveRender(); // render functions call setupCanvas internally
  }
}, { passive: true });
```

---

## 7. Ambient Keyframe Glows

Subtle pulsing effects on active or highlighted elements. Use sparingly — at most 2 keyframe animations per page.

### Hero Title Flicker

```css
@keyframes copper-pulse {
  0%, 97%, 100% { opacity: 1; }
  97.5% { opacity: 0.9; }
  98% { opacity: 1; }
  98.5% { opacity: 0.95; }
}

.hero-title {
  animation: copper-pulse 4s infinite;
}
```

### Active Node Glow

```css
@keyframes node-glow {
  0%, 100% { box-shadow: 0 0 12px var(--green-faint); }
  50% { box-shadow: 0 0 24px var(--green-glow); }
}

@keyframes node-glow-error {
  0%, 100% { box-shadow: 0 0 12px var(--red-faint); }
  50% { box-shadow: 0 0 24px var(--red-glow); }
}

.fsm-node.active { animation: node-glow 1.5s infinite; }
.fsm-node.error-state.active { animation: node-glow-error 1.5s infinite; }
```

### Rules

1. **Max 2 keyframe animations per page** — more creates visual noise
2. **Long periods (1.5s–4s)** — slow enough to be ambient, not distracting
3. **Subtle property changes** — opacity ±5%, box-shadow spread only
4. **Respect reduced motion** — keyframes get `duration: 0.01ms !important` via the global media query
5. **No keyframes for functional animation** — only decorative ambient effects

---

## 8. GPU-Composited Properties

Prefer properties that trigger GPU compositing (no layout/repaint) for smoother animation:

### Composited (fast, GPU-handled)
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (blur, brightness, drop-shadow)

### Non-composited (triggers repaint)
- `color`, `background`, `border-color`, `box-shadow`
- Acceptable for CSS transitions (handled by browser scheduler)
- Avoid in rAF loops — use class toggles with transitions instead

### Non-composited (triggers layout reflow)
- `width`, `height`, `max-height`, `padding`, `margin`
- Only use with CSS transitions at Slow tier
- Never animate in rAF loops

### Practical Rules

1. **rAF loops should only set:** `style.left`, `style.top`, `style.transform`, SVG attributes (`cx`, `cy`, `x2`, `y2`), `textContent`, or `innerHTML` (for small rebuilds)
2. **State changes use class toggles** — let CSS transitions handle the visual change
3. **Never set `style.background` or `style.borderColor` in a rAF loop** — use `.classList.toggle()` and let CSS transition it
4. **`innerHTML` rebuilds in rAF are acceptable** for small element counts (<20 elements). For larger counts, reuse existing DOM elements and update their styles.

---

## 9. Scroll Performance

### Passive Event Listeners

Always use `{ passive: true }` on scroll and touch handlers:

```js
window.addEventListener('scroll', updateActiveNav, { passive: true });
```

### Lightweight Scroll Handlers

The scroll handler for active nav tracking should be fast — only DOM reads and class toggles:

```js
function updateActiveNav() {
  const scrollY = window.scrollY + 120;
  let current = '';
  sections.forEach(s => {
    if (s.offsetTop <= scrollY) current = s.id;
  });
  links.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}
```

### No Scroll-Linked Animations

Do not animate properties based on scroll position. Use `IntersectionObserver` for viewport-enter triggers instead. Scroll-linked animation causes jank on all platforms.

---

## Checklist

Every animated visualization should satisfy:

```
[ ] Continuous animations use rAF + delta-time (not setTimeout)
[ ] Values that track targets use exponential smoothing (lerp)
[ ] Progressive reveal dims unreached elements (opacity 0.2-0.4), not hidden
[ ] Particle/pulse spawning uses probabilistic rate (dt * RATE)
[ ] All state change visuals use CSS transitions (not JS-driven)
[ ] CSS transitions use correct tier (fast/med/slow)
[ ] setTimeout discrete patterns include random jitter
[ ] Canvas 2D uses 2x resolution for HiDPI
[ ] Keyframe animations are ambient-only, max 2 per page
[ ] rAF loops only touch compositable properties or small innerHTML
[ ] Scroll handlers are passive with lightweight callbacks
[ ] IntersectionObserver gates all animation start/stop
```
