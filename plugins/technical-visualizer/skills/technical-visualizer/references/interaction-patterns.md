# Interaction Patterns Reference

Complete interaction patterns extracted from the ESP32 Peripherals Guide. All patterns use vanilla JavaScript with no dependencies.

---

## 1. Card Expand/Collapse

### HTML Structure
```html
<article class="section-card" id="section-id">
  <div class="card-header"
       role="button"
       tabindex="0"
       aria-expanded="false"
       aria-controls="body-section-id"
       onclick="toggleCard(this)">
    <div class="card-index">01</div>
    <div class="card-info">
      <div class="card-pattern-label">Playhead / Sweep</div>
      <h2 class="card-title">Pattern Name</h2>
      <p class="card-summary">Brief description of the pattern.</p>
    </div>
    <div class="card-expand-icon">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
        <path d="M3 1l7 5-7 5V1z"/>
      </svg>
    </div>
  </div>
  <div class="card-body" id="body-section-id">
    <div class="card-content">
      <!-- Content here -->
    </div>
  </div>
</article>
```

### CSS
```css
.card-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 500ms ease;
}

.section-card.expanded .card-body {
  max-height: 8000px;
}

.card-expand-icon {
  transition: transform 300ms ease;
  color: var(--copper-dim);
  display: flex;
  align-items: center;
}

.section-card.expanded .card-expand-icon {
  transform: rotate(90deg);
}
```

### JavaScript
```javascript
function toggleCard(header) {
  const card = header.closest('.section-card');
  const body = card.querySelector('.card-body');
  const expanded = card.classList.toggle('expanded');

  // Update ARIA
  header.setAttribute('aria-expanded', expanded);

  // Optional: Close other cards (accordion mode)
  // document.querySelectorAll('.section-card.expanded').forEach(c => {
  //   if (c !== card) {
  //     c.classList.remove('expanded');
  //     c.querySelector('.card-header').setAttribute('aria-expanded', 'false');
  //   }
  // });
}

// Keyboard support
document.addEventListener('keydown', (e) => {
  if (e.target.matches('.card-header[tabindex="0"]')) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCard(e.target);
    }
  }
});
```

---

## 2. Deep-Dive Buttons

### HTML
```html
<!-- Inside card content -->
<button class="deep-dive-btn" data-modal="pwm-modal">
  PWM Hardware Details
</button>

<!-- Multiple buttons in a group -->
<div class="deep-dive-group">
  <button class="deep-dive-btn" data-modal="spi-timing">Timing Analysis</button>
  <button class="deep-dive-btn" data-modal="spi-hardware">Hardware Details</button>
</div>
```

### CSS
```css
.deep-dive-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--blue);
  border-radius: 2px;
  color: var(--blue);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
}

.deep-dive-btn::before {
  content: '[';
  color: var(--text-dim);
  margin-right: 4px;
}

.deep-dive-btn::after {
  content: ']';
  color: var(--text-dim);
  margin-left: 4px;
}

.deep-dive-btn:hover {
  background: var(--blue-faint);
  box-shadow: 0 0 12px var(--blue-faint);
  text-shadow: 0 0 8px var(--blue-glow);
}

.deep-dive-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
```

### JavaScript
```javascript
// Event delegation for all deep-dive buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.deep-dive-btn');
  if (btn) {
    const modalId = btn.dataset.modal;
    openModal(modalId);
  }
});
```

---

## 3. Modal System

### HTML Structure
```html
<!-- Modal container (single instance) -->
<div class="modal-backdrop" id="modalBackdrop" onclick="closeModal()"></div>
<div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
  <div class="modal-titlebar">
    <div class="modal-dots">
      <span class="dot-close"></span>
      <span class="dot-min"></span>
      <span class="dot-max"></span>
    </div>
    <span class="modal-title-text" id="modalTitle">Deep Dive</span>
    <button class="modal-close" onclick="closeModal()" aria-label="Close modal">&times;</button>
  </div>
  <div class="modal-body" id="modalBody"></div>
</div>

<!-- Template content (at end of body, one per section) -->
<template id="pwm-modal">
  <h4>PWM Hardware Architecture</h4>
  <p>Detailed information about the PWM peripheral...</p>
  <ul>
    <li>8 independent channels</li>
    <li>16-bit duty cycle resolution</li>
  </ul>
  <div class="warn">
    <p>Timer frequency must divide evenly into 80MHz APB clock.</p>
  </div>
</template>
```

### CSS
```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: var(--z-modal-backdrop);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-med);
}

.modal-backdrop.visible {
  opacity: 1;
  pointer-events: auto;
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.92);
  width: min(720px, 90vw);
  max-height: 85vh;
  background: var(--bg-modal);
  border: 1px solid var(--copper-dim);
  border-radius: 2px;
  box-shadow: 0 0 30px var(--copper-faint), 0 0 60px rgba(0, 0, 0, 0.8);
  z-index: var(--z-modal);
  opacity: 0;
  pointer-events: none;
  transition: all var(--transition-med);
}

.modal.visible {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  pointer-events: auto;
}

.modal-titlebar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.modal-dots {
  display: flex;
  gap: 6px;
}

.modal-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: block;
}

.dot-close { background: var(--red); }
.dot-min { background: var(--copper); }
.dot-max { background: var(--green); }

.modal-title-text {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  transition: color var(--transition-fast);
}

.modal-close:hover {
  color: var(--red);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(85vh - 60px);
}

.modal-body h4 {
  font-family: var(--font-mono);
  font-size: 15px;
  color: var(--copper);
  margin-bottom: 12px;
}

.modal-body p {
  font-size: 14px;
  line-height: 1.8;
  margin-bottom: 12px;
}

.modal-body ul {
  list-style: none;
  padding-left: 0;
}

.modal-body li {
  position: relative;
  padding-left: 20px;
  margin-bottom: 8px;
}

.modal-body li::before {
  content: '\25C6';
  position: absolute;
  left: 0;
  color: var(--copper-dim);
}

.modal-body .warn {
  border-left: 3px solid var(--red);
  background: var(--red-faint);
  padding: 12px;
  margin: 16px 0;
}

.modal-body .warn::before {
  content: 'NOTE: ';
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--red);
  font-weight: 600;
}

/* Body scroll lock */
body.modal-open {
  overflow: hidden;
}
```

### JavaScript
```javascript
const modal = document.getElementById('modal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');
const modalTitle = document.getElementById('modalTitle');

function openModal(templateId) {
  const template = document.getElementById(templateId);
  if (!template) return;

  // Clone template content into modal body
  modalBody.innerHTML = template.innerHTML;

  // Set title (optional: extract from template or button)
  const btn = document.querySelector(`[data-modal="${templateId}"]`);
  if (btn) {
    modalTitle.textContent = btn.textContent.trim();
  }

  // Show modal
  modalBackdrop.classList.add('visible');
  modal.classList.add('visible');
  document.body.classList.add('modal-open');

  // Focus close button
  modal.querySelector('.modal-close').focus();
}

function closeModal() {
  modalBackdrop.classList.remove('visible');
  modal.classList.remove('visible');
  document.body.classList.remove('modal-open');

  // Return focus to trigger button (optional)
  const activeBtn = document.activeElement.closest('.deep-dive-btn');
  if (activeBtn) activeBtn.focus();
}

// Escape key handler
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('visible')) {
    closeModal();
  }
});
```

---

## 4. Visualization Controls

### HTML Structure
```html
<div class="viz-container" id="pwmViz">
  <div class="viz-header">
    <div class="viz-label">PWM Channels</div>
    <div class="viz-controls">
      <button class="viz-btn"
              onclick="pwmToggle()"
              aria-label="Play or pause PWM animation">
        Pause
      </button>
      <button class="viz-btn"
              onclick="pwmReset()"
              aria-label="Reset PWM animation">
        Reset
      </button>
      <!-- Optional speed control -->
      <select class="viz-speed"
              onchange="pwmSetSpeed(this.value)"
              aria-label="Animation speed">
        <option value="0.5">0.5x</option>
        <option value="1" selected>1x</option>
        <option value="2">2x</option>
      </select>
    </div>
  </div>
  <div class="viz-canvas" id="pwmCanvas">
    <!-- Visualization content -->
  </div>
</div>
```

### CSS
```css
.viz-container {
  background: #060a12;
  border: 1px solid var(--border-color);
  border-radius: 2px;
  margin: 20px 0;
}

.viz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.viz-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.viz-label::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--copper);
  box-shadow: 0 0 4px var(--copper-glow);
}

.viz-controls {
  display: flex;
  gap: 8px;
}

.viz-btn {
  padding: 4px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 2px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.viz-btn:hover {
  border-color: var(--copper-dim);
  color: var(--copper);
}

.viz-btn.active {
  border-color: var(--copper);
  color: var(--copper);
  background: var(--copper-faint);
}

.viz-speed {
  padding: 4px 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
}

.viz-canvas {
  min-height: 200px;
  padding: 24px;
  background-image:
    linear-gradient(rgba(212,146,75,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(212,146,75,0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

### JavaScript Pattern
```javascript
// State variables for each visualization
let pwmPlaying = true;
let pwmAnimId = null;
let pwmPosition = 0;
let pwmLastTime = 0;
let pwmSpeed = 1.0;
const PWM_BASE_SPEED = 0.15;

function pwmToggle() {
  pwmPlaying = !pwmPlaying;
  const btn = event.target;
  btn.textContent = pwmPlaying ? 'Pause' : 'Play';
  btn.classList.toggle('active', !pwmPlaying);
  btn.setAttribute('aria-label', pwmPlaying ? 'Pause animation' : 'Play animation');
}

function pwmReset() {
  pwmPosition = 0;
  pwmLastTime = 0;
  pwmRender();
}

function pwmSetSpeed(speed) {
  pwmSpeed = parseFloat(speed);
}

function pwmStep(timestamp) {
  if (!pwmLastTime) pwmLastTime = timestamp;
  const dt = (timestamp - pwmLastTime) / 1000;
  pwmLastTime = timestamp;

  // Global motion check
  const motionReduced = document.body.classList.contains('reduce-motion') ||
                        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (pwmPlaying && !motionReduced) {
    pwmPosition += PWM_BASE_SPEED * pwmSpeed * dt;
    if (pwmPosition > 1) pwmPosition = 0;
  }

  pwmRender();
  pwmAnimId = requestAnimationFrame(pwmStep);
}

function pwmRender() {
  // Update DOM based on pwmPosition
  // ...
}

// Viewport visibility optimization
const vizObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.target.id === 'pwmViz') {
      if (entry.isIntersecting) {
        pwmAnimId = requestAnimationFrame(pwmStep);
      } else {
        if (pwmAnimId) cancelAnimationFrame(pwmAnimId);
        pwmAnimId = null;
        pwmLastTime = 0;
      }
    }
  });
}, { threshold: 0.1 });

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  vizObserver.observe(document.getElementById('pwmViz'));
});
```

---

## 5. Accessibility Checklist

### Semantic HTML
```html
<!-- Main structure -->
<nav class="nav-sidebar" aria-label="Main navigation">...</nav>
<main class="main-content">...</main>
<footer class="site-footer">...</footer>

<!-- Section cards -->
<article class="section-card">...</article>

<!-- Skip link (hidden, visible on focus) -->
<a href="#main-content" class="skip-link">Skip to content</a>
```

### ARIA Attributes
```html
<!-- Card headers -->
<div class="card-header"
     role="button"
     tabindex="0"
     aria-expanded="false"
     aria-controls="body-section-id">
</div>

<!-- Modal -->
<div class="modal"
     role="dialog"
     aria-modal="true"
     aria-labelledby="modalTitle">
</div>

<!-- Buttons -->
<button aria-label="Play or pause animation">Pause</button>
<button aria-label="Reset animation">Reset</button>
<button aria-label="Close modal">&times;</button>

<!-- Interactive bits/cells -->
<div class="bit-box"
     role="switch"
     aria-checked="false"
     tabindex="0">
</div>
```

### Focus Styles
```css
*:focus-visible {
  outline: 2px solid var(--copper);
  outline-offset: 2px;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--copper);
  color: var(--bg-primary);
  padding: 8px;
  z-index: 999;
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}
```

### Keyboard Support
```javascript
// Card expand/collapse
document.addEventListener('keydown', (e) => {
  if (e.target.matches('.card-header[tabindex="0"]')) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCard(e.target);
    }
  }
});

// Modal close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('visible')) {
    closeModal();
  }
});

// Interactive bits
document.addEventListener('keydown', (e) => {
  if (e.target.matches('.bit-box[role="switch"]')) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleBit(e.target);
    }
  }
});
```

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

body.reduce-motion *,
body.reduce-motion *::before,
body.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}
```

```javascript
// Check motion preference in animation loops
const motionReduced = document.body.classList.contains('reduce-motion') ||
                      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (playing && !motionReduced) {
  // Run animation
}
```

### Focus Management
```javascript
function openModal(templateId) {
  // ... show modal ...

  // Focus close button when modal opens
  modal.querySelector('.modal-close').focus();
}

function closeModal() {
  // ... hide modal ...

  // Return focus to trigger button
  const activeBtn = document.querySelector('.deep-dive-btn:focus-within');
  if (activeBtn) activeBtn.focus();
}
```

### Complete Checklist
- [ ] Every card-header has `role="button"`, `tabindex="0"`, `aria-expanded`, `aria-controls`
- [ ] Every modal has `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- [ ] Every button has descriptive `aria-label`
- [ ] Every interactive bit/cell has `role="switch"` or `role="checkbox"`, `aria-checked`
- [ ] All interactive elements have visible `:focus-visible` outlines
- [ ] Semantic HTML: `<article>` for cards, `<nav>` for sidebar, `<main>` for content, `<footer>`
- [ ] Skip-to-content link present and functional
- [ ] `prefers-reduced-motion` respected in CSS and JavaScript
- [ ] Keyboard navigation works: Enter/Space for toggles, Escape for modals
- [ ] Focus returns to trigger element when modals close
- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Popovers dismiss on Escape and click-outside
- [ ] Modal tabs reset to first tab on reopen

---

## 6. Popover System (Layer 2)

Popovers provide hover/click context on interactive elements. Based on Shneiderman's "details on demand" principle and the Chrome DevTools pin pattern. Maximum 3 information layers: visualization (L1) → popover (L2) → modal (L3).

### HTML — Annotating Elements

Add `class="has-popover"` and data attributes to elements that should show popovers:

```html
<span class="has-popover"
  data-popover-title="NVS Partition"
  data-popover-body="<code>0x9000</code> &mdash; 20KB non-volatile storage. Key-value pairs for WiFi credentials and device settings.">
  NVS (20KB)
</span>
```

**Guidelines:**
- 3-5 popover elements per section (don't over-annotate)
- `data-popover-body` can contain inline HTML (`<code>`, `<strong>`, `<em>`)
- Keep body text to 2-3 lines max
- Target: field names, partition regions, config values, pin names, enum values

### CSS

```css
.has-popover {
  border-bottom: 1px dashed var(--text-dim);
  cursor: help;
  transition: border-color var(--transition-fast);
}
.has-popover:hover { border-color: var(--copper); }

.popover {
  position: absolute; width: 280px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  padding: 12px 16px;
  font-family: var(--font-mono); font-size: 12px;
  color: var(--text-secondary);
  z-index: 200;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  opacity: 0; transform: translateY(4px);
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  pointer-events: none;
}
.popover.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
.popover.pinned {
  border-color: var(--copper-dim);
  box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px var(--copper-faint);
}
.popover-title { font-weight: 600; color: var(--copper); margin-bottom: 6px; font-size: 12px; }
.popover-body { line-height: 1.5; }
.popover-body code { background: var(--bg-primary); padding: 1px 4px; border-radius: 2px; font-size: 11px; }
.popover-close {
  position: absolute; top: 8px; right: 8px;
  background: none; border: none; color: var(--text-dim);
  cursor: pointer; font-size: 14px; display: none;
}
.popover.pinned .popover-close { display: block; }
.popover-pin-hint {
  font-size: 10px; color: var(--text-dim); margin-top: 8px; font-style: italic;
}
.popover.pinned .popover-pin-hint { display: none; }
```

### JavaScript

```javascript
let activePopover = null;
let popoverTimeout = null;

function createPopoverElement() {
  const el = document.createElement('div');
  el.className = 'popover';
  el.innerHTML = `
    <button class="popover-close" onclick="dismissPopover()" aria-label="Close">&times;</button>
    <div class="popover-title"></div>
    <div class="popover-body"></div>
    <div class="popover-pin-hint">Click to pin</div>
  `;
  document.body.appendChild(el);
  return el;
}

const popoverEl = createPopoverElement();

function positionPopover(target) {
  const rect = target.getBoundingClientRect();
  const pw = 280;
  let left = rect.left + rect.width / 2 - pw / 2;
  let top = rect.bottom + 8;
  if (left < 8) left = 8;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  if (top + 200 > window.innerHeight) top = rect.top - 8 - popoverEl.offsetHeight;
  popoverEl.style.left = left + 'px';
  popoverEl.style.top = top + window.scrollY + 'px';
}

function showPopover(target) {
  if (activePopover === target && popoverEl.classList.contains('pinned')) return;
  popoverEl.querySelector('.popover-title').textContent = target.dataset.popoverTitle || '';
  popoverEl.querySelector('.popover-body').innerHTML = target.dataset.popoverBody || '';
  popoverEl.classList.remove('pinned');
  popoverEl.classList.add('visible');
  positionPopover(target);
  activePopover = target;
}

function hidePopover() {
  if (popoverEl.classList.contains('pinned')) return;
  popoverEl.classList.remove('visible');
  activePopover = null;
}

function pinPopover(target) {
  if (activePopover && activePopover !== target) popoverEl.classList.remove('pinned', 'visible');
  showPopover(target);
  popoverEl.classList.add('pinned');
}

function dismissPopover() {
  popoverEl.classList.remove('visible', 'pinned');
  activePopover = null;
}

function initPopovers() {
  document.querySelectorAll('.has-popover').forEach(el => {
    el.addEventListener('mouseenter', () => { clearTimeout(popoverTimeout); showPopover(el); });
    el.addEventListener('mouseleave', () => { popoverTimeout = setTimeout(hidePopover, 200); });
    el.addEventListener('click', e => { e.preventDefault(); pinPopover(el); });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.popover') && !e.target.closest('.has-popover')) dismissPopover();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') dismissPopover(); });
  popoverEl.addEventListener('mouseenter', () => clearTimeout(popoverTimeout));
  popoverEl.addEventListener('mouseleave', () => {
    if (!popoverEl.classList.contains('pinned')) popoverTimeout = setTimeout(hidePopover, 200);
  });
}
```

Call `initPopovers()` in `init()`.

---

## 7. Tabbed Modals (Layer 3)

Deep-dive modals use internal tabs for structured depth instead of nested dialogs. Based on MDN/Stripe documentation patterns. Each modal has 2-4 tabs — never expand/grow the modal itself.

### HTML — Template Structure

```html
<template id="section-modal">
  <div class="modal-tabs">
    <button class="modal-tab active" data-tab="overview" onclick="switchModalTab(this)">Overview</button>
    <button class="modal-tab" data-tab="details" onclick="switchModalTab(this)">Details</button>
    <button class="modal-tab" data-tab="code" onclick="switchModalTab(this)">Code</button>
  </div>
  <div class="modal-tab-content active" data-tab="overview">
    <h4>Topic Overview</h4>
    <p>Main explanation content...</p>
  </div>
  <div class="modal-tab-content" data-tab="details">
    <h4>Technical Details</h4>
    <table class="modal-table"><!-- structured data --></table>
  </div>
  <div class="modal-tab-content" data-tab="code">
    <h4>Source References</h4>
    <ul><li><code>path/to/file.cpp</code> &mdash; description</li></ul>
  </div>
</template>
```

**Tab guidelines:**
- Minimum 2 tabs, maximum 4
- Standard tab set: Overview, Details, Code, Related
- Not every modal needs all tabs — use what's relevant
- Overview tab contains the existing deep-dive content (migration path)
- Details tab: tables, config values, thresholds, formulas
- Code tab: source file paths, function signatures, config struct fields
- Related tab: cross-references to other sections/pages

### CSS

```css
.modal-tabs {
  display: flex; gap: 0; border-bottom: 1px solid var(--border-color);
  margin: -16px -24px 16px; padding: 0 24px;
}
.modal-tab {
  padding: 10px 16px;
  font-family: var(--font-mono); font-size: 12px;
  color: var(--text-dim); background: none; border: none;
  cursor: pointer; border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}
.modal-tab:hover { color: var(--text-secondary); }
.modal-tab.active { color: var(--copper); border-bottom-color: var(--copper); }
.modal-tab-content { display: none; }
.modal-tab-content.active { display: block; }

.modal-table {
  width: 100%; border-collapse: collapse; margin: 12px 0;
  font-family: var(--font-mono); font-size: 12px;
}
.modal-table th {
  text-align: left; padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  color: var(--copper); font-weight: 600; font-size: 11px;
  text-transform: uppercase; letter-spacing: 1px;
}
.modal-table td {
  padding: 6px 12px; border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}
.modal-table tr:hover td { background: var(--copper-faint); }
```

### JavaScript

```javascript
function switchModalTab(btn) {
  const container = btn.closest('.modal') || btn.closest('.modal-body');
  if (!container) return;
  container.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  container.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const tabId = btn.dataset.tab;
  container.querySelector(`.modal-tab-content[data-tab="${tabId}"]`)?.classList.add('active');
}
```

Update `openModal()` to reset tab state on open:

```javascript
function openModal(templateId) {
  // ... existing clone + show logic ...

  // Reset tabs to first tab
  const firstTab = modalBody.querySelector('.modal-tab');
  if (firstTab) {
    modalBody.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    modalBody.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
    firstTab.classList.add('active');
    modalBody.querySelector('.modal-tab-content')?.classList.add('active');
  }
}
```
