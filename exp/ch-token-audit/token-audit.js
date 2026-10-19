#!/usr/bin/env node
// token-audit.js — baseline token audit for thesis §3.4.1 (Eq. 3.1).
//
// Decomposes the uncompressed first-pass agent prompt into its components by
// growing it one component at a time and reading Groq's exact `prompt_tokens`
// after each step:
//
//   persona + query                      → t_system, t_query
//   + LMS context (optional)             → t_context
//   + retrieved course material          → t_retrieved   (k chunks)
//   + tool definitions                   → t_tools       (measured once)
//   + conversation history (follow-ups)  → t_history
//
// Runs INSIDE the backend container, so it uses the deployed retrieval code
// (server/rag.js), tool schemas (server/agentTools.js, plus any connected MCP
// servers), and the persona builder from server/chat.js. Compression is forced
// OFF: this audit measures the uncompressed baseline.
//
// Usage (inside the container; see README.md):
//   node /tmp/token-audit.js --questions /tmp/questions.csv --course CS3241 \
//        --out /tmp/token-audit-results.csv [--context /tmp/context.txt] \
//        [--model openai/gpt-oss-20b] [--app /app]
//
// Each measurement call asks for at most 8 output tokens; only the reported
// prompt_tokens is used. Calls are paced under the free tier's 8,000
// tokens/minute per model, so a 10-question run takes roughly 10 minutes.

'use strict';
process.env.RAG_COMPRESS = 'off';            // must be set before rag.js loads

const fs   = require('fs');
const path = require('path');

// ── arguments ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { model: 'openai/gpt-oss-20b', app: '/app', course: 'CS3241' };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    a[k] = argv[i + 1];
    i++;
  }
  return a;
}

// ── minimal CSV (quoted fields, commas inside quotes) ────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(f => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(f => f !== '')) rows.push(row);
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

function toCSV(rows, cols) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n';
}

// ── persona, taken from the deployed chat.js so it cannot drift ──────────────
function loadPersonaBuilder(appDir, mcpClient) {
  const src = fs.readFileSync(path.join(appDir, 'server', 'chat.js'), 'utf8');
  const start = src.indexOf('function buildTASystemPrompt(');
  if (start < 0) throw new Error('buildTASystemPrompt not found in server/chat.js');
  const end = src.indexOf('\n}\n', start);
  if (end < 0) throw new Error('could not find the end of buildTASystemPrompt');
  const fnSrc = src.slice(start, end + 2);
  // eslint-disable-next-line no-new-func
  return new Function('mcpClient', `${fnSrc}\nreturn buildTASystemPrompt;`)(mcpClient);
}

// ── Groq, paced under the per-minute token budget ────────────────────────────
const TPM_BUDGET = Number(process.env.AUDIT_TPM) || 7000;   // stay under the 8,000 free-tier cap
const window_ = [];                            // [timestamp, tokens]
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pace(estimate) {
  for (;;) {
    const now = Date.now();
    while (window_.length && now - window_[0][0] > 60000) window_.shift();
    const used = window_.reduce((s, [, t]) => s + t, 0);
    if (used + estimate <= TPM_BUDGET) return;
    const wait = 60000 - (now - window_[0][0]) + 500;
    process.stderr.write(`  pacing: waiting ${Math.ceil(wait / 1000)}s for the token budget\n`);
    await sleep(wait);
  }
}

async function promptTokens({ model, messages, tools, maxTokens = 8 }) {
  const base = (process.env.GROQ_BASE || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set in this container');
  const estimate = Math.ceil(JSON.stringify({ messages, tools }).length / 3) + maxTokens;
  for (let attempt = 0; attempt < 5; attempt++) {
    await pace(estimate);
    const body = { model, messages, max_completion_tokens: maxTokens };
    if (/gpt-oss/.test(model)) Object.assign(body, { reasoning_effort: 'low', include_reasoning: false });
    if (tools && tools.length) body.tools = tools;
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      const ra = Number(res.headers.get('retry-after')) || 20;
      process.stderr.write(`  429 from Groq: retrying in ${ra}s\n`);
      await sleep(ra * 1000 + 500);
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    const used = json.usage || {};
    window_.push([Date.now(), (used.prompt_tokens || 0) + (used.completion_tokens || 0)]);
    if (typeof used.prompt_tokens !== 'number') throw new Error('Groq response has no usage.prompt_tokens');
    return { prompt: used.prompt_tokens, content: json.choices?.[0]?.message?.content || '' };
  }
  throw new Error('Groq kept rate-limiting; try again in a few minutes');
}

// ── main ─────────────────────────────────────────────────────────────────────
const RESULT_COLS = [
  'id', 'question', 'type', 'follow_up_of', 'course',
  'chunks_retrieved', 'retrieved_chars',
  't_system', 't_context', 't_retrieved', 't_history', 't_query', 't_tools',
  'first_pass_input', 'retrieved_share_pct',
  'passes_observed', 'notes',
];

async function main() {
  const args = parseArgs(process.argv);
  if (!args.questions || !args.out) {
    console.error('usage: node token-audit.js --questions <csv> --out <csv> [--course CS3241] [--context <txt>] [--model <id>] [--app /app]');
    process.exit(2);
  }
  const app = args.app;
  const questions = parseCSV(fs.readFileSync(args.questions, 'utf8'));
  const context = args.context ? fs.readFileSync(args.context, 'utf8').trim() : '';

  const services = require(path.join(app, 'server', 'services.js'));
  const { retrieveCourseContext } = require(path.join(app, 'server', 'rag.js'));
  if (!services.db || !services.embeddings) throw new Error('database or embeddings unavailable in this container');
  // Give MCP servers a moment to connect, as they would in a live chat turn.
  await sleep(4000);
  const tools = (services.agentTools ? services.agentTools.toolDefs : [])
    .concat(services.mcpClient ? services.mcpClient.toolDefs() : []);
  const buildPrompt = loadPersonaBuilder(app, services.mcpClient);
  const model = args.model;

  // Retrieval fails silently (it returns '' so chat can degrade), which would
  // record zeros here. Check it works before spending any tokens.
  const probe = await retrieveCourseContext(questions[0].question, args.course);
  if (!probe) {
    throw new Error(`retrieval returned nothing for ${questions[0].id} in ${args.course}. ` +
      'Check that the embedding host (Ollama tunnel) is up and the course is ingested.');
  }

  console.error(`Token audit: ${questions.length} questions, course=${args.course}, model=${model}, ` +
    `tools=${tools.length}, context=${context ? context.length + ' chars' : 'none'}`);

  // Fixed components, measured once.
  const sysOnly = await promptTokens({ model, messages: [
    { role: 'system', content: buildPrompt('') }, { role: 'user', content: '?' }] });
  const tSystem = sysOnly.prompt - 1;            // the "?" is one token

  const answers = {};                             // id → assistant answer, for follow-ups
  const results = [];
  let tTools = null;

  for (const q of questions) {
    process.stderr.write(`${q.id}  ${q.question}\n`);
    const retrieved = await retrieveCourseContext(q.question, args.course);
    const chunks = (retrieved.match(/^\[\d+\] \(/gm) || []).length;

    const user = { role: 'user', content: q.question };
    const sys = (ctx) => ({ role: 'system', content: buildPrompt(ctx) });
    const ctxWithRag = [context, retrieved].filter(Boolean).join('\n\n');

    const m0 = await promptTokens({ model, messages: [sys(''), user] });
    const tQuery = m0.prompt - sysOnly.prompt + 1;

    const m1 = context ? await promptTokens({ model, messages: [sys(context), user] }) : m0;
    const tContext = m1.prompt - m0.prompt;

    const m2 = retrieved ? await promptTokens({ model, messages: [sys(ctxWithRag), user] }) : m1;
    const tRetrieved = m2.prompt - m1.prompt;

    if (tTools === null) {
      const m3 = await promptTokens({ model, messages: [sys(ctxWithRag), user], tools });
      tTools = m3.prompt - m2.prompt;
    }

    let tHistory = 0, notes = '';
    if (q.follow_up_of) {
      const prev = questions.find(p => p.id === q.follow_up_of);
      if (!prev) throw new Error(`${q.id}: follow_up_of ${q.follow_up_of} not found`);
      if (!answers[prev.id]) {
        // Generate the earlier answer the way a chat turn would (no tools).
        const prevRag = await retrieveCourseContext(prev.question, args.course);
        const ans = await promptTokens({
          model, maxTokens: 600,
          messages: [sys([context, prevRag].filter(Boolean).join('\n\n')),
                     { role: 'user', content: prev.question }],
        });
        answers[prev.id] = ans.content || '(empty answer)';
      }
      const history = [{ role: 'user', content: prev.question },
                       { role: 'assistant', content: answers[prev.id] }];
      const m4 = await promptTokens({ model, messages: [sys(ctxWithRag), ...history, user] });
      tHistory = m4.prompt - m2.prompt;
      notes = `history = ${prev.id} question + generated answer (${answers[prev.id].length} chars)`;
    }
    if (!retrieved) notes = [notes, 'no chunk passed the distance cut-off'].filter(Boolean).join('; ');

    const firstPass = m2.prompt + tTools + tHistory;
    results.push({
      id: q.id, question: q.question, type: q.type, follow_up_of: q.follow_up_of, course: args.course,
      chunks_retrieved: chunks, retrieved_chars: retrieved.length,
      t_system: tSystem, t_context: tContext, t_retrieved: tRetrieved, t_history: tHistory,
      t_query: tQuery, t_tools: tTools,
      first_pass_input: firstPass,
      retrieved_share_pct: firstPass ? (100 * tRetrieved / firstPass).toFixed(1) : '0.0',
      passes_observed: '', notes,
    });
    process.stderr.write(`  k=${chunks}  retrieved=${tRetrieved}  first pass=${firstPass}\n`);
  }

  // Summary for the thesis: in-syllabus questions are those that retrieved material.
  const inSyl = results.filter(r => r.chunks_retrieved > 0);
  const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const summary = {
    in_syllabus_n: inSyl.length,
    mean_chunks: +mean(inSyl.map(r => r.chunks_retrieved)).toFixed(2),
    mean_t_retrieved: Math.round(mean(inSyl.map(r => r.t_retrieved))),
    mean_first_pass_input: Math.round(mean(inSyl.map(r => r.first_pass_input))),
    retrieved_share_pct: +(100 * mean(inSyl.map(r => r.t_retrieved)) /
                           (mean(inSyl.map(r => r.first_pass_input)) || 1)).toFixed(1),
    t_system: tSystem, t_tools: tTools,
  };
  console.error('\nSummary (in-syllabus questions):', JSON.stringify(summary));

  fs.writeFileSync(args.out, toCSV(results, RESULT_COLS));
  fs.writeFileSync(args.out.replace(/\.csv$/, '') + '.json',
    JSON.stringify({ model, course: args.course, tools: tools.length,
      context_chars: context.length, ran_at: new Date().toISOString(), summary, results, answers }, null, 2));
  console.error(`\nWrote ${args.out} (and .json). t_system=${tSystem}, t_tools=${tTools}.`);
  process.exit(0);
}

if (require.main === module) {
  main().catch(e => { console.error(`\ntoken audit failed: ${e.message}`); process.exit(1); });
}
module.exports = { parseCSV, toCSV, loadPersonaBuilder, parseArgs };
