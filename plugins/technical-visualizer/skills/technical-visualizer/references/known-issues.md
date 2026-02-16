# Known Issues & Lessons Learned

Living document. Update as we discover and fix issues.

## Animation

### Playhead cursor/block sync
**Problem:** Blocks and cursor update in the same render frame at the same position, making blocks appear to pop in ahead of the cursor.
**Fix:** Cursor position is a float driven by `requestAnimationFrame`. The active block's right edge trails the cursor. Completed blocks only render up to `Math.floor(cursorPos)`. The cursor is always visually ahead because it's at the float position while blocks render to the integer position.
**Root cause:** Original implementation used `setTimeout` with integer positions and rendered both simultaneously.

### Blocks rebuilding every frame
**Problem:** `innerHTML = ''` on every render frame causes DOM thrashing and visual flicker.
**Mitigation:** For completed blocks (static), cache them and only rebuild when the integer tick changes. Only update the active block's width each frame.

## Layout

### Sidebar section spread
**Problem:** Nav sections spread across full sidebar height with large gaps between groups.
**Root cause:** `.nav-links` had `flex: 1`, distributing space equally across all `<ul>` elements in the flex column.
**Fix:** Set `.nav-links { flex: none; }`. Sections pack to top naturally.

### Sidebar spacing
**Tuned values:**
- Section label padding: `10px 16px 2px`
- Link padding: `5px 16px`
- List padding: `2px 0`

## Visualization-Specific

### FSM arrow tangles
**Problem:** State machine with >4 nodes and many cross-connections produces overlapping SVG arrows in the center, making the diagram hard to read.
**Status:** Not yet fixed.
**Mitigation options:**
- Use curved `<path>` elements with arc offsets instead of straight lines
- Offset parallel arrows by a few pixels
- Use manual anchor points per edge (specify source/target attachment side)
- Arrange nodes to minimize crossing (common paths on same row, error/reset paths separate)

### Single-file size limits
**Problem:** 15 patterns in one file ≈ 190KB / 5400 lines. Hits Claude output token limits when generating.
**Workaround:** Generate in chunks of 5 patterns per agent invocation, then stitch.
**Future fix:** Consider splitting large collections into multiple linked pages.

## Browser Compatibility

### Backdrop filter
`backdrop-filter: blur()` for glassmorphic sidebar requires `-webkit-` prefix for Safari. Always include both:
```css
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
```

### SVG resize
Block diagram SVG connection lines don't reposition on window resize unless explicitly handled. Add `window.addEventListener('resize', redrawLines)` for any SVG overlay patterns.
