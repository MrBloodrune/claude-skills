import { request } from 'node:http';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const PORT = parseInt(process.env.OBSERVATORY_PORT || '7847', 10);
const SESSION_ID = `ses_mock_${Date.now()}`;
const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_TRANSCRIPT = join(__dirname, 'mock-transcript.jsonl');

function post(event) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(event);
    const req = request({
      hostname: 'localhost', port: PORT, path: '/api/events',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end(body);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let eventCounter = 0;
let toolUseCounter = 0;
function evt(overrides) {
  eventCounter++;
  return {
    id: `evt_mock_${eventCounter.toString().padStart(3, '0')}`,
    session_id: SESSION_ID,
    timestamp: Date.now(),
    ...overrides,
  };
}

function nextToolUseId() {
  toolUseCounter++;
  return `tu_mock_${toolUseCounter.toString().padStart(3, '0')}`;
}

async function run() {
  console.log(`Mock swarm starting — session ${SESSION_ID}`);
  const t0 = Date.now();

  // Session start
  await post(evt({ event_type: 'session_start', agent_id: 'ag_main', agent_label: 'main', transcript_path: MOCK_TRANSCRIPT }));
  console.log('  session_start');
  await sleep(500);

  // Main agent tool calls
  const mainTools = ['Read', 'Glob', 'Grep', 'Read', 'Edit'];
  for (const tool of mainTools) {
    const tuId = nextToolUseId();
    await post(evt({ event_type: 'tool_start', agent_id: 'ag_main', agent_label: 'main', tool_name: tool, tool_params_summary: `file=src/${tool.toLowerCase()}.js`, tool_use_id: tuId, cwd: '/project/src' }));
    console.log(`  tool_start: ${tool} (main)`);
    await sleep(800 + Math.random() * 1500);
    await post(evt({ event_type: 'tool_end', agent_id: 'ag_main', agent_label: 'main', tool_name: tool, tokens_in: 500 + Math.floor(Math.random() * 2000), tokens_out: 200 + Math.floor(Math.random() * 1000), duration_ms: 800 + Math.floor(Math.random() * 2000), tool_use_id: tuId, has_error: false, tool_response_summary: `Found ${Math.floor(Math.random() * 20)} results in src/` }));
    console.log(`  tool_end: ${tool} (main)`);
    await sleep(300);
  }

  // Spawn 4 sub-agents
  const subAgents = [
    { id: 'ag_explore_01', label: 'Explore', task: 'Search codebase for authentication patterns', tags: ['search', 'auth'] },
    { id: 'ag_explore_02', label: 'Explore', task: 'Find all API endpoint definitions', tags: ['search', 'api'] },
    { id: 'ag_plan_01', label: 'Plan', task: 'Design authentication middleware architecture', tags: ['auth', 'design'] },
    { id: 'ag_bash_01', label: 'Bash', task: 'Run test suite and collect coverage', tags: ['test', 'coverage'] },
  ];

  for (const agent of subAgents) {
    await post(evt({
      event_type: 'agent_spawn',
      agent_id: agent.id,
      parent_agent_id: 'ag_main',
      agent_label: agent.label,
      task_description: agent.task,
      task_tags: agent.tags,
    }));
    console.log(`  agent_spawn: ${agent.label} (${agent.id})`);
    await sleep(600 + Math.random() * 800);
  }

  // Tool calls within each sub-agent (interleaved for realism)
  const agentToolSeqs = {
    ag_explore_01: ['Glob', 'Grep', 'Read', 'Grep', 'Read'],
    ag_explore_02: ['Glob', 'Grep', 'Read'],
    ag_plan_01: ['Read', 'Read', 'Glob', 'Read'],
    ag_bash_01: ['Bash', 'Bash', 'Read'],
  };

  const pending = Object.entries(agentToolSeqs).map(([agentId, tools]) => ({
    agentId,
    label: subAgents.find(a => a.id === agentId).label,
    tools: [...tools],
    idx: 0,
  }));

  while (pending.some(p => p.idx < p.tools.length)) {
    for (const p of pending) {
      if (p.idx >= p.tools.length) continue;
      const tool = p.tools[p.idx];
      const tuId = nextToolUseId();
      const isBashError = p.agentId === 'ag_bash_01' && tool === 'Bash' && p.idx === 1;

      await post(evt({
        event_type: 'tool_start',
        agent_id: p.agentId,
        agent_label: p.label,
        tool_name: tool,
        tool_params_summary: `pattern='auth.*handler'`,
        tool_use_id: tuId,
        cwd: tool === 'Bash' ? '/project' : null,
      }));
      console.log(`  tool_start: ${tool} (${p.agentId})`);
      await sleep(500 + Math.random() * 2000);

      await post(evt({
        event_type: 'tool_end',
        agent_id: p.agentId,
        agent_label: p.label,
        tool_name: tool,
        tokens_in: 1000 + Math.floor(Math.random() * 5000),
        tokens_out: 300 + Math.floor(Math.random() * 2000),
        duration_ms: 500 + Math.floor(Math.random() * 3000),
        tool_use_id: tuId,
        has_error: isBashError,
        tool_response_summary: isBashError ? 'ENOENT: npm not found in PATH' : `Completed ${tool} operation`,
      }));
      console.log(`  tool_end: ${tool} (${p.agentId})${isBashError ? ' [ERROR]' : ''}`);

      p.idx++;
      await sleep(200 + Math.random() * 500);
    }
  }

  // Complete sub-agents
  await post(evt({
    event_type: 'agent_complete',
    agent_id: 'ag_explore_01',
    parent_agent_id: 'ag_main',
    agent_label: 'Explore',
    task_description: 'Search codebase for authentication patterns',
    task_tags: ['search', 'auth'],
    tokens_in: 12000,
    tokens_out: 4500,
    duration_ms: Date.now() - t0 - 2000,
    status: 'success',
    contributes_to: ['task_auth'],
    transcript_path: MOCK_TRANSCRIPT,
  }));
  console.log('  agent_complete: ag_explore_01 (success)');
  await sleep(1000);

  await post(evt({
    event_type: 'agent_complete',
    agent_id: 'ag_explore_02',
    parent_agent_id: 'ag_main',
    agent_label: 'Explore',
    task_description: 'Find all API endpoint definitions',
    task_tags: ['search', 'api'],
    tokens_in: 8000,
    tokens_out: 3000,
    duration_ms: Date.now() - t0 - 5000,
    status: 'success',
    contributes_to: ['task_api'],
  }));
  console.log('  agent_complete: ag_explore_02 (success)');
  await sleep(800);

  await post(evt({
    event_type: 'agent_complete',
    agent_id: 'ag_plan_01',
    parent_agent_id: 'ag_main',
    agent_label: 'Plan',
    task_description: 'Design authentication middleware architecture',
    task_tags: ['auth', 'design'],
    tokens_in: 20000,
    tokens_out: 8000,
    duration_ms: Date.now() - t0 - 3000,
    status: 'success',
    contributes_to: ['task_auth'],
  }));
  console.log('  agent_complete: ag_plan_01 (success)');
  await sleep(1200);

  // ag_bash_01 fails
  await post(evt({
    event_type: 'agent_complete',
    agent_id: 'ag_bash_01',
    parent_agent_id: 'ag_main',
    agent_label: 'Bash',
    task_description: 'Run test suite and collect coverage',
    task_tags: ['test', 'coverage'],
    tokens_in: 5000,
    tokens_out: 1500,
    duration_ms: Date.now() - t0 - 6000,
    status: 'error',
    contributes_to: [],
  }));
  console.log('  agent_complete: ag_bash_01 (error)');

  console.log(`\nMock swarm complete — ${eventCounter} events emitted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

run().catch(console.error);
