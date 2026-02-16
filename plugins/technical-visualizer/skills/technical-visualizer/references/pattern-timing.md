# Timing & Sequential Patterns

Implementation details for patterns that visualize time-based progression.

## 1. Playhead/Sweep

**Use when:** Showing state changes over time — scheduling, PWM signals, bus transactions, protocol timing.

**Animation approach:** `requestAnimationFrame` with floating-point cursor position.

**Critical implementation:**
```javascript
let float = 0;          // Smooth cursor position
let lastTime = 0;
const SPEED = 5;        // Slots per second
const SLOTS = 60;       // Total timeline slots

function step(timestamp) {
  if (!playing || motionReduced) { animId = null; return; }
  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  float += delta * SPEED;
  if (float >= SLOTS) float = 0;

  render();
  animId = requestAnimationFrame(step);
}

function render() {
  const cursorPos = float;
  const completedTick = Math.floor(cursorPos);

  // Render completed blocks (static, behind cursor)
  for (let t = 0; t <= completedTick; t++) {
    // Get state for this tick from pre-computed pattern
    // Collapse consecutive same-state ticks into single blocks
  }

  // Active block: right edge follows cursorPos (grows in real-time)
  // This is the key: the block grows WITH the cursor, trailing behind it

  // Position cursor at cursorPos
  cursor.style.left = `calc(LABEL_WIDTH + (100% - LABEL_WIDTH) * ${cursorPos / SLOTS})`;
}
```

**Visual spec:**
- Cursor: 2px dotted vertical line, full height of all tracks, amber color with drop-shadow
- Blocks: Colored by channel/task, 2px inset from track edges
- Track background: `var(--green-faint)` or similar faint accent
- Time scale labels below tracks

**Gotchas:**
- Cursor MUST lead blocks. Never render a block at the same position as the cursor in the same frame.
- Pre-compute the schedule/pattern array at init time. Don't compute state in the render loop.
- Use `calc()` for cursor positioning when tracks have a label offset.

## 2. Sequence Diagram

**Use when:** Ordered message passing — SPI/I2C transactions, TCP handshakes, IPC calls, protocol exchanges.

**Animation approach:** `requestAnimationFrame` with phase index and inter-phase timing.

**Structure:**
- Vertical lifelines (entity columns) spanning the full height
- Horizontal segments representing signals or messages between entities
- Phase labels above or below showing current transaction step
- Phases advance at timed intervals (not per-frame — use accumulated delta)

**Implementation:**
```javascript
const PHASES = [
  { name: 'IDLE', duration: 0.5, signals: {...} },
  { name: 'CS LOW', duration: 0.3, signals: {...} },
  { name: 'CLK + DATA', duration: 2.0, signals: {...} },
  // ...
];
let phaseIndex = 0;
let phaseElapsed = 0;

function step(timestamp) {
  // Accumulate delta into phaseElapsed
  // When phaseElapsed >= currentPhase.duration, advance phaseIndex
  // Render current phase state
}
```

**Visual spec:**
- Lifeline rows with labels on the left
- Signal tracks showing HIGH/LOW states as colored blocks
- Active phase highlighted with accent border
- Phase label bar above the diagram

## 3. Waveform Trace

**Use when:** Showing signal values over time — GPIO states, clock signals, data lines, analog readings.

**Animation approach:** `requestAnimationFrame` with progressive reveal. Can use canvas for smooth line drawing or CSS for stepped digital signals.

**Structure:**
- One or more signal rows (SDA, SCL, etc.)
- Each row shows a stepped waveform (HIGH/LOW levels)
- Sweep cursor reveals the waveform progressively
- Phase labels indicate protocol segments (START, ADDRESS, ACK, DATA, STOP)

**Implementation:**
- Pre-compute the complete waveform as an array of HIGH/LOW values at each time unit
- Use canvas `lineTo()` for smooth rendering, or positioned divs for stepped blocks
- Phase bar below shows labeled segments with current phase highlighted
- Cursor sweeps using same float + rAF pattern as Playhead

**Visual spec:**
- Signal names: mono labels left-aligned
- HIGH level: top of track, colored
- LOW level: bottom of track, dimmer
- Transitions: Vertical lines connecting HIGH↔LOW
- Phase labels: Colored tags, active one has accent background

## 4. Gantt Timeline

**Use when:** Showing parallel activities with duration — boot sequences, DMA transfers, pipeline stages, task execution.

**Animation approach:** `requestAnimationFrame` with playhead sweep.

**Structure:**
- Horizontal bars per activity/phase
- Each bar has a start time, end time, and label
- Bars can overlap (parallel activities)
- Playhead sweeps with time counter display
- Bars reveal as cursor passes their start position

**Implementation:**
```javascript
const phases = [
  { name: 'ROM Boot', start: 0, end: 50, color: '--copper' },
  { name: '2nd Stage', start: 50, end: 120, color: '--blue' },
  // ...
];
const TOTAL_MS = 420;

function render() {
  const cursorMs = float / SLOTS * TOTAL_MS;
  phases.forEach(phase => {
    const bar = getBar(phase);
    if (cursorMs >= phase.start) {
      const visibleEnd = Math.min(cursorMs, phase.end);
      bar.style.width = ((visibleEnd - phase.start) / TOTAL_MS * 100) + '%';
      bar.style.display = 'block';
    }
  });
  // Update ms counter display
  msDisplay.textContent = Math.floor(cursorMs) + 'ms';
}
```

**Visual spec:**
- Row labels left-aligned, mono font
- Bars: Rounded 2px, colored per phase, opacity 0.9
- Bar labels inside the bar (if wide enough) or above
- Time axis below with ms markers
- Ms counter: Large mono display showing current time
