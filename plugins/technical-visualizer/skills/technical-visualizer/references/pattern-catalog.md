# Visualization Pattern Catalog

Extracted from the gold-standard ESP32 Peripherals Guide. Each pattern includes
the exact HTML structure, CSS classes, and JavaScript animation mechanics needed
for a complete, copy-paste-ready implementation.

All patterns share the standard viz-container wrapper and control UI documented
in `theme-system.md`. CSS classes reference the theme custom properties.

---

## Shared Infrastructure

Every visualization uses these common pieces.

### Viz Container Wrapper

```html
<div class="viz-container" id="{prefix}Viz">
  <div class="viz-header">
    <span class="viz-label">{LABEL TEXT}</span>
    <div class="viz-controls">
      <button class="viz-btn active" id="{prefix}PlayBtn"
        onclick="{prefix}Toggle()">Pause</button>
      <button class="viz-btn" onclick="{prefix}Reset()">Reset</button>
    </div>
  </div>
  <div class="viz-canvas">
    <!-- pattern-specific content -->
  </div>
</div>
```

### Animation Control Template (JS)

```js
let {prefix}Playing = true;
let {prefix}AnimId = null;   // rAF id or setTimeout id
let {prefix}LastTime = 0;
const {PREFIX}_SPEED = 0.15; // units per second

function {prefix}Step(timestamp) {
  if (!{prefix}LastTime) {prefix}LastTime = timestamp;
  const dt = (timestamp - {prefix}LastTime) / 1000;
  {prefix}LastTime = timestamp;
  if ({prefix}Playing && !motionReduced) {
    // update state using dt
  }
  {prefix}Render();
  {prefix}AnimId = requestAnimationFrame({prefix}Step);
}

function {prefix}Toggle() {
  {prefix}Playing = !{prefix}Playing;
  const btn = document.getElementById('{prefix}PlayBtn');
  btn.textContent = {prefix}Playing ? 'Pause' : 'Play';
  btn.classList.toggle('active', {prefix}Playing);
}

function {prefix}Reset() {
  {prefix}Position = 0;
  {prefix}LastTime = 0;
  {prefix}Render();
}
```

### IntersectionObserver (shared for all viz)

```js
const vizObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = entry.target.id;
    if (entry.isIntersecting) {
      // Start: {prefix}LastTime = 0; {prefix}AnimId = rAF({prefix}Step);
    } else {
      // Stop: cancelAnimationFrame({prefix}AnimId); {prefix}AnimId = null;
      // For setTimeout patterns: clearTimeout({prefix}TimerId);
    }
  });
}, { threshold: 0.1 });
```

---

## Pattern 1: Playhead / Sweep

**Category:** Timing & Sequential | **Animation:** rAF continuous

**When to use:** Repeating waveforms or signals where a cursor reveals content
progressively from left to right, looping back to start.

### HTML

```html
<div class="pwm-viz" id="pwmCanvas">
  <!-- Repeat for each channel -->
  <div class="pwm-channel">
    <div class="pwm-label">CH0 <span class="duty">25%</span></div>
    <div class="pwm-track" id="pwmTrack0">
      <div class="pwm-blocks" id="pwmBlocks0"></div>
      <div class="pwm-cursor" id="pwmCursor0"></div>
    </div>
  </div>
  <!-- Time scale at bottom -->
  <div class="pwm-time-scale">
    <div class="pwm-time-label"></div>
    <div class="pwm-time-track">
      <span>0</span><span>T/4</span><span>T/2</span><span>3T/4</span><span>T</span>
    </div>
  </div>
</div>
```

### Key CSS

```css
.pwm-channel { display: flex; align-items: center; gap: 10px; height: 44px; }
.pwm-label { font-family: var(--font-mono); font-size: 11px; width: 90px;
  text-align: right; color: var(--text-secondary); }
.pwm-track { flex: 1; height: 36px; position: relative;
  border: 1px solid var(--border-color); overflow: hidden;
  background: rgba(0,0,0,0.3); }
.pwm-blocks { position: absolute; inset: 0; display: flex; }
.pwm-block { height: 100%; flex-shrink: 0; }
.pwm-cursor { position: absolute; top: 0; bottom: 0; width: 2px;
  background: var(--copper); box-shadow: 0 0 8px var(--copper-glow);
  z-index: 5; }
```

### JavaScript

```js
const channels = [
  { duty: 0.25, color: '#60a5fa' },
  { duty: 0.50, color: '#4ade80' },
  { duty: 0.75, color: '#d4924b' },
];
const PERIOD_COUNT = 4;
let position = 0; // 0-1 normalized
const SPEED = 0.15;

function render() {
  channels.forEach((ch, i) => {
    const trackW = document.getElementById('pwmTrack' + i).clientWidth;
    const periodW = trackW / PERIOD_COUNT;
    const cursorX = position * trackW;
    document.getElementById('pwmCursor' + i).style.left = cursorX + 'px';
    let html = '';
    for (let p = 0; p < Math.ceil(cursorX / periodW) + 1; p++) {
      const ps = p * periodW;
      const highW = periodW * ch.duty;
      if (ps < cursorX) {
        const visH = Math.min(highW, cursorX - ps);
        if (visH > 0) html += `<div class="pwm-block" style="width:${visH}px;background:${ch.color};opacity:0.85"></div>`;
        if (cursorX > ps + highW) {
          const visL = Math.min(periodW - highW, cursorX - ps - highW);
          if (visL > 0) html += `<div class="pwm-block" style="width:${visL}px;background:${ch.color};opacity:0.15"></div>`;
        }
      }
    }
    document.getElementById('pwmBlocks' + i).innerHTML = html;
  });
}

function step(ts) {
  if (!lastTime) lastTime = ts;
  const dt = (ts - lastTime) / 1000;
  lastTime = ts;
  if (playing && !motionReduced) {
    position += SPEED * dt;
    if (position > 1) position = 0;
  }
  render();
  animId = requestAnimationFrame(step);
}
```

### Data Configuration

Change `channels` array: each entry needs `duty` (0-1) and `color`. Adjust
`PERIOD_COUNT` for visible repetitions and `SPEED` for sweep rate.

---

## Pattern 2: Sequence Diagram

**Category:** Timing & Sequential | **Animation:** setTimeout discrete (phase stepping)

**When to use:** Multi-signal protocol transactions that step through discrete
phases (SPI, handshakes, request-response).

### HTML

```html
<div class="spi-viz" id="spiCanvas">
  <!-- Built dynamically: signal rows + phase labels -->
</div>
```

### Key CSS

```css
.spi-lifeline-row { display: flex; align-items: center; gap: 10px; height: 40px; }
.spi-label { font-family: var(--font-mono); font-size: 11px; width: 60px;
  text-align: right; }
.spi-track { flex: 1; height: 100%; position: relative; display: flex; }
.spi-segment { height: 100%; display: flex; align-items: center;
  justify-content: center; font-family: var(--font-mono); font-size: 9px;
  border-right: 1px dashed var(--border-color); transition: background 0.2s; }
.spi-segment.active { background: var(--copper-faint); }
.spi-phase-label { font-family: var(--font-mono); font-size: 10px;
  color: var(--text-dim); border-bottom: 2px solid transparent; }
.spi-phase-label.active { color: var(--copper);
  border-bottom-color: var(--copper); }
```

### JavaScript

```js
const phases = [
  { name: 'IDLE',  cs: 'H', clk: 'L', mosi: '-', miso: '-', dur: 1 },
  { name: 'CS LOW', cs: 'L', clk: 'L', mosi: '-', miso: '-', dur: 1 },
  // ... clock cycles with data bits
  { name: 'DONE',  cs: 'H', clk: 'L', mosi: '-', miso: '-', dur: 1 },
];
const lines = ['CS','CLK','MOSI','MISO'];
const lineKeys = ['cs','clk','mosi','miso'];
const lineColors = ['#ef4444','#d4924b','#60a5fa','#4ade80'];
let phaseIdx = 0;
const STEP_MS = 600;

function renderInit() { /* build signal rows + phase label row */ }

function render() {
  const phaseW = 100 / phases.length;
  lines.forEach((label, li) => {
    const key = lineKeys[li];
    let html = '';
    phases.forEach((ph, pi) => {
      const val = ph[key];
      const revealed = pi <= phaseIdx;
      let bg = revealed ? (val === 'H' || val === '1' ?
        lineColors[li] + '40' : 'rgba(0,0,0,0.3)') : 'transparent';
      html += `<div class="spi-segment${pi === phaseIdx ? ' active' : ''}"
        style="width:${phaseW}%;background:${bg};color:${lineColors[li]}">
        ${revealed ? val : ''}</div>`;
    });
    document.getElementById('spiTrack' + li).innerHTML = html;
  });
}

// Uses rAF but advances on elapsed time threshold (discrete)
function step(ts) {
  if (!lastTime) lastTime = ts;
  if (ts - lastTime >= STEP_MS && playing && !motionReduced) {
    lastTime = ts;
    phaseIdx = (phaseIdx + 1) % phases.length;
    render();
  }
  animId = requestAnimationFrame(step);
}
```

### Data Configuration

Define `phases` array where each entry has a name and signal values per line.
Add or remove signal lines by editing `lines`/`lineKeys`/`lineColors`.

---

## Pattern 3: Waveform Trace

**Category:** Timing & Sequential | **Animation:** rAF + Canvas 2D

**When to use:** Analog or digital waveforms with precise timing that need
smooth progressive drawing (oscilloscope-style).

### HTML

```html
<div class="i2c-viz">
  <div class="i2c-wave-row">
    <div class="i2c-label">SCL</div>
    <div class="i2c-canvas-wrap"><canvas id="i2cSclCanvas"></canvas></div>
  </div>
  <div class="i2c-wave-row">
    <div class="i2c-label">SDA</div>
    <div class="i2c-canvas-wrap"><canvas id="i2cSdaCanvas"></canvas></div>
  </div>
  <div class="i2c-phase-bar">
    <div class="i2c-label">Phase</div>
    <div class="i2c-phase-track" id="i2cPhaseTrack"></div>
  </div>
</div>
```

### Key CSS

```css
.i2c-wave-row { display: flex; align-items: center; gap: 10px; height: 50px; }
.i2c-canvas-wrap { flex: 1; height: 100%; position: relative; overflow: hidden; }
.i2c-canvas-wrap canvas { width: 100%; height: 100%; display: block; }
.i2c-phase-tag { font-family: var(--font-mono); font-size: 9px; padding: 2px 6px;
  border: 1px solid var(--border-color); color: var(--text-dim); }
.i2c-phase-tag.active { border-color: var(--green); color: var(--green);
  background: var(--green-faint); }
```

### JavaScript (core drawing function)

```js
const phases = [/* {name, scl, sda, len} entries built from protocol bits */];
let position = 0; // 0-1
const SPEED = 0.08;

function drawWave(canvasId, values, cursorFrac) {
  const canvas = document.getElementById(canvasId);
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * 2;  // retina
  canvas.height = rect.height * 2;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const totalLen = values.reduce((s, v) => s + v.len, 0);
  const cursorX = cursorFrac * canvas.width;
  const highY = canvas.height * 0.15;
  const lowY = canvas.height * 0.85;

  ctx.strokeStyle = color; // per-signal color
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let x = 0, first = true;
  values.forEach(v => {
    const segW = (v.len / totalLen) * canvas.width;
    const y = v.val ? highY : lowY;
    if (x > cursorX) return;
    const endX = Math.min(x + segW, cursorX);
    if (first) { ctx.moveTo(x, y); first = false; }
    else ctx.lineTo(x, y);
    ctx.lineTo(endX, y);
    x += segW;
  });
  ctx.stroke();

  // Dashed cursor line
  ctx.strokeStyle = '#d4924b'; ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(cursorX, 0); ctx.lineTo(cursorX, canvas.height);
  ctx.stroke(); ctx.setLineDash([]);
}
```

### Data Configuration

Build `phases` from protocol bit sequences. Each entry: `{name, scl, sda, len}`.
The phase bar is derived by grouping consecutive phases with the same label.

---

## Pattern 4: Gantt Timeline

**Category:** Timing & Sequential | **Animation:** rAF sweep

**When to use:** Sequential or overlapping time intervals (boot stages, task
scheduling, protocol timing).

### HTML

```html
<div class="gantt-viz" id="ganttCanvas">
  <!-- Built dynamically: rows with labels + tracks + bars, shared cursor -->
</div>
```

### Key CSS

```css
.gantt-row { display: flex; align-items: center; gap: 10px; height: 32px; }
.gantt-label { font-family: var(--font-mono); font-size: 11px; width: 110px;
  text-align: right; color: var(--text-secondary); }
.gantt-track { flex: 1; height: 100%; position: relative;
  border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); }
.gantt-bar { position: absolute; top: 3px; bottom: 3px; border-radius: 2px;
  opacity: 0.3; transition: opacity 0.3s; }
.gantt-bar.revealed { opacity: 0.9; }
.gantt-cursor { position: absolute; top: 0; bottom: 0; width: 2px;
  background: var(--copper); box-shadow: 0 0 8px var(--copper-glow);
  z-index: 10; }
.gantt-ms-display { font-family: var(--font-mono); font-size: 12px;
  color: var(--copper); text-align: center; margin-top: 6px; }
```

### JavaScript

```js
const stages = [
  { name: 'Stage A', start: 0,   end: 50,  color: '#ef4444' },
  { name: 'Stage B', start: 50,  end: 120, color: '#d4924b' },
  // ...
];
const MAX_UNITS = 420;
let position = 0;
const SPEED = 0.12;

function renderInit() {
  // Create rows: label + track with positioned bar (left/width as %)
  // Create shared cursor div and time axis
}

function render() {
  const currentUnit = position * MAX_UNITS;
  cursor.style.left = (labelW + position * trackW) + 'px';
  stages.forEach((s, i) => {
    bar.classList.toggle('revealed', currentUnit >= s.start);
  });
  msDisplay.textContent = Math.round(currentUnit) + ' ms';
}
```

### Data Configuration

Define `stages` with `name`, `start`, `end`, `color`. Set `MAX_UNITS` to the
total timeline range. Bars auto-position via percentage math.

---

## Pattern 5: State Machine

**Category:** Timing & Sequential | **Animation:** setTimeout discrete

**When to use:** Finite state machines with nodes, edges, and event-driven
transitions (protocol states, connection lifecycles).

### HTML

```html
<div class="fsm-viz" id="fsmCanvas">
  <!-- Built dynamically: SVG for edges, absolutely-positioned divs for nodes -->
</div>
<div class="fsm-event-log" id="eventLog">
  <span class="silkscreen">Event: </span>
  <span class="event-text" id="eventText">Waiting...</span>
</div>
```

### Key CSS

```css
.fsm-viz { position: relative; min-height: 300px; }
.fsm-node { position: absolute; padding: 10px 18px;
  border: 2px solid var(--border-color); border-radius: 4px;
  font-family: var(--font-mono); font-size: 12px; background: var(--bg-card);
  z-index: 2; transition: all 0.3s; }
.fsm-node.active { border-color: var(--green); color: var(--green);
  background: var(--green-faint);
  box-shadow: 0 0 16px var(--green-faint);
  animation: fsm-glow 1.5s infinite; }
.fsm-node.error-state.active { border-color: var(--red); color: var(--red);
  background: var(--red-faint); }
.fsm-svg { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.fsm-svg line.active { stroke: var(--green); stroke-width: 2;
  filter: drop-shadow(0 0 4px var(--green-glow)); }
```

### JavaScript

```js
const nodes = [
  { id: 'idle', label: 'IDLE', x: 50, y: 40 },
  // ...
];
const edges = [
  { from: 'idle', to: 'scanning', label: 'scan_start' },
  // ...
];
const scenario = [
  { state: 'idle', event: 'Initialized', duration: 1500 },
  { state: 'scanning', event: 'Scan complete', duration: 2000 },
  // ...
];
let scenarioIdx = 0, currentState = 'idle', stepElapsed = 0;

function renderInit() {
  // Create SVG with arrow markers (defs), draw edge lines
  // Create positioned node divs
}

function render() {
  nodes.forEach(n => {
    el.classList.toggle('active', n.id === currentState);
  });
  edges.forEach((e, i) => {
    const isActive = e.from === prevState && e.to === currentState;
    line.classList.toggle('active', isActive);
  });
  eventText.textContent = scenario[scenarioIdx].event;
}

function step(ts) {
  if (!lastTime) lastTime = ts;
  stepElapsed += ts - lastTime;
  lastTime = ts;
  if (playing && stepElapsed >= scenario[scenarioIdx].duration) {
    stepElapsed = 0;
    scenarioIdx = (scenarioIdx + 1) % scenario.length;
    currentState = scenario[scenarioIdx].state;
    render();
  }
  animId = requestAnimationFrame(step);
}
```

### Data Configuration

Define `nodes` (id, label, x, y pixel positions), `edges` (from, to), and a
`scenario` array of `{state, event, duration}` for auto-play sequencing.

---

## Pattern 6: Pipeline / FIFO (Ring Buffer)

**Category:** State & Flow | **Animation:** setTimeout discrete

**When to use:** Circular buffers, queues, producer-consumer relationships with
pointer math and overflow detection.

### HTML

```html
<div class="ring-buffer-wrap">
  <svg class="ring-buffer-svg" id="ringSvg" viewBox="0 0 260 260"></svg>
  <div class="ring-stats" id="ringStats">
    <div class="ring-stat-row">
      <span class="ring-stat-label">Head (W)</span>
      <span class="ring-stat-val" id="ringHead">0</span>
    </div>
    <!-- Tail, Used, Status rows -->
    <div class="ring-fill-bar">
      <div class="ring-fill-inner" id="ringFillBar" style="width:0%"></div>
    </div>
  </div>
</div>
```

### Key CSS

```css
.ring-buffer-wrap { display: flex; align-items: center; gap: 48px;
  min-height: 320px; }
.ring-cell { transition: fill 0.15s, stroke 0.15s; }
.ring-cell.occupied { fill: var(--green-faint); stroke: var(--green-dim); }
.ring-cell.overflow { fill: var(--red-faint); stroke: var(--red); }
.ring-fill-inner { height: 100%; background: var(--green);
  transition: width 0.15s; }
.ring-fill-inner.warn { background: var(--red); }
```

### JavaScript

```js
const SIZE = 16;
let head = 0, tail = 0, count = 0;
let cells = new Array(SIZE).fill(null);

function buildSvg() {
  const cx = 130, cy = 130, r = 95, cellR = 18;
  for (let i = 0; i < SIZE; i++) {
    const angle = (i / SIZE) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    // Create rect at (x-cellR, y-cellR) and centered text
  }
  // W and R pointer labels at inner radius
}

function write() {
  if (count >= SIZE) { overflow = true; return; }
  cells[head] = hexValue;
  head = (head + 1) % SIZE;
  count++;
  updateDisplay();
}

function read() {
  if (count <= 0) return;
  cells[tail] = null;
  tail = (tail + 1) % SIZE;
  count--;
  updateDisplay();
}

function phaseStep() {
  if (!playing) return;
  // Random write/read pattern with occasional burst
  const phase = Math.floor(Math.random() * 5);
  if (phase < 3) write(); else read();
  if (count < SIZE - 1 && Math.random() < 0.15) { write(); write(); }
  timerId = setTimeout(phaseStep, 400 + Math.random() * 300);
}
```

### Data Configuration

Set `SIZE` for cell count. Modify `phaseStep` probabilities for write vs read
frequency and burst behavior.

---

## Pattern 7: Lock Cycle

**Category:** State & Flow | **Animation:** setTimeout discrete

**When to use:** Multi-step protection/permission sequences (write-enable,
authentication, lock/unlock cycles).

### HTML

```html
<div class="lock-viz">
  <div class="lock-components">
    <div class="lock-box" id="lockApp">Application</div>
    <div class="lock-arrow" id="lockArrow">
      <div class="lock-arrow-text" id="lockArrowText">idle</div>
      <div class="lock-arrow-line">--------&gt;</div>
    </div>
    <div class="lock-box" id="lockFlash">Controller</div>
  </div>
  <div class="wel-indicator">
    <span class="silkscreen">Status Bit:</span>
    <div class="wel-bit" id="welBit">0</div>
    <span id="welLabel">PROTECTED</span>
  </div>
  <div class="lock-phase-log">
    <span class="silkscreen">Phase: </span>
    <span class="phase-text" id="lockPhaseText">Waiting...</span>
  </div>
</div>
```

### Key CSS

```css
.lock-box { border: 2px solid var(--border-color); padding: 16px 24px;
  font-family: var(--font-mono); font-size: 13px; background: var(--bg-card);
  transition: border-color 0.3s, box-shadow 0.3s; }
.lock-box.active { border-color: var(--green); color: var(--green);
  box-shadow: 0 0 12px var(--green-faint); }
.lock-box.rejected { border-color: var(--red); color: var(--red); }
.wel-bit.set { border-color: var(--green); color: var(--green);
  background: var(--green-faint); }
```

### JavaScript

```js
const lockPhases = [
  { text: 'Idle', app: '', flash: '', arrow: '', arrowText: 'idle', bit: false },
  { text: 'Sending enable cmd', app: 'active', flash: '', arrow: 'active',
    arrowText: 'ENABLE', bit: false },
  { text: 'Bit set - writable', app: '', flash: 'active', arrow: '',
    arrowText: 'ack', bit: true },
  // ... write, done, rejected, NACK phases
];
let phase = 0;

function render() {
  const p = lockPhases[phase];
  app.className = 'lock-box' + (p.app ? ` ${p.app}` : '');
  flash.className = 'lock-box' + (p.flash ? ` ${p.flash}` : '');
  arrow.className = 'lock-arrow' + (p.arrow ? ` ${p.arrow}` : '');
  welBit.classList.toggle('set', p.bit);
}

function stepForward() {
  if (!playing) return;
  phase = (phase + 1) % lockPhases.length;
  render();
  timerId = setTimeout(stepForward, phase === 0 ? 1500 : 1200);
}
```

### Data Configuration

Define `lockPhases` array. Each entry specifies visual state for both boxes,
arrow, the status bit, and descriptive text.

---

## Pattern 8: Bit Register

**Category:** State & Flow | **Animation:** User-driven click (optional auto mode)

**When to use:** Hardware register visualization, configuration bit fields,
flag/status displays where users toggle individual bits.

### HTML

```html
<div class="gpio-reg-viz">
  <div class="gpio-bits-row" id="gpioBitsRow"></div>
  <div class="gpio-preview" id="gpioPreview"></div>
</div>
```

### Key CSS

```css
.gpio-bit { display: flex; flex-direction: column; align-items: center; gap: 4px;
  cursor: pointer; user-select: none; }
.gpio-bit-box { width: 48px; height: 40px; border: 2px solid var(--border-color);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 16px; font-weight: 600;
  background: rgba(0,0,0,0.3); transition: all 0.15s; }
.gpio-bit-box.set { border-color: var(--copper); color: var(--copper);
  background: var(--copper-faint); box-shadow: 0 0 8px var(--copper-faint); }
```

### JavaScript

```js
const bitDefs = [
  { label: 'Mode[0]', group: 'mode' },
  { label: 'Mode[1]', group: 'mode' },
  // ... 8 bits total
];
let bits = [0, 0, 0, 0, 0, 0, 0, 0];

function buildUI() {
  // For each bit (MSB first): create gpio-bit with bit-num, bit-box, label
}

function toggleBit(i) {
  bits[i] = bits[i] ? 0 : 1;
  box.classList.toggle('set', bits[i] === 1);
  updatePreview();
}

function updatePreview() {
  const mode = (bits[1] << 1) | bits[0];
  // Decode all field groups, render preview panel with mode graphic
}

// Optional auto-mode: random bit toggles on timer
function autoStep() {
  const bit = Math.floor(Math.random() * 8);
  toggleBit(bit);
  autoId = setTimeout(autoStep, 600 + Math.random() * 800);
}
```

### Data Configuration

Define `bitDefs` with `label` and `group` per bit. The preview decoder maps
groups to human-readable names (e.g., mode 0 = Input, 1 = Output).

---

## Pattern 9: Memory Map

**Category:** Structural | **Animation:** Interactive click-to-expand

**When to use:** Address spaces, partition layouts, stacked region diagrams
where sub-regions expand on click (accordion behavior).

### HTML

```html
<div class="memmap-viz" id="memmapViz">
  <!-- Built dynamically: memmap-region + memmap-sub pairs -->
</div>
```

### Key CSS

```css
.memmap-region { display: flex; align-items: stretch;
  border-bottom: 1px solid var(--border-color); cursor: pointer; }
.memmap-addr { font-family: var(--font-mono); font-size: 10px; width: 130px;
  border-right: 1px solid var(--border-color); }
.memmap-bar { width: 16px; /* background: region color */ }
.memmap-sub { max-height: 0; overflow: hidden; transition: max-height 0.3s; }
.memmap-sub.expanded { max-height: 400px; }
.memmap-expand-icon { transition: transform 0.2s; }
.memmap-region.expanded .memmap-expand-icon { transform: rotate(90deg); }
.memmap-tooltip { position: absolute; bottom: 100%; opacity: 0; }
.memmap-region:hover .memmap-tooltip { opacity: 1; }
```

### JavaScript

```js
const regions = [
  { name: 'Region A', start: '0x00000', end: '0x0FFFF', size: '64 KB',
    color: 'var(--green)', subs: [
      { name: 'Sub-region 1', color: 'var(--green)' },
    ]},
  // ...
];

function buildViz() {
  // For each region: create row (addr + colored bar + info + expand icon)
  // For each region: create sub container with sub-rows
}

function toggle(idx) {
  // Close all first (accordion), then toggle target
  document.querySelectorAll('.memmap-region').forEach(r =>
    r.classList.remove('expanded'));
  document.querySelectorAll('.memmap-sub').forEach(s =>
    s.classList.remove('expanded'));
  if (!wasExpanded) { region.classList.add('expanded');
    sub.classList.add('expanded'); }
}
```

### Data Configuration

Define `regions` array with `name`, `start`, `end`, `size`, `color`, and `subs`
sub-array. Accordion behavior is built-in.

---

## Pattern 10: Tree / Hierarchy

**Category:** Structural | **Animation:** Interactive collapsible

**When to use:** File trees, component hierarchies, dependency graphs with
nested expand/collapse and leaf-node highlighting.

### HTML

```html
<div class="tree-viz" id="treeRoot"></div>
<div class="tree-dep-info" id="treeDepInfo">
  <div class="dep-title"></div>
  <div class="dep-body"></div>
</div>
```

### Key CSS

```css
.tree-node { position: relative; padding-left: 24px; }
.tree-node::before { content: ''; position: absolute; left: 8px; top: 0;
  bottom: 0; width: 1px; background: var(--border-color); }
.tree-item { display: flex; align-items: center; gap: 8px; padding: 5px 8px;
  cursor: pointer; }
.tree-toggle.open { transform: rotate(90deg); }
.tree-children { max-height: 0; overflow: hidden; transition: max-height 0.3s; }
.tree-children.open { max-height: 2000px; }
.tree-name.highlight { background: var(--copper-faint); color: var(--copper); }
```

### JavaScript

```js
const treeData = {
  name: 'root/', type: 'dir', children: [
    { name: 'src/', type: 'dir', children: [
      { name: 'main.c', type: 'file', deps: ['lib-a', 'lib-b'] },
    ]},
  ]
};

function treeBuild(node, parent, isRoot) {
  const div = createElement('div'); div.className = 'tree-node';
  const item = createElement('div'); item.className = 'tree-item';
  // Add toggle triangle, icon, name span
  if (hasChildren) {
    const children = createElement('div');
    children.className = 'tree-children' + (isRoot ? ' open' : '');
    node.children.forEach(c => treeBuild(c, children, false));
    item.addEventListener('click', () => {
      toggle.classList.toggle('open');
      children.classList.toggle('open');
    });
  } else {
    item.addEventListener('click', () => treeHighlight(node, nameEl));
  }
}
```

### Data Configuration

Nested object with `name`, `type` (dir/file/managed), optional `children`
array, and `deps` on leaf nodes for dependency highlighting.

---

## Pattern 11: Block Diagram

**Category:** Structural | **Animation:** rAF pulse (CSS Grid + SVG)

**When to use:** System architecture diagrams with interconnected blocks,
animated data flow pulses, click-to-highlight connections.

### HTML

```html
<div class="viz-canvas" style="padding: 0; position: relative;">
  <div class="block-viz" id="blockGrid"></div>
  <svg class="block-svg-overlay" id="blockSvg"></svg>
</div>
<div class="block-legend">
  <div class="block-legend-item">
    <span class="block-legend-swatch" style="background:var(--copper)"></span>
    Bus A
  </div>
  <!-- more legend items -->
</div>
```

### Key CSS

```css
.block-viz { display: grid; grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(5, 1fr); gap: 12px; padding: 16px;
  min-height: 420px; position: relative; }
.block-component { display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  border: 2px solid var(--border-color); cursor: pointer; z-index: 2; }
.block-component.highlighted { border-color: var(--copper);
  background: var(--copper-faint); }
.block-component.dimmed { opacity: 0.25; }
.block-svg-overlay { position: absolute; inset: 0; z-index: 1;
  pointer-events: none; }
.block-pulse { r: 4; filter: drop-shadow(0 0 4px currentColor); }
```

### JavaScript

```js
const COMPONENTS = [
  { id: 'cpu', label: 'CPU', col: '1/3', row: '1/2' },
  // ...
];
const CONNECTIONS = [
  { from: 'cpu', to: 'mem', bus: 'ahb' },
  // ...
];
const BUS_COLORS = { apb: 'var(--copper)', ahb: 'var(--blue)' };
let pulses = [], selectedId = null;

function buildViz() {
  COMPONENTS.forEach(c => {
    el.style.gridColumn = c.col; el.style.gridRow = c.row;
    el.addEventListener('click', () => select(c.id));
  });
}

function drawLines() {
  // SVG lines between component centers (getBoundingClientRect math)
  // Apply highlighted/dimmed classes based on selectedId
}

function select(id) {
  selectedId = selectedId === id ? null : id;
  // Highlight connected components, dim others
  drawLines();
}

function step(ts) {
  // Spawn random pulses: pulses.push({connIdx, t: 0, bus})
  // Advance: p.t += dt * 0.8; filter p.t <= 1
  // Render circles along connection lines at interpolated position
}
```

### Data Configuration

Define `COMPONENTS` with grid positions and `CONNECTIONS` with bus types.
`BUS_COLORS` maps bus names to colors. Grid dimensions set in CSS.

---

## Pattern 12: Split-Core (Parallel Lanes)

**Category:** Structural | **Animation:** rAF continuous (scrolling)

**When to use:** Dual-lane or multi-lane parallel execution (multi-core, pipeline
stages, producer/consumer with visual task scrolling).

### HTML

```html
<div class="split-viz">
  <div class="split-lane">
    <div class="split-lane-header core0">Core 0 - Lane A</div>
    <div class="split-lane-body" id="splitLane0"></div>
  </div>
  <div class="split-lane">
    <div class="split-lane-header core1">Core 1 - Lane B</div>
    <div class="split-lane-body" id="splitLane1"></div>
  </div>
</div>
<div class="split-shared" id="splitShared">Shared Memory - idle</div>
```

### Key CSS

```css
.split-viz { display: flex; gap: 12px; min-height: 360px; }
.split-lane { flex: 1; border: 1px solid var(--border-color); overflow: hidden; }
.split-lane-header { font-family: var(--font-mono); font-size: 12px;
  font-weight: 600; text-align: center; padding: 8px 12px; }
.split-lane-header.core0 { color: var(--blue); background: var(--blue-faint); }
.split-lane-header.core1 { color: var(--green); background: var(--green-faint); }
.split-task { position: absolute; left: 8px; right: 8px; height: 32px;
  border-radius: 3px; font-family: var(--font-mono); font-size: 10px;
  transition: top 0.05s linear; }
.split-shared.flash { border-color: var(--copper); color: var(--copper);
  background: var(--copper-faint); }
```

### JavaScript

```js
let tasks0 = [], tasks1 = [], taskId = 0;
const LANE_HEIGHT = 300;
const TASK_TYPES_A = ['type-a1', 'type-a2'];
const TASK_TYPES_B = ['type-b1', 'type-b2'];

function spawnA() {
  tasks0.push({ id: taskId++, y: -40,
    type: TASK_TYPES_A[Math.floor(Math.random() * 2)],
    speed: 60 + Math.random() * 30 });
}

function step(ts) {
  // Move tasks: t.y += t.speed * dt
  // Remove exited: filter t.y < LANE_HEIGHT
  // Spawn on timer: every 0.8s for lane A, 0.5s for lane B
  // Cross-lane flash: random chance sets sharedTimer
}

function render() {
  // Create/update DOM elements for each task in each lane
  // Toggle .flash on shared element when sharedTimer > 0
}
```

### Data Configuration

Define task types per lane with CSS class and label. Adjust spawn intervals
and scroll speed per lane.

---

## Pattern 13: Live Gauge / Meter

**Category:** Data Patterns | **Animation:** rAF continuous (SVG arc + needle)

**When to use:** Real-time value display with zones (voltage, temperature,
pressure, any single-value metric with safe/warning/danger ranges).

### HTML

```html
<div class="gauge-viz">
  <div class="gauge-svg-wrap">
    <svg id="gaugeSvg" viewBox="0 0 280 180"></svg>
  </div>
  <div class="gauge-readout">
    <div class="gauge-readout-item">
      <span class="gauge-readout-val" id="gaugeVolts">0.00</span>
      <span class="gauge-readout-label">Value</span>
    </div>
    <div class="gauge-readout-item">
      <span class="gauge-readout-val" id="gaugeRaw">0</span>
      <span class="gauge-readout-label">Raw</span>
    </div>
  </div>
</div>
```

### Key CSS

```css
.gauge-svg-wrap { width: 280px; height: 180px; }
.gauge-readout { display: flex; gap: 24px; font-family: var(--font-mono); }
.gauge-readout-val { font-size: 24px; font-weight: 600; }
.gauge-readout-label { font-size: 10px; color: var(--text-dim);
  text-transform: uppercase; }
```

### JavaScript

```js
const MIN_ANGLE = -135, MAX_ANGLE = 135;
const CX = 140, CY = 150, R = 110;
let currentAngle = MIN_ANGLE, targetAngle = MIN_ANGLE, time = 0;

function angleToXY(deg, r) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function buildSvg() {
  const valToAngle = v => MIN_ANGLE + (v / MAX_VAL) * (MAX_ANGLE - MIN_ANGLE);
  const zones = [
    { from: 0, to: 1.0, color: 'var(--green-dim)' },
    { from: 1.0, to: 2.5, color: '#d4924b' },
    { from: 2.5, to: 3.3, color: 'var(--red-dim)' },
  ];
  // Draw: tick marks, major tick labels, colored arc paths,
  // threshold marker, center pivot, needle line
}

function step(ts) {
  time += dt;
  // Simulated signal: sine wave + noise
  const val = Math.sin(time * 0.8) * 0.5 + 0.5;
  targetAngle = MIN_ANGLE + (val / MAX_VAL) * (MAX_ANGLE - MIN_ANGLE);
  // Smooth interpolation
  currentAngle += (targetAngle - currentAngle) * Math.min(1, dt * 8);
  // Update needle endpoint and readout values
}
```

### Data Configuration

Set `zones` array with value ranges and colors. `MAX_VAL` defines the gauge
scale. Adjust the signal function for different data shapes (sine, random walk,
stepped).

---

## Pattern 14: Packet Anatomy

**Category:** Data Patterns | **Animation:** Hover-driven + click-to-expand

**When to use:** Protocol packet/frame layouts, binary data structures, any
horizontal byte-field diagram with detail drill-down.

### HTML

```html
<div class="packet-viz">
  <div class="packet-fields" id="packetFields"></div>
  <div class="packet-expand" id="packetExpand"></div>
</div>
```

### Key CSS

```css
.packet-fields { display: flex; border: 1px solid var(--border-color);
  overflow: hidden; cursor: pointer; }
.packet-field { display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 12px 4px; font-family: var(--font-mono);
  font-size: 10px; border-right: 1px solid var(--border-color);
  min-height: 64px; transition: all 0.15s; }
.packet-field:hover { filter: brightness(1.3);
  box-shadow: inset 0 0 16px rgba(255,255,255,0.05); }
.packet-tooltip { position: absolute; bottom: calc(100% + 8px); opacity: 0;
  transition: opacity 0.15s; }
.packet-field:hover .packet-tooltip { opacity: 1; }
.packet-expand { display: none; border: 1px solid var(--border-color);
  padding: 12px 16px; }
.packet-expand.visible { display: block; }
.packet-byte { width: 32px; height: 24px; border: 1px solid var(--border-color);
  font-size: 10px; }
```

### JavaScript

```js
const FIELDS = [
  { name: 'Header', bytes: 2, color: 'var(--blue-faint)',
    borderColor: 'var(--blue-dim)',
    tooltip: 'Packet header with type and length',
    detail: [{ label: 'Type', hex: '00' }, { label: 'Len', hex: '17' }] },
  // ... more fields
];
let activeField = null;

function buildViz() {
  const total = FIELDS.reduce((s, f) => s + f.bytes, 0);
  FIELDS.forEach((f, i) => {
    // Flex: f.bytes proportional width
    // Each field div has tooltip, name, byte count
  });
}

function click(idx) {
  if (activeField === idx) { activeField = null; expand.hide(); return; }
  activeField = idx;
  // Show byte grid with hex values from f.detail
  expand.show();
}
```

### Data Configuration

Define `FIELDS` with `name`, `bytes`, `color`, `borderColor`, `tooltip`, and
`detail` (array of `{label, hex}` for byte-level expansion).

---

## Pattern 15: Truth Table

**Category:** Data Patterns | **Animation:** User-driven select inputs

**When to use:** Pin assignment tables, logic truth tables, configuration
matrices with conflict detection and visual feedback (SVG pinout).

### HTML

```html
<div class="truth-viz">
  <div class="truth-table-wrap">
    <table class="truth-table">
      <thead><tr><th>Signal</th><th>Pin</th><th>Function</th>
        <th>Result</th><th>Conflict?</th></tr></thead>
      <tbody id="truthBody"></tbody>
    </table>
  </div>
  <div class="truth-pinout">
    <svg class="truth-pinout-svg" id="truthPinSvg" viewBox="0 0 200 260"></svg>
  </div>
</div>
```

### Key CSS

```css
.truth-table { width: 100%; border-collapse: collapse;
  font-family: var(--font-mono); font-size: 12px; }
.truth-table th { color: var(--copper);
  border-bottom: 2px solid var(--copper-dim); text-transform: uppercase; }
.truth-table tr.conflict td { background: var(--red-faint); }
.truth-table select { background: rgba(0,0,0,0.4);
  border: 1px solid var(--border-color); font-family: var(--font-mono); }
.truth-pin-label.assigned { fill: var(--copper); font-weight: 600; }
```

### JavaScript

```js
const SIGNALS = [
  { signal: 'SPI CLK', pin: 18, func: 'Direct', funcNum: 0 },
  // ...
];
const AVAILABLE_PINS = [0, 1, 2, 3, 4, 5, /* ... */];
let assignments = SIGNALS.map(s => ({ ...s }));

function render() {
  // Detect conflicts: group by pin, flag duplicates
  const pinUsage = {};
  assignments.forEach((a, i) => {
    if (!pinUsage[a.pin]) pinUsage[a.pin] = [];
    pinUsage[a.pin].push(i);
  });
  // Build rows with select dropdowns and conflict indicators
  renderPinout();
}

function changePin(idx, val) {
  assignments[idx].pin = parseInt(val);
  render();
}

function renderPinout() {
  // SVG chip body rect with pin rects on left/right sides
  // Assigned pins get copper highlight and signal label
}
```

### Data Configuration

Define `SIGNALS` with default pin assignments and function types.
`AVAILABLE_PINS` lists valid options for dropdowns. Conflict detection is
automatic based on duplicate pin assignments.
