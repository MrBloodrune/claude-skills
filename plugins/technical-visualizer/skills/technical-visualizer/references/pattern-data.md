# Data Patterns

Implementation details for patterns that visualize values, packet structures, and configuration mappings.

## 13. Live Gauge/Meter

**Use when:** Displaying a single value with range and thresholds — ADC readings, signal strength, temperature, voltage.

**Animation approach:** `requestAnimationFrame` with smooth interpolation.

**Structure:**
- SVG circular arc gauge (180° or 270°)
- Needle rotates to indicate current value
- Arc segments colored by zone (safe, warning, danger)
- Digital readout below showing numeric value
- Threshold marker lines on the arc

**Implementation:**
```javascript
let targetValue = 0;
let displayValue = 0;
const SMOOTHING = 0.08; // Interpolation factor

function step(timestamp) {
  // Generate simulated data (sine + noise)
  targetValue = baseSine(timestamp) + noise();

  // Smooth interpolation
  displayValue += (targetValue - displayValue) * SMOOTHING;

  // Rotate needle
  const angle = valueToAngle(displayValue);
  needle.setAttribute('transform', `rotate(${angle}, cx, cy)`);

  // Update digital readout
  readout.textContent = displayValue.toFixed(2) + 'V';
}
```

**Visual spec:**
- Arc: SVG `<path>` with stroke, 8-12px stroke-width
- Zones: Green (safe), amber (warning), red (danger)
- Needle: Line from center to arc edge, copper color with glow
- Center dot: Small copper circle
- Readout: Large mono font below gauge
- Threshold marker: Thin line on arc with label

## 14. Packet Anatomy

**Use when:** Showing byte-field structure — BLE advertisements, Ethernet frames, MQTT packets, USB descriptors.

**Animation approach:** None (purely interactive hover/click).

**Structure:**
- Horizontal row of colored fields, width proportional to byte count
- Hover: Highlight field, show tooltip with byte values and description
- Click: Expand field below to show individual bytes/bits
- Total byte count shown at the end

**Implementation:**
```javascript
const fields = [
  { name: 'Preamble', bytes: 1, color: '--text-dim', hex: '0xAA' },
  { name: 'Access Address', bytes: 4, color: '--blue', hex: '0x8E89BED6' },
  // ...
];

// Render: flexbox row, each field width = (bytes / totalBytes * 100)%
// Hover: Show tooltip positioned above field
// Click: Insert expansion row below with per-byte breakdown
```

**Visual spec:**
- Fields: Colored blocks with name label inside (if wide enough) or above
- Hover: Field gets brighter border + glow, tooltip appears
- Tooltip: Dark bg, shows field name, byte offset, hex values, description
- Expanded view: Per-byte or per-bit cells below the main row
- Color coding: Headers=blue, addresses=green, payload=amber, check=red, padding=dim

## 15. Truth Table

**Use when:** Input→output mappings — GPIO multiplexing, logic gates, decoder tables, configuration matrices.

**Animation approach:** None (purely interactive).

**Structure:**
- HTML table with input and output columns
- Dropdowns or buttons for user to change input values
- Active/matching row highlighted
- Conflict detection (e.g., two signals on same pin) with red highlight
- Optional diagram showing the result of current selection

**Implementation:**
```javascript
const mappings = [
  { signal: 'SPI CLK', pin: 18, func: 6, result: 'VSPICLK' },
  { signal: 'I2C SDA', pin: 21, func: 0, result: 'GPIO21' },
  // ...
];

function render() {
  // Rebuild table rows
  // Check for pin conflicts
  const pinCounts = {};
  mappings.forEach(m => {
    pinCounts[m.pin] = (pinCounts[m.pin] || 0) + 1;
  });
  // Highlight rows where pinCounts[pin] > 1
}

function changePin(index, newPin) {
  mappings[index].pin = newPin;
  render();
  renderPinout(); // Update chip diagram
}
```

**Visual spec:**
- Table: Mono font, dark bg, copper header row
- Input columns: Dropdowns styled to match theme
- Conflict row: Red border + red-faint background
- Active row: Copper-faint background on hover
- Pinout diagram: Simplified chip outline with labeled pins
- Conflict pins: Red highlight on the chip diagram
