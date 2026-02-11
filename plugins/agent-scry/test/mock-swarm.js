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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let evtN = 0, tuN = 0;
const evt = (overrides) => ({ id: `evt_mock_${String(++evtN).padStart(3, '0')}`, session_id: SESSION_ID, timestamp: Date.now(), ...overrides });
const tuId = () => `tu_mock_${String(++tuN).padStart(3, '0')}`;

async function toolCall(agentId, label, tool, params, opts = {}) {
  const id = tuId();
  await post(evt({
    event_type: 'tool_start', agent_id: agentId, agent_label: label,
    tool_name: tool, tool_params_summary: params, tool_use_id: id,
    cwd: opts.cwd || '/home/user/projects/auth-system',
    ...(opts.task_data ? { task_data: opts.task_data } : {}),
    ...(opts.plan_data ? { plan_data: opts.plan_data } : {}),
    ...(opts.spawns ? { spawns_agent_id: opts.spawns.id, agent_spawn_label: opts.spawns.label, agent_spawn_task: opts.spawns.task } : {}),
  }));
  const delay = opts.delay || (200 + Math.random() * 600);
  await sleep(delay);
  await post(evt({
    event_type: 'tool_end', agent_id: agentId, agent_label: label,
    tool_name: tool, tool_use_id: id,
    tokens_in: opts.tokIn || 500 + Math.floor(Math.random() * 2000),
    tokens_out: opts.tokOut || 200 + Math.floor(Math.random() * 800),
    duration_ms: Math.floor(delay),
    has_error: !!opts.error,
    tool_response_summary: opts.error || opts.summary || `Completed ${tool}`,
    ...(opts.task_data_end ? { task_data: opts.task_data_end } : {}),
  }));
  await sleep(80);
}

async function spawnAgent(id, parentId, label, task, tags = [], model = null) {
  await post(evt({ event_type: 'agent_spawn', agent_id: id, parent_agent_id: parentId, agent_label: label, task_description: task, task_tags: tags, ...(model ? { agent_spawn_model: model } : {}) }));
  await sleep(150);
}

async function completeAgent(id, parentId, label, task, tags, status, tokIn, tokOut, durMs) {
  await post(evt({ event_type: 'agent_complete', agent_id: id, parent_agent_id: parentId, agent_label: label, task_description: task, task_tags: tags, tokens_in: tokIn, tokens_out: tokOut, duration_ms: durMs, status, contributes_to: [], transcript_path: MOCK_TRANSCRIPT }));
  await sleep(100);
}

async function compaction(trigger = 'auto') {
  await post(evt({ event_type: 'compaction', agent_id: 'ag_main', trigger }));
  await sleep(200);
}

async function run() {
  console.log(`Mock swarm starting — session ${SESSION_ID}`);
  console.log('Simulating: "Refactor Authentication System" (three-phase with compactions)\n');
  const t0 = Date.now();

  // ═══════════════════════════════════════════
  // SESSION START
  // ═══════════════════════════════════════════
  await post(evt({ event_type: 'session_start', agent_id: 'ag_main', agent_label: 'main', transcript_path: MOCK_TRANSCRIPT, model: 'claude-sonnet-4-5-20250929', cwd: '/home/user/projects/auth-system' }));
  console.log('  session_start (sonnet, cwd set)');
  await sleep(300);

  // ═══════════════════════════════════════════
  // PHASE 1 — PLANNING (~0s–26s simulated)
  // ═══════════════════════════════════════════
  console.log('\n  ─── Phase 1: Planning ───');

  // EnterPlanMode
  await toolCall('ag_main', 'main', 'EnterPlanMode', '', {
    plan_data: { plan_event: 'enter_plan_mode' }, delay: 300,
  });
  console.log('  EnterPlanMode');

  // Read CLAUDE.md
  await toolCall('ag_main', 'main', 'Read', 'file_path=CLAUDE.md', { summary: 'Read project instructions' });
  console.log('  Read CLAUDE.md');

  // Glob auth files
  await toolCall('ag_main', 'main', 'Glob', 'pattern=src/auth/**/*.ts', { summary: 'Found 12 auth files' });
  console.log('  Glob auth files');

  // Extra main reads for event volume
  await toolCall('ag_main', 'main', 'Read', 'file_path=package.json', { summary: 'Read package config' });
  await toolCall('ag_main', 'main', 'Grep', 'pattern=session.*store', { summary: 'Found 5 session store refs' });
  await toolCall('ag_main', 'main', 'Read', 'file_path=tsconfig.json', { summary: 'Read TypeScript config' });
  console.log('  extra main reads (3)');

  // TaskCreate x3 (planning tasks)
  const tasks = [
    { subject: 'Explore authentication patterns', desc: 'Search codebase for existing auth implementations', active: 'Exploring auth patterns' },
    { subject: 'Explore API endpoint structure', desc: 'Find all API endpoints and their auth requirements', active: 'Exploring API endpoints' },
    { subject: 'Design auth middleware architecture', desc: 'Design new JWT-based auth middleware with refresh tokens', active: 'Designing middleware' },
  ];
  for (let i = 0; i < tasks.length; i++) {
    await toolCall('ag_main', 'main', 'TaskCreate', `subject=${tasks[i].subject}`, {
      task_data: { task_type: 'task_create', subject: tasks[i].subject, description: tasks[i].desc, activeForm: tasks[i].active },
      delay: 200,
    });
    console.log(`  TaskCreate: ${tasks[i].subject}`);
  }

  // Spawn explore agents
  await spawnAgent('ag_explore_01', 'ag_main', 'Explore', 'Search codebase for authentication patterns', ['search', 'auth'], 'haiku');
  console.log('  spawn: ag_explore_01 (Explore, haiku)');
  await spawnAgent('ag_explore_02', 'ag_main', 'Explore', 'Find all API endpoint definitions', ['search', 'api'], 'haiku');
  console.log('  spawn: ag_explore_02 (Explore, haiku)');

  // Interleaved explore tool calls (7 each for more volume)
  const e1Tools = [
    ['Glob', 'pattern=src/auth/**/*.ts', 'Found 12 matching files'],
    ['Grep', 'pattern=authenticate.*middleware', 'Found 8 matches'],
    ['Read', 'file_path=src/auth/middleware.ts', 'Read 145 lines'],
    ['Grep', 'pattern=jwt\\.verify', 'Found 3 matches'],
    ['Read', 'file_path=src/auth/token.ts', 'Read 89 lines'],
    ['Read', 'file_path=src/auth/session.ts', 'Read 67 lines'],
    ['Grep', 'pattern=refreshToken', 'Found 4 matches'],
  ];
  const e2Tools = [
    ['Glob', 'pattern=src/routes/**/*.ts', 'Found 24 route files'],
    ['Grep', 'pattern=router\\.(get|post|put|delete)', 'Found 47 endpoints'],
    ['Read', 'file_path=src/routes/index.ts', 'Read 210 lines'],
    ['Grep', 'pattern=requireAuth', 'Found 31 protected routes'],
    ['Read', 'file_path=src/routes/admin.ts', 'Read 156 lines'],
    ['Grep', 'pattern=middleware.*chain', 'Found 6 chains'],
    ['Read', 'file_path=src/routes/health.ts', 'Read 22 lines'],
  ];

  const maxLen = Math.max(e1Tools.length, e2Tools.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < e1Tools.length) {
      const [tool, params, summary] = e1Tools[i];
      await toolCall('ag_explore_01', 'Explore', tool, params, { summary, tokIn: 1000 + Math.floor(Math.random() * 3000), tokOut: 400 + Math.floor(Math.random() * 1500) });
    }
    if (i < e2Tools.length) {
      const [tool, params, summary] = e2Tools[i];
      await toolCall('ag_explore_02', 'Explore', tool, params, { summary, tokIn: 800 + Math.floor(Math.random() * 2500), tokOut: 300 + Math.floor(Math.random() * 1200) });
    }
  }
  console.log('  explore tool calls complete');

  // Complete explore agents
  await completeAgent('ag_explore_01', 'ag_main', 'Explore', 'Search codebase for authentication patterns', ['search', 'auth'], 'success', 12000, 4500, 14000);
  console.log('  complete: ag_explore_01 (success)');
  await completeAgent('ag_explore_02', 'ag_main', 'Explore', 'Find all API endpoint definitions', ['search', 'api'], 'success', 8000, 3000, 12000);
  console.log('  complete: ag_explore_02 (success)');

  // TaskUpdate tasks 1,2 completed
  await toolCall('ag_main', 'main', 'TaskUpdate', 'taskId=1 status=completed', {
    task_data: { task_type: 'task_update', taskId: '1', status: 'completed', owner: null, subject: null }, delay: 150,
  });
  await toolCall('ag_main', 'main', 'TaskUpdate', 'taskId=2 status=completed', {
    task_data: { task_type: 'task_update', taskId: '2', status: 'completed', owner: null, subject: null }, delay: 150,
  });
  console.log('  TaskUpdate: tasks 1,2 completed');

  // Spawn plan agent
  await spawnAgent('ag_plan_01', 'ag_main', 'Plan', 'Design authentication middleware architecture', ['auth', 'design'], 'sonnet');
  console.log('  spawn: ag_plan_01 (Plan, sonnet)');

  // Plan agent tool calls
  await toolCall('ag_plan_01', 'Plan', 'Read', 'file_path=src/auth/middleware.ts', { summary: 'Read current middleware', tokIn: 3000, tokOut: 500 });
  await toolCall('ag_plan_01', 'Plan', 'Read', 'file_path=src/auth/config.ts', { summary: 'Read auth config', tokIn: 2000, tokOut: 400 });
  await toolCall('ag_plan_01', 'Plan', 'Grep', 'pattern=bcrypt|argon2', { summary: 'Found 2 hash implementations', tokIn: 1500, tokOut: 300 });
  await toolCall('ag_plan_01', 'Plan', 'Write', 'file_path=.claude/plans/auth-redesign.md', {
    summary: 'Wrote auth redesign plan',
    plan_data: { plan_event: 'plan_write', file_path: '.claude/plans/auth-redesign.md', content_preview: '# Auth Middleware Redesign\n\n## Goals\n- Migrate from session-based to JWT\n- Add refresh token rotation\n- Implement middleware chain pattern\n\n## Architecture\n...' },
    tokIn: 5000, tokOut: 3000,
  });
  console.log('  plan agent: Read, Read, Grep, Write plan');

  // Complete plan agent
  await completeAgent('ag_plan_01', 'ag_main', 'Plan', 'Design authentication middleware architecture', ['auth', 'design'], 'success', 20000, 8000, 18000);
  console.log('  complete: ag_plan_01 (success)');

  // TaskUpdate task 3 completed + ExitPlanMode
  await toolCall('ag_main', 'main', 'TaskUpdate', 'taskId=3 status=completed', {
    task_data: { task_type: 'task_update', taskId: '3', status: 'completed', owner: null, subject: null }, delay: 150,
  });
  await toolCall('ag_main', 'main', 'ExitPlanMode', '', {
    plan_data: { plan_event: 'exit_plan_mode' }, delay: 300,
  });
  console.log('  TaskUpdate: task 3 completed, ExitPlanMode');

  // ═══════════════════════════════════════════
  // COMPACTION 1 — Auto compaction after planning
  // ═══════════════════════════════════════════
  await compaction('auto');
  console.log('\n  ⚡ Compaction C1 (auto — post-planning)');

  // ═══════════════════════════════════════════
  // GAP — Human reviewing plan (~2s)
  // ═══════════════════════════════════════════
  console.log('\n  ─── Gap: Human review ───');
  await sleep(1500);

  // ═══════════════════════════════════════════
  // PHASE 2 — EXECUTION (~28s–66s simulated)
  // ═══════════════════════════════════════════
  console.log('\n  ─── Phase 2: Execution ───');

  // TaskCreate x4 (execution tasks)
  const execTasks = [
    { subject: 'Implement JWT middleware', desc: 'Create new JWT auth middleware with token validation', active: 'Implementing JWT middleware' },
    { subject: 'Write auth unit tests', desc: 'Write comprehensive tests for JWT auth flow', active: 'Writing auth tests' },
    { subject: 'Update route handlers', desc: 'Migrate all routes to use new JWT middleware', active: 'Updating route handlers' },
    { subject: 'Run integration tests', desc: 'Run full test suite to verify no regressions', active: 'Running integration tests' },
  ];
  for (const t of execTasks) {
    await toolCall('ag_main', 'main', 'TaskCreate', `subject=${t.subject}`, {
      task_data: { task_type: 'task_create', subject: t.subject, description: t.desc, activeForm: t.active },
      delay: 150,
    });
    console.log(`  TaskCreate: ${t.subject}`);
  }

  // Spawn implementation agents
  await spawnAgent('ag_impl_01', 'ag_main', 'general-purpose', 'Implement JWT middleware', ['auth', 'impl'], 'sonnet');
  await spawnAgent('ag_impl_02', 'ag_main', 'general-purpose', 'Write auth unit tests', ['auth', 'test'], 'sonnet');
  await spawnAgent('ag_impl_03', 'ag_main', 'general-purpose', 'Update route handlers', ['auth', 'routes'], 'opus');
  await spawnAgent('ag_test_01', 'ag_main', 'Bash', 'Run integration tests', ['test', 'integration'], 'haiku');
  console.log('  spawn: ag_impl_01, ag_impl_02, ag_impl_03, ag_test_01');

  // Interleaved implementation tool calls (expanded for volume)
  const impl1 = [
    ['Read', 'file_path=src/auth/middleware.ts', 'Read current middleware'],
    ['Read', 'file_path=src/auth/token.ts', 'Read token utilities'],
    ['Grep', 'pattern=express\\.Request', 'Found 14 request type refs'],
    ['Write', 'file_path=src/auth/jwt-middleware.ts', 'Created JWT middleware'],
    ['Edit', 'file_path=src/auth/index.ts', 'Updated auth exports'],
    ['Write', 'file_path=src/auth/jwt-utils.ts', 'Created JWT utility functions'],
    ['Edit', 'file_path=src/auth/config.ts', 'Added JWT config options'],
    ['Read', 'file_path=src/auth/types.ts', 'Read auth type definitions'],
  ];
  const impl2 = [
    ['Read', 'file_path=src/auth/jwt-middleware.ts', 'Read new middleware'],
    ['Write', 'file_path=tests/auth/jwt.test.ts', 'Created JWT test suite'],
    ['Write', 'file_path=tests/auth/refresh.test.ts', 'Created refresh token tests'],
    ['Edit', 'file_path=tests/auth/helpers.ts', 'Updated test helpers'],
    ['Write', 'file_path=tests/auth/mock-tokens.ts', 'Created token mocks'],
    ['Read', 'file_path=tests/auth/jwt.test.ts', 'Verified test file'],
  ];
  const impl3 = [
    ['Read', 'file_path=src/routes/index.ts', 'Read route definitions'],
    ['Edit', 'file_path=src/routes/users.ts', 'Migrated users routes'],
    ['Edit', 'file_path=src/routes/admin.ts', 'Migrated admin routes'],
    ['Edit', 'file_path=src/routes/api.ts', 'Migrated API routes'],
    ['Edit', 'file_path=src/routes/index.ts', 'Updated route middleware'],
    ['Grep', 'pattern=requireAuth.*deprecated', 'Found 3 deprecated uses'],
    ['Edit', 'file_path=src/routes/webhooks.ts', 'Migrated webhook routes'],
  ];
  const test1 = [
    ['Bash', 'command=npm run test:integration', null, true],
  ];

  const allWork = [
    { id: 'ag_impl_01', label: 'general-purpose', calls: impl1 },
    { id: 'ag_impl_02', label: 'general-purpose', calls: impl2 },
    { id: 'ag_impl_03', label: 'general-purpose', calls: impl3 },
    { id: 'ag_test_01', label: 'Bash', calls: test1 },
  ];

  // Interleave: round-robin through agents
  const maxCalls = Math.max(...allWork.map(w => w.calls.length));
  for (let i = 0; i < maxCalls; i++) {
    for (const w of allWork) {
      if (i >= w.calls.length) continue;
      const [tool, params, summary, isError] = w.calls[i];
      await toolCall(w.id, w.label, tool, params, {
        summary: isError ? 'ECONNREFUSED: test server not responding' : summary,
        error: isError ? 'ECONNREFUSED: test server not responding' : null,
        cwd: tool === 'Bash' ? '/project' : null,
        tokIn: 1000 + Math.floor(Math.random() * 4000),
        tokOut: 300 + Math.floor(Math.random() * 2000),
        delay: 300 + Math.random() * 800,
      });
    }
  }
  console.log('  implementation tool calls complete');

  // Complete impl agents
  await completeAgent('ag_impl_01', 'ag_main', 'general-purpose', 'Implement JWT middleware', ['auth', 'impl'], 'success', 18000, 7000, 20000);
  await completeAgent('ag_impl_02', 'ag_main', 'general-purpose', 'Write auth unit tests', ['auth', 'test'], 'success', 12000, 5000, 16000);
  await completeAgent('ag_impl_03', 'ag_main', 'general-purpose', 'Update route handlers', ['auth', 'routes'], 'success', 15000, 6000, 18000);
  console.log('  complete: ag_impl_01, ag_impl_02, ag_impl_03 (success)');

  // ag_test_01 fails
  await completeAgent('ag_test_01', 'ag_main', 'Bash', 'Run integration tests', ['test', 'integration'], 'error', 5000, 1500, 8000);
  console.log('  complete: ag_test_01 (error)');

  // TaskUpdate: tasks 4-6 completed, task 7 failed
  for (let i = 4; i <= 6; i++) {
    await toolCall('ag_main', 'main', 'TaskUpdate', `taskId=${i} status=completed`, {
      task_data: { task_type: 'task_update', taskId: String(i), status: 'completed', owner: null, subject: null }, delay: 100,
    });
  }
  await toolCall('ag_main', 'main', 'TaskUpdate', 'taskId=7 status=error', {
    task_data: { task_type: 'task_update', taskId: '7', status: 'error', owner: null, subject: null }, delay: 100,
  });
  console.log('  TaskUpdate: tasks 4-6 completed, task 7 failed');

  // ═══════════════════════════════════════════
  // COMPACTION 2 — Manual compaction during execution
  // ═══════════════════════════════════════════
  await compaction('manual');
  console.log('\n  ⚡ Compaction C2 (manual — focus auth middleware)');

  // ═══════════════════════════════════════════
  // PHASE 3 — RE-PLANNING (2nd plan cycle)
  // ═══════════════════════════════════════════
  console.log('\n  ─── Phase 3: Re-planning after test failure ───');

  await toolCall('ag_main', 'main', 'EnterPlanMode', '', {
    plan_data: { plan_event: 'enter_plan_mode' }, delay: 300,
  });
  console.log('  EnterPlanMode (2nd cycle)');

  // Main reads the failing test output
  await toolCall('ag_main', 'main', 'Read', 'file_path=tests/auth/jwt.test.ts', { summary: 'Read failing test file' });
  await toolCall('ag_main', 'main', 'Grep', 'pattern=ECONNREFUSED', { summary: 'Found 3 connection refused errors' });
  await toolCall('ag_main', 'main', 'Read', 'file_path=src/auth/jwt-middleware.ts', { summary: 'Read JWT middleware for review' });
  console.log('  Main reads failing test context');

  // Write fix plan
  await toolCall('ag_main', 'main', 'Write', 'file_path=.claude/plans/auth-fix-plan.md', {
    summary: 'Wrote auth fix plan',
    plan_data: { plan_event: 'plan_write', file_path: '.claude/plans/auth-fix-plan.md', content_preview: '# Auth Fix Plan\n\n## Issue\nIntegration tests failing: ECONNREFUSED on test server\n\n## Root Cause\nTest server port conflict with dev server\n\n## Fix\n1. Update test config to use dynamic ports\n2. Add test server startup wait\n3. Re-run integration + e2e tests' },
    tokIn: 4000, tokOut: 2500,
  });
  console.log('  Write fix plan');

  await toolCall('ag_main', 'main', 'ExitPlanMode', '', {
    plan_data: { plan_event: 'exit_plan_mode' }, delay: 300,
  });
  console.log('  ExitPlanMode (2nd cycle)');

  // ═══════════════════════════════════════════
  // PHASE 4 — FIX + RETRY
  // ═══════════════════════════════════════════
  console.log('\n  ─── Phase 4: Fix + Retry ───');

  // TaskCreate for fix
  await toolCall('ag_main', 'main', 'TaskCreate', 'subject=Fix test server port conflict', {
    task_data: { task_type: 'task_create', subject: 'Fix test server port conflict', description: 'Update test config for dynamic ports and add startup wait', activeForm: 'Fixing test server' },
    delay: 150,
  });
  await toolCall('ag_main', 'main', 'TaskCreate', 'subject=Retry integration tests', {
    task_data: { task_type: 'task_create', subject: 'Retry integration tests', description: 'Re-run integration tests after fixing test server', activeForm: 'Retrying integration tests' },
    delay: 150,
  });
  console.log('  TaskCreate: Fix + Retry');

  // Main does the fix directly
  await toolCall('ag_main', 'main', 'Read', 'file_path=tests/config.ts', { summary: 'Read test config' });
  await toolCall('ag_main', 'main', 'Edit', 'file_path=tests/config.ts', { summary: 'Updated port to dynamic' });
  await toolCall('ag_main', 'main', 'Edit', 'file_path=tests/setup.ts', { summary: 'Added server startup wait' });
  console.log('  Main fixes test config');

  // TaskUpdate fix task completed
  await toolCall('ag_main', 'main', 'TaskUpdate', 'taskId=8 status=completed', {
    task_data: { task_type: 'task_update', taskId: '8', status: 'completed', owner: null, subject: null }, delay: 100,
  });

  // Spawn retry test agent
  await spawnAgent('ag_test_02', 'ag_main', 'Bash', 'Retry integration tests', ['test', 'retry'], 'haiku');
  console.log('  spawn: ag_test_02 (Bash, haiku)');

  await toolCall('ag_test_02', 'Bash', 'Bash', 'command=npm run test:integration', {
    summary: 'All 47 tests passed', cwd: '/project',
    tokIn: 3000, tokOut: 1000, delay: 800,
  });
  await toolCall('ag_test_02', 'Bash', 'Bash', 'command=npm run test:e2e', {
    summary: 'All 12 e2e tests passed', cwd: '/project',
    tokIn: 2000, tokOut: 800, delay: 600,
  });
  await toolCall('ag_test_02', 'Bash', 'Bash', 'command=npm run test:coverage', {
    summary: '94.2% coverage (target: 90%)', cwd: '/project',
    tokIn: 2500, tokOut: 900, delay: 700,
  });

  await completeAgent('ag_test_02', 'ag_main', 'Bash', 'Retry integration tests', ['test', 'retry'], 'success', 8000, 3000, 10000);
  console.log('  complete: ag_test_02 (success)');

  // TaskUpdate task 9 completed
  await toolCall('ag_main', 'main', 'TaskUpdate', 'taskId=9 status=completed', {
    task_data: { task_type: 'task_update', taskId: '9', status: 'completed', owner: null, subject: null }, delay: 100,
  });
  console.log('  TaskUpdate: task 9 completed');

  // Final TaskList showing all tasks
  await toolCall('ag_main', 'main', 'TaskList', '', {
    task_data_end: {
      task_type: 'task_list',
      tasks: [
        { id: '1', subject: 'Explore authentication patterns', status: 'completed' },
        { id: '2', subject: 'Explore API endpoint structure', status: 'completed' },
        { id: '3', subject: 'Design auth middleware architecture', status: 'completed' },
        { id: '4', subject: 'Implement JWT middleware', status: 'completed' },
        { id: '5', subject: 'Write auth unit tests', status: 'completed' },
        { id: '6', subject: 'Update route handlers', status: 'completed' },
        { id: '7', subject: 'Run integration tests', status: 'error' },
        { id: '8', subject: 'Fix test server port conflict', status: 'completed' },
        { id: '9', subject: 'Retry integration tests', status: 'completed' },
      ],
    },
    delay: 200,
  });
  console.log('  TaskList: final state (9 tasks)');

  // ═══════════════════════════════════════════
  // SESSION END
  // ═══════════════════════════════════════════
  await post(evt({ event_type: 'session_end', agent_id: 'ag_main' }));
  console.log('  session_end');

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nMock swarm complete — ${evtN} events, ${tuN} tool calls in ${elapsed}s`);
  console.log('Agents: 1 main + 9 sub (2 Explore, 1 Plan, 3 general-purpose, 2 Bash + 1 retry)');
  console.log('Plan cycles: 2, Compactions: 2');
}

run().catch(console.error);
