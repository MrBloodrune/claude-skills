import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, renameSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { request } from 'node:http';

const BASE_DIR = join(process.env.HOME, '.claude', 'observatory');
const SESSIONS_DIR = join(BASE_DIR, 'sessions');
const PENDING_DIR = join(BASE_DIR, 'pending');
const RESOLVED_DIR = join(BASE_DIR, 'resolved');
const PORT = parseInt(process.env.OBSERVATORY_PORT || '7847', 10);

[PENDING_DIR, RESOLVED_DIR, SESSIONS_DIR].forEach(d => mkdirSync(d, { recursive: true }));

const eventType = process.argv[2];
if (!eventType) process.exit(1);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let payload;
  try { payload = JSON.parse(input); } catch { payload = {}; }
  processEvent(payload);
});

function hash(str) {
  return createHash('sha256').update(str).digest('hex').slice(0, 12);
}

function buildEvent(payload) {
  const sessionId = payload.session_id || process.env.CLAUDE_SESSION_ID || `ses_${Date.now()}`;
  const now = Date.now();

  const event = {
    id: `evt_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    session_id: sessionId,
    event_type: eventType,
    timestamp: now,
  };

  if (eventType === 'session_start') {
    event.agent_id = `ag_main`;
    event.agent_label = 'main';
    return event;
  }

  if (eventType === 'tool_start' || eventType === 'tool_end') {
    event.tool_name = payload.tool_name || payload.tool || 'unknown';
    event.tool_params_summary = payload.tool_params_summary || summarizeParams(payload);
    event.agent_id = payload.agent_id || 'ag_main';
    event.agent_label = payload.agent_label || 'main';

    if (eventType === 'tool_start' && event.tool_name === 'Task') {
      const desc = payload.description || payload.prompt || '';
      const agentId = `ag_${hash(sessionId + now + desc)}`;
      const agentLabel = payload.subagent_type || 'general-purpose';
      const pendingFile = join(PENDING_DIR, `${agentLabel}-${agentId}.json`);
      writeFileSync(pendingFile, JSON.stringify({
        agent_id: agentId,
        parent_agent_id: event.agent_id,
        agent_label: agentLabel,
        task_description: desc,
        timestamp: now,
        session_id: event.session_id,
      }));
      event.spawns_agent_id = agentId;
    }

    if (eventType === 'tool_end') {
      event.tokens_in = payload.tokens_in || 0;
      event.tokens_out = payload.tokens_out || 0;
      event.duration_ms = payload.duration_ms || 0;
    }
    return event;
  }

  if (eventType === 'agent_spawn') {
    event.agent_id = payload.agent_id || `ag_${hash(sessionId + now)}`;
    event.parent_agent_id = payload.parent_agent_id || null;
    event.agent_label = payload.agent_label || 'general-purpose';
    event.task_description = payload.task_description || '';
    event.task_tags = payload.task_tags || [];
    return event;
  }

  if (eventType === 'agent_complete') {
    const resolved = matchPending(payload);
    event.agent_id = resolved?.agent_id || payload.agent_id || 'ag_unknown';
    event.parent_agent_id = resolved?.parent_agent_id || payload.parent_agent_id || null;
    event.agent_label = resolved?.agent_label || payload.agent_label || 'unknown';
    event.task_description = resolved?.task_description || payload.task_description || '';
    event.task_tags = payload.task_tags || [];
    event.tokens_in = payload.tokens_in || 0;
    event.tokens_out = payload.tokens_out || 0;
    event.duration_ms = payload.duration_ms || 0;
    event.status = payload.status || 'success';
    event.contributes_to = payload.contributes_to || [];
    return event;
  }

  return event;
}

function summarizeParams(payload) {
  const params = payload.tool_params || payload.input || {};
  if (typeof params === 'string') return params.slice(0, 100);
  const entries = Object.entries(params).slice(0, 3);
  return entries.map(([k, v]) => `${k}=${String(v).slice(0, 50)}`).join(' ');
}

function matchPending(payload) {
  if (!existsSync(PENDING_DIR)) return null;
  const files = readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) return null;

  const agentLabel = payload.agent_label || payload.subagent_type || '';
  const match = files.find(f => f.startsWith(agentLabel + '-')) || files[files.length - 1];

  const data = JSON.parse(readFileSync(join(PENDING_DIR, match), 'utf8'));
  renameSync(join(PENDING_DIR, match), join(RESOLVED_DIR, match));
  return data;
}

function postToServer(event) {
  const body = JSON.stringify(event);
  return new Promise((resolve) => {
    const req = request({
      hostname: 'localhost', port: PORT, path: '/api/events',
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 3000,
    }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end(body);
  });
}

async function processEvent(payload) {
  const event = buildEvent(payload);
  const sent = await postToServer(event);
  if (!sent) appendFileSync(join(SESSIONS_DIR, `${event.session_id || 'unknown'}.jsonl`), JSON.stringify(event) + '\n');
}
