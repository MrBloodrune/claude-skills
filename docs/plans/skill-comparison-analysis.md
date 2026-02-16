# Skill Comparison Analysis: Technical Visualizer vs Anthropic Frontend-Design

**Date:** 2026-02-16
**Purpose:** Understand the current state of technical-visualizer, compare structural patterns with Anthropic's frontend-design skill, and identify gaps.

---

## Current Technical Visualizer Skill

### File Structure

```
plugins/technical-visualizer/
├── .claude-plugin/
│   └── plugin.json                          # Name, version 1.0.0, description, metadata
├── README.md                                # Public-facing summary
└── skills/technical-visualizer/
    ├── SKILL.md                             # Main skill instruction file (~116 lines)
    └── references/
        ├── theme-pcb-schematic.md           # Complete CSS variable spec (~218 lines)
        ├── infrastructure.md                # Layout, nav, modals, observers (~212 lines)
        ├── pattern-timing.md                # Patterns 1-4 implementation (~164 lines)
        ├── pattern-state.md                 # Patterns 5-8 implementation (~133 lines)
        ├── pattern-structural.md            # Patterns 9-12 implementation (~123 lines)
        ├── pattern-data.md                  # Patterns 13-15 implementation (~124 lines)
        └── known-issues.md                  # Bugs, fixes, lessons (~56 lines)
```

Total reference material: ~1,046 lines across 7 reference files, plus the 116-line SKILL.md.

### What SKILL.md Currently Instructs

The skill file has these sections:

1. **YAML Frontmatter** -- Trigger phrases and one-line description
2. **Process** (5 steps) -- Topic identification, pattern selection, reference loading, generation, known-issues check
3. **Pattern Catalog** -- 4 tables (Timing, State, Structural, Data) listing all 15 patterns with columns: number, name, use-when, animation approach
4. **Hard Rules** -- Non-negotiable rules covering animation (rAF, delta-time, playhead), lifecycle (IntersectionObserver, reduced motion, ARIA), naming conventions, and output constraints
5. **Theme** -- Brief summary pointing to `theme-pcb-schematic.md`
6. **Layout** -- Brief summary pointing to `infrastructure.md`
7. **Before Shipping** -- 5-item checklist

### Patterns and Components Described

All 15 patterns are cataloged in SKILL.md with brief table entries. The full implementation details live in the reference files:

- **pattern-timing.md**: Playhead/Sweep (with full JS code), Sequence Diagram, Waveform Trace, Gantt Timeline
- **pattern-state.md**: State Machine (with scenario loop code), Pipeline/FIFO (with ring buffer code), Lock Cycle, Bit Register
- **pattern-structural.md**: Memory Map, Tree/Hierarchy, Block Diagram (with pulse animation code), Split-Core
- **pattern-data.md**: Live Gauge (with interpolation code), Packet Anatomy (with field rendering code), Truth Table (with conflict detection code)

Each pattern reference includes: use-when, animation approach, structure description, implementation code, visual spec, and gotchas (where relevant).

### CSS Guidance

The `theme-pcb-schematic.md` file provides:
- Google Fonts link snippet (JetBrains Mono + Instrument Sans)
- Complete `:root` CSS custom properties block (79 lines of variables)
- Color semantics table with four variants per color (base, dim, glow, faint)
- Typography specs (body, code, section labels, card titles, pattern labels, index numbers)
- Visual motif CSS snippets: copper trace grid, solder pad dots, silkscreen labels, component boxes
- Sidebar glassmorphism CSS
- Modal window CSS with entry animation
- Code block CSS with syntax highlighting color map

### Examples Included

The skill includes inline JavaScript code examples in the reference files:
- Playhead/Sweep: Full step/render loop (~30 lines)
- Sequence diagram: Phase array structure and step function
- Gantt timeline: Bar rendering with time-based reveal
- State machine: Scenario-driven setTimeout loop
- Ring buffer: produce/consume with pointer math
- Block diagram: Pulse animation along SVG paths
- Gauge: Smooth interpolation with rAF
- Packet anatomy: Field rendering with flexbox
- Truth table: Conflict detection with pin counting

The `infrastructure.md` provides HTML structure examples for: page skeleton, section cards, viz containers, modals, category headers, scroll-synced nav, IntersectionObserver setup, and the init function.

---

## Anthropic Frontend-Design Skill (Structural Reference)

### File Structure

```
plugins/frontend-design/
├── .claude-plugin/
│   └── plugin.json          # Name, author (Anthropic), description
├── README.md                # Public summary with usage examples
└── skills/frontend-design/
    └── SKILL.md             # Single monolithic skill file (~42 lines of content)
```

No reference files. Everything lives in a single SKILL.md.

### Sections

1. **YAML Frontmatter** -- Name, description, license reference
2. **Introductory paragraph** -- What the skill does and when it activates
3. **Design Thinking** (4 bullets) -- Purpose, Tone, Constraints, Differentiation
4. **Implementation quality list** -- 4 bullets on what code should be
5. **Frontend Aesthetics Guidelines** -- 5 focus areas with detailed guidance
6. **Anti-patterns (NEVER)** -- Explicit list of generic AI aesthetics to avoid
7. **Creative mandate** -- Closing paragraph encouraging bold choices

### How It Describes Patterns

Frontend-design does not use a pattern catalog. Instead it provides:
- **Design thinking framework** -- A pre-coding mental checklist (purpose, tone, constraints, differentiation)
- **Aesthetic dimensions** -- Typography, Color & Theme, Motion, Spatial Composition, Backgrounds & Visual Details
- Each dimension gets a paragraph of guidance with specific examples and techniques

### How It Provides Examples

- Inline examples within prose (font names to avoid, color schemes to avoid, techniques to use)
- No code snippets at all
- The README provides 3 one-line prompt examples showing how users trigger the skill
- References an external cookbook notebook for extended guidance

### Level of Detail

Relatively high-level and philosophical. It describes *what to aim for* and *what to avoid* rather than providing implementation code. The entire skill fits in ~42 lines of substantive content. It relies on Claude's general frontend knowledge to fill in implementation details.

### Best Practices vs Anti-Patterns

Explicitly handled:
- **Best practices:** Bold aesthetic choices, distinctive typography, CSS variables, high-impact animations, scroll-triggering, staggered reveals
- **Anti-patterns:** Listed under a "NEVER" block -- Inter/Roboto/Arial fonts, purple gradients on white, predictable layouts, cookie-cutter design, converging on the same fonts across generations

The contrast between "do this" and "never do this" is one of the strongest structural elements.

---

## Gap Analysis

### Structural Patterns Worth Adopting

| Frontend-Design Pattern | Status in Technical-Visualizer | Recommendation |
|------------------------|-------------------------------|----------------|
| Design thinking pre-flight | Missing entirely | Add a "Before Building" section -- topic analysis, audience, which concepts need animation vs static display |
| Anti-patterns / NEVER list | Partially covered in "Hard Rules" but only for animation | Add explicit anti-pattern section for common generation failures |
| Creative mandate / philosophy | Missing | Not needed -- technical-visualizer is prescriptive, not creative |
| External reference links | Frontend-design links to a cookbook | Consider linking to the reference implementations mentioned in the design doc |

### Where Technical-Visualizer Lacks Specificity

1. **Pattern selection guidance is weak.** The SKILL.md says "Pick 4-8 patterns" but gives no guidance on *how* to decide which patterns fit a topic. Frontend-design's "Design Thinking" section (Purpose, Tone, Constraints, Differentiation) provides a structured pre-flight. Technical-visualizer needs an equivalent: "What concepts in this topic are time-based? What's hierarchical? What has state transitions?" -- a mapping from topic characteristics to pattern categories.

2. **No anti-pattern catalog.** The "Hard Rules" say what to do but don't enumerate common failure modes beyond the known-issues file. Things like:
   - Using `setInterval` instead of `requestAnimationFrame`
   - Rebuilding DOM every frame instead of caching completed elements
   - Mixing animation approaches within a single pattern
   - Forgetting IntersectionObserver registration
   - Using `flex: 1` on nav elements
   - Inline styles instead of CSS custom properties

3. **No content/writing guidance.** The skill specifies how to build visualizations but says nothing about the explanatory text within each section card: how long it should be, what tone to use, how technical the language should be, whether to include code examples in the educational content.

4. **No topic-to-pattern mapping examples.** The pattern catalog lists abstract "Use When" descriptions but never shows a concrete mapping. For example: "If the topic is SPI protocol, you'd pick: Sequence Diagram (message flow), Waveform Trace (clock + data lines), Bit Register (control register), Packet Anatomy (frame structure)." One or two worked examples would dramatically improve pattern selection accuracy.

5. **No inter-pattern composition rules.** When multiple patterns appear on the same page, there's no guidance on: ordering (do timing patterns go first?), narrative flow (how do patterns build on each other?), shared state (can two patterns reference the same data?), or density (how many patterns before the page feels overloaded?).

### Sections Missing Entirely

1. **Topic Analysis Framework** -- Structured pre-flight for understanding what visualization needs the topic has, analogous to frontend-design's "Design Thinking" section.

2. **Anti-Patterns / Common Failures** -- Explicit "NEVER do this" list for the most common generation errors. Currently scattered across known-issues and buried in rule descriptions.

3. **Content Guidelines** -- What the explanatory prose should look like: reading level, length, structure, whether to include code snippets in the educational content itself.

4. **Worked Examples** -- At least 1-2 topic-to-pattern-selection walkthroughs showing the full decision process.

5. **Composition / Ordering** -- How to arrange multiple patterns into a coherent educational narrative on a single page.

6. **Quality Checklist Expansion** -- The "Before Shipping" section has 5 items. It should also cover: content review (are explanations accurate and clear?), pattern count (is it too many/few?), narrative flow (do sections build logically?), responsive testing, and accessibility beyond just ARIA labels.

### What Technical-Visualizer Does Better

For completeness -- areas where technical-visualizer is *stronger* than frontend-design:

- **Implementation specificity**: Full code examples with exact variable names, loop structures, and rendering logic. Frontend-design provides zero code.
- **Reference file architecture**: Splitting theme, infrastructure, and per-category patterns into separate loadable files is a strong pattern for managing context window usage.
- **Deterministic output**: The locked theme, naming conventions, and hard rules mean two different generations of the same topic will look structurally identical. Frontend-design explicitly encourages divergence.
- **Known issues as living document**: A dedicated file for bugs and lessons learned, updated over time. Frontend-design has no equivalent.

---

## Summary

Technical-visualizer is strong on implementation mechanics (how to render, animate, and structure) but weak on the decision layer above it (what to build, how to select, how to compose). Adopting a structured pre-flight framework, explicit anti-patterns, and worked examples from the frontend-design model would close the most impactful gaps without changing the skill's prescriptive nature.
