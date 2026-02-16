# State & Flow Patterns

Implementation details for patterns that visualize state transitions and data movement.

## 5. State Machine

**Use when:** Finite state machine visualization — WiFi states, protocol FSMs, task lifecycles, connection states.

**Animation approach:** `setTimeout` phase-based. Discrete transitions, not continuous.

**Structure:**
- Nodes positioned in a logical layout (usually 2 rows of 3, or circular)
- SVG or CSS arrows connecting nodes showing valid transitions
- Active node glows/pulses with accent color
- Event log showing transition history
- Auto-plays a predefined scenario on loop

**Implementation:**
```javascript
const SCENARIO = [
  { from: 'IDLE', to: 'SCANNING', event: 'wifi_start', delay: 1500 },
  { from: 'SCANNING', to: 'CONNECTING', event: 'ap_found', delay: 1200 },
  // ...
];
let scenarioIndex = 0;

function step() {
  if (!playing || motionReduced) return;
  const transition = SCENARIO[scenarioIndex];
  // Deactivate old node, activate new node
  // Highlight the transition arrow briefly
  // Log the event
  scenarioIndex = (scenarioIndex + 1) % SCENARIO.length;
  animId = setTimeout(step, transition.delay);
}
```

**Known issue:** Arrow tangles. With >4 nodes and many cross-connections, SVG arrows overlap in the center. Mitigation:
- Use curved paths (`<path>` with arc) instead of straight lines
- Offset parallel arrows
- Consider manual anchor points per edge rather than center-to-center
- Or use layout where common paths don't cross (e.g., linear flow top row, error/reset paths on bottom)

**Visual spec:**
- Nodes: Rounded rectangles with border, label centered
- Active node: Accent border + glow + pulse animation
- Arrows: SVG `<path>` with arrowhead markers
- Active arrow: Brighter color, thicker stroke briefly
- Event log: Mono font, scrolling, newest at top

## 6. Pipeline/FIFO

**Use when:** Data flowing through stages — queues, ring buffers, packet processing chains.

**Animation approach:** `setTimeout` phase-based for discrete push/pop operations.

**Structure (Ring Buffer variant):**
- Circular arrangement of cells (12-16)
- Head (write) and tail (read) pointers as labeled indicators
- Cells colored when occupied, empty when free
- Fill level indicator (percentage or bar)
- Overflow/underflow detection with visual alert

**Implementation:**
```javascript
const RING_SIZE = 16;
let head = 0, tail = 0, count = 0;
const cells = new Array(RING_SIZE).fill(null);

function produce() {
  if (count >= RING_SIZE) { /* overflow! */ return; }
  cells[head] = generateValue();
  head = (head + 1) % RING_SIZE;
  count++;
  render();
}

function consume() {
  if (count <= 0) { /* underflow! */ return; }
  cells[tail] = null;
  tail = (tail + 1) % RING_SIZE;
  count--;
  render();
}
```

**Visual spec:**
- SVG ring with cells as arc segments or positioned rectangles
- Head pointer: Arrow/indicator in accent color (write direction)
- Tail pointer: Different accent (read direction)
- Occupied cells: Filled with data color, show hex value
- Empty cells: Dim border only
- Fill bar: Green→amber→red gradient based on percentage

## 7. Lock Cycle

**Use when:** Resource contention — mutex acquire/release, flash write protection, semaphore operations.

**Animation approach:** `setTimeout` phase-based with discrete state transitions.

**Structure:**
- Two or more component boxes representing actors (Application, Controller, etc.)
- A shared resource with lock/unlock indicator
- Phase sequence: request → acquire → use → release
- Show rejection when attempting access without permission

**Visual spec:**
- Component boxes: Schematic style with pin stubs
- Lock indicator: Toggle/LED element (green=unlocked, red=locked)
- Phase arrows: Animated between components
- Rejected attempt: Red flash, X indicator
- Phase log: Shows sequence of operations

## 8. Bit Register

**Use when:** Toggleable bit flags — GPIO config registers, status registers, configuration words.

**Animation approach:** Interactive (click-driven). Optional auto-mode with `setTimeout` for demo.

**Structure:**
- Row of bit cells (8, 16, or 32 bits)
- Each bit clickable with label
- Bit groups have function labels (e.g., bits [1:0] = Mode)
- Preview panel shows the effect of current bit configuration
- Optional auto-mode that randomly toggles bits

**Visual spec:**
- Bit cells: Fixed-width squares, mono font, border
- Set bit (1): Accent background, bright text
- Clear bit (0): Dark background, dim text
- Group labels: Above the register, spanning their bits
- Preview: Component-style box showing the configured result
