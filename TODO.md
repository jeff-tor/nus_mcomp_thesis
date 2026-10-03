# Next-Session TODOs

Status as of 2026-10-03 (after PR #9). Part C records what is done; Part D
lists the writing still to do. Items in Parts A and B are still open unless
marked otherwise.

## Part A — Token-Cost Research Follow-ups

Carried over from the token-cost research integration (2026-07-05, source:
`/Users/jeff/Downloads/fyp-thesis-token-cost-research-handoff.md`). Each item
is also flagged as a `% TODO` comment at the indicated location.

### A1. Run the baseline token audit

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

### A3. Course-material QA evaluation set

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

### B2. Implement the instructor-hours-returned aggregation

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

Each item has a visible `\draftnote{}` and/or a `% TODO` in the source.

### D1. Open items from PR #9

- **Name the AI model (and version)** that judged quiz answer-key
  correctness — `ch-evaluation.tex`, §5.1.1.
- **AWS rationale:** keep the placeholder until the comparison of service
  level, cost, and related factors against GCP and Azure is done; then tie
  the deciding dimensions to §3.1 — `ch-implementation.tex`, §4.1.2.
- **Tie the deployment decision to requirements** once §3.1 exists —
  `ch-design.tex`, §3.2.1.
- **Report P95 latency** once larger samples exist (current: n=10 / n=3).
- **Time a full production turn on Groq** (retrieval + live tools +
  streaming); the benchmark used stubbed tools.

### D2. Empty sections

- **Abstract:** bracketed placeholders (`[dataset / course cohort]`, `X%`,
  `Y` instructor-hours).
- **Ch 1:** `\field{}` specialisation in `main.tex` (confirm).
- **Ch 3:** chapter intro; Design Goals and Requirements (§3.1);
  architecture diagram (§3.3); Methodology (§3.4); Summary.
- **Ch 4:** chapter intro; Technology Stack (Node.js, PostgreSQL/pgvector,
  Ollama, Groq); Knowledge Base and Retrieval; prompting, agent loop and
  personalisation; Analytics and Feedback Loop; Summary.
- **Ch 5:** chapter intro and research questions; dataset/cohort setup;
  metrics overview; instructor-hours results (B2); overall discussion;
  Summary.
- **Ch 6:** full conclusion once B2 and A3 results exist; fold the future-work
  items into a narrative.
- **Appendices:** prompt templates; survey instruments (or drop the survey
  appendix if no surveys are run).

### D3. Build

- Biber fails on the author's Mac (`extracting arm64 binary with lipo
  failed`), so local builds have undefined citations. Fix the TeX Live Biber
  install, or build in the devcontainer.
