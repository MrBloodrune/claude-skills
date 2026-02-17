import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import {
  initDb,
  upsertSession,
  insertAgent,
  insertToolCall,
  completeToolCall,
  insertCompaction,
  updateSessionStats,
} from './db.js';

function readLines(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8').split('\n').filter(Boolean);
}

function safeParse(line) {
  try { return JSON.parse(line); } catch { return null; }
}

export function parseSessionMeta(path) {
  const lines = readLines(path);
  if (!lines) return null;

  let sessionId = null;
  let slug = null;
  let cwd = null;
  let gitBranch = null;
  let version = null;
  let model = null;
  let firstPrompt = null;
  let startedAt = null;

  for (const line of lines) {
    const entry = safeParse(line);
    if (!entry) continue;

    if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
    if (!slug && entry.slug) slug = entry.slug;
    if (!cwd && entry.cwd) cwd = entry.cwd;
    if (!gitBranch && entry.gitBranch) gitBranch = entry.gitBranch;
    if (!version && entry.version) version = entry.version;

    if (!startedAt && entry.timestamp) {
      startedAt = new Date(entry.timestamp).getTime();
    }

    if (!model && entry.type === 'assistant' && entry.message?.model) {
      model = entry.message.model;
    }

    if (!firstPrompt && entry.type === 'user' && entry.message?.content) {
      const content = entry.message.content;
      firstPrompt = typeof content === 'string'
        ? content.slice(0, 2000)
        : Array.isArray(content)
          ? content.filter(b => b.type === 'text').map(b => b.text).join('\n').slice(0, 2000)
          : null;
    }

    if (sessionId && slug && cwd && gitBranch && version && model && firstPrompt) break;
  }

  if (!sessionId) return null;

  return {
    sessionId,
    slug,
    cwd,
    project: cwd,
    gitBranch,
    version,
    model,
    firstPrompt,
    startedAt,
  };
}

export function parseTokenUsage(path) {
  const lines = readLines(path);
  if (!lines) return { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 };

  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let cacheCreate = 0;

  for (const line of lines) {
    const entry = safeParse(line);
    if (!entry || entry.type !== 'assistant') continue;

    const usage = entry.message?.usage;
    if (!usage) continue;

    input += usage.input_tokens || 0;
    output += usage.output_tokens || 0;
    cacheRead += usage.cache_read_input_tokens || 0;
    cacheCreate += usage.cache_creation_input_tokens || 0;
  }

  return { input, output, cacheRead, cacheCreate };
}

export function parseToolCalls(path) {
  const lines = readLines(path);
  if (!lines) return [];

  const tools = [];

  for (const line of lines) {
    const entry = safeParse(line);
    if (!entry || entry.type !== 'assistant') continue;

    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type !== 'tool_use') continue;

      const input = block.input || {};
      let paramsSummary = '';
      const keys = Object.keys(input);
      if (keys.length > 0) {
        paramsSummary = keys.slice(0, 3).map(k => {
          const v = input[k];
          const s = typeof v === 'string' ? v : JSON.stringify(v);
          return `${k}=${(s || '').slice(0, 100)}`;
        }).join(', ');
      }

      tools.push({
        id: block.id,
        toolName: block.name,
        paramsSummary,
        timestamp: entry.timestamp,
        spawnsAgentId: block.name === 'Task' ? (input.description || '').slice(0, 50) : null,
      });
    }
  }

  return tools;
}

export function parseAgents(path) {
  const lines = readLines(path);
  if (!lines) return [];

  const agents = [];

  for (const line of lines) {
    const entry = safeParse(line);
    if (!entry || entry.type !== 'assistant') continue;

    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type !== 'tool_use' || block.name !== 'Task') continue;
      const input = block.input || {};
      agents.push({
        toolUseId: block.id,
        agentType: input.subagent_type || null,
        description: input.description || null,
        model: input.model || null,
        prompt: (input.prompt || '').slice(0, 500),
        background: !!input.run_in_background,
      });
    }
  }

  return agents;
}

export function parseCompactions(path) {
  const lines = readLines(path);
  if (!lines) return [];

  const compactions = [];

  for (const line of lines) {
    const entry = safeParse(line);
    if (!entry) continue;

    // Compact agent transcripts have assistant messages with summary content
    if (entry.type === 'assistant' && entry.message?.content) {
      const content = entry.message.content;
      const blocks = Array.isArray(content) ? content : [];
      for (const block of blocks) {
        if (block.type === 'text' && block.text && block.text.includes('<summary>')) {
          const match = block.text.match(/<summary>([\s\S]*?)<\/summary>/);
          if (match) {
            compactions.push({
              timestamp: entry.timestamp ? new Date(entry.timestamp).getTime() : Date.now(),
              summaryText: match[1].trim().slice(0, 5000),
              trigger: 'context_limit',
            });
          }
        }
      }
    }

    // Also catch system-level compaction markers
    if (entry.type === 'summary' || entry.type === 'compact') {
      const text = typeof entry.summary === 'string'
        ? entry.summary
        : typeof entry.message?.content === 'string'
          ? entry.message.content
          : '';
      if (text) {
        compactions.push({
          timestamp: entry.timestamp ? new Date(entry.timestamp).getTime() : Date.now(),
          summaryText: text.slice(0, 5000),
          trigger: 'context_limit',
        });
      }
    }
  }

  return compactions;
}

export function ingestSession(db, path) {
  if (!existsSync(path)) return { success: false, error: 'File not found' };

  const meta = parseSessionMeta(path);
  if (!meta) return { success: false, error: 'Could not parse session metadata' };

  const usage = parseTokenUsage(path);
  const toolCalls = parseToolCalls(path);
  const agents = parseAgents(path);
  const compactions = parseCompactions(path);

  // Wrap in transaction for atomicity
  const txn = db.prepare('BEGIN');
  const commit = db.prepare('COMMIT');
  const rollback = db.prepare('ROLLBACK');

  try {
    txn.run();

    // Delete existing data for idempotency
    db.prepare('DELETE FROM compactions WHERE session_id = ?').run(meta.sessionId);
    db.prepare('DELETE FROM tool_calls WHERE session_id = ?').run(meta.sessionId);
    db.prepare('DELETE FROM agents WHERE session_id = ?').run(meta.sessionId);

    upsertSession(db, {
      id: meta.sessionId,
      slug: meta.slug,
      project: meta.project,
      cwd: meta.cwd,
      git_branch: meta.gitBranch,
      model: meta.model,
      claude_version: meta.version,
      started_at: meta.startedAt,
      transcript_path: path,
      first_prompt: meta.firstPrompt,
      tokens_in: usage.input,
      tokens_out: usage.output,
      cache_read: usage.cacheRead,
      cache_create: usage.cacheCreate,
    });

    for (const tc of toolCalls) {
      insertToolCall(db, {
        id: tc.id,
        session_id: meta.sessionId,
        agent_id: 'ag_main',
        tool_name: tc.toolName,
        params_summary: tc.paramsSummary,
        started_at: tc.timestamp ? new Date(tc.timestamp).getTime() : null,
        spawns_agent_id: tc.spawnsAgentId,
      });
    }

    for (const a of agents) {
      insertAgent(db, {
        id: a.toolUseId,
        session_id: meta.sessionId,
        agent_type: a.agentType,
        task_description: a.description,
        model: a.model,
      });
    }

    for (const c of compactions) {
      insertCompaction(db, {
        session_id: meta.sessionId,
        timestamp: c.timestamp,
        trigger: c.trigger,
        summary_text: c.summaryText,
      });
    }

    updateSessionStats(db, meta.sessionId);
    commit.run();

    return { success: true, sessionId: meta.sessionId };
  } catch (err) {
    try { rollback.run(); } catch {}
    return { success: false, error: err.message };
  }
}

// CLI interface
if (process.argv[1] && process.argv[1].endsWith('ingest.js') && process.argv.length > 2) {
  const args = process.argv.slice(2);
  const dbPath = process.env.OBSERVATORY_DB || `${process.env.HOME}/.claude/observatory/observatory.db`;

  if (args.includes('--help')) {
    console.log('Usage: node ingest.js [--session <path>] [--backfill <project-dir>]');
    process.exit(0);
  }

  const { mkdirSync } = await import('node:fs');
  const { dirname: dirnameFn } = await import('node:path');
  mkdirSync(dirnameFn(dbPath), { recursive: true });
  const db = initDb(dbPath);

  const sessionIdx = args.indexOf('--session');
  if (sessionIdx !== -1 && args[sessionIdx + 1]) {
    const result = ingestSession(db, args[sessionIdx + 1]);
    console.log(JSON.stringify(result));
    process.exit(result.success ? 0 : 1);
  }

  const backfillIdx = args.indexOf('--backfill');
  if (backfillIdx !== -1 && args[backfillIdx + 1]) {
    const { readdirSync } = await import('node:fs');
    const dir = args[backfillIdx + 1];
    const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));
    let ingested = 0;
    let failed = 0;
    for (const f of files) {
      const result = ingestSession(db, `${dir}/${f}`);
      if (result.success) { ingested++; } else { failed++; }
    }
    console.log(JSON.stringify({ ingested, failed, total: files.length }));
    process.exit(failed > 0 ? 1 : 0);
  }

  db.close();
}
