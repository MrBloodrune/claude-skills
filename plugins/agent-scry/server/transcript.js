import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const cache = new Map();
const CACHE_TTL_MS = 60_000;

function cachedRead(path) {
  const now = Date.now();
  const entry = cache.get(path);
  if (entry && (now - entry.time) < CACHE_TTL_MS) {
    try {
      const mtime = statSync(path).mtimeMs;
      if (mtime === entry.mtime) return entry.data;
    } catch { /* fall through to re-read */ }
  }
  return null;
}

function cacheStore(path, data) {
  try {
    const mtime = statSync(path).mtimeMs;
    cache.set(path, { data, mtime, time: Date.now() });
  } catch { /* skip caching if stat fails */ }
}

export function parseTranscript(path) {
  const cached = cachedRead(path);
  if (cached) return cached;

  if (!existsSync(path)) return null;

  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
  let prompt = null;
  const messages = [];
  const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  const files = new Map();
  const errors = [];

  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }

    if (entry.type === 'user' && !prompt) {
      const content = entry.message?.content;
      prompt = typeof content === 'string' ? content
        : Array.isArray(content) ? content.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : null;
    }

    if (entry.type === 'assistant') {
      const content = entry.message?.content || [];
      const msgUsage = entry.message?.usage;

      if (msgUsage) {
        usage.input_tokens += msgUsage.input_tokens || 0;
        usage.output_tokens += msgUsage.output_tokens || 0;
        usage.cache_creation_input_tokens += msgUsage.cache_creation_input_tokens || 0;
        usage.cache_read_input_tokens += msgUsage.cache_read_input_tokens || 0;
      }

      const blocks = Array.isArray(content) ? content : [];
      for (const block of blocks) {
        if (block.type === 'tool_use') {
          const input = block.input || {};
          const msg = { type: 'tool_use', name: block.name, id: block.id, input };
          messages.push(msg);
          extractFiles(block.name, input, files);
        } else if (block.type === 'text') {
          messages.push({ type: 'text', text: block.text });
        }
      }
    }

    if (entry.type === 'tool_result' || entry.type === 'tool_response') {
      const content = entry.content || entry.message?.content;
      const isError = !!(entry.is_error || entry.error);
      if (isError) {
        const errText = typeof content === 'string' ? content
          : Array.isArray(content) ? content.map(b => b.text || '').join('\n')
          : String(content || '');
        errors.push({ tool_use_id: entry.tool_use_id, text: errText.slice(0, 500) });
      }
      messages.push({ type: 'tool_result', tool_use_id: entry.tool_use_id, is_error: isError, preview: summarizeContent(content) });
    }
  }

  usage.cache_hit_rate = usage.input_tokens > 0
    ? ((usage.cache_read_input_tokens / usage.input_tokens) * 100).toFixed(1) + '%'
    : '0%';

  const compactionSummaries = extractCompactionsFromMessages(lines);
  const result = { prompt: prompt ? prompt.slice(0, 2000) : null, messages, usage, files: [...files.entries()].map(([p, ops]) => ({ path: p, ops: [...ops] })), errors, compactionSummaries };
  cacheStore(path, result);
  return result;
}

function extractFiles(toolName, input, files) {
  let path = null;
  let op = null;

  switch (toolName) {
    case 'Read': case 'NotebookRead': path = input.file_path; op = 'R'; break;
    case 'Write': case 'NotebookEdit': path = input.file_path || input.notebook_path; op = 'W'; break;
    case 'Edit': path = input.file_path; op = 'E'; break;
    case 'Glob': path = input.pattern; op = 'R'; break;
    case 'Grep': path = input.path || input.pattern; op = 'R'; break;
    case 'Bash': {
      const cmd = input.command || '';
      const m = cmd.match(/(?:cat|head|tail|less|vim|nano)\s+(?:-[^\s]*\s+)*([^\s|;&-][^\s|;&]*)/);
      if (m) { path = m[1]; op = 'R'; }
      break;
    }
  }

  if (path) {
    if (!files.has(path)) files.set(path, new Set());
    files.get(path).add(op);
  }
}

function summarizeContent(content) {
  if (typeof content === 'string') return content.slice(0, 300).replace(/\n/g, ' ');
  if (Array.isArray(content)) return content.map(b => b.text || '').join(' ').slice(0, 300).replace(/\n/g, ' ');
  return '';
}

export function listSubagentTranscripts(sessionTranscriptPath) {
  const dir = dirname(sessionTranscriptPath);
  const sessionBase = basename(sessionTranscriptPath, '.jsonl');
  const subagentsDir = join(dir, sessionBase, 'subagents');

  if (!existsSync(subagentsDir)) {
    const altDir = join(dir, 'subagents');
    if (!existsSync(altDir)) return [];
    return scanSubagentDir(altDir);
  }
  return scanSubagentDir(subagentsDir);
}

function extractCompactionsFromMessages(lines) {
  const summaries = [];
  let compactionIdx = 0;
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.type === 'summary' || entry.type === 'compact') {
      const text = typeof entry.summary === 'string' ? entry.summary
        : typeof entry.message?.content === 'string' ? entry.message.content
        : Array.isArray(entry.message?.content) ? entry.message.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : '';
      if (text) summaries.push({ index: compactionIdx++, text: text.slice(0, 5000) });
    }
    if (entry.type === 'system' && typeof entry.message?.content === 'string' && entry.message.content.includes('compacted')) {
      summaries.push({ index: compactionIdx++, text: entry.message.content.slice(0, 5000) });
    }
  }
  return summaries;
}

export function extractCompactionSummaries(path) {
  if (!existsSync(path)) return [];
  const cached = cachedRead(path);
  if (cached && cached.compactionSummaries) return cached.compactionSummaries;
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
  return extractCompactionsFromMessages(lines);
}

function scanSubagentDir(dir) {
  const results = [];
  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl'));

  for (const file of files) {
    const path = join(dir, file);
    const cached = cachedRead(path);
    if (cached) {
      results.push({ path, prompt: cached.prompt, agentId: null });
      continue;
    }

    try {
      const first = readFileSync(path, 'utf8').split('\n').find(Boolean);
      if (!first) continue;
      const entry = JSON.parse(first);
      const content = entry.message?.content;
      const prompt = typeof content === 'string' ? content.slice(0, 200)
        : Array.isArray(content) ? content.filter(b => b.type === 'text').map(b => b.text).join(' ').slice(0, 200)
        : null;
      results.push({ path, prompt, agentId: null });
    } catch { continue; }
  }
  return results;
}
