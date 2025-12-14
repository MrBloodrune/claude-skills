# Browser Runtimes

Advanced computation in single-file HTML tools using Pyodide (Python) and WebAssembly.

## Pyodide (Python in Browser)

Run Python code client-side with full NumPy/Pandas/etc support.

### Basic Setup

```html
<script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>
<script>
let pyodide;

async function initPyodide() {
    pyodide = await loadPyodide();
    // Load packages as needed
    await pyodide.loadPackage(['numpy', 'pandas']);
}

async function runPython(code) {
    return await pyodide.runPythonAsync(code);
}

initPyodide();
</script>
```

### Loading Packages

```javascript
// Common packages available:
await pyodide.loadPackage('numpy');
await pyodide.loadPackage('pandas');
await pyodide.loadPackage('matplotlib');
await pyodide.loadPackage('scikit-learn');
await pyodide.loadPackage('pillow');  // Image processing

// Install from PyPI (micropip)
await pyodide.loadPackage('micropip');
const micropip = pyodide.pyimport('micropip');
await micropip.install('some-pure-python-package');
```

### JS ↔ Python Data Exchange

```javascript
// JS → Python
pyodide.globals.set('data', [1, 2, 3, 4, 5]);
await pyodide.runPythonAsync(`
    import numpy as np
    arr = np.array(data)
    result = arr.mean()
`);

// Python → JS
const result = pyodide.globals.get('result');

// Convert Python objects to JS
const pyList = pyodide.runPython('[1, 2, 3]');
const jsArray = pyList.toJs();
```

### File Processing Example

```javascript
async function processCSV(file) {
    const text = await file.text();
    pyodide.globals.set('csv_text', text);

    const result = await pyodide.runPythonAsync(`
        import pandas as pd
        from io import StringIO

        df = pd.read_csv(StringIO(csv_text))
        summary = df.describe().to_html()
        summary
    `);

    document.getElementById('output').innerHTML = result;
}
```

### Loading Indicator Pattern

```javascript
async function initWithProgress() {
    const status = document.getElementById('status');
    status.textContent = 'Loading Python runtime...';

    pyodide = await loadPyodide({
        stdout: (text) => console.log(text),
        stderr: (text) => console.error(text)
    });

    status.textContent = 'Loading packages...';
    await pyodide.loadPackage(['numpy', 'pandas']);

    status.textContent = 'Ready!';
    document.getElementById('run-btn').disabled = false;
}
```

## WebAssembly (WASM)

High-performance compiled code in the browser.

### Loading Pre-built WASM

```javascript
// Many libraries provide WASM builds via CDN
// Example: SQLite
<script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js"></script>

// Example: FFmpeg (video processing)
<script src="https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/umd/ffmpeg.js"></script>

// Example: Tesseract.js (OCR)
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
```

### SQL.js (SQLite in Browser)

```javascript
const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
});

const db = new SQL.Database();
db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
db.run('INSERT INTO test VALUES (1, "hello")');

const results = db.exec('SELECT * FROM test');
console.log(results[0].values);  // [[1, "hello"]]
```

### Tesseract.js (OCR)

```javascript
const { createWorker } = Tesseract;

async function recognizeText(imageFile) {
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();
    return text;
}
```

### FFmpeg (Video/Audio Processing)

```javascript
const { FFmpeg } = FFmpegWASM;
const ffmpeg = new FFmpeg();

await ffmpeg.load();
await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
await ffmpeg.exec(['-i', 'input.mp4', '-vf', 'scale=320:-1', 'output.gif']);
const data = await ffmpeg.readFile('output.gif');

// Create download link
const blob = new Blob([data.buffer], { type: 'image/gif' });
```

## Common WASM Libraries

| Library | CDN | Use Case |
|---------|-----|----------|
| sql.js | cdnjs | SQLite database |
| Tesseract.js | jsdelivr | OCR text extraction |
| FFmpeg.wasm | unpkg | Video/audio processing |
| pdfjs | mozilla | PDF rendering |
| sharp-wasm | unpkg | Image manipulation |
| opencv.js | docs.opencv.org | Computer vision |

## Performance Tips

1. **Lazy load** - Don't load Pyodide/WASM until needed
2. **Web Workers** - Run heavy computation off main thread
3. **Show progress** - These runtimes take seconds to initialize
4. **Cache** - Browsers cache WASM, subsequent loads are fast

### Web Worker Pattern

```javascript
// worker.js
importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');

let pyodide;

self.onmessage = async (e) => {
    if (e.data.type === 'init') {
        pyodide = await loadPyodide();
        self.postMessage({ type: 'ready' });
    } else if (e.data.type === 'run') {
        const result = await pyodide.runPythonAsync(e.data.code);
        self.postMessage({ type: 'result', data: result });
    }
};

// main.js
const worker = new Worker('worker.js');
worker.postMessage({ type: 'init' });
```
