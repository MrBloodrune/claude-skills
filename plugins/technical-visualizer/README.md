# Technical Visualizer

Interactive educational visualization builder for technical topics. Generates single-file HTML pages with animated diagrams, progressive disclosure, and a PCB schematic aesthetic.

## What It Does

When triggered, the skill guides Claude through:
1. Identifying which visualization patterns fit the topic
2. Loading the exact CSS spec, layout conventions, and animation rules
3. Generating a self-contained HTML page with interactive visualizations

## 15 Visualization Patterns

**Timing & Sequential:** Playhead/Sweep, Sequence Diagram, Waveform Trace, Gantt Timeline

**State & Flow:** State Machine, Pipeline/FIFO, Lock Cycle, Bit Register

**Structural:** Memory Map, Tree/Hierarchy, Block Diagram, Split-Core

**Data:** Live Gauge/Meter, Packet Anatomy, Truth Table

## Trigger Phrases

- "educational website", "interactive guide", "technical visualization"
- "interactive tutorial", "visualization page", "visual explainer"
- "animated diagram", "educational page", "technical education"

## Output

Single HTML file, all CSS/JS inline, no frameworks. Vanilla JS with `requestAnimationFrame` animations, `IntersectionObserver` lifecycle, reduced motion support, and full keyboard accessibility.

## Theme

PCB/EDA schematic — dark navy background, copper/gold accents, JetBrains Mono + Instrument Sans typography, glassmorphic sidebar, terminal-style modals.
