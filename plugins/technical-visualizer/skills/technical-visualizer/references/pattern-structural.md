# Structural Patterns

Implementation details for patterns that visualize architecture, memory layout, and component relationships.

## 9. Memory Map

**Use when:** Address space visualization — flash partitions, RAM layout, peripheral registers, stack/heap.

**Animation approach:** None (purely interactive click-to-expand).

**Structure:**
- Vertical stack of colored address ranges
- Each region shows: address range, name, size
- Click to expand sub-regions
- Hover shows tooltip with details

**Implementation:**
- Data structure: array of regions with start, end, name, color, optional children
- Render as stacked divs with height proportional to address range (or fixed for readability)
- Click handler toggles children visibility with slide animation
- No animation loop needed

**Visual spec:**
- Regions: Full-width colored bars, left-aligned address labels
- Colors: Different accent per memory type (SRAM=green, Flash=amber, Peripherals=copper, RTC=red)
- Expanded: Sub-regions appear indented with connecting line
- Address format: `0x3FF00000` mono font
- Size label: Human-readable (e.g., "512 KB")

## 10. Tree/Hierarchy

**Use when:** Parent-child relationships — file trees, component dependencies, device trees, class hierarchies.

**Animation approach:** None (purely interactive expand/collapse).

**Structure:**
- Indented tree with expand/collapse toggles
- CSS connector lines (border-left + ::before pseudo-elements)
- Click leaf nodes to highlight dependency paths
- Optional info panel showing details of selected node

**Implementation:**
- Build DOM recursively from data structure
- Toggle visibility of `.tree-children` containers
- Use CSS `border-left` for vertical connector lines
- `::before` pseudo-elements for horizontal branch lines

**Visual spec:**
- Toggle icon: ▶ (collapsed) / ▼ (expanded), copper color
- Node labels: Mono font, files get file-type icon
- Connector lines: `var(--border-color)`, 1px solid
- Selected node: Copper background highlight
- Directory: Bold, slightly larger font

## 11. Block Diagram

**Use when:** System architecture with data flow — SoC internals, bus topology, network architecture.

**Animation approach:** `requestAnimationFrame` for animated data pulses along connection lines.

**Structure:**
- Component blocks positioned via CSS grid or absolute positioning
- SVG overlay for connection lines between blocks
- Animated dots/pulses traveling along connections
- Click a block to highlight its connections (dim others)
- Legend showing connection types

**Implementation:**
```javascript
// Connection lines: SVG <line> or <path> elements
// Pulses: Small circles animated along the path
// Use rAF to move pulse positions along connection paths

function step(timestamp) {
  pulses.forEach(pulse => {
    pulse.progress += delta * pulse.speed;
    if (pulse.progress >= 1) {
      // Respawn or remove
    }
    // Interpolate position along connection path
    const x = lerp(pulse.startX, pulse.endX, pulse.progress);
    const y = lerp(pulse.startY, pulse.endY, pulse.progress);
    pulse.element.setAttribute('cx', x);
    pulse.element.setAttribute('cy', y);
  });
}
```

**Visual spec:**
- Blocks: Component-box style with label, optional sub-labels for pins
- Connections: Colored by bus type (APB=copper, AHB=blue, direct=green)
- Pulses: Small circles (4-6px radius) matching connection color with glow
- Selected block: Brighter border, unrelated blocks dim to 40% opacity
- Legend: Small color-coded key at bottom

**Gotcha:** Recalculate SVG line positions on window resize.

## 12. Split-Core

**Use when:** Parallel processing — multi-core execution, pipeline stages, SIMD, concurrent tasks.

**Animation approach:** `requestAnimationFrame` with independent animations per lane.

**Structure:**
- Two (or more) vertical lanes side by side
- Each lane processes items independently
- Shared memory block between lanes (optional)
- Items move through each lane at different rates
- Cross-core access highlighted when it occurs

**Implementation:**
- Each lane has its own item queue and processing speed
- Items spawn at top, move downward through processing stages
- When an item reaches the bottom, it completes and a new one spawns
- Shared memory access: Flash the shared block with accent when accessed

**Visual spec:**
- Lanes: Equal-width columns with header (Core 0 / Core 1)
- Items: Small colored rectangles with labels (packet types, sample values)
- Processing stages: Horizontal dividers within each lane
- Shared memory: Centered block between lanes with border
- Cross-core flash: Brief glow animation on shared memory
