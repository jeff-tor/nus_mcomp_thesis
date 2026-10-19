# Next-Session TODOs

Status as of 2026-10-03 (after PR #9). Part C records what is done; Part D
lists the writing still to do. Items in Parts A and B are still open unless
marked otherwise.

## Part A — Token-Cost Research Follow-ups

Carried over from the token-cost research integration (2026-07-05, source:
`/Users/jeff/Downloads/fyp-thesis-token-cost-research-handoff.md`). Each item
is also flagged as a `% TODO` comment at the indicated location.

### A1. Run the baseline token audit — DONE (2026-10-19)

Run on the deployed system; written up in §3.4.1 (Table 3.3). Script and raw
results in `exp/ch-token-audit/`. Finding: tool definitions (1,177 tokens,
51%) and system prompt (615, 27%) outweigh retrieved context (512, 22%) on
the small CS3241 corpus.


**Where:** `chapters/ch-design.tex`, §3.4.1 (Baseline Token Audit,
`design:subsec:tokenaudit`).

Eq. 3.1 decomposes baseline input tokens/query; the numbers are not yet
measured. Measure tokens per retrieved chunk and k from the deployed
Canvas-material chunking config, plus system-prompt/history/query tokens from
production logs, and report the retrieved-context share. This number anchors
Ch 1, Ch 3, and the evaluation.

### A2. Verify the Jill Watson citation

**Where:** `references.bib` (`arxiv24:JillWatson`), cited in
`ch-intro.tex` and `ch-review.tex` §2.2.1.

arXiv:2407.17429 was verified only as a preprint. Confirm final venue and
author list (or pair it with the peer-reviewed Jill Watson AIED 2024 paper)
before the final reference pass. Also fetch ACL Anthology page numbers for
LLMLingua (`emnlp23:Jiang`), LongLLMLingua (`acl24:Jiang`), and Selective
Context (`emnlp23:Li`).

### A3. Course-material QA evaluation set — DONE (2026-10-19)

Run, scored and written up (§5.1.2, §5.3.2, discussion, summary, abstract,
Ch 6). Results in `exp/ch-answer-quality/results/`. Still open: the
scoring-method sentence in §5.1.2 (author to confirm how the review was done).

(Previously: KIT READY)

Kit in `exp/ch-answer-quality/` (IT5001, 20 in-syllabus + 4 off-syllabus,
blind A/B scoring, `score.py`). Still to do: run it, score it, write up §5.1,
§5.3, §5.5, abstract and Ch 6.


**Where:** `chapters/ch-evaluation.tex`, §5.2.2
(`eval:subsec:tokenmetrics`), dimension 4.

Decide the QA set (n questions over the ingested Canvas materials) for the
answer-quality dimension; the current probe is three questions on CS3241.

### A4. Cost-per-student projection ("money chart") — PARTLY DONE

**Where:** `chapters/ch-evaluation.tex`, §5.3.3
(`eval:subsec:results:cost`).

**Done (PR #9):** cost/query and per-student-per-semester projection for
the hosted (Groq) path — baseline, +RAG, +RAG+compression, three model
splits — as table `eval:tab:cost` (US$0.11–0.27 with retrieval), set against
Ethel's US$7.50 with caveats. Local path reported as latency/memory
residency instead.

**Still to do:**
- Replace the assumed usage rates (20 chat turns, 10 quiz questions, 1 note
  per student per week, 13 weeks) with rates from production logs.
- Optionally turn the table into a chart.

### A5. Keep the novelty claim current

**Where:** `chapters/ch-review.tex`, §2.2.3 (`review:subsec:compression`).

Before submission, re-run a literature search on "RECOMP education" /
"prompt compression teaching assistant" to keep the "no published work"
claim (phrased as "to the best of our knowledge") current.

### A6. Do not cite "ITAS"

An earlier research pass referred to a source called "ITAS" with per-query
token breakdowns; it could not be re-verified. Do not cite it unless the
original citation details are recovered and checked.

## Part B — Literature Review Follow-ups

Carried over from the lit-review integration (2026-07-05). Each item below is
also flagged as a `% TODO` comment at the indicated location.

### B1. Verify TALIS cross-country figures and cite table numbers

**Where:** `chapters/ch-review.tex`, §2.1.1 (Educator Time Allocation), after
the Singapore paragraph.

The sentence citing cross-system administrative hours (Korea >6 h/week,
Finland/France ~1.5 h/week) is currently cited to the TALIS 2024 international
report as a whole. Before submission:

- Verify these figures against the published tables in *Results from TALIS
  2024: The State of Teaching* (OECD, 2025) — the relevant chapter is "The
  demands of teaching" (likely Ch. 3; candidate tables 3.8, 3.16, 3.17 per the
  original plan, unverified).
- Optionally add Japan (~5 h) and Australia (4.7 h, 69% stress) if the tables
  confirm them.
- Add the specific table numbers to the `oecd25:Talis` citation or in-text.

### B2. Implement the instructor-hours-returned aggregation — MOVED TO FUTURE WORK

Not possible in this thesis: chat turns are not stored (see D0). Kept here
for reference only.

**Where:** `chapters/ch-evaluation.tex`, §5.2.1 (Instructor-Hours Returned),
and results in §5.3.

The metric is defined (Eq. 5.1: deflected queries × 2–5 min conservative
handling time, per course per week) but not yet computed. To do:

- Write the aggregation as a PostgreSQL query over the production bot's query
  logs (classify deflected queries, count per course per week, multiply by the
  2–5 min handling-time range).
- Report the per-course results as a table in §5.3 (`eval:sec:results`).

### B3. Decide on the topic-clustering secondary metric

**Where:** `chapters/ch-evaluation.tex`, end of §5.2.1.

Question-topic clustering over the same logs is described as a complementary,
behaviour-based teaching signal (the answer to the SET-limitations caveat in
§2.1.2). Decide whether it is:

- implemented and reported in this thesis (§5.3), or
- moved to Future Research Directions (§6.2, `ch:concl`).

### Context

- The source plan: `/Users/jeff/Downloads/nus-mcomp-thesis-litreview-update-plan.md`.
- Citation division-of-labor rules to preserve when editing Chapter 2:
  time/burden numbers → TALIS only; quality effects → García-Gallego et al.;
  AI-intervention framing → Ahmad et al. (never for numbers); no time
  mechanism claimed from García-Gallego; keep the SET-limitations sentence.

## Part C — Done (2026-10-03, PR #9)

- **Draft prepared for first supervisor review:** Ch 1 opening, Overview,
  Objectives (4) and Contributions (3) rewritten; Ch 6 placeholder replaced
  with a short conclusion; `\degreeyear` → 2026; template publications
  appendix removed; `\draftnote{}` macro added for visible placeholders.
- **Hosted (Groq) vs local (Ollama) findings integrated** from
  `groq-vs-ollama-findings.md`:
  - Ch 3: hybrid deployment decision (`design:subsec:deployment-decision`)
    and architecture overview.
  - Ch 4: deployment-configuration table (`impl:tab:configs`), LLM provider
    layer and fallback (`impl:subsec:llm-providers`).
  - Ch 5: benchmark setup, agent and quiz results
    (`eval:sec:results:providers`), cost projection, threats to validity.
  - Abstract, Ch 1, Ch 2, Ch 3 (RECOMP rationale), Ch 6: "locally hosted"
    framing replaced with the hybrid deployment.
- **AI-judged quiz correctness disclosed** in Ch 5 (setup, table caption,
  threats to validity) and qualified in Ch 3.

## Part D — Remaining Writing and Open Items

Status as of 2026-10-14 (PR #12). Ch 3–5 and Appendix A are drafted from
the system's source (`fyp-virtual-teaching-assistant`, origin/main at PR
#114). Ten grey `\draftnote{}` placeholders remain; each needs data or a
decision from the author.

### D0. Findings from the source code — decide first

- **Chat turns are not logged on the server.** DECIDED (2026-10-14): stated
  as a limitation (§6.2), with storing chat histories as future work (§6.3).
  The instrumentation claims are softened throughout: the thesis now
  *defines* the instructor-hours measure and the data it needs, rather than
  claiming to measure it. RQ1 is reworded to "how can instructor time be
  measured, and what must the system record", and is answered in §5.2.1.
- **Analytics source.** DECIDED (2026-10-14): analytics are described as
  built on quiz and assignment results, not chat questions — aligned in the
  abstract, Ch 1, FR4, Ch 4, Ch 5 and Ch 6.
- **Fuzzy rule table.** DONE (2026-10-15): not validated by faculty; §4.5 now
  gives a design rationale (revised Bloom's taxonomy, zone of proximal
  development, Zadeh fuzzy sets, Takagi–Sugeno averaging — 4 new references
  to check in the final reference pass), §6.2 states it is unvalidated, and
  §6.3 adds validating it as future work. The FYP repo's `feedbackEngine.py`
  comment still says "validated by 15 faculty members" — fix it there.

### D1. Open items

- **Name the AI model (and version)** that judged quiz answer-key
  correctness — §5.1.1.
- **AWS rationale:** placeholder until the GCP/Azure comparison is done —
  §4.1.2.
- **Report P95 latency** once larger samples exist (current: n=10 / n=3).
- **Time a full production turn on Groq** (retrieval + live tools +
  streaming); the benchmark used stubbed tools.

### D2. Grey placeholders still in the draft

- **Abstract:** bracketed answer-quality results (`[n]`, `[result]`).
- **Title page:** DONE (2026-10-15) — degree "Master of Computing (General
  Track)" (class prints "in <field>" only when `\field` is set); end date
  and declaration date 30 October 2026.
- **Ch 3 (§3.4):** done. (Token audit done 2026-10-19; ethics paragraph done
  2026-10-15: no student data used; IRB to be sought before collecting
  any; pseudonymous IDs 001, 002, … mapped to emails.)
- **Ch 4 (§4.1.2):** AWS rationale (D1).
- **Ch 5:** question set and scoring protocol for the RQ2 answer-quality
  evaluation (§5.1); update the summary with those results (§5.5).
- **Ch 6:** final conclusion once the answer-quality results exist.
- **Appendix B (surveys):** DONE (2026-10-15) — no surveys will be run;
  appendix removed.
- **Diagrams:** the drawio (20 Sep) predates the Groq migration; update it.
  Optional further figures: adaptive-quiz flow, instructor course analysis.
