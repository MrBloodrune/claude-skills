import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  initDb,
  upsertSession,
  insertAgent,
  updateAgent,
  insertToolCall,
  completeToolCall,
  insertCompaction,
  updateSessionStats,
  listSessions,
  searchSessions,
} from '../server/db.js';

describe('initDb', () => {
  it('creates all tables and indexes in :memory:', () => {
    const db = initDb(':memory:');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tableNames = tables.map(r => r.name);
    assert.ok(tableNames.includes('sessions'), 'missing sessions table');
    assert.ok(tableNames.includes('agents'), 'missing agents table');
    assert.ok(tableNames.includes('tool_calls'), 'missing tool_calls table');
    assert.ok(tableNames.includes('compactions'), 'missing compactions table');
    assert.ok(tableNames.includes('sessions_fts'), 'missing sessions_fts table');
    assert.ok(tableNames.includes('agents_fts'), 'missing agents_fts table');
    db.close();
  });

  it('creates indexes', () => {
    const db = initDb(':memory:');
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all();
    const names = indexes.map(r => r.name);
    assert.ok(names.includes('idx_agents_session'));
    assert.ok(names.includes('idx_tool_calls_session'));
    assert.ok(names.includes('idx_tool_calls_agent'));
    assert.ok(names.includes('idx_sessions_project'));
    assert.ok(names.includes('idx_sessions_started'));
    db.close();
  });

  it('is idempotent — calling twice does not error', () => {
    const db = new DatabaseSync(':memory:');
    initDb(db);
    initDb(db);
    db.close();
  });
});

describe('upsertSession', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });

  it('inserts a new session', () => {
    upsertSession(db, {
      id: 'ses_001',
      slug: 'test-session',
      project: '/data/dev/test',
      cwd: '/data/dev/test',
      git_branch: 'main',
      model: 'claude-opus-4-6',
      claude_version: '2.1.44',
      started_at: 1700000000000,
      first_prompt: 'Hello world',
    });
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get('ses_001');
    assert.equal(row.id, 'ses_001');
    assert.equal(row.slug, 'test-session');
    assert.equal(row.project, '/data/dev/test');
    assert.equal(row.model, 'claude-opus-4-6');
    assert.equal(row.first_prompt, 'Hello world');
    assert.equal(row.status, 'active');
  });

  it('updates existing session on conflict', () => {
    upsertSession(db, { id: 'ses_001', slug: 'v1', started_at: 1700000000000 });
    upsertSession(db, { id: 'ses_001', slug: 'v1', ended_at: 1700001000000, status: 'completed', tokens_in: 500 });
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get('ses_001');
    assert.equal(row.ended_at, 1700001000000);
    assert.equal(row.status, 'completed');
    assert.equal(row.tokens_in, 500);
  });

  it('populates FTS index on insert', () => {
    upsertSession(db, { id: 'ses_fts', first_prompt: 'Build a weather station' });
    const results = db.prepare("SELECT * FROM sessions_fts WHERE sessions_fts MATCH 'weather'").all();
    assert.equal(results.length, 1);
  });
});

describe('insertAgent / updateAgent', () => {
  let db;
  beforeEach(() => {
    db = initDb(':memory:');
    upsertSession(db, { id: 'ses_001' });
  });

  it('inserts an agent', () => {
    insertAgent(db, {
      id: 'ag_001',
      session_id: 'ses_001',
      parent_agent_id: null,
      agent_type: 'Explore',
      task_description: 'Find all config files',
      model: 'haiku',
      started_at: 1700000001000,
    });
    const row = db.prepare('SELECT * FROM agents WHERE id = ?').get('ag_001');
    assert.equal(row.agent_type, 'Explore');
    assert.equal(row.status, 'running');
    assert.equal(row.task_description, 'Find all config files');
  });

  it('updates agent on completion', () => {
    insertAgent(db, { id: 'ag_002', session_id: 'ses_001', started_at: 1700000000000 });
    updateAgent(db, { id: 'ag_002', status: 'completed', tokens_in: 1000, tokens_out: 200, ended_at: 1700000005000, duration_ms: 5000 });
    const row = db.prepare('SELECT * FROM agents WHERE id = ?').get('ag_002');
    assert.equal(row.status, 'completed');
    assert.equal(row.tokens_in, 1000);
    assert.equal(row.duration_ms, 5000);
  });

  it('populates FTS index', () => {
    insertAgent(db, { id: 'ag_fts', session_id: 'ses_001', task_description: 'Analyze the authentication module' });
    const results = db.prepare("SELECT * FROM agents_fts WHERE agents_fts MATCH 'authentication'").all();
    assert.equal(results.length, 1);
  });
});

describe('insertToolCall / completeToolCall', () => {
  let db;
  beforeEach(() => {
    db = initDb(':memory:');
    upsertSession(db, { id: 'ses_001' });
  });

  it('inserts a tool call', () => {
    insertToolCall(db, {
      id: 'tc_001',
      session_id: 'ses_001',
      agent_id: 'ag_main',
      tool_name: 'Read',
      params_summary: 'file_path=/etc/config.json',
      started_at: 1700000000000,
    });
    const row = db.prepare('SELECT * FROM tool_calls WHERE id = ?').get('tc_001');
    assert.equal(row.tool_name, 'Read');
    assert.equal(row.agent_id, 'ag_main');
    assert.equal(row.has_error, 0);
  });

  it('completes a tool call', () => {
    insertToolCall(db, { id: 'tc_002', session_id: 'ses_001', tool_name: 'Bash', started_at: 1700000000000 });
    completeToolCall(db, { id: 'tc_002', ended_at: 1700000002000, duration_ms: 2000, tokens_in: 50, tokens_out: 100, response_summary: 'Exit code 0' });
    const row = db.prepare('SELECT * FROM tool_calls WHERE id = ?').get('tc_002');
    assert.equal(row.duration_ms, 2000);
    assert.equal(row.response_summary, 'Exit code 0');
  });

  it('records errors', () => {
    insertToolCall(db, { id: 'tc_err', session_id: 'ses_001', tool_name: 'Bash', started_at: 1700000000000 });
    completeToolCall(db, { id: 'tc_err', has_error: true, response_summary: 'ENOENT: file not found' });
    const row = db.prepare('SELECT * FROM tool_calls WHERE id = ?').get('tc_err');
    assert.equal(row.has_error, 1);
  });

  it('records spawned agent id', () => {
    insertToolCall(db, { id: 'tc_spawn', session_id: 'ses_001', tool_name: 'Task', spawns_agent_id: 'ag_sub1' });
    const row = db.prepare('SELECT * FROM tool_calls WHERE id = ?').get('tc_spawn');
    assert.equal(row.spawns_agent_id, 'ag_sub1');
  });
});

describe('insertCompaction', () => {
  let db;
  beforeEach(() => {
    db = initDb(':memory:');
    upsertSession(db, { id: 'ses_001' });
  });

  it('inserts a compaction record', () => {
    insertCompaction(db, {
      session_id: 'ses_001',
      timestamp: 1700000050000,
      trigger: 'context_limit',
      pre_tokens: 180000,
      summary_text: 'Compacted conversation about auth system',
    });
    const rows = db.prepare('SELECT * FROM compactions WHERE session_id = ?').all('ses_001');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].trigger, 'context_limit');
    assert.equal(rows[0].pre_tokens, 180000);
  });
});

describe('updateSessionStats', () => {
  let db;
  beforeEach(() => {
    db = initDb(':memory:');
    upsertSession(db, { id: 'ses_001' });
    insertAgent(db, { id: 'ag_1', session_id: 'ses_001', tokens_in: 100, tokens_out: 50 });
    insertAgent(db, { id: 'ag_2', session_id: 'ses_001', tokens_in: 200, tokens_out: 75 });
    insertToolCall(db, { id: 'tc_1', session_id: 'ses_001', tool_name: 'Read' });
    insertToolCall(db, { id: 'tc_2', session_id: 'ses_001', tool_name: 'Write' });
    insertToolCall(db, { id: 'tc_3', session_id: 'ses_001', tool_name: 'Bash' });
    insertCompaction(db, { session_id: 'ses_001', timestamp: 1700000000000 });
  });

  it('recomputes aggregates from child tables', () => {
    updateSessionStats(db, 'ses_001');
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get('ses_001');
    assert.equal(row.agent_count, 2);
    assert.equal(row.tool_call_count, 3);
    assert.equal(row.compaction_count, 1);
  });
});

describe('listSessions', () => {
  let db;
  beforeEach(() => {
    db = initDb(':memory:');
    upsertSession(db, { id: 'ses_old', project: '/proj/a', started_at: 1700000000000, status: 'completed' });
    upsertSession(db, { id: 'ses_new', project: '/proj/b', started_at: 1700001000000, status: 'active' });
    upsertSession(db, { id: 'ses_mid', project: '/proj/a', started_at: 1700000500000, status: 'completed' });
  });

  it('returns sessions sorted by started_at desc', () => {
    const rows = listSessions(db);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].id, 'ses_new');
    assert.equal(rows[2].id, 'ses_old');
  });

  it('filters by project', () => {
    const rows = listSessions(db, { project: '/proj/a' });
    assert.equal(rows.length, 2);
    assert.ok(rows.every(r => r.project === '/proj/a'));
  });

  it('filters by status', () => {
    const rows = listSessions(db, { status: 'active' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'ses_new');
  });

  it('respects limit', () => {
    const rows = listSessions(db, { limit: 2 });
    assert.equal(rows.length, 2);
  });
});

describe('searchSessions', () => {
  let db;
  beforeEach(() => {
    db = initDb(':memory:');
    upsertSession(db, { id: 'ses_viz', first_prompt: 'Create a technical visualizer for SPI protocol' });
    upsertSession(db, { id: 'ses_auth', first_prompt: 'Fix the authentication bug in login flow' });
    upsertSession(db, { id: 'ses_test', first_prompt: 'Write tests for the database module' });
  });

  it('finds sessions by keyword', () => {
    const rows = searchSessions(db, 'visualizer');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'ses_viz');
  });

  it('returns empty for no matches', () => {
    const rows = searchSessions(db, 'xyznonexistent');
    assert.equal(rows.length, 0);
  });

  it('handles multiple word queries', () => {
    const rows = searchSessions(db, 'authentication login');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'ses_auth');
  });
});

describe('edge cases', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });

  it('handles null fields in session', () => {
    upsertSession(db, { id: 'ses_null' });
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get('ses_null');
    assert.equal(row.id, 'ses_null');
    assert.equal(row.slug, null);
    assert.equal(row.project, null);
    assert.equal(row.status, 'active');
  });

  it('handles empty string first_prompt', () => {
    upsertSession(db, { id: 'ses_empty', first_prompt: '' });
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get('ses_empty');
    assert.equal(row.first_prompt, '');
  });

  it('duplicate agent insert is rejected', () => {
    upsertSession(db, { id: 'ses_001' });
    insertAgent(db, { id: 'ag_dup', session_id: 'ses_001' });
    assert.throws(() => insertAgent(db, { id: 'ag_dup', session_id: 'ses_001' }));
  });
});
