import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  slug TEXT,
  project TEXT,
  cwd TEXT,
  git_branch TEXT,
  model TEXT,
  claude_version TEXT,
  started_at INTEGER,
  ended_at INTEGER,
  duration_ms INTEGER,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cache_read INTEGER DEFAULT 0,
  cache_create INTEGER DEFAULT 0,
  agent_count INTEGER DEFAULT 0,
  tool_call_count INTEGER DEFAULT 0,
  compaction_count INTEGER DEFAULT 0,
  transcript_path TEXT,
  first_prompt TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  parent_agent_id TEXT,
  agent_type TEXT,
  task_description TEXT,
  model TEXT,
  status TEXT DEFAULT 'running',
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  started_at INTEGER,
  ended_at INTEGER,
  transcript_path TEXT
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  agent_id TEXT DEFAULT 'ag_main',
  tool_name TEXT NOT NULL,
  params_summary TEXT,
  started_at INTEGER,
  ended_at INTEGER,
  duration_ms INTEGER DEFAULT 0,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  has_error BOOLEAN DEFAULT FALSE,
  response_summary TEXT,
  spawns_agent_id TEXT
);

CREATE TABLE IF NOT EXISTS compactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  timestamp INTEGER NOT NULL,
  trigger TEXT,
  pre_tokens INTEGER,
  summary_text TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
  first_prompt, content='sessions', content_rowid='rowid'
);

CREATE VIRTUAL TABLE IF NOT EXISTS agents_fts USING fts5(
  task_description, content='agents', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS sessions_ai AFTER INSERT ON sessions BEGIN
  INSERT INTO sessions_fts(rowid, first_prompt) VALUES (new.rowid, new.first_prompt);
END;

CREATE TRIGGER IF NOT EXISTS agents_ai AFTER INSERT ON agents BEGIN
  INSERT INTO agents_fts(rowid, task_description) VALUES (new.rowid, new.task_description);
END;

CREATE INDEX IF NOT EXISTS idx_agents_session ON agents(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_agent ON tool_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);
`;

export function initDb(target) {
  const db = typeof target === 'string' ? new DatabaseSync(target) : target;
  db.exec(SCHEMA);
  return db;
}

export function upsertSession(db, s) {
  db.prepare(`
    INSERT INTO sessions (id, slug, project, cwd, git_branch, model, claude_version, started_at, ended_at, duration_ms, tokens_in, tokens_out, cache_read, cache_create, transcript_path, first_prompt, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      slug = COALESCE(excluded.slug, slug),
      project = COALESCE(excluded.project, project),
      cwd = COALESCE(excluded.cwd, cwd),
      git_branch = COALESCE(excluded.git_branch, git_branch),
      model = COALESCE(excluded.model, model),
      claude_version = COALESCE(excluded.claude_version, claude_version),
      started_at = COALESCE(excluded.started_at, started_at),
      ended_at = COALESCE(excluded.ended_at, ended_at),
      duration_ms = COALESCE(excluded.duration_ms, duration_ms),
      tokens_in = COALESCE(excluded.tokens_in, tokens_in),
      tokens_out = COALESCE(excluded.tokens_out, tokens_out),
      cache_read = COALESCE(excluded.cache_read, cache_read),
      cache_create = COALESCE(excluded.cache_create, cache_create),
      transcript_path = COALESCE(excluded.transcript_path, transcript_path),
      first_prompt = COALESCE(excluded.first_prompt, first_prompt),
      status = COALESCE(excluded.status, status)
  `).run(
    s.id,
    s.slug ?? null,
    s.project ?? null,
    s.cwd ?? null,
    s.git_branch ?? null,
    s.model ?? null,
    s.claude_version ?? null,
    s.started_at ?? null,
    s.ended_at ?? null,
    s.duration_ms ?? null,
    s.tokens_in ?? null,
    s.tokens_out ?? null,
    s.cache_read ?? null,
    s.cache_create ?? null,
    s.transcript_path ?? null,
    s.first_prompt ?? null,
    s.status ?? 'active',
  );
}

export function insertAgent(db, a) {
  db.prepare(`
    INSERT INTO agents (id, session_id, parent_agent_id, agent_type, task_description, model, status, tokens_in, tokens_out, duration_ms, started_at, ended_at, transcript_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    a.id,
    a.session_id,
    a.parent_agent_id ?? null,
    a.agent_type ?? null,
    a.task_description ?? null,
    a.model ?? null,
    a.status ?? 'running',
    a.tokens_in ?? 0,
    a.tokens_out ?? 0,
    a.duration_ms ?? 0,
    a.started_at ?? null,
    a.ended_at ?? null,
    a.transcript_path ?? null,
  );
}

export function updateAgent(db, a) {
  const fields = [];
  const values = [];
  for (const key of ['status', 'tokens_in', 'tokens_out', 'duration_ms', 'ended_at', 'transcript_path']) {
    if (a[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(a[key]);
    }
  }
  if (fields.length === 0) return;
  values.push(a.id);
  db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function insertToolCall(db, tc) {
  db.prepare(`
    INSERT INTO tool_calls (id, session_id, agent_id, tool_name, params_summary, started_at, ended_at, duration_ms, tokens_in, tokens_out, has_error, response_summary, spawns_agent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tc.id,
    tc.session_id,
    tc.agent_id ?? 'ag_main',
    tc.tool_name,
    tc.params_summary ?? null,
    tc.started_at ?? null,
    tc.ended_at ?? null,
    tc.duration_ms ?? 0,
    tc.tokens_in ?? 0,
    tc.tokens_out ?? 0,
    tc.has_error ? 1 : 0,
    tc.response_summary ?? null,
    tc.spawns_agent_id ?? null,
  );
}

export function completeToolCall(db, tc) {
  const fields = [];
  const values = [];
  for (const key of ['ended_at', 'duration_ms', 'tokens_in', 'tokens_out', 'response_summary']) {
    if (tc[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(tc[key]);
    }
  }
  if (tc.has_error !== undefined) {
    fields.push('has_error = ?');
    values.push(tc.has_error ? 1 : 0);
  }
  if (fields.length === 0) return;
  values.push(tc.id);
  db.prepare(`UPDATE tool_calls SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function insertCompaction(db, c) {
  db.prepare(`
    INSERT INTO compactions (session_id, timestamp, trigger, pre_tokens, summary_text)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    c.session_id,
    c.timestamp ?? 0,
    c.trigger ?? null,
    c.pre_tokens ?? null,
    c.summary_text ?? null,
  );
}

export function updateSessionStats(db, sessionId) {
  db.prepare(`
    UPDATE sessions SET
      agent_count = (SELECT COUNT(*) FROM agents WHERE session_id = ?),
      tool_call_count = (SELECT COUNT(*) FROM tool_calls WHERE session_id = ?),
      compaction_count = (SELECT COUNT(*) FROM compactions WHERE session_id = ?)
    WHERE id = ?
  `).run(sessionId, sessionId, sessionId, sessionId);
}

export function listSessions(db, opts = {}) {
  let sql = 'SELECT * FROM sessions WHERE 1=1';
  const params = [];
  if (opts.project) {
    sql += ' AND project = ?';
    params.push(opts.project);
  }
  if (opts.status) {
    sql += ' AND status = ?';
    params.push(opts.status);
  }
  sql += ' ORDER BY started_at DESC';
  if (opts.limit) {
    sql += ' LIMIT ?';
    params.push(opts.limit);
  }
  return db.prepare(sql).all(...params);
}

export function searchSessions(db, query) {
  return db.prepare(`
    SELECT s.* FROM sessions s
    JOIN sessions_fts fts ON s.rowid = fts.rowid
    WHERE sessions_fts MATCH ?
  `).all(query);
}
