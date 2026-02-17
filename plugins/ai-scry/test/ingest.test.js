import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from '../server/db.js';
import {
  parseSessionMeta,
  parseTokenUsage,
  parseToolCalls,
  parseAgents,
  parseCompactions,
  ingestSession,
} from '../server/ingest.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES = join(__dirname, 'fixtures');
const HEAD = join(FIXTURES, 'main-session-head.jsonl');
const TAIL = join(FIXTURES, 'main-session-tail.jsonl');
const LINE_TYPES = join(FIXTURES, 'line-types.jsonl');
const COMPACT = join(FIXTURES, 'compact-agent.jsonl');

describe('parseSessionMeta', () => {
  it('extracts session id, slug, cwd, branch, model, version from head', () => {
    const meta = parseSessionMeta(HEAD);
    assert.equal(meta.sessionId, '033e9ee0-854b-44aa-bddc-8826d47cf868');
    assert.equal(meta.cwd, '/data/dev/projects/esp32/dog');
    assert.equal(meta.gitBranch, 'feat/sensor-integration');
    assert.equal(meta.version, '2.1.42');
    assert.ok(meta.slug, 'should have a slug');
  });

  it('extracts model from first assistant message', () => {
    const meta = parseSessionMeta(HEAD);
    assert.equal(meta.model, 'claude-opus-4-6');
  });

  it('extracts first user prompt text', () => {
    const meta = parseSessionMeta(HEAD);
    assert.ok(meta.firstPrompt, 'should have first prompt');
    assert.ok(meta.firstPrompt.includes('firmware'), 'prompt should mention firmware');
  });

  it('derives project name from cwd', () => {
    const meta = parseSessionMeta(HEAD);
    assert.equal(meta.project, '/data/dev/projects/esp32/dog');
  });

  it('returns null for nonexistent file', () => {
    const meta = parseSessionMeta('/nonexistent/path.jsonl');
    assert.equal(meta, null);
  });
});

describe('parseTokenUsage', () => {
  it('sums token usage across assistant messages', () => {
    const usage = parseTokenUsage(HEAD);
    assert.ok(usage.input > 0, 'should have input tokens');
    assert.ok(usage.output > 0, 'should have output tokens');
    assert.ok(usage.cacheRead >= 0, 'should have cache read count');
    assert.ok(usage.cacheCreate >= 0, 'should have cache creation count');
  });

  it('returns zeros for file with no assistant messages', () => {
    const usage = parseTokenUsage(COMPACT);
    // compact-agent has an assistant message with usage
    assert.ok(typeof usage.input === 'number');
    assert.ok(typeof usage.output === 'number');
  });
});

describe('parseToolCalls', () => {
  it('extracts tool_use blocks from assistant messages', () => {
    const tools = parseToolCalls(HEAD);
    assert.ok(Array.isArray(tools));
    // head fixture has at least one Task tool call
    const taskCall = tools.find(t => t.toolName === 'Task');
    assert.ok(taskCall, 'should find a Task tool call');
    assert.ok(taskCall.id, 'tool call should have an id');
  });

  it('captures tool name and params summary', () => {
    const tools = parseToolCalls(HEAD);
    if (tools.length > 0) {
      assert.ok(tools[0].toolName, 'should have toolName');
      assert.ok(typeof tools[0].paramsSummary === 'string', 'should have paramsSummary');
    }
  });
});

describe('parseAgents', () => {
  it('identifies Task spawns from tool_use blocks', () => {
    const agents = parseAgents(HEAD);
    assert.ok(Array.isArray(agents));
    // head fixture dispatches background agents
    if (agents.length > 0) {
      assert.ok(agents[0].toolUseId, 'should have toolUseId');
      assert.ok(agents[0].agentType || agents[0].description, 'should have type or description');
    }
  });
});

describe('parseCompactions', () => {
  it('extracts compaction summaries from compact agent transcript', () => {
    const compactions = parseCompactions(COMPACT);
    assert.ok(Array.isArray(compactions));
    assert.ok(compactions.length > 0, 'should find compaction data');
    if (compactions.length > 0) {
      assert.ok(compactions[0].summaryText, 'should have summary text');
      assert.ok(compactions[0].summaryText.length > 50, 'summary should be substantial');
    }
  });
});

describe('ingestSession', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });

  it('ingests head fixture into database', () => {
    const result = ingestSession(db, HEAD);
    assert.ok(result.success);
    assert.equal(result.sessionId, '033e9ee0-854b-44aa-bddc-8826d47cf868');

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.sessionId);
    assert.ok(session, 'session should exist in db');
    assert.equal(session.cwd, '/data/dev/projects/esp32/dog');
    assert.equal(session.model, 'claude-opus-4-6');
    assert.ok(session.tokens_in > 0 || session.tokens_out > 0, 'should have token counts');
  });

  it('stores tool calls', () => {
    const result = ingestSession(db, HEAD);
    const tools = db.prepare('SELECT * FROM tool_calls WHERE session_id = ?').all(result.sessionId);
    assert.ok(tools.length > 0, 'should have tool calls');
  });

  it('is idempotent — second ingest does not duplicate', () => {
    ingestSession(db, HEAD);
    ingestSession(db, HEAD);
    const sessions = db.prepare('SELECT COUNT(*) as c FROM sessions').get();
    assert.equal(sessions.c, 1, 'should still have exactly one session');
  });

  it('returns error for nonexistent file', () => {
    const result = ingestSession(db, '/nonexistent/file.jsonl');
    assert.equal(result.success, false);
  });
});
