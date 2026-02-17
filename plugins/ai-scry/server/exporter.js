import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, renameSync, appendFileSync, existsSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { request } from 'node:http';
import { extractTaskData, extractPlanData } from './tasks.js';
import { createInterface } from 'node:readline';
import { hostname } from 'node:os';

const HOME = process.env.HOME || '/home';
const BASE_DIR = join(HOME, '.claude', 'observatory');
const SESSIONS_DIR = join(BASE_DIR, 'sessions');
const PENDING_DIR = join(BASE_DIR, 'pending');
const RESOLVED_DIR = join(BASE_DIR, 'resolved');
const ALLOY_HOST = process.env.ALLOY_HOST || '127.0.0.1';
const ALLOY_PORT = parseInt(process.env.ALLOY_PORT || '4318', 10);

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
  if (eventType === 'agent_start') {
    return Object.assign(event, {
      agent_id: payload.agent_id || 'ag_unknown',
      agent_type: payload.agent_type || 'unknown',
      cwd: payload.cwd || null,
    });
  }
  if (eventType === 'tool_error') {
    return Object.assign(event, {
      tool_name: payload.tool_name || 'unknown',
      tool_use_id: payload.tool_use_id || null,
      tool_params_summary: summarizeParams(toolInput),
      agent_id: payload.agent_id || 'ag_main',
      error: typeof payload.error === 'string' ? payload.error.slice(0, 200) : (typeof payload.tool_response === 'string' ? payload.tool_response.slice(0, 200) : ''),
      cwd: payload.cwd || null,
    });
  }
  if (eventType === 'permission_request') {
    return Object.assign(event, {
      agent_id: 'ag_main',
      tool_name: payload.tool_name || null,
      cwd: payload.cwd || null,
    });
  }
  if (eventType === 'notification') {
    return Object.assign(event, { agent_id: 'ag_main', cwd: payload.cwd || null });
  }
  if (eventType === 'task_completed') {
    return Object.assign(event, { agent_id: 'ag_main', cwd: payload.cwd || null });
  }
  if (eventType === 'teammate_idle') {
    return Object.assign(event, { agent_id: payload.agent_id || 'ag_main', agent_type: payload.agent_type || null, cwd: payload.cwd || null });
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
  const match = files.find(f => f.startsWith(label + '-')) || files[0];
  const src = join(PENDING_DIR, match);
  const dst = join(RESOLVED_DIR, match);
  try {
    renameSync(src, dst);
    return JSON.parse(readFileSync(dst, 'utf8'));
  } catch {
    return null;
  }
}

// --- OTLP Transport ---

function flattenAttributes(event) {
  const attrs = [];
  const add = (key, value) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        attrs.push({ key, value: { intValue: String(value) } });
      } else {
        attrs.push({ key, value: { doubleValue: value } });
      }
    } else if (typeof value === 'boolean') {
      attrs.push({ key, value: { boolValue: value } });
    } else if (Array.isArray(value)) {
      attrs.push({ key, value: { stringValue: value.join(',') } });
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        add(`${key}_${k}`, v);
      }
    } else {
      attrs.push({ key, value: { stringValue: String(value) } });
    }
  };
  for (const [k, v] of Object.entries(event)) {
    if (k === 'id' || k === 'event_type' || k === 'timestamp') continue;
    add(k, v);
  }
  return attrs;
}

function buildOtlpLogRecord(event) {
  return {
    timeUnixNano: String(event.timestamp * 1_000_000),
    severityNumber: 9,
    severityText: 'INFO',
    body: { stringValue: `ai_scry.${event.event_type}` },
    attributes: [
      { key: 'event_id', value: { stringValue: event.id } },
      ...flattenAttributes(event),
    ],
    traceId: '',
    spanId: '',
  };
}

function buildOtlpPayload(logRecords) {
  return {
    resourceLogs: [{
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'ai-scry' } },
          { key: 'host.name', value: { stringValue: hostname() } },
        ],
      },
      scopeLogs: [{
        scope: { name: 'ai-scry.hooks' },
        logRecords,
      }],
    }],
  };
}

function postToAlloy(payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve) => {
    const req = request({
      hostname: ALLOY_HOST, port: ALLOY_PORT, path: '/v1/logs',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 2000,
    }, (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end(body);
  });
}

async function parseTranscriptToolIds(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return [];
  const ids = [];
  const rl = createInterface({ input: createReadStream(transcriptPath, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.type !== 'assistant') continue;
    const content = obj.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'tool_use' && block.id) ids.push(block.id);
    }
  }
  return ids;
}

function writeJsonl(event) {
  const safeSid = String(event.session_id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  appendFileSync(join(SESSIONS_DIR, `${safeSid}.jsonl`), JSON.stringify(event) + '\n');
}

async function sendEvent(event) {
  const record = buildOtlpLogRecord(event);
  return { record, event };
}

async function sendBatch(logRecords, events) {
  // Always write JSONL locally
  for (const evt of events) writeJsonl(evt);
  // POST OTLP to Alloy
  const payload = buildOtlpPayload(logRecords);
  await postToAlloy(payload);
}

async function processEvent(payload) {
  const event = buildEvent(payload);
  const { record } = await sendEvent(event);
  const logRecords = [record];
  const events = [event];

  // After agent_complete, parse transcript and emit attribution — batched into same OTLP request
  if (eventType === 'agent_complete' && event.agent_transcript_path) {
    try {
      const toolUseIds = await parseTranscriptToolIds(event.agent_transcript_path);
      if (toolUseIds.length) {
        const attrEvent = {
          id: `evt_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
          session_id: event.session_id,
          event_type: 'attribution',
          timestamp: Date.now(),
          agent_id: event.agent_id,
          tool_use_ids: toolUseIds,
        };
        logRecords.push(buildOtlpLogRecord(attrEvent));
        events.push(attrEvent);
      }
    } catch { /* transcript unreadable — skip attribution */ }
  }

  await sendBatch(logRecords, events);
}
