// Quiz-generation benchmark: the production MCQ prompt (server/quiz.js,
// generateQuizQuestion, isMcq branch) sent unchanged to Groq or local Ollama.
// Settings mirror production's first attempt: temperature 0.7, no JSON mode
// (quiz.js does not request it), same defensive parse and schema check.
//   node bench-quiz.js groq   openai/gpt-oss-20b 10 > out.json   (needs GROQ_API_KEY)
//   node bench-quiz.js ollama llama3.2           10 > out.json
const [, , PROVIDER, MODEL, REPS_ARG] = process.argv;
const REPS = Number(REPS_ARG || 10);
const TOPICS = ['recursion', 'list comprehensions', 'hash tables', 'TCP congestion control', 'ray tracing'];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const prompt = (topic) => `You are a university quiz generator. Generate exactly ONE multiple-choice question about "${topic}" at Bloom's Taxonomy level 3 (apply).
Difficulty complexity: 3/5.

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "question": "<the question text>",
  "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"],
  "correct_index": <0, 1, 2 or 3 — the index of the correct option>,
  "exp": "<one-sentence explanation of why the answer is correct>"
}
Rules: exactly 4 options; exactly one is correct; the other three are plausible but wrong; do not prefix options with letters or numbers.`;

async function groq(content) {
  const body = { model: MODEL, temperature: 0.7, max_completion_tokens: 1024,
    messages: [{ role: 'user', content }] };
  if (/gpt-oss/.test(MODEL)) Object.assign(body, { reasoning_effort: 'low', include_reasoning: false });
  for (;;) {
    const t = Date.now();
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify(body) });
    const ms = Date.now() - t;
    if (r.status === 429) { await sleep(10000); continue; }
    const d = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(d).slice(0, 200));
    return { ms, text: d.choices[0].message.content || '', inTok: d.usage.prompt_tokens,
      outTok: d.usage.completion_tokens, reasonTok: d.usage.completion_tokens_details?.reasoning_tokens || 0 };
  }
}

async function ollama(content) {
  const t = Date.now();
  const r = await fetch('http://localhost:11434/api/chat', { method: 'POST',
    body: JSON.stringify({ model: MODEL, stream: false, options: { temperature: 0.7 },
      messages: [{ role: 'user', content }] }) });
  const d = await r.json();
  return { ms: Date.now() - t, text: d.message?.content || '', inTok: d.prompt_eval_count,
    outTok: d.eval_count, reasonTok: 0, loadMs: Math.round((d.load_duration || 0) / 1e6) };
}

// Same acceptance test as generateQuizQuestion.
function valid(raw) {
  try {
    const cleaned = raw.replace(/```json|```/gi, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    const c = JSON.parse(m ? m[0] : cleaned);
    const idx = Number(c.correct_index);
    return !!c.question && Array.isArray(c.options) && c.options.length === 4 &&
      c.options.every(o => typeof o === 'string' && o.trim()) && Number.isInteger(idx) && idx >= 0 && idx <= 3;
  } catch { return false; }
}

(async () => {
  const call = PROVIDER === 'groq' ? groq : ollama;
  const rows = [];
  for (let i = 0; i < REPS; i++) {
    const topic = TOPICS[i % TOPICS.length];
    const out = await call(prompt(topic));
    rows.push({ provider: PROVIDER, model: MODEL, rep: i + 1, topic, ...out, valid: valid(out.text) });
    process.stderr.write(`${MODEL} ${i + 1}: ${out.ms}ms valid=${rows.at(-1).valid}\n`);
    if (PROVIDER === 'groq') await sleep(3000);
  }
  console.log(JSON.stringify(rows, null, 1));
})();
