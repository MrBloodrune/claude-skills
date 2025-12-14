---
name: html-tools
description: Create single-file HTML tools following Simon Willison's pattern. Use when building browser-based utilities, converters, generators, or interactive tools. Triggers on requests to create HTML tools, web utilities, client-side apps, or tools for tools.netscry.dev. Covers file structure, dark theme styling, CDN dependencies, URL state, localStorage, file handling, and publishing to Cloudflare Pages.
---

# HTML Tools

Create self-contained single-file HTML tools for tools.netscry.dev following Simon Willison's single file pattern.

## Core Principles

1. **Single file** - All HTML, CSS, JS inline. No build step, no imports
2. **No frameworks** - No React/Vue/Angular. Vanilla JS only
3. **CDN dependencies** - Load libraries from CDNs when needed (unpkg, cdnjs, jsdelivr)
4. **Few hundred lines** - Keep tools small and focused
5. **Client-side only** - All processing in browser, nothing sent to servers
6. **Dark theme** - Use Netscry dark color scheme

## Template

Use `assets/template.html` as the starting point. Replace placeholders:
- `{{TOOL_NAME}}` - Tool title
- `{{TOOL_DESCRIPTION}}` - One-line description
- `{{PRIVACY_NOTE}}` - Privacy statement (e.g., "Runs entirely in browser")

## Color Palette

```css
--bg-primary: #0d1117;      /* Main background */
--bg-secondary: #161b22;    /* Container background */
--border: #30363d;          /* Borders */
--text-primary: #c9d1d9;    /* Main text */
--text-secondary: #8b949e;  /* Labels, descriptions */
--text-muted: #484f58;      /* Footer */
--accent: #58a6ff;          /* Headings, links, focus */
--success: #3fb950;         /* Success states */
--error: #f85149;           /* Error states */
--button-primary: #238636;  /* Primary button */
--button-hover: #2ea043;    /* Primary button hover */
--button-secondary: #1f6feb; /* Secondary button */
```

## Browser APIs to Leverage

| Feature | API | Use Case |
|---------|-----|----------|
| URL state | `location.hash`, `URLSearchParams` | Shareable tool states |
| Local storage | `localStorage` | Save preferences, API keys |
| File access | `FileReader`, `<input type="file">` | Process user files |
| Downloads | `Blob`, `URL.createObjectURL` | Generate downloadable files |
| Clipboard | `navigator.clipboard` | Copy/paste functionality |
| Crypto | `crypto.subtle` | Encryption, hashing |
| Canvas | `<canvas>`, `getImageData` | Image processing |

## Common Patterns

See `references/simon-willison-patterns.md` for real code extracted from Simon's tools:
- Drop zone with drag/drop/click/paste support
- Accessible hidden file inputs
- URL state with History API
- Processing status updates
- Pointer events (touch + mouse)
- Canvas image processing
- PDF to images with pdf.js
- Transparency detection

### Quick Reference

```javascript
// Download generated file
function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

// Copy to clipboard
async function copyToClipboard(text) {
    await navigator.clipboard.writeText(text);
}

// URL state
const params = new URLSearchParams(location.search);
history.pushState({}, '', `?${new URLSearchParams(data)}`);
```

## Publishing

Tools are published to tools.netscry.dev via Cloudflare Pages:

1. **Location**: `/home/bloodrune/dev/projects/html_tools/`
2. **Naming**: `toolname.html` (lowercase, hyphen-separated)
3. **Commit**: `git add . && git commit -m "Add toolname tool"`
4. **Push**: `git push` - Cloudflare auto-deploys
5. **URL**: `https://tools.netscry.dev/toolname.html`

## Advanced: Browser Runtimes

For heavy computation, use Pyodide (Python) or WebAssembly. See `references/browser-runtimes.md` for:
- Pyodide setup and package loading (NumPy, Pandas, etc.)
- JS ↔ Python data exchange
- WASM libraries (SQLite, Tesseract OCR, FFmpeg)
- Web Worker patterns for off-thread processing

## Checklist

Before publishing:
- [ ] Single file, no external dependencies except CDN
- [ ] Works offline after loading
- [ ] Dark theme using Netscry palette
- [ ] Footer links to tools.netscry.dev
- [ ] Privacy note accurate (client-side only)
- [ ] Tested in browser
- [ ] Mobile responsive
