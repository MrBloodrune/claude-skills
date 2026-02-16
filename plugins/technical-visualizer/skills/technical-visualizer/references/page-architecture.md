# Page Architecture Reference

Complete HTML/CSS/JS patterns for educational visualization pages. Extracted from ESP32 Peripherals Guide gold standard.

---

## 1. Page Template

Complete HTML skeleton showing every required element:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Character encoding and viewport for responsive design -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Topic} — Interactive Guide</title>

  <!-- Google Fonts preconnect for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">

  <!-- All CSS inline in style block -->
  <style>/* CSS from section 2-7 */</style>
</head>
<body>
  <!-- Mobile navigation button - fixed top-left, hidden on desktop -->
  <button class="mobile-nav-btn" onclick="toggleMobileNav()" aria-label="Open navigation">&#9776;</button>

  <!-- Left sidebar: Series navigation (all pages in series) -->
  <nav class="series-nav" aria-label="Series navigation">
    <!-- Populated from section 3: series links + motion toggle -->
  </nav>

  <!-- Modal system - fixed, hidden by default -->
  <div class="modal-backdrop" id="modalBackdrop" onclick="closeModal()"></div>
  <div class="modal" id="modal" role="dialog" aria-modal="true">
    <div class="modal-titlebar">
      <div class="modal-dots"><span></span><span></span><span></span></div>
      <span class="modal-title-text">Deep Dive</span>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>

  <!-- Main content area - offset left by sidebar width -->
  <main class="main-content">
    <!-- Hero section with chip title and stats -->
    <section class="hero grid-bg" id="hero">
      <!-- Hero content from section 2 -->
    </section>

    <!-- Sections container - max-width constrained -->
    <div class="sections-container">
      <!-- Category headers divide sections -->
      <div class="category-header">Category Name<span class="pad-dot"></span></div>

      <!-- Section cards - expandable, numbered -->
      <article class="section-card" id="section-id">
        <div class="card-header" onclick="toggleCard(this)">
          <!-- Card header from section 4 -->
        </div>
        <div class="card-body">
          <div class="card-content">
            <!-- Content blocks, visualizations, code -->
          </div>
        </div>
      </article>

      <!-- Repeat for all sections -->
    </div>

    <!-- Footer with attribution -->
    <footer class="site-footer">
      <!-- Footer from section 6 -->
    </footer>
  </main>

  <!-- Right sidebar: Page table of contents (auto-populated by JS) -->
  <aside class="page-toc" aria-label="Page table of contents">
    <div class="page-toc-header">On This Page</div>
    <nav class="page-toc-links"></nav>
  </aside>

  <!-- Deep dive modal templates - hidden, with tabs -->
  <template id="section-modal-id">
    <div class="modal-tabs">
      <button class="modal-tab active" data-tab="overview" onclick="switchModalTab(this)">Overview</button>
      <button class="modal-tab" data-tab="details" onclick="switchModalTab(this)">Details</button>
    </div>
    <div class="modal-tab-content active" data-tab="overview"><!-- Overview content --></div>
    <div class="modal-tab-content" data-tab="details"><!-- Detail content --></div>
  </template>

  <!-- All JavaScript inline in script block -->
  <script>/* JavaScript from section 8 */</script>
</body>
</html>
```

---

## 2. Hero Section

### HTML Structure

```html
<section class="hero grid-bg" id="hero">
  <!-- Chip-style title container with solder pads -->
  <div class="chip-element">
    <h1 class="hero-title">Topic Name</h1>
  </div>

  <!-- Subtitle and tagline -->
  <p class="hero-subtitle">Descriptive subtitle explaining the topic</p>
  <div class="hero-tagline">Technical context or framework reference</div>

  <!-- Statistics row - 3 items showing counts -->
  <div class="hero-stats">
    <div class="stat-item">
      <span class="stat-value">15</span>
      <span class="stat-label">Patterns</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">12</span>
      <span class="stat-label">Visualizations</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">8</span>
      <span class="stat-label">Deep Dives</span>
    </div>
  </div>
</section>
```

### CSS

```css
.hero {
  padding: 100px 48px 80px;
  text-align: center;
  position: relative;
  background: var(--bg-primary);
}

/* Grid background overlay */
.grid-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle at 50% 30%, rgba(212,146,75,0.08) 0%, transparent 60%),
    linear-gradient(var(--grid-color) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
  background-size: 100% 100%, 20px 20px, 20px 20px;
}

/* Chip element container with solder pads */
.chip-element {
  display: inline-block;
  position: relative;
  padding: 24px 48px;
  border: 2px solid var(--copper);
  border-radius: 2px;
  margin-bottom: 24px;
}

.chip-element::before,
.chip-element::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--copper);
  box-shadow: 0 0 8px var(--copper-glow);
}

.chip-element::before { left: -3px; }
.chip-element::after { right: -3px; }

/* Hero title with glow animation */
.hero-title {
  font-family: var(--font-mono);
  font-size: clamp(32px, 6vw, 56px);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--copper);
  margin: 0;
  text-shadow:
    0 0 10px var(--copper-glow),
    0 0 30px var(--copper-glow),
    0 0 60px rgba(212,146,75,0.2);
  animation: copper-pulse 3s ease-in-out infinite;
}

@keyframes copper-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.hero-subtitle {
  font-size: clamp(14px, 2vw, 18px);
  color: var(--text-secondary);
  margin: 16px auto 12px;
  max-width: 600px;
}

.hero-tagline {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--green);
  text-shadow: 0 0 8px var(--green-glow);
  display: inline-block;
  padding: 6px 12px;
  border: 1px solid var(--green-dim);
  border-radius: 2px;
}

.hero-tagline::before {
  content: '// ';
  color: var(--text-dim);
}

/* Stats row */
.hero-stats {
  display: flex;
  gap: 48px;
  justify-content: center;
  margin-top: 40px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 32px;
  font-weight: 600;
  color: var(--copper);
  text-shadow: 0 0 8px var(--copper-glow);
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
}
```

---

## 3. Dual Sidebar Navigation

Pages use a wiki-style dual sidebar layout:
- **Left sidebar (series nav):** Links to all pages in the series. Shows page numbers and short titles. Current page highlighted. Collapsible to icon rail.
- **Right sidebar (page TOC):** Auto-populated from section cards on the current page. Scrollspy highlights active section.

For standalone pages (not part of a series), the left sidebar shows section categories (the legacy single-sidebar pattern). For multi-page series, always use the dual sidebar.

### HTML Structure

```html
<!-- Left sidebar: Series Navigation -->
<nav class="series-nav" aria-label="Series navigation">
  <div class="series-nav-header">
    <div class="series-nav-title">Series Title</div>
    <button class="series-nav-collapse-btn" onclick="toggleSeriesNav()" aria-label="Collapse navigation">
      <span class="series-nav-collapse-icon">&#8249;</span>
    </button>
  </div>
  <div class="series-nav-links">
    <a href="01-page-name.html" class="series-nav-link active">
      <span class="series-nav-num">01</span>
      <span class="series-nav-label">Page Title</span>
    </a>
    <a href="02-page-name.html" class="series-nav-link">
      <span class="series-nav-num">02</span>
      <span class="series-nav-label">Page Title</span>
    </a>
    <!-- Repeat for all pages in series -->
  </div>
  <div class="series-nav-controls">
    <button class="motion-toggle" onclick="toggleMotion()" aria-label="Toggle motion">
      <span class="motion-indicator"></span>
      <span class="motion-label">Motion</span>
    </button>
  </div>
</nav>

<!-- Right sidebar: Page Table of Contents (auto-populated by JS) -->
<aside class="page-toc" aria-label="Page table of contents">
  <div class="page-toc-header">On This Page</div>
  <nav class="page-toc-links">
    <!-- Populated by initPageToc() from .section-card elements -->
  </nav>
</aside>
```

Place the `<aside class="page-toc">` after `</main>` and before the footer/templates.

### CSS

```css
/* Add to :root */
--series-nav-width: 220px;
--series-nav-collapsed: 48px;
--page-toc-width: 180px;

/* Series Nav (left sidebar) */
.series-nav {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: var(--series-nav-width);
  background: rgba(10,15,26,0.92);
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(212,146,75,0.15);
  box-shadow: 1px 0 12px rgba(212,146,75,0.06), inset -1px 0 0 rgba(255,255,255,0.04);
  z-index: var(--z-nav);
  display: flex; flex-direction: column;
  overflow-y: auto; overflow-x: hidden;
  transition: width var(--transition-med);
}
.series-nav.collapsed { width: var(--series-nav-collapsed); }
.series-nav.collapsed .series-nav-label,
.series-nav.collapsed .series-nav-title,
.series-nav.collapsed .motion-label { opacity: 0; pointer-events: none; }

.series-nav-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; border-bottom: 1px solid var(--border-color);
}
.series-nav-title {
  font-family: var(--font-mono); font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 2px; color: var(--copper);
  white-space: nowrap;
}
.series-nav-collapse-btn {
  width: 24px; height: 24px; border: 1px solid var(--border-color);
  background: transparent; color: var(--text-secondary); border-radius: 2px;
  cursor: pointer; transition: all var(--transition-fast); flex-shrink: 0;
}
.series-nav-collapse-btn:hover { border-color: var(--copper-dim); color: var(--copper); }
.series-nav-collapse-icon { display: inline-block; transition: transform var(--transition-med); }
.series-nav.collapsed .series-nav-collapse-icon { transform: rotate(180deg); }

.series-nav-links { flex: 1; padding: 12px 0; overflow-y: auto; }
.series-nav-link {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  color: var(--text-secondary); text-decoration: none;
  font-family: var(--font-mono); font-size: 12px;
  border-left: 2px solid transparent;
  transition: all var(--transition-fast); white-space: nowrap;
}
.series-nav-link:hover {
  color: var(--copper); background: rgba(212,146,75,0.08);
  border-left-color: var(--copper-dim);
}
.series-nav-link.active {
  color: var(--copper); background: rgba(212,146,75,0.12);
  border-left-color: var(--copper);
}
.series-nav-num { font-size: 10px; color: var(--text-dim); min-width: 18px; }
.series-nav-controls { padding: 16px; border-top: 1px solid var(--border-color); }

/* Page TOC (right sidebar) */
.page-toc {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: var(--page-toc-width);
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  padding-top: 24px;
  z-index: var(--z-nav);
}
.page-toc-header {
  font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 2px; color: var(--text-dim);
  padding: 0 16px 12px; border-bottom: 1px solid var(--border-color);
}
.page-toc-links { padding: 8px 0; }
.page-toc-link {
  display: block; padding: 6px 16px;
  font-family: var(--font-mono); font-size: 11px;
  color: var(--text-dim); text-decoration: none;
  border-left: 2px solid transparent;
  transition: all var(--transition-fast);
}
.page-toc-link:hover { color: var(--text-secondary); border-left-color: var(--border-color); }
.page-toc-link.active { color: var(--copper); border-left-color: var(--copper); }

/* Motion toggle (shared) */
.motion-toggle {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 2px;
  background: transparent; color: var(--text-secondary);
  font-family: var(--font-mono); font-size: 11px;
  cursor: pointer; transition: all var(--transition-fast);
}
.motion-toggle:hover { border-color: var(--copper-dim); }
.motion-indicator {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--green); box-shadow: 0 0 6px var(--green-glow);
}
body.reduce-motion .motion-indicator {
  background: var(--red); box-shadow: 0 0 6px var(--red-glow);
}

/* Main content offset for both sidebars */
.main-content {
  margin-left: var(--series-nav-width);
  margin-right: var(--page-toc-width);
  position: relative; z-index: 2;
  transition: margin var(--transition-med);
}
.series-nav.collapsed ~ .main-content { margin-left: var(--series-nav-collapsed); }
```

### JavaScript

```javascript
// Series nav collapse
function toggleSeriesNav() {
  document.querySelector('.series-nav').classList.toggle('collapsed');
}

// Mobile menu toggle
function toggleMobileNav() {
  document.querySelector('.series-nav').classList.toggle('mobile-open');
}

// Auto-populate page TOC from section cards
function initPageToc() {
  const toc = document.querySelector('.page-toc-links');
  if (!toc) return;
  const cards = document.querySelectorAll('.section-card');
  cards.forEach(card => {
    const title = card.querySelector('.card-title')?.textContent;
    if (!title) return;
    const link = document.createElement('a');
    link.href = '#' + card.id;
    link.className = 'page-toc-link';
    link.textContent = title;
    link.addEventListener('click', e => {
      e.preventDefault();
      card.scrollIntoView({ behavior: motionReduced ? 'auto' : 'smooth' });
    });
    toc.appendChild(link);
  });
}

// Scrollspy for page TOC
function initScrollspy() {
  const tocLinks = document.querySelectorAll('.page-toc-link');
  if (!tocLinks.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.page-toc-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -75% 0px', threshold: 0 });
  document.querySelectorAll('.section-card').forEach(card => observer.observe(card));
}

// Close mobile nav when clicking link
document.querySelectorAll('.series-nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 1200) {
      document.querySelector('.series-nav').classList.remove('mobile-open');
    }
  });
});
```

---

## 4. Section Cards

### HTML Structure

```html
<article class="section-card" id="section-pwm">
  <!-- Card header - clickable to expand/collapse -->
  <div class="card-header" onclick="toggleCard(this)" role="button" tabindex="0"
       aria-expanded="false" aria-controls="card-body-pwm">
    <!-- Index number -->
    <div class="card-index">01</div>

    <!-- Card info block -->
    <div class="card-info">
      <div class="card-pattern-label">Playhead / Sweep</div>
      <h2 class="card-title">PWM Generation</h2>
      <p class="card-summary">Pulse-width modulation timing visualization</p>
    </div>

    <!-- Expand icon (SVG triangle) -->
    <svg class="card-expand-icon" width="12" height="12" viewBox="0 0 12 12">
      <path d="M 2 2 L 10 6 L 2 10 Z" fill="currentColor"/>
    </svg>
  </div>

  <!-- Card body - collapsible content -->
  <div class="card-body" id="card-body-pwm">
    <div class="card-content">
      <!-- Content block with heading and text -->
      <div class="content-block">
        <h3>// Overview</h3>
        <p>Explanatory paragraph about the topic...</p>
        <ul>
          <li>List item with details</li>
          <li>Another point</li>
        </ul>
      </div>

      <!-- Visualization container -->
      <div class="viz-container" id="pwmViz">
        <div class="viz-header">
          <div class="viz-label">PWM Timing</div>
          <div class="viz-controls">
            <button class="viz-btn" onclick="togglePWM()">Pause</button>
            <button class="viz-btn" onclick="resetPWM()">Reset</button>
          </div>
        </div>
        <div class="viz-canvas">
          <!-- Visualization content -->
        </div>
      </div>

      <!-- Code block -->
      <div class="content-block">
        <h3>// Implementation</h3>
        <div class="code-block">
<span class="cmt">// Configure timer</span>
<span class="type">ledc_timer_config_t</span> timer = {
    .<span class="fn">speed_mode</span> = <span class="macro">LEDC_LOW_SPEED_MODE</span>,
    .<span class="fn">freq_hz</span>    = <span class="num">5000</span>,
};</div>
      </div>

      <!-- Deep dive button -->
      <button class="deep-dive-btn" onclick="openModal('pwm-modal')">
        Explore Implementation Details
      </button>
    </div>
  </div>
</article>

<!-- Category header (placed between cards) -->
<div class="category-header">
  Category Name
  <span class="pad-dot"></span>
</div>
```

### CSS

```css
.section-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  position: relative;
  transition: all var(--transition-fast);
}

/* Left accent bar */
.section-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--copper);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.section-card:hover::before,
.section-card.expanded::before {
  opacity: 1;
}

.section-card:hover {
  border-color: var(--copper-dim);
  box-shadow: 0 0 12px var(--copper-faint);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  cursor: pointer;
  user-select: none;
}

.card-header:hover .card-title {
  color: var(--copper);
}

.card-index {
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 600;
  color: var(--copper-dim);
  text-shadow: 0 0 8px var(--copper-glow);
  flex-shrink: 0;
}

.card-info {
  flex: 1;
}

.card-pattern-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--blue);
  margin-bottom: 4px;
}

.card-title {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 500;
  color: var(--copper);
  text-shadow: 0 0 6px rgba(212,146,75,0.15);
  margin: 0 0 4px;
  transition: color var(--transition-fast);
}

.card-summary {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.card-expand-icon {
  flex-shrink: 0;
  color: var(--copper-dim);
  transition: transform var(--transition-med);
}

.section-card.expanded .card-expand-icon {
  transform: rotate(90deg);
}

.card-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--transition-slow);
}

.section-card.expanded .card-body {
  max-height: 8000px;
}

.card-content {
  padding: 0 24px 32px;
  border-top: 1px solid var(--border-color);
}

.category-header {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--copper);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 32px 0 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.category-header::before {
  content: '';
  width: 24px;
  height: 2px;
  background: var(--copper);
  box-shadow: 0 0 4px var(--copper-glow);
}

.category-header .pad-dot {
  margin-left: auto;
}
```

---

## 5. Content Blocks

### HTML & CSS

```html
<div class="content-block">
  <h3>// Section Heading</h3>
  <p>Paragraph text with line-height 1.8 for readability...</p>

  <ul>
    <li>List item with diamond bullet</li>
    <li>Another point in the list</li>
  </ul>

  <div class="warn">
    Critical information or warning callout
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Column 1</th>
        <th>Column 2</th>
        <th>Column 3</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data value</td>
        <td>Data value</td>
        <td>Data value</td>
      </tr>
    </tbody>
  </table>
</div>
```

```css
.content-block {
  margin-top: 24px;
}

.content-block h3 {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  color: var(--copper);
  text-shadow: 0 0 8px rgba(212,146,75,0.15);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.content-block h3::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--copper);
  box-shadow: 0 0 4px var(--copper-glow);
}

.content-block p {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.content-block ul {
  list-style: none;
  margin: 12px 0;
  padding: 0;
}

.content-block li {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-primary);
  padding-left: 20px;
  position: relative;
  margin-bottom: 8px;
}

.content-block li::before {
  content: '\25C6';
  position: absolute;
  left: 0;
  color: var(--copper-dim);
}

.warn {
  border-left: 3px solid var(--red);
  background: var(--red-faint);
  padding: 12px 16px;
  margin: 16px 0;
  border-radius: 2px;
}

.warn::before {
  content: 'NOTE: ';
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--red);
  letter-spacing: 1px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 13px;
}

.data-table thead {
  background: var(--bg-secondary);
}

.data-table th {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--copper);
  text-align: left;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
}

.data-table td {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.data-table tbody tr:hover {
  background: var(--copper-faint);
}
```

---

## 6. Footer

### HTML & CSS

```html
<footer class="site-footer">
  <span class="pad-dot sm"></span>
  <span class="pad-dot sm"></span>
  <span class="pad-dot sm"></span>

  <div class="footer-links">
    <a href="#docs">Documentation</a>
    <span class="footer-separator">|</span>
    <a href="#source">Source Code</a>
    <span class="footer-separator">|</span>
    <a href="#license">License</a>
  </div>

  <div class="footer-copyright">
    Built with Claude Code Technical Visualizer
  </div>
</footer>
```

```css
.site-footer {
  padding: 48px 24px 32px;
  text-align: center;
  border-top: 1px solid var(--border-color);
  margin-top: 80px;
}

.site-footer .pad-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--copper);
  box-shadow: 0 0 4px var(--copper-glow);
  margin: 0 8px 16px;
}

.site-footer .pad-dot.sm {
  width: 5px;
  height: 5px;
}

.footer-links {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.footer-links a {
  color: var(--copper-dim);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: var(--copper);
  text-shadow: 0 0 8px var(--copper-glow);
}

.footer-separator {
  margin: 0 12px;
  color: var(--text-dim);
}

.footer-copyright {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-dim);
}
```

---

## 7. Responsive Design

### Three Breakpoints

```css
/* Hide right sidebar on medium screens */
@media (max-width: 1400px) {
  .page-toc { display: none; }
  .main-content { margin-right: 0; }
}

/* Collapse left sidebar to hamburger on narrow screens */
@media (max-width: 1200px) {
  .series-nav {
    transform: translateX(-100%);
    width: var(--series-nav-width);
  }
  .series-nav.mobile-open { transform: translateX(0); }
  .main-content { margin-left: 0 !important; margin-right: 0; }
  .mobile-nav-btn { display: flex !important; }
}

/* Mobile layout adjustments */
@media (max-width: 768px) {
  .hero { padding: 60px 24px 48px; }
  .hero-stats { gap: 32px; }
  .sections-container { padding: 24px 16px 48px; }
  .card-header { padding: 16px; }
  .card-content { padding: 0 16px 24px; }
  .viz-label { font-size: 10px; }
  .modal { width: min(720px, 95vw); max-height: 90vh; }
}
```

### Mobile Navigation Button

```css
.mobile-nav-btn {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 101;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 2px;
  color: var(--copper);
  font-size: 18px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-nav-btn:hover {
  border-color: var(--copper-dim);
  box-shadow: 0 0 8px var(--copper-faint);
}
```

### Fluid Typography

Hero uses clamp() for responsive text sizing:

```css
.hero-title {
  font-size: clamp(32px, 6vw, 56px);
}

.hero-subtitle {
  font-size: clamp(14px, 2vw, 18px);
}
```

### Modal Responsive Sizing

```css
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(720px, 90vw);
  max-height: 85vh;
  background: var(--bg-modal);
  border: 1px solid var(--copper-dim);
  border-radius: 2px;
  box-shadow:
    0 0 30px var(--copper-faint),
    0 0 60px rgba(0,0,0,0.8);
  z-index: var(--z-modal);
  display: none;
}

.modal.visible {
  display: block;
  animation: modal-appear 0.3s ease;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

---

## 8. Initialization Pattern

### JavaScript Setup

```javascript
// Global state
let motionReduced = false;

// Intersection observer for visualizations
const vizObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = entry.target.id;

    if (entry.isIntersecting) {
      // Start animation for this visualization
      if (id === 'pwmViz') startPWM();
      else if (id === 'spiViz') startSPI();
      // ... handle all viz types
    } else {
      // Stop animation when out of view
      if (id === 'pwmViz') stopPWM();
      else if (id === 'spiViz') stopSPI();
      // ... handle all viz types
    }
  });
}, { threshold: 0.1 });

// Card expand/collapse
function toggleCard(header) {
  const card = header.closest('.section-card');
  const isExpanded = card.classList.toggle('expanded');
  header.setAttribute('aria-expanded', isExpanded);
}

// Modal system
function openModal(templateId) {
  const template = document.getElementById(templateId);
  const modalBody = document.getElementById('modalBody');
  const modal = document.getElementById('modal');
  const backdrop = document.getElementById('modalBackdrop');

  modalBody.innerHTML = '';
  modalBody.appendChild(template.content.cloneNode(true));

  modal.classList.add('visible');
  backdrop.classList.add('visible');

  // Focus management
  modal.querySelector('.modal-close')?.focus();
}

function closeModal() {
  document.getElementById('modal').classList.remove('visible');
  document.getElementById('modalBackdrop').classList.remove('visible');
}

// Keyboard handlers
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Motion toggle
function toggleMotion() {
  motionReduced = !motionReduced;
  document.body.classList.toggle('reduce-motion', motionReduced);
}

// Main initialization
function init() {
  // Check system motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    motionReduced = true;
    document.body.classList.add('reduce-motion');
  }

  // Initialize all visualizations
  initPWM();
  initSPI();
  // ... init all viz types

  // Observe all viz containers
  document.querySelectorAll('.viz-container').forEach(container => {
    vizObserver.observe(container);
  });

  // Set up page TOC and scrollspy
  initPageToc();
  initScrollspy();

  // Resize handler for canvas/SVG elements
  window.addEventListener('resize', () => {
    // Redraw visualizations that need resize handling
    if (typeof resizeI2C === 'function') resizeI2C();
    if (typeof resizeBlockDiagram === 'function') resizeBlockDiagram();
  });

  // Open first card by default
  const firstCard = document.querySelector('.section-card');
  if (firstCard) {
    firstCard.classList.add('expanded');
    firstCard.querySelector('.card-header')?.setAttribute('aria-expanded', 'true');
  }
}

// Start when DOM ready
document.addEventListener('DOMContentLoaded', init);
```

### Visualization Animation Pattern

Every visualization follows this structure:

```javascript
// Per-visualization state
let pwmPlaying = true;
let pwmAnimId = null;
let pwmPosition = 0;
let pwmLastTime = 0;
const PWM_SPEED = 0.15;

function initPWM() {
  // Build static UI elements
  const container = document.getElementById('pwmViz').querySelector('.viz-canvas');
  // ... create DOM structure
}

function startPWM() {
  if (pwmAnimId) return;
  pwmLastTime = 0;
  pwmAnimId = requestAnimationFrame(stepPWM);
}

function stopPWM() {
  if (pwmAnimId) {
    cancelAnimationFrame(pwmAnimId);
    pwmAnimId = null;
  }
}

function stepPWM(timestamp) {
  if (!pwmLastTime) pwmLastTime = timestamp;
  const dt = (timestamp - pwmLastTime) / 1000;
  pwmLastTime = timestamp;

  // Update position if playing and motion enabled
  if (pwmPlaying && !motionReduced) {
    pwmPosition += PWM_SPEED * dt;
    if (pwmPosition >= 1) pwmPosition = 0;
  }

  renderPWM();
  pwmAnimId = requestAnimationFrame(stepPWM);
}

function renderPWM() {
  // Update DOM based on current state
  // ...
}

function togglePWM() {
  pwmPlaying = !pwmPlaying;
  const btn = document.querySelector('#pwmViz .viz-btn');
  btn.textContent = pwmPlaying ? 'Pause' : 'Play';
  btn.classList.toggle('active', pwmPlaying);
}

function resetPWM() {
  pwmPosition = 0;
  pwmLastTime = 0;
  renderPWM();
}
```
