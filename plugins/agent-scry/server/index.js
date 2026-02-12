import { createServer } from 'node:http';
import { readFileSync, appendFileSync, mkdirSync, readdirSync, existsSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { parseTranscript, listSubagentTranscripts, extractCompactionSummaries } from './transcript.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = parseInt(process.env.OBSERVATORY_PORT || '7847', 10);
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const HOME = process.env.HOME || '/home';
const BASE_DIR = join(HOME, '.claude', 'observatory');
const SESSIONS_DIR = join(BASE_DIR, 'sessions');
const PID_FILE = join(BASE_DIR, 'server.pid');
const DASHBOARD_PATH = join(__dirname, '..', 'dashboard', 'index.html');

mkdirSync(SESSIONS_DIR, { recursive: true });

const bus = new EventEmitter();
bus.setMaxListeners(100);

let currentSessionId = null;
let lastEventTime = Date.now();
const startTime = Date.now();
const agentTranscripts = new Map();

function sessionPath(sid) {
  const safe = String(sid).replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(SESSIONS_DIR, `${safe}.jsonl`);
}

function readSessionEvents(sid) {
  const p = sessionPath(sid);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}

function sessionMeta(sid, file) {
  const p = join(SESSIONS_DIR, file);
  try {
    const raw = readFileSync(p, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    if (lines.length === 0) return { id: sid, project: null, startTime: statSync(p).mtimeMs, active: true };
    const first = JSON.parse(lines[0]);
    const last = lines.length > 1 ? JSON.parse(lines[lines.length - 1]) : first;
    const cwd = first.cwd || null;
    return {
      id: sid,
      project: cwd ? cwd.split('/').pop() : null,
      cwd,
      startTime: first.timestamp || statSync(p).mtimeMs,
      active: last.event_type !== 'session_end',
      model: first.model || null,
    };
  } catch { return { id: sid, project: null, startTime: 0, active: true }; }
}

function parseBody(req, maxBytes = 1_048_576) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > maxBytes) { req.destroy(); return reject(new Error('Body too large')); }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function isAllowedTranscriptPath(tpath) {
  const home = process.env.HOME || '/home';
  const resolved = resolve(tpath);
  const allowedBase = resolve(join(home, '.claude', 'projects'));
  if (resolved.startsWith(allowedBase + '/')) return true;
  for (const known of agentTranscripts.values()) {
    const knownDir = resolve(dirname(known));
    if (resolved === resolve(known) || resolved.startsWith(knownDir + '/')) return true;
  }
  return false;
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'POST' && path === '/api/events') {
    let event;
    try { event = await parseBody(req); }
    catch { return json(res, 400, { error: 'Invalid JSON' }); }

    if (!event.event_type || !event.timestamp) {
      return json(res, 400, { error: 'Missing event_type or timestamp' });
    }

    const sid = event.session_id || currentSessionId || `ses_${Date.now()}`;
    if (!currentSessionId) currentSessionId = sid;
    event.session_id = sid;

    appendFileSync(sessionPath(sid), JSON.stringify(event) + '\n');
    lastEventTime = Date.now();
    if (event.transcript_path) {
      const key = event.agent_id || (event.event_type === 'session_start' ? 'ag_main' : null);
      if (key) agentTranscripts.set(key, event.transcript_path);
    }
    bus.emit('event', event);
    return json(res, 201, { ok: true, id: event.id });
  }

  if (req.method === 'GET' && path === '/api/events') {
    cors(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(':ok\n\n');

    const onEvent = (event) => {
      res.write(`event: message\ndata: ${JSON.stringify(event)}\n\n`);
    };
    bus.on('event', onEvent);
    req.on('close', () => bus.off('event', onEvent));
    return;
  }

  if (req.method === 'GET' && path === '/api/session') {
    const sid = url.searchParams.get('id') || currentSessionId;
    if (!sid) return json(res, 200, []);
    return json(res, 200, readSessionEvents(sid));
  }

  if (req.method === 'GET' && path === '/api/sessions') {
    if (!existsSync(SESSIONS_DIR)) return json(res, 200, []);
    const sessions = readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => sessionMeta(f.replace('.jsonl', ''), f))
      .sort((a, b) => b.startTime - a.startTime);
    return json(res, 200, sessions);
  }

  if (req.method === 'GET' && path === '/api/health') {
    return json(res, 200, { status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000) });
  }

  if (req.method === 'GET' && path === '/api/transcript') {
    const tpath = url.searchParams.get('path');
    if (!tpath) return json(res, 400, { error: 'Missing path parameter' });
    if (!isAllowedTranscriptPath(tpath)) return json(res, 403, { error: 'Path outside allowed directory' });
    const data = parseTranscript(tpath);
    if (!data) return json(res, 404, { error: 'Transcript not found' });
    return json(res, 200, data);
  }

  if (req.method === 'GET' && path === '/api/subagents') {
    const tpath = url.searchParams.get('transcript');
    if (!tpath) return json(res, 400, { error: 'Missing transcript parameter' });
    if (!isAllowedTranscriptPath(tpath)) return json(res, 403, { error: 'Path outside allowed directory' });
    return json(res, 200, listSubagentTranscripts(tpath));
  }

  if (req.method === 'GET' && path === '/api/compaction-summary') {
    const tpath = url.searchParams.get('path');
    const idx = parseInt(url.searchParams.get('index') || '0', 10);
    if (!tpath) return json(res, 400, { error: 'Missing path parameter' });
    if (!isAllowedTranscriptPath(tpath)) return json(res, 403, { error: 'Path outside allowed directory' });
    const summaries = extractCompactionSummaries(tpath);
    const entry = summaries.find(s => s.index === idx);
    if (!entry) return json(res, 404, { error: 'Compaction summary not found' });
    return json(res, 200, { summary: entry.text, index: entry.index });
  }

  if (req.method === 'GET' && path === '/api/agent-transcripts') {
    return json(res, 200, Object.fromEntries(agentTranscripts));
  }

  if (req.method === 'GET' && path === '/api/memory') {
    const project = url.searchParams.get('project');
    if (!project) return json(res, 400, { error: 'Missing project parameter' });
    const slug = project.replace(/\//g, '-');
    const home = process.env.HOME || '/home';
    const memPath = join(home, '.claude', 'projects', slug, 'memory', 'MEMORY.md');
    try {
      const content = readFileSync(memPath, 'utf8');
      const lineCount = content.split('\n').length;
      return json(res, 200, { content, path: memPath, lineCount });
    } catch {
      return json(res, 404, { error: 'MEMORY.md not found', path: memPath });
    }
  }

  if (req.method === 'GET' && path === '/api/claude-md') {
    const project = url.searchParams.get('project');
    if (!project) return json(res, 400, { error: 'Missing project parameter' });
    const slug = project.replace(/\//g, '-');
    const home = process.env.HOME || '/home';
    // Check project-specific CLAUDE.md first, then project root
    const projectClaudePath = join(home, '.claude', 'projects', slug, 'CLAUDE.md');
    const rootClaudePath = join(project, 'CLAUDE.md');
    const resolvedRoot = resolve(rootClaudePath);
    if (!resolvedRoot.startsWith(resolve(project) + '/')) {
      return json(res, 403, { error: 'Invalid project path' });
    }
    for (const p of [projectClaudePath, rootClaudePath]) {
      try {
        const content = readFileSync(p, 'utf8');
        const lineCount = content.split('\n').length;
        return json(res, 200, { content, path: p, lineCount });
      } catch {}
    }
    return json(res, 404, { error: 'CLAUDE.md not found', paths: [projectClaudePath, rootClaudePath] });
  }

  if (req.method === 'GET' && path === '/') {
    cors(res);
    try {
      const html = readFileSync(DASHBOARD_PATH, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(html);
    } catch {
      res.writeHead(404);
      return res.end('Dashboard not found');
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  writeFileSync(PID_FILE, process.pid.toString());
  console.log(`Observatory server listening on http://localhost:${PORT}`);
  console.log(`PID ${process.pid} written to ${PID_FILE}`);
});

const idleCheck = setInterval(() => {
  if (Date.now() - lastEventTime > IDLE_TIMEOUT_MS) {
    console.log('Idle timeout reached, shutting down.');
    cleanup();
  }
}, 60_000);

function cleanup() {
  clearInterval(idleCheck);
  try { unlinkSync(PID_FILE); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
