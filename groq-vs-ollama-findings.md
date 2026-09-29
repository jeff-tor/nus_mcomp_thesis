# Hosted (Groq) vs. Local (Ollama) Inference for the VTA — Notes & Findings

*Compiled 2026-09-27 from the migration and benchmarking work of 26–27 Sep 2026.
Raw data, harnesses and scoring script are in [`exp/ch-llm-providers/`](exp/ch-llm-providers/).
System code lives in the FYP repo (`fyp-virtual-teaching-assistant`), PRs #102, #103 and #104.*

---

## 0. Key findings (cite-ready)

1. **Latency: hosted inference is 1.5–6.6x faster end to end on the agent loop.** On the flagship
   multi-part turn (progress lookup, then a practice question; n=10), the hosted gpt-oss models
   took **1.7 s** (20b) and **2.2 s** (120b) median. The local models took **3.3 s**
   (llama3.2 3B) and **11.2 s** (qwen3:14b), the latter being the model the local deployment
   actually used.
2. **Quality: the hosted models match the best local model on grounding at a fraction of the
   latency.** gpt-oss-20b and -120b both reported the student's real figures in **10/10** turns,
   as did qwen3:14b. llama3.2 managed 8/10, and qwen3:8b 3/10.
3. **Quiz generation: the hosted models are faster and far more often correct.** Parse-valid
   questions: 10/10 for both gpt-oss models, 8/10 for llama3.2. Questions whose answer key is
   actually correct (manual review): **8/10** for 120b, **6/10** for 20b, **3/10** for llama3.2.
4. **Cost: tokens remain the controllable cost driver in the hosted regime, and the agent loop
   multiplies them.** A tool-using turn re-sends the persona, context and tool schemas on every
   pass, so a 3-pass turn bills ~3x the prompt. Measured cost per turn is
   **US\$0.00025 (20b) to \$0.00049 (120b)**. The projected cost is **\$0.10–0.27 per student
   per semester**, 28–95x below Ethel's \$7.50. RECOMP-style compression of the retrieved
   context cuts the per-turn agent cost by a further ~30%.
5. **Reasoning tokens are a hidden token cost.** The gpt-oss models always reason, and reasoning
   is billed as output. At `reasoning_effort=medium` a quiz question consumed **400–650**
   reasoning tokens, against **10–50** at `low`, for equally valid output. That is a ~4–5x
   output-token multiplier with no visible benefit.
6. **Hosted providers are stricter than local runtimes, and that strictness surfaced a latent
   bug.** Groq validates tool-call arguments against the JSON schema on its side. gpt-oss-120b
   sent `course_code: null` for an optional parameter, and **10/10** multi-part turns were
   rejected with HTTP 400. Ollama had silently tolerated the same calls. Declaring optional
   parameters as nullable fixed it: 0/10 errors, 10/10 grounded. The fix is deployed
   (PR #104) and verified in production.
7. **A pure-hosted deployment is not possible for this system; a hybrid is required.** Groq
   offers no embedding models, so retrieval (bge-m3) stays local. The result is a hybrid:
   hosted generation, local embeddings, and a local generation fallback.
8. **The local regime's constraint is memory residency, not raw speed.** On a 32 GB M1 Max
   (~5 GB system memory free), loading qwen3:14b (10.4 GB) as a fallback evicted the embedding
   model. Every later retrieval then paid a cold reload. A cold local model load (27.7 s)
   exceeds the quiz latency budget (4 s / 10 s) by an order of magnitude.

---

## 1. Why this matters to the thesis

The thesis argues that input tokens per query are the primary controllable cost driver **in both
regimes**: in hosted deployments as per-token charges, and in local deployments as latency and
hardware constraints (`ch-intro.tex`, problem statement). This work measured both regimes on the
**same system, prompts and tasks**, which gives direct evidence for that claim. It feeds three
open items:

| Thesis location | Open item | What this note supplies |
|---|---|---|
| `ch-design.tex`, deployment-model comparison | "decision + justification still to write" | §5: the hybrid decision, with measured trade-offs |
| `ch-evaluation.tex` §Metrics, dimension 2 | per-student-per-semester cost projection vs. Ethel | §4.5: projection with explicit assumptions |
| `ch-evaluation.tex` §Metrics, dimension 3 | latency (P50; P95 once more data exists) | §4.1, §4.4: medians and ranges per model |
| `ch-implementation.tex` | "cloud-provider decision" | §2: architecture actually deployed |

**Caveat for the text.** The existing chapters describe the deployment as "Llama 3.2 via Ollama
on an 8 GB laptop". That was accurate for the RECOMP probe. Production then moved to qwen3:14b
on a 32 GB M1 Max (Aug 2026), and to Groq-hosted gpt-oss with a local fallback (Sep 2026). The
chapters should say which configuration each result was measured on.

---

## 2. Implementation (what was built)

### 2.1 Provider abstraction
All text generation goes through one module (`server/llm/`) that picks a provider **per role**:

- **chat role:** student chat, the Level-3 tool-calling agent loop, and generated notes;
- **quiz role:** question generation and end-of-quiz feedback.

Each provider implements the same four-member interface: `chatStream` (streaming, with tool
calls), `chatJSON` (one-shot, optional JSON mode), `listModels`, and `config`. The call sites
(chat, quiz, recommendations, analytics) are provider-agnostic.

| Provider | Transport | Notes |
|---|---|---|
| `ollama` | native `/api/chat` over a reverse SSH tunnel (EC2 → Mac) | local models; also serves embeddings |
| `groq` (new, PR #102) | OpenAI-compatible `/chat/completions` via plain `fetch`, no SDK | SSE streaming, tool calls, JSON mode; `reasoning_effort=low`, 1024-token completion cap |
| ~~`gemini`~~ | removed | had implemented one-shot JSON only (no streaming, no tools) |

Two protocol mismatches had to be bridged in the Groq provider:
- **Tool-call arguments** are an object in the app's canonical format but a JSON *string* on the
  OpenAI wire format.
- **Tool replies** must carry a `tool_call_id` on the OpenAI format. Ollama matches replies
  positionally, and the agent loop pushes them in call order without ids, so the Groq provider
  assigns ids from the preceding assistant turn in the same order.

### 2.2 Local fallback (PR #103)
A wrapper (`server/llm/fallback.js`) retries a failed hosted call on local Ollama. The rules:

- **Never switch a stream that has already emitted tokens.** Switching mid-answer would splice
  two different answers together.
- **Never retry after the caller's own deadline** (an aborted signal).
- **Cooldown on availability failures.** After a 429, a 5xx or a network error, calls skip the
  hosted provider for the wait the 429 names (clamped to 10 s–5 min), or 30 s otherwise. A
  per-request 4xx falls back for that call only.
- **Model mapping is per model, not per role.** The default is a single small model
  (llama3.2), chosen because of the residency finding in §4.6.

### 2.3 Deployed configuration (EC2, from 27 Sep 2026, after the benchmark)
```
LLM_PROVIDER=groq          AGENT_MODEL=openai/gpt-oss-20b    QUIZ_MODEL=openai/gpt-oss-120b
LLM_FALLBACK=ollama        FALLBACK_MODEL=llama3.2           EMBED_MODEL=bge-m3 (local)
QUIZ_FIRST_ATTEMPT_MS=4000 QUIZ_TIMEOUT_MS=10000
```
The role split follows the evidence in §4 (see §5). Recommendation, feedback and note
generation inherit `QUIZ_MODEL`.

### 2.4 Timeline
| Date | Change | Basis |
|---|---|---|
| Aug 2026 | Local production: qwen3:14b agent, llama3.2 quiz, on a 32 GB M1 Max over a reverse SSH tunnel | Local agent benchmark (grounding 10/10) |
| 26 Sep | Groq provider added and Gemini removed (PR #102); agent gpt-oss-120b, quiz gpt-oss-20b | n=3 pilot |
| 27 Sep | Local Ollama fallback (PR #103) | Operational resilience |
| 27 Sep | Benchmark (§3–4) finds 120b's tool calls rejected on 10/10 multi-part turns | This note |
| 27 Sep | Optional tool parameters made nullable (PR #104); **roles swapped**: agent 20b, quiz 120b | §4.1, §4.3 |

**Verified in production after PR #104.** The previously failing multi-part prompt, with no
course named, was run inside the production container on the deployed tool schema: 4/4 turns
succeeded (gpt-oss-20b 0.9–1.0 s, gpt-oss-120b 1.2–1.3 s). All four sent
`course_code: null`, which Groq accepted, all four were grounded, and none fell back to Ollama.

---

## 3. Experimental setup

| | Local (Ollama) | Hosted (Groq) |
|---|---|---|
| Date | 2026-08-20 (agent), 2026-09-27 (quiz) | 2026-09-27 |
| Hardware / runtime | MacBook Pro M1 Max, 32 GB; Ollama 0.20.2 (agent) / 0.34.4 (quiz); Q4_K_M; thinking off; `OLLAMA_CONTEXT_LENGTH=16384` | Groq on-demand (free tier); `reasoning_effort=low` (gpt-oss) / `none` (qwen3.8); `max_completion_tokens=1024` |
| Models | llama3.2 (3B), qwen3:8b, qwen3:14b | openai/gpt-oss-20b, openai/gpt-oss-120b, qwen/qwen3.8-27b |
| Client location | same machine | Singapore laptop → Groq (trans-Pacific; see §4.4) |

**Agent benchmark.** The existing FYP harness (`tools/bench-agent-models.js`) replicates the
production agent loop: the same tool definitions, the same persona, a 5-iteration cap, and tools
withheld on the final pass. Tool results are stubbed and byte-identical for every model. The
Groq variant (`exp/ch-llm-providers/bench-groq-agent.js`) copies the persona, stubs, scenarios
and loop **verbatim**; only the transport and token accounting differ. There are four scenarios:

- S1: concept explanation, no tool expected;
- S2: one tool lookup;
- S3: multi-part turn, progress lookup and then a practice question (**headline scenario, n=10**);
- S4: course-material retrieval.

Every scenario other than S3 was run n=3.

**Scoring (`score.py`).** One rubric, applied to both regimes. The local rows are re-scored
from the FYP CSV rather than reusing its hand-coded grounding column.
- *grounded* (S2, S3): the answer states the stubbed score **5.2** *and* names a stubbed weak topic.
- *question delivered* (S3): the answer poses a practice question (true/false, the stub's
  "base case", or lettered or numbered options).
- *tool_ok*: every expected tool was called.

**Validation.** The re-scoring reproduces the original hand-coded local grounding exactly
(llama3.2 8/10, qwen3:14b 10/10, qwen3:8b 3/10). The question metric is slightly stricter
(8 and 7 vs. the original 9 and 8).

**Latency accounting (Groq).** The sum of HTTP request times per turn. Rate-limit pauses are
excluded, since they are a quota artefact, not model speed.

**Quiz benchmark (`bench-quiz.js`).** The production MCQ prompt from `server/quiz.js`, unchanged.
Five topics in rotation, n=10 per model, temperature 0.7 and no JSON mode (both matching
production), with the same parse and schema check as production. Answer-key correctness was
then judged by manual review (`quiz_manual_review.csv`, single unblinded rater).

---

## 4. Results

### 4.1 Agent loop, headline: multi-part turn (S3, n=10)

| Model | Regime | Median ms | Range ms | Passes | Input tok | Output tok (of which reasoning) | Errors | Tools OK | **Grounded** | Question delivered | US\$ / turn |
|---|---|---|---|---|---|---|---|---|---|---|---|
| llama3.2 (3B) | local | 3,255 | 2,576–7,286 | 2 | 1,156 | 158 | 0 | 8/10 | 8/10 | 8/10 | 0 (marginal) |
| qwen3:8b | local | 1,273 | 697–4,980 | 1 | 760 | 26 | 0 | 0/10 | 3/10 | 0/10 | 0 |
| qwen3:14b | local | 11,243 | 8,202–14,909 | 2 | 1,595 | 195 | 0 | 0/10 | **10/10** | 7/10 | 0 |
| gpt-oss-20b | hosted | **1,707** | 1,124–1,786 | 3 | 2,248 | 307 (80) | 0 | 8/10 | **10/10** | 9/10 | 0.00025 |
| gpt-oss-120b (original schema) | hosted | — | — | — | — | — | **10/10** | — | — | — | — |
| gpt-oss-120b (nullable schema) | hosted | 2,155 | 1,412–2,571 | 3 | 2,277 | 266 (33) | 0 | 7/10 | **10/10** | 9/10 | 0.00049 |
| qwen3.8-27b | hosted | 1,358 | 830–1,377 | 3 | 3,249 | 245 | 3/10 | 6/7 | 2/7 | 7/7 | 0.00360 |

- **"Tools OK" and grounding diverge again,** as the August benchmark found locally. qwen3:14b
  never calls `generate_practice_question` (it writes its own question) yet grounds 10/10.
  Grounding fidelity remains the discriminating metric for an assistant that reports grades.
- **The hosted gpt-oss models take 3 passes where the local models take 2.** They chain the two
  tools sequentially rather than finishing in one pass, so the prompt is billed three times.
  This is the mechanism behind finding 4.

### 4.2 Agent loop, all scenarios (medians; S1/S2/S4 n=3)

| Model | S1 concept ms | S2 one-tool ms | S4 retrieval ms | S1 output tok | Gen. tok/s |
|---|---|---|---|---|---|
| llama3.2 (local) | 7,066 | 3,400 | 2,505 | 420 | ~75 |
| qwen3:14b (local) | 2,595 | 8,460 | 5,400 | 48 | ~19 |
| gpt-oss-20b (Groq) | 874 | 1,258 | 1,207 | 352 | ~965 |
| gpt-oss-120b (Groq) | 1,503 | 1,806 | 1,730 | 561 | ~475 |
| qwen3.8-27b (Groq) | 1,190 | 953 | 954 | 477 | ~490 |

Generation throughput differs by **6–50x**: ~19–75 tok/s locally against ~475–965 tok/s hosted.
The measured Groq throughput matches the vendor-stated 500 and 1,000 tok/s. Every model called
exactly the expected tools on S1, S2 and S4, except llama3.2, which made 3 spurious calls on S1,
and one qwen3.8 malformed tool call on S4.

### 4.3 Quiz generation (production MCQ prompt, n=10 each)

| Model | Regime | Median ms | Range ms | Input tok | Output tok (reasoning) | Parse-valid | **Correct key** (manual) | US\$ / question |
|---|---|---|---|---|---|---|---|---|
| llama3.2 | local (warm) | 1,757 | 1,197–2,797 | 187 | 112 | 8/10 | **3/10** | 0 |
| gpt-oss-20b | hosted | **638** | 452–864 | 233 | 188 (14) | 10/10 | **6/10** | 0.000074 |
| gpt-oss-120b | hosted | 860 | 742–1,114 | 233 | 182 (22) | 10/10 | **8/10** | 0.000145 |

**Failure modes.**
- **llama3.2:** options returned as one comma-joined string (2), wrong answer keys (3, including
  "TCP uses a fixed rate regardless of congestion"), and ambiguous or malformed stems (2).
- **gpt-oss-20b:** wrong keys on protocol detail (2 TCP Reno, 1 ray-tracing), and one question
  with two correct options.
- **gpt-oss-120b:** one arithmetic slip (237 mod 10 keyed as 3), and one question with duplicate
  options.

Parse-validity overstates quality for every model, so reported quiz quality needs an
answer-correctness check, not just schema validity.

### 4.4 Latency in context

| Measurement | Value |
|---|---|
| Groq single call, **from EC2 (us-east-1)**: agent pass / quiz | 229–256 ms / 307–347 ms |
| Same calls from the Singapore laptop (benchmark client) | ~600–1,100 ms per call |
| Local production turn, qwen3:14b + RAG + tunnel (Aug 2026) | first token 25–34 s, complete 30–40 s |
| qwen3:14b agent pass, thinking **on** vs. **off** (Aug 2026) | 63.4 s (no tool called) vs. 3.2 s |
| Embedding (bge-m3), from EC2 through the tunnel vs. on the Mac | 1.2–1.7 s vs. 0.12 s |
| Course retrieval (embed + pgvector), from EC2 | 0.59 s |
| Fallback path from EC2 (llama3.2 via tunnel, warm): quiz / agent pass | 1.28 s / 0.81 s |
| llama3.2 cold load: unloaded host (Aug) vs. under memory pressure (Sep) | 1.8 s vs. 27.7 s |

- **The benchmark latencies in §4.1–4.3 are conservative for the hosted regime.** Production
  calls from EC2 are ~2–5x faster than the Singapore client, because most of the client-side
  time is network round trip.
- **In the local regime, cold loads and retrieval over the tunnel dominate,** not generation.

### 4.5 Token usage and cost

**Reasoning effort (pilot, n=3 per cell, 26 Sep).**

| Model | Effort | Quiz output tok | of which reasoning | Quiz latency |
|---|---|---|---|---|
| gpt-oss-20b | low | 165–206 | 9–50 | 0.68–0.85 s |
| gpt-oss-20b | medium | 560–784 | 410–593 | 0.84–1.25 s |
| gpt-oss-120b | low | 102–111 | 17–23 | 0.67–0.70 s |
| gpt-oss-120b | medium | 558–760 | 414–658 | 1.65–2.10 s |

All outputs at both effort levels were valid.

**Per-turn cost.** List prices: gpt-oss-20b \$0.075 / \$0.30, gpt-oss-120b \$0.15 / \$0.60,
qwen3.8-27b \$0.80 / \$4.00 per 1M input / output tokens (console.groq.com, fetched 27 Sep).
The harness prompts carry **no retrieved context**, so the production cost is modelled by adding
retrieved context:

| Agent model | Harness turn | + RAG (~1k tok/pass × 3 passes) | + RAG with RECOMP (−65% of RAG) |
|---|---|---|---|
| gpt-oss-20b | \$0.00026 | \$0.00049 | \$0.00034 |
| gpt-oss-120b | \$0.00050 | \$0.00095 | \$0.00066 |

**Per student per semester.** Assumptions: 20 chat turns and 10 quiz questions per week, one
quiz-feedback note per week, 13 weeks. These are round-number assumptions, not measured usage;
replace them with production-log rates when available.

| Split | Harness | + RAG | + RAG + RECOMP |
|---|---|---|---|
| agent 20b, quiz 120b (deployed from 27 Sep, §5) | \$0.090 | \$0.148 | **\$0.110** |
| agent 120b, quiz 20b (initial split, 26–27 Sep) | \$0.141 | \$0.258 | \$0.182 |
| all 120b | \$0.152 | \$0.269 | \$0.193 |

Against Ethel's US\$7.50 per student per course per semester (Kortemeyer et al.), this is
**28–95x lower**. The comparison is indicative only: Ethel used a different model class
(GPT-4-family), different usage patterns, and 2024 pricing.

**Rate limits are a capacity constraint, separate from cost.** The free tier allows
**8,000 tokens per minute per model** and 1,000 requests per day. A RAG-inflated agent turn uses
~5.5k tokens, so one model serves only **~1.4 turns per minute** across *all* users on the free
tier. Putting the agent and quiz roles on different models gives each role its own budget.
qwen3.8-27b also has a 1,000 output-tokens-per-minute cap. No prompt caching was observed:
a repeated 2.5k-token prefix reported no cached tokens.

**Tokenizer caveat.** Token counts are not comparable across model families. The same S1 prompt
was counted as **1,093** (llama3.2), **758** (qwen3) and **672** (gpt-oss) input tokens. Compare
token reductions *within* a model (as the RECOMP evaluation does), never across models.

### 4.6 Reliability and operational findings

| Finding | Evidence | Consequence |
|---|---|---|
| Strict tool-argument validation on the hosted side | 120b: 10/10 S3 turns rejected (HTTP 400, `course_code` expected string, got null); 20b unaffected | Optional parameters must be declared nullable; the local runtime had hidden this bug. Fixed in PR #104 and verified in production (§2.4) |
| Malformed tool calls | qwen3.8-27b: 4/13 `tool_use_failed` on tool scenarios | Model rejected (also 5–13x the price of gpt-oss) |
| Memory residency on the local host | Falling back to qwen3:14b (10.4 GB) evicted bge-m3 (`OLLAMA_MAX_LOADED_MODELS=2`, ~5 GB free) | Fallback restricted to llama3.2 (3.1 GB), which stays resident beside bge-m3 |
| Cold load vs. latency budget | llama3.2 cold 27.7 s vs. quiz budget of 4 s + 10 s | Fallback model must be kept warm (`OLLAMA_KEEP_ALIVE=-1`) |
| Reachability is not usability | After a Homebrew upgrade the old Ollama server (0.20.2) ran the new runner (0.34.4); every model load failed while `/api/tags` health checks stayed green; embeddings hung 60 s | Health checks must exercise an actual inference or embedding call |
| Hosted model ids expire | Google retired gemini-2.5-flash-lite in Aug 2026; quiz generation 404'd in production | Hosted deployments carry vendor-lifecycle risk that local ones do not |
| Fallback verified in production | Groq forced unreachable inside the prod container: quiz fell back in 1.28 s, agent pass in 0.81 s, bge-m3 stayed resident | The hybrid degrades to local quality, not to an outage (provided the Mac and tunnel are up) |

---

## 5. Discussion and deployment decision

**Decision: a hybrid deployment.** Generation runs hosted on gpt-oss via Groq, embeddings run
locally (bge-m3), and a small local model (llama3.2) serves as the generation fallback.

- **Why hosted generation.** On this system the hosted regime wins on every measured axis
  except marginal cost:
  - agent turns 1.5–6.6x faster;
  - grounding equal to the best local model;
  - quiz answer keys correct 2–3x more often than the local quiz model;
  - no memory-residency contention with the retriever.

  The marginal cost is real but small (~\$0.10–0.27 per student per semester).
- **Why not purely hosted.** There is no hosted embedding option on the chosen provider. A local
  fallback also turns provider outages, rate limits and model retirements into a quality
  degradation instead of an outage.
- **Why not purely local.** The capable local model (qwen3:14b) is 5–7x slower than hosted and
  competes with the retriever for memory. The small local model (llama3.2) is fast enough but
  weaker at grounding (8/10) and at producing correct quiz keys (3/10).
- **Model split (adopted; deployed 27 Sep 2026).**
  - **Agent: gpt-oss-20b.** It is 1.3x faster than 120b, half the cost per turn, just as
    grounded, and was not affected by the nullable-argument bug.
  - **Quiz: gpt-oss-120b.** It produced 8/10 correct keys against 6/10, for \$0.00007 more per
    question.

  Keeping the two roles on different models also preserves separate rate-limit budgets.

**Implication for the thesis argument.** The hosted regime confirms that input tokens are the
cost lever, and adds a mechanism the literature review does not isolate. **Agentic tool use
multiplies the prompt.** Each extra pass re-sends the system prompt, the retrieved context and
the tool schemas. Retrieved context injected once per turn is therefore billed once per *pass*
(3x here), and compressing it (RECOMP) saves proportionally more in an agent loop than in
single-shot RAG. In the local regime the same tokens show up as prefill latency and, more
acutely, as memory pressure. Both regimes reward fewer input tokens, for different reasons.

---

## 6. Threats to validity

- **Small samples.** n=10 (S3, quiz) and n=3 (other scenarios): enough to rank models, not
  enough for fine-grained claims or P95. Report medians and ranges, as above.
- **Local and hosted agent data are 5 weeks apart**, on different Ollama versions (0.20.2 vs
  0.34.4 for the quiz run). The prompts, stubs and loop are identical.
- **Latency is measured from a Singapore client,** so the absolute Groq numbers include
  trans-Pacific round trips. Production numbers from EC2 are given separately in §4.4.
- **Quiz correctness has a single unblinded rater** (the author's agent), across 5 CS topics.
  A second rater and a larger, course-specific item set are needed before citing percentages.
- **The cost projection rests on assumed usage rates.** Replace them with production-log rates.
- **Stubbed tool results measure model behaviour, not live-data effects.** No end-to-end
  production turn (RAG + live tools + streaming) was timed on Groq; that remains to be measured.
- **The free tier throttled the runs.** 429 waits were excluded from latency; queue time under
  paid tiers may differ.
- **Tokenizer differences** make cross-family token counts incomparable (§4.5).

---

## 7. Draft thesis text (adapt as needed)

**For `ch-design.tex`, deployment decision.**
> We adopt a hybrid deployment: generation is served by an open-weight model (gpt-oss) on a
> hosted inference provider, while embedding and retrieval remain local, and a small local model
> serves as a generation fallback. On the system's flagship multi-part interaction, hosted
> generation reduced median turn latency from 11.2 s to 1.7 s with no loss of grounding fidelity
> (10/10 turns in both cases, n=10). The marginal cost is US\$0.0003–0.0005 per agent turn, or an
> estimated US\$0.10–0.27 per student per semester. A fully local deployment was rejected: on the
> same 32 GB host, the model capable of reliable grounding contended with the retriever for
> memory and evicted it. A fully hosted one was rejected because the provider offers no
> embedding models and because a local fallback converts provider outages into a quality
> degradation rather than an outage.

**For `ch-evaluation.tex`, token cost in agentic RAG.**
> In a tool-using agent loop the prompt is re-sent on every pass, so retrieved context injected
> once per turn is billed once per pass. With three passes per multi-part turn, a 1,000-token
> retrieved context costs 3,000 input tokens. Compressing that context by 65%, as in our
> compression probe, reduces the agent turn's cost by ~30% (US\$0.00049 → \$0.00034 on
> gpt-oss-20b).

**LaTeX table (headline).**
```latex
\begin{table}[t]
  \centering
  \caption{Multi-part agent turn, local vs.\ hosted inference ($n=10$, medians).}
  \label{eval:tab:providers}
  \begin{tabular}{llrrrr}
    \toprule
    Model & Regime & Latency (s) & Input tok. & Grounded & US\$/turn \\
    \midrule
    Llama 3.2 3B   & local  & 3.3  & 1{,}156 & 8/10  & -- \\
    Qwen3 14B      & local  & 11.2 & 1{,}595 & 10/10 & -- \\
    gpt-oss-20b    & hosted & 1.7  & 2{,}248 & 10/10 & 0.00025 \\
    gpt-oss-120b\textsuperscript{a} & hosted & 2.2 & 2{,}277 & 10/10 & 0.00049 \\
    \bottomrule
  \end{tabular}\\[2pt]
  {\footnotesize \textsuperscript{a}With nullable optional tool parameters; with the original
  schema all 10 turns were rejected by the provider's tool-argument validation.
  Token counts are not comparable across model families (different tokenizers).}
\end{table}
```

---

## 8. Reproduction and file index (`exp/ch-llm-providers/`)

| File | Contents |
|---|---|
| `bench-groq-agent.js` | Groq variant of the FYP agent harness (persona, stubs, scenarios and loop copied verbatim) |
| `bench-quiz.js` | Quiz-generation benchmark (production MCQ prompt; `groq` or `ollama`) |
| `score.py` | Shared rubric; re-scores the local CSV and the Groq JSON; writes `scored.json` |
| `groq_all_scenarios.json` / `groq_s3_extra.json` | Raw Groq agent runs (S1–S4 n=3, plus S3 ×7), original schema |
| `groq_120b_s3_nullable.json` | gpt-oss-120b S3 n=10 with nullable optional parameters |
| `quiz_*.json` | Raw quiz runs, including full model outputs |
| `quiz_manual_review.csv` | Per-question correctness verdicts and reasons |
| `*.log` | Per-turn progress logs, including 429 waits (kept locally; `*.log` is gitignored, and the JSON files hold the same per-turn data) |

The local agent data are in the FYP repo, `docs/benchmark_agent_models.csv` (harness
`tools/bench-agent-models.js`, write-up `docs/agent-model-benchmark.md`).

```bash
# Groq agent benchmark (FYP repo path as first argument)
GROQ_API_KEY=... node bench-groq-agent.js <fyp-repo> openai/gpt-oss-20b,openai/gpt-oss-120b 3 > groq_all_scenarios.json
GROQ_API_KEY=... node bench-groq-agent.js <fyp-repo> openai/gpt-oss-20b,openai/gpt-oss-120b 7 S3-multipart > groq_s3_extra.json
# Quiz
GROQ_API_KEY=... node bench-quiz.js groq openai/gpt-oss-120b 10 > quiz_groq_gpt-oss-120b.json
node bench-quiz.js ollama llama3.2 10 > quiz_ollama_llama3.2.json
# Score both regimes with one rubric
python3 score.py <fyp-repo>/docs/benchmark_agent_models.csv groq_*.json
```
