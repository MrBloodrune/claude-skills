# Multi-Chunk Generation Protocol

This protocol defines how to split large visualization pages across multiple responses while maintaining structural consistency and preventing style drift.

## When to Use Multi-Chunk

**Single-response target:**
- Pages with 4-5 sections
- Estimated 2000-3500 lines total
- Simple card-based layouts

**Multi-chunk required:**
- Pages with 6+ sections
- Complex interactive visualizations (graphs, diagrams, animations)
- Estimated 3500+ lines total
- Risk of truncation in single response

## Chunk Sequence

| Chunk | Contents | Checkpoint |
|-------|----------|------------|
| 1: Foundation | `<!DOCTYPE>` through `</style>` — ALL CSS, ALL variables | Verify every class name from page-architecture exists |
| 2: Skeleton | `<body>` through sidebar + hero + category headers + empty card shells | Verify all IDs that JS will reference are established |
| 3-N: Sections | 2-3 complete section cards per chunk | Verify all CSS classes used exist in Chunk 1 |
| N+1: Templates | All `<template>` elements for modals | Verify each template has a trigger button |
| N+2: JavaScript | Complete `<script>` block | Verify all DOM IDs referenced exist in HTML |

**Example sequence for 8-section page:**
1. Foundation (CSS)
2. Skeleton (structure + sidebar + hero)
3. Sections 1-3
4. Sections 4-6
5. Sections 7-8
6. Templates
7. JavaScript

## Consistency Rules

**CSS FIRST:**
- All styles must be in Chunk 1
- No adding CSS in later chunks
- No inline `style` attributes (except computed SVG coordinates)
- Use CSS custom property names, never raw hex values in HTML

**DOM ID Registry:**
- Maintain a comment listing all IDs at the top of the JS chunk
- IDs must be unique across all chunks
- Verify IDs match between HTML and JavaScript

**Class Inventory:**
- Every class used in HTML must appear in Chunk 1 CSS
- No inventing new classes in later chunks
- If new classes are needed, regenerate Chunk 1

**Card Structure:**
- ALL cards use identical markup
- No variation between chunks or sections
- Template: `article.card > .card-header > .card-body > .card-content`
- Expand icons: ALWAYS use SVG, never Unicode (❯, ►, etc.)

**SVG Icons:**
- Use the SAME SVG expand icon across all cards
- Copy SVG markup verbatim, do not switch to Unicode equivalents
- Maintain consistent icon dimensions and transforms

**Variable Usage:**
- Reference CSS variables: `var(--primary-600)`, not `#3b82f6`
- Maintain variable naming consistency with theme-system.md
- No hardcoded colors, spacing, or timing values

**Template Elements:**
- Always at end of `<body>`, before `<script>`
- Never inside `<main>` or other semantic containers
- Each template must have corresponding trigger with `data-modal` attribute

## Chunk Boundaries

**Never split:**
- A section card across chunks
- CSS across chunks
- The script block across chunks
- A template element across chunks

**Each chunk must:**
- Produce valid HTML that could theoretically render (even if incomplete)
- Close all opened tags
- Maintain proper indentation
- Include continuation comment if mid-page: `<!-- Chunk N of M -->`

**Preferred split points:**
- After complete section cards
- After major category boundaries
- Between hero and first section
- Between last section and templates

## Validation Checklist

Run this checklist between each chunk:

```
CSS (Chunk 1 only):
[ ] All design-system variables defined
[ ] All card component classes defined
[ ] All visualization-specific classes defined
[ ] All animation keyframes defined
[ ] Mobile/tablet/desktop breakpoints complete

Skeleton (Chunk 2):
[ ] All section headers with correct IDs
[ ] Sidebar nav links match section IDs
[ ] Hero content complete
[ ] Empty card shells use correct structure

Section chunks (3-N):
[ ] All CSS class names exist in Chunk 1 stylesheet
[ ] All element IDs unique and not duplicated
[ ] Card structure matches template exactly
[ ] Expand icons use SVG, not Unicode
[ ] No inline style attributes
[ ] Deep-dive buttons have data-modal attributes
[ ] Viz containers have viz-header with label + controls

Templates (N+1):
[ ] Each template has unique ID
[ ] Each template has corresponding trigger button
[ ] Modal structure matches modal-templates.md
[ ] Close buttons present

JavaScript (N+2):
[ ] DOM ID registry comment at top
[ ] All referenced IDs exist in HTML chunks
[ ] All event listeners reference valid selectors
[ ] Smooth scroll, expand/collapse, modal handlers complete
[ ] No undefined functions or variables
```

## Error Recovery

**If style inconsistency detected:**
1. Stop generation
2. Regenerate Chunk 1 with complete CSS
3. Resume from last valid chunk

**If missing CSS class:**
1. Add class to Chunk 1
2. Increment page version
3. Resume generation

**If truncated chunk:**
1. Note exact truncation point
2. Resume from last complete element
3. Continue sequence

## Version Control

After multi-chunk generation:
- Document chunk count and total line count in a comment at the top of the HTML file
