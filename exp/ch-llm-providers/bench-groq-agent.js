// Groq variant of fyp-virtual-teaching-assistant/tools/bench-agent-models.js.
// PERSONA, STUBS, SCENARIOS and the loop are copied VERBATIM from that harness;
// only the transport (OpenAI-compatible Groq API) and token accounting differ.
// Settings match production: reasoning_effort=low, max_completion_tokens=1024.
//   GROQ_API_KEY=... node bench-groq-agent.js <fyp-repo> <models> <reps> [scenario] > out.json
// Original header: Agent-model benchmark. Mirrors server/chat.js runAgentLoop: same tool defs,
// same persona, same max-iteration behaviour, tools withheld on the final pass.
// Tool RESULTS are stubbed and identical for every model, so differences come
// from the model, not from live data.
const GROQ = 'https://api.groq.com/openai/v1';
const KEY  = process.env.GROQ_API_KEY;
const { toolDefs } = require(process.argv[2] + '/server/agentTools.js');
const MODELS   = process.argv[3].split(',');
const REPS     = Number(process.argv[4] || 3);
const MAX_ITERS = 5;
const ONLY = process.argv[5] || null;

const PERSONA = `You are Professor Mentor, a virtual teaching assistant for a university student. Today is Wednesday, 20 August 2026.

YOUR ROLE
- You are a patient, encouraging TA whose goal is for the student to UNDERSTAND, not merely to obtain answers.
- Teach with the Socratic method: ask a guiding question or give a hint before revealing a full solution.
- Adapt your depth and vocabulary to the student's apparent level.

ACADEMIC INTEGRITY
- Never write a graded submission on the student's behalf. Instead, coach.

GROUNDING
- Use the student's academic data below when relevant. Do not invent facts.

STYLE
- Be concise, warm, and encouraging. Prefer short paragraphs and bullet points.

MULTI-PART REQUESTS
- When a request has several parts, work through each part in turn, using the tools available for the parts that need them.
- Do not conclude your answer until EVERY part of the request has been addressed.`;

// Deterministic stubs — every model sees byte-identical tool output.
const STUBS = {
  get_student_progress: { course: 'IT5001', performance_score: 5.2, mastery_tier: 'INTERMEDIATE',
    answered: 48, correct: 27, weakest_topics: ['recursion', 'list comprehensions'] },
  generate_practice_question: { question: 'True or False: a recursive function must always have a base case.',
    correct_option: 'true', explanation: 'Without a base case the recursion never terminates.' },
  search_course_material: { excerpts: [{ source: 'IT5001/week7.md',
    text: 'Recursion solves a problem by reducing it to a smaller instance of the same problem.' }] },
};

const SCENARIOS = [
  { id: 'S1-concept',   expect: [],
    prompt: 'Explain what a hash table is and why average lookups are O(1).' },
  { id: 'S2-one-tool',  expect: ['get_student_progress'],
    prompt: 'How am I doing on my quizzes so far in IT5001?' },
  { id: 'S3-multipart', expect: ['get_student_progress', 'generate_practice_question'],
    prompt: 'How am I doing on my quizzes so far, and then quiz me on one weak topic?' },
  { id: 'S4-retrieval', expect: ['search_course_material'],
    prompt: 'Look up what my IT5001 course notes say about recursion.' },
];


const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PACE_MS = Number(process.env.PACE_MS || 4000);   // free tier: 8k tokens/min per model

// One Groq pass. Retries 429s after the wait Groq names (rate-limit pauses are
// excluded from latency: they are a quota artefact, not model speed).
async function pass(model, messages, tools) {
  const oa = [];
  let pending = [];
  for (const m of messages) {
    if (m.role === 'assistant' && m.tool_calls?.length) {
      const calls = m.tool_calls.map((c, i) => ({ id: c.id || `call_${oa.length}_${i}`, type: 'function',
        function: { name: c.function.name, arguments: typeof c.function.arguments === 'string'
          ? c.function.arguments : JSON.stringify(c.function.arguments || {}) } }));
      pending = calls.map(c => c.id);
      oa.push({ role: 'assistant', content: m.content || null, tool_calls: calls });
    } else if (m.role === 'tool') {
      oa.push({ role: 'tool', tool_call_id: pending.shift(), content: m.content });
    } else oa.push({ role: m.role, content: m.content });
  }
  const body = { model, messages: oa, max_completion_tokens: 1024 };
  if (/gpt-oss/.test(model)) Object.assign(body, { reasoning_effort: 'low', include_reasoning: false });
  if (/qwen3/.test(model))   body.reasoning_effort = 'none';
  if (tools) body.tools = tools;
  for (;;) {
    const t = Date.now();
    const r = await fetch(`${GROQ}/chat/completions`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    const ms = Date.now() - t;
    if (r.status === 429) {
      const txt = await r.text();
      const m = /try again in (?:(\d+)m)?(\d+(?:\.\d+)?)s/i.exec(txt);
      const wait = m ? Math.ceil(((+m[1] || 0) * 60 + parseFloat(m[2])) * 1000) + 250 : 10000;
      process.stderr.write(`    429, waiting ${wait}ms\n`); await sleep(wait); continue;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    const msg = d.choices[0].message;
    return { ms, message: { content: msg.content || '', tool_calls: msg.tool_calls?.map(c => ({ id: c.id,
               function: { name: c.function.name, arguments: c.function.arguments } })) },
             prompt_eval_count: d.usage.prompt_tokens, eval_count: d.usage.completion_tokens,
             reasoning: d.usage.completion_tokens_details?.reasoning_tokens || 0,
             eval_duration: (d.usage.completion_time || 0) * 1e9 };
  }
}

async function turn(model, prompt) {
  const messages = [{ role: 'system', content: PERSONA }, { role: 'user', content: prompt }];
  let ms = 0, inTok = 0, outTok = 0, reasonTok = 0, genNs = 0, passes = 0;
  const called = [];
  for (let i = 0; i < MAX_ITERS; i++) {
    const last = i === MAX_ITERS - 1;
    const d = await pass(model, messages, last ? undefined : toolDefs);
    passes++; ms += d.ms;
    inTok += d.prompt_eval_count; outTok += d.eval_count; reasonTok += d.reasoning; genNs += d.eval_duration;
    const tc = d.message.tool_calls;
    if (tc?.length && !last) {
      messages.push({ role: 'assistant', content: d.message.content || '', tool_calls: tc });
      for (const c of tc) {
        const n = c.function?.name;
        called.push(n);
        messages.push({ role: 'tool', content: JSON.stringify(STUBS[n] || { error: 'unknown tool' }) });
      }
      continue;
    }
    return { ms, inTok, outTok, reasonTok, genNs, passes, called, text: d.message.content || '' };
  }
  return { ms, inTok, outTok, reasonTok, genNs, passes, called, text: '(iteration cap)' };
}

(async () => {
  const rows = [];
  for (const model of MODELS) {
    process.stderr.write(`\n### ${model}\n`);
    for (const s of SCENARIOS.filter(x => !ONLY || x.id === ONLY)) {
      for (let r = 0; r < REPS; r++) {
        try {
          const out = await turn(model, s.prompt);
          const hit = s.expect.filter(e => out.called.includes(e)).length;
          rows.push({ model, scenario: s.id, rep: r + 1, ms: out.ms, passes: out.passes,
            inTok: out.inTok, outTok: out.outTok, reasonTok: out.reasonTok,
            tps: out.genNs ? +(out.outTok / (out.genNs / 1e9)).toFixed(1) : null,
            expected: s.expect.length, toolHits: hit,
            extraTools: out.called.filter(c => !s.expect.includes(c)).length,
            called: out.called.join('+') || '-', text: out.text });
          process.stderr.write(`  ${s.id} r${r + 1}: ${out.ms}ms  ${out.passes}p  tools=${out.called.join('+') || '-'}\n`);
        } catch (e) {
          rows.push({ model, scenario: s.id, rep: r + 1, error: e.message });
          process.stderr.write(`  ${s.id} r${r + 1}: ERROR ${e.message}\n`);
        }
        await sleep(PACE_MS);
      }
    }
  }
  console.log(JSON.stringify(rows, null, 1));
})();
