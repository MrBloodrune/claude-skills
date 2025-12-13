# Simon Willison Tool Patterns

Real patterns extracted from https://github.com/simonw/tools

## ES Module Imports from CDN

```html
<script type="module">
import pdfjsDist from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/+esm';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.mjs";
</script>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
```

## Drop Zone Pattern (from ocr.html)

```html
<style>
.dropzone {
  box-sizing: border-box;
  width: 100%;
  height: 10em;
  border: 2px dashed #ccc;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  cursor: pointer;
  padding: 1em;
  margin-bottom: 1em;
}
.dropzone.disabled { cursor: not-allowed; }
.dropzone.drag-over { background-color: pink; }
</style>

<input type="file" id="fileInput" accept=".pdf,.jpg,.jpeg,.png,.gif" style="display: none;" />
<div class="dropzone" id="dropzone">
  Drag and drop a file here or click to select
</div>

<script>
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
let fileSelectionAllowed = true;

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (fileSelectionAllowed) dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  if (fileSelectionAllowed) {
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    fileInput.files = e.dataTransfer.files;
    processFile(file);
  }
});

dropzone.addEventListener('click', () => {
  if (fileSelectionAllowed) fileInput.click();
});

fileInput.addEventListener('change', (e) => processFile(e.target.files[0]));
</script>
```

## Paste Support (from ocr.html)

```javascript
document.addEventListener('paste', (event) => {
  const items = (event.clipboardData || event.originalEvent.clipboardData).items;
  const images = Array.from(items).filter(item => item.type.indexOf('image') !== -1);
  if (images.length) {
    processFile(images[0].getAsFile());
  }
});
```

## URL State with History API (from ocr.html)

```javascript
// Update URL bar to match state
languageSelect.addEventListener('change', async (event) => {
  let newUrl = window.location.pathname;
  let language = event.target.value;
  if (language != 'eng') {
    newUrl += '?language=' + language;
  }
  window.history.pushState({ path: newUrl }, '', newUrl);
});

function setLanguageFromQueryString() {
  const params = new URLSearchParams(window.location.search);
  let value = params.get('language');
  if (!value) value = 'eng';
  languageSelect.value = value;
}

window.addEventListener('load', setLanguageFromQueryString);
window.addEventListener('popstate', setLanguageFromQueryString);
```

## Processing Status Updates (from ocr.html)

```javascript
async function processFile(file) {
  const originalText = dropzone.innerText;
  dropzone.innerText = 'Processing file...';
  dropzone.classList.add('disabled');
  fileSelectionAllowed = false;

  // ... do work ...

  // Progress updates
  dropzone.innerText = `Done ${done} of ${numPages}`;

  // Restore
  dropzone.innerText = originalText;
  dropzone.classList.remove('disabled');
  fileSelectionAllowed = true;
}
```

## Load Example Button (from ocr.html)

```javascript
const EXAMPLE_URL = 'https://example.com/sample.pdf';

async function loadExample() {
  if (!fileSelectionAllowed) return;
  dropzone.innerText = 'Fetching example...';
  dropzone.classList.add('disabled');
  fileSelectionAllowed = false;

  try {
    const response = await fetch(EXAMPLE_URL, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const file = new File([blob], 'example.pdf', { type: 'application/pdf' });
    await processFile(file);
  } catch (err) {
    alert('Failed to load example');
  } finally {
    dropzone.innerText = DROPZONE_DEFAULT_TEXT;
    dropzone.classList.remove('disabled');
    fileSelectionAllowed = true;
  }
}
```

## Accessible Hidden File Input (from image-resize-quality.html)

```html
<style>
.visually-hidden-file {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>

<!-- Label wraps dropzone, clicking anywhere opens file dialog -->
<label id="drop-zone" for="file-input">
  <p>Drop an image here, click to select, or paste</p>
</label>
<input type="file" id="file-input" accept="image/*" class="visually-hidden-file">
```

## Pointer Events for Touch + Mouse (from image-resize-quality.html)

```javascript
element.addEventListener('pointerdown', onPointerDown);

function onPointerDown(e) {
  e.preventDefault();
  dragState = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY
  };
  e.currentTarget.setPointerCapture(e.pointerId);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
  window.addEventListener('pointercancel', onPointerUp, { once: true });
}

function onPointerMove(e) {
  if (!dragState || e.pointerId !== dragState.pointerId) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  // ... handle drag
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove);
  dragState = null;
}
```

## Canvas Image Processing (from image-resize-quality.html)

```javascript
function processImage(img) {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  // Optional: fill background for transparency
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw image (with optional crop)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  // Export as blob
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    // Use url for preview or download
  }, 'image/jpeg', quality);
}
```

## Download Link Generation

```javascript
const downloadLink = document.createElement('a');
downloadLink.href = URL.createObjectURL(blob);
downloadLink.download = `image_${width}x${height}_q${quality}.jpg`;
downloadLink.textContent = 'Download';
container.appendChild(downloadLink);
```

## Transparency Detection (from image-resize-quality.html)

```javascript
function checkTransparency(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true; // Has transparency
      }
    }
    return false;
  } catch (_) {
    return true; // Assume transparent on cross-origin error
  }
}
```

## PDF to Images with pdf.js (from ocr.html)

```javascript
async function convertPDFToImages(file) {
  const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
  const numPages = pdf.numPages;

  async function* images() {
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      const desiredWidth = 1000;
      canvas.width = desiredWidth;
      canvas.height = (desiredWidth / viewport.width) * viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: page.getViewport({ scale: desiredWidth / viewport.width }),
      };
      await page.render(renderContext).promise;

      const imageURL = canvas.toDataURL('image/jpeg', 0.8);
      yield { imageURL };
    }
  }

  return { numPages, imageIterator: images() };
}
```

## Footer Pattern

```html
<p>
  <a href="https://github.com/simonw/tools/blob/main/toolname.html">Source code</a>.
  <a href="https://simonwillison.net/YYYY/Mon/DD/tool-name/">How I built this</a>.
</p>
```

## Basic Page Structure (Simon's Style)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Tool Name</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      padding: 1em;
      font-family: helvetica, sans-serif;
      line-height: 1.3;
    }
    /* ... */
  </style>
</head>
<body>
  <h1>Tool Name</h1>
  <p>This tool runs entirely in your browser. No files are uploaded to a server.</p>

  <!-- Tool UI -->

  <p><a href="https://github.com/...">Source code</a>.</p>
  <script>
    // Tool logic
  </script>
</body>
</html>
```
