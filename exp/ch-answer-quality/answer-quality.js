#!/usr/bin/env node
// answer-quality.js — answer-quality evaluation of the compression stage (RQ2,
// thesis §5.1 / §5.3).
//
// For each question, retrieves course material exactly as production does
// (server/rag.js: top-5 chunks, cosine distance <= 0.6), then answers it twice
// with the deployed agent model:
//
//   uncompressed — every retrieved chunk in full (RAG_COMPRESS=off)
//   compressed   — RECOMP-lite sentence selection (topK=6, minScore=0.5),
//                  empty context when no sentence qualifies
//
// Both answers use the production persona from server/chat.js and no tools, so
// the only difference between the two is the retrieved context. The two answers
// are labelled A and B in a random but reproducible order (--seed), so they can
// be scored blind; the key is written to a separate file.
//
// Runs INSIDE the backend container (see README.md):
//   node /tmp/answer-quality.js --questions /tmp/questions.csv --course IT5001 \
//        --outdir /tmp/aq [--model openai/gpt-oss-20b] [--seed 5105] [--app /app]
//
// Writes to --outdir:
//   scoring-sheet.csv   one row per question, answers A and B side by side
//   answers.md          the same answers, easier to read while scoring
//   key.json            which of A/B is compressed — do not open before scoring
//   raw.json            tokens, latency, retrieval and compression stats

'use strict';

const fs   = require('fs');
const path = require('path');

const RAG_TOP_K        = 5;     // production defaults (server/rag.js)
const RAG_MAX_DISTANCE = 0.6;
const COMPRESS_TOP_K   = 6;
const COMPRESS_MIN     = 0.5;

function parseArgs(argv) {
  const a = { model: 'openai/gpt-oss-20b', app: '/app', course: 'IT5001', seed: '5105',
              temperature: '0', maxtokens: '1024' };
  for (let i = 2; i < argv.length; i++) { a[argv[i].replace(/^--/, '')] = argv[i + 1]; i++; }
  return a;
}

// ── CSV ──────────────────────────────────────────────────────────────────────
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
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n';
}

// ── reproducible A/B order ───────────────────────────────────────────────────
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ── persona, from the deployed chat.js ───────────────────────────────────────
function loadPersonaBuilder(appDir, mcpClient) {
  const src = fs.readFileSync(path.join(appDir, 'server', 'chat.js'), 'utf8');
  const start = src.indexOf('function buildTASystemPrompt(');
  if (start < 0) throw new Error('buildTASystemPrompt not found in server/chat.js');
  const end = src.indexOf('\n}\n', start);
  if (end < 0) throw new Error('could not find the end of buildTASystemPrompt');
  // eslint-disable-next-line no-new-func
  return new Function('mcpClient', `${src.slice(start, end + 2)}\nreturn buildTASystemPrompt;`)(mcpClient);
}

// ── retrieval, mirroring server/rag.js ───────────────────────────────────────
function uncompressedBlock(hits) {
  if (!hits.length) return '';
  const block = hits.map((r, i) =>
    `[${i + 1}] (${r.source}${r.course_code ? ', ' + r.course_code : ''})\n${r.content}`
  ).join('\n\n');
  return `RELEVANT COURSE MATERIAL EXCERPTS (retrieved for this question):\n\n${block}`;
}

// ── Groq, paced under the per-minute token budget ────────────────────────────
const TPM_BUDGET = Number(process.env.AUDIT_TPM) || 7000;
const window_ = [];
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

async function generate({ model, messages, temperature, maxTokens }) {
  const base = (process.env.GROQ_BASE || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set in this container');
  // Budget for the prompt plus a typical answer (not the full cap), so pacing
  // is neither reckless nor needlessly slow.
  const estimate = Math.ceil(JSON.stringify(messages).length / 3) + Math.min(maxTokens, 500);
  for (let attempt = 0; attempt < 6; attempt++) {
    await pace(estimate);
    const body = { model, messages, max_completion_tokens: maxTokens, temperature };
    if (/gpt-oss/.test(model)) Object.assign(body, { reasoning_effort: 'low', include_reasoning: false });
    const started = Date.now();
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
    const u = json.usage || {};
    window_.push([Date.now(), (u.prompt_tokens || 0) + (u.completion_tokens || 0)]);
    return {
      answer: json.choices?.[0]?.message?.content || '',
      finish: json.choices?.[0]?.finish_reason || '',
      prompt_tokens: u.prompt_tokens, completion_tokens: u.completion_tokens,
      latency_ms: Date.now() - started,
    };
  }
  throw new Error('Groq kept rate-limiting; try again in a few minutes');
}

// ── main ─────────────────────────────────────────────────────────────────────
const SHEET_COLS = [
  'id', 'question', 'kind', 'reference_answer',
  'answer_A', 'answer_B',
  'correct_A', 'correct_B', 'cites_A', 'cites_B',
  'not_covered_A', 'not_covered_B', 'preferred', 'notes',
];

async function main() {
  const args = parseArgs(process.argv);
  if (!args.questions || !args.outdir) {
    console.error('usage: node answer-quality.js --questions <csv> --outdir <dir> [--course IT5001] [--model <id>] [--seed 5105] [--app /app]');
    process.exit(2);
  }
  const app = args.app, model = args.model, course = args.course;
  const temperature = Number(args.temperature), maxTokens = Number(args.maxtokens);
  const questions = parseCSV(fs.readFileSync(args.questions, 'utf8'));
  fs.mkdirSync(args.outdir, { recursive: true });

  const services = require(path.join(app, 'server', 'services.js'));
  const recomp = require(path.join(app, 'server', 'recompCompressor.js'));
  const { db, embeddings } = services;
  if (!db || !embeddings) throw new Error('database or embeddings unavailable in this container');
  await sleep(4000);                               // let MCP connect, as in a live turn
  const buildPrompt = loadPersonaBuilder(app, services.mcpClient);

  async function retrieve(question) {
    const t0 = Date.now();
    const vec = await embeddings.embedOne(question);
    const rows = await db.searchCourseChunks(embeddings.toVectorLiteral(vec), course, RAG_TOP_K);
    const hits = rows.filter(r => r.distance <= RAG_MAX_DISTANCE);
    return { vec, rows, hits, retrieval_ms: Date.now() - t0 };
  }

  // Fail fast if retrieval is down (it would otherwise silently return nothing).
  const firstIn = questions.find(q => q.kind === 'in-syllabus') || questions[0];
  const probe = await retrieve(firstIn.question);
  if (!probe.hits.length) {
    throw new Error(`retrieval returned nothing for ${firstIn.id} in ${course}. ` +
      'Check that the embedding host (Ollama tunnel) is up and the course is ingested.');
  }

  console.error(`Answer quality: ${questions.length} questions x 2 conditions, course=${course}, ` +
    `model=${model}, temperature=${temperature}, seed=${args.seed}`);

  const rand = mulberry32(Number(args.seed));
  const raw = [], sheet = [], key = {};
  let md = `# Answer-quality scoring — ${course}\n\nScore each answer against the reference ` +
    `(see README.md for the rubric). A and B are in random order; do not open key.json until ` +
    `scoring is finished.\n`;

  for (const q of questions) {
    process.stderr.write(`${q.id}  ${q.question}\n`);
    const r = await retrieve(q.question);
    const full = uncompressedBlock(r.hits);

    const c0 = Date.now();
    let compressed = '', cstats = null;
    if (r.hits.length) {
      const { sentences, stats } = await recomp.compress(r.vec, r.hits, {
        embed: embeddings.embed, topK: COMPRESS_TOP_K, minScore: COMPRESS_MIN,
      });
      compressed = recomp.toContextBlock(sentences);
      cstats = stats;
    }
    const compression_ms = Date.now() - c0;

    const user = { role: 'user', content: q.question };
    const runs = {};
    for (const [cond, ctx] of [['uncompressed', full], ['compressed', compressed]]) {
      runs[cond] = await generate({
        model, temperature, maxTokens,
        messages: [{ role: 'system', content: buildPrompt(ctx) }, user],
      });
      runs[cond].context_chars = ctx.length;
    }
    runs.compressed.compression_ms = compression_ms;

    const aIsCompressed = rand() < 0.5;
    const A = aIsCompressed ? 'compressed' : 'uncompressed';
    const B = aIsCompressed ? 'uncompressed' : 'compressed';
    key[q.id] = { A, B };

    raw.push({
      id: q.id, question: q.question, kind: q.kind, tag: q.tag, source: q.source,
      chunks_retrieved: r.hits.length,
      best_distance: r.rows[0] ? Number(r.rows[0].distance) : null,
      retrieval_ms: r.retrieval_ms,
      compression: cstats,
      uncompressed: runs.uncompressed,
      compressed: runs.compressed,
    });
    sheet.push({
      id: q.id, question: q.question, kind: q.kind, reference_answer: q.reference_answer,
      answer_A: runs[A].answer, answer_B: runs[B].answer,
      correct_A: '', correct_B: '', cites_A: '', cites_B: '',
      not_covered_A: '', not_covered_B: '', preferred: '', notes: '',
    });
    md += `\n---\n\n## ${q.id} (${q.kind})\n\n**Question:** ${q.question}\n\n` +
      `**Reference:** ${q.reference_answer}\n\n### Answer A\n\n${runs[A].answer}\n\n` +
      `### Answer B\n\n${runs[B].answer}\n`;
    process.stderr.write(`  k=${r.hits.length}  prompt ${runs.uncompressed.prompt_tokens} -> ` +
      `${runs.compressed.prompt_tokens} tokens  ` +
      `(${!r.hits.length ? 'nothing retrieved' : cstats.empty ? 'compressed to nothing' : 'compressed'})\n`);
  }

  fs.writeFileSync(path.join(args.outdir, 'scoring-sheet.csv'), toCSV(sheet, SHEET_COLS));
  fs.writeFileSync(path.join(args.outdir, 'answers.md'), md);
  fs.writeFileSync(path.join(args.outdir, 'key.json'), JSON.stringify(key, null, 2));
  fs.writeFileSync(path.join(args.outdir, 'raw.json'), JSON.stringify({
    model, course, temperature, max_tokens: maxTokens, seed: Number(args.seed),
    rag: { top_k: RAG_TOP_K, max_distance: RAG_MAX_DISTANCE },
    compression: { top_k: COMPRESS_TOP_K, min_score: COMPRESS_MIN },
    ran_at: new Date().toISOString(), results: raw,
  }, null, 2));
  console.error(`\nWrote scoring-sheet.csv, answers.md, key.json and raw.json to ${args.outdir}.`);
  process.exit(0);
}

if (require.main === module) {
  main().catch(e => { console.error(`\nanswer-quality run failed: ${e.message}`); process.exit(1); });
}
module.exports = { parseCSV, toCSV, mulberry32, uncompressedBlock, loadPersonaBuilder };
