# Next-Session TODOs — Literature Review Follow-ups

Carried over from the lit-review integration (2026-07-05). Each item below is
also flagged as a `% TODO` comment at the indicated location.

## 1. Verify TALIS cross-country figures and cite table numbers

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

## 2. Implement the instructor-hours-returned aggregation

**Where:** `chapters/ch-evaluation.tex`, §5.2.1 (Instructor-Hours Returned),
and results in §5.3.

The metric is defined (Eq. 5.1: deflected queries × 2–5 min conservative
handling time, per course per week) but not yet computed. To do:

- Write the aggregation as a PostgreSQL query over the production bot's query
  logs (classify deflected queries, count per course per week, multiply by the
  2–5 min handling-time range).
- Report the per-course results as a table in §5.3 (`eval:sec:results`).

## 3. Decide on the topic-clustering secondary metric

**Where:** `chapters/ch-evaluation.tex`, end of §5.2.1.

Question-topic clustering over the same logs is described as a complementary,
behaviour-based teaching signal (the answer to the SET-limitations caveat in
§2.1.2). Decide whether it is:

- implemented and reported in this thesis (§5.3), or
- moved to Future Research Directions (§6.2, `ch:concl`).

## Context

- The source plan: `/Users/jeff/Downloads/nus-mcomp-thesis-litreview-update-plan.md`.
- Citation division-of-labor rules to preserve when editing Chapter 2:
  time/burden numbers → TALIS only; quality effects → García-Gallego et al.;
  AI-intervention framing → Ahmad et al. (never for numbers); no time
  mechanism claimed from García-Gallego; keep the SET-limitations sentence.
