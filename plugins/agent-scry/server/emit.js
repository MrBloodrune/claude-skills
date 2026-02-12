import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, renameSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { request } from 'node:http';
import { extractTaskData, extractPlanData } from './tasks.js';

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

const hash = (str) => createHash('sha256').update(str).digest('hex').slice(0, 12);

function buildEvent(payload) {
  const sessionId = payload.session_id || process.env.CLAUDE_SESSION_ID || `ses_${Date.now()}`;
  const now = Date.now();
  const toolInput = payload.tool_input || {};

  const event = {
    id: `evt_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    session_id: sessionId,
    event_type: eventType,
    timestamp: now,
  };

  if (eventType === 'session_start') {
    return Object.assign(event, { agent_id: 'ag_main', agent_label: 'main', transcript_path: payload.transcript_path || null, model: payload.model || null, cwd: payload.cwd || null, source: payload.source || null });
  }
  if (eventType === 'compaction') {
    return Object.assign(event, { agent_id: 'ag_main', trigger: payload.trigger || 'auto', cwd: payload.cwd || null });
  }
  if (eventType === 'session_end') { event.agent_id = 'ag_main'; event.cwd = payload.cwd || null; event.reason = payload.reason || null; return event; }

  if (eventType === 'user_prompt') {
    return Object.assign(event, {
      agent_id: 'ag_main',
      prompt_text: payload.prompt || '',
      cwd: payload.cwd || null,
    });
  }
  if (eventType === 'agent_stop') {
    return Object.assign(event, {
      agent_id: 'ag_main',
      stop_hook_active: payload.stop_hook_active || false,
      cwd: payload.cwd || null,
    });
  }

  if (eventType === 'tool_start' || eventType === 'tool_end') {
    event.tool_name = payload.tool_name || 'unknown';
    event.tool_params_summary = summarizeParams(toolInput);
    event.agent_id = payload.agent_id || 'ag_main';
    event.agent_label = payload.agent_label || 'main';
    event.tool_use_id = payload.tool_use_id || null;
    event.cwd = payload.cwd || null;

    if (eventType === 'tool_start' && event.tool_name === 'Task') {
      const desc = toolInput.description || toolInput.prompt || '';
      const agentType = toolInput.subagent_type || 'general-purpose';
      const agentId = `ag_${hash(sessionId + now + desc)}`;
      const model = toolInput.model || null;
      const pendingFile = join(PENDING_DIR, `${agentType}-${agentId}.json`);
      writeFileSync(pendingFile, JSON.stringify({
        agent_id: agentId,
        parent_agent_id: event.agent_id,
        agent_label: agentType,
        task_description: desc,
        model,
        timestamp: now,
        session_id: event.session_id,
      }));
      event.spawns_agent_id = agentId;
      event.agent_spawn_label = agentType;
      event.agent_spawn_task = desc;
      if (model) event.agent_spawn_model = model;
    }

    if (eventType === 'tool_start') {
      const td = extractTaskData(event.tool_name, toolInput, null);
      const pd = extractPlanData(event.tool_name, toolInput);
      if (td) event.task_data = td;
      if (pd) event.plan_data = pd;
    }

    if (eventType === 'tool_end') {
      const resp = payload.tool_response || {};
      event.tokens_in = payload.tokens_in || 0;
      event.tokens_out = payload.tokens_out || 0;
      event.duration_ms = payload.duration_ms || 0;
      const stderr = typeof resp === 'object' ? (resp.stderr || '') : '';
      event.has_error = !!(stderr && stderr.trim());
      const preview = stderr.trim() || (typeof resp === 'string' ? resp : (resp.stdout || resp.output || ''));
      event.tool_response_summary = String(preview).slice(0, 80).replace(/\n/g, ' ');
      const td = extractTaskData(event.tool_name, toolInput, resp);
      if (td) event.task_data = td;
    }
    return event;
  }

  if (eventType === 'agent_complete') {
    const r = matchPending(payload);
    Object.assign(event, {
      agent_id: r?.agent_id || payload.agent_id || 'ag_unknown',
      parent_agent_id: r?.parent_agent_id || payload.parent_agent_id || null,
      agent_label: r?.agent_label || payload.agent_label || 'unknown',
      task_description: r?.task_description || payload.task_description || '',
      model: r?.model || payload.model || null,
      task_tags: payload.task_tags || [], tokens_in: payload.tokens_in || 0,
      tokens_out: payload.tokens_out || 0, duration_ms: payload.duration_ms || 0,
      status: payload.status || 'success', contributes_to: payload.contributes_to || [],
      transcript_path: payload.transcript_path || null,
      agent_transcript_path: payload.agent_transcript_path || null,
    });
    return event;
  }

  return event;
}

const summarizeParams = (ti) => (!ti || typeof ti !== 'object') ? '' : Object.entries(ti).slice(0, 3).map(([k, v]) => `${k}=${String(v).slice(0, 60)}`).join(' ');

function matchPending(payload) {
  if (!existsSync(PENDING_DIR)) return null;
  const files = readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  if (!files.length) return null;
  const label = payload.agent_type || payload.agent_label || payload.subagent_type || '';
  // Sort by creation time (FIFO) for multiple agents of same type
  const match = files.find(f => f.startsWith(label + '-')) || files[0];
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
    }, (res) => { res.resume(); resolve(true); });
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