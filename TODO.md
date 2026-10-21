# Thesis Status

Status as of 2026-10-21. The report is complete: no grey `\draftnote{}`
placeholders remain, and the body is 49 pages (limit 50). Final report due
Mon 26 Oct 2026.

## Open before submission

- **Name the AI model (and version)** that judged quiz answer-key
  correctness: §5.1.2, marked by the one remaining `% TODO` in
  `chapters/ch-evaluation.tex`.
- **Demo video link:** add it to §1.1 next to the project page once
  uploaded (narration script in `demo/demo-script.md`).
- **Supervisor feedback** from the catch-up, if any.
- **Final build from `master`** (`./build.sh`), check the PDF, and tag the
  submitted commit (e.g. `v1.0-submission`).

## Outside this repository (optional)

- System repo (`fyp-virtual-teaching-assistant`): `feedbackEngine.py` still
  says the fuzzy rule table was "validated by 15 faculty members"; the
  thesis states it is unvalidated (§4.5, §6.2).
- The draw.io master diagram (Appendix C) predates the Groq migration and
  shows Gemini; Appendix C says so.

## Kept as limitations or future work (no further action)

- **Instructor-hours from production data:** chat turns are not logged, so
  the measure is defined (§5.2.1) and illustrated with a projection; storing
  chat histories (with IRB approval) is future work (§6.3).
- **Topic clustering of student questions:** future work (§5.2.1, §6.3);
  depends on the same chat logging.
- **P95 latency:** samples (n=10, n=3) support medians and ranges only.
- **Usage rates in the cost projection** (§5.3.3) and the 2–5 min handling
  time are assumptions, not measured.
- **Fuzzy rule table:** not validated by faculty (§6.2); validation is
  future work (§6.3).
- **Full production turn on Groq** (live tools + streaming) not timed; the
  benchmark used stubbed tools.

## Done (summary)

- Ch 1–6, abstract, acknowledgements, declaration (AI use: Claude Opus 5.5)
  and Appendices A–C.
- Hybrid deployment (Groq hosted, Ollama local) integrated in Ch 3–5.
- Token audit, 19 Oct (§3.4.1; `exp/ch-token-audit/`).
- Answer-quality evaluation of compression on IT5001, n=20 + 4 off-syllabus
  (§5.3; `exp/ch-answer-quality/`): scored blind by the author with
  AI-suggested provisional scores, disclosed as such.
- Instructor-hours projection, cost-per-student projection.
- References checked (31 cited); TALIS figures verified against the Korea
  country note.

## Rules to keep when editing

- Never describe AI-suggested scores as human-only scores.
- Do not cite "ITAS": an earlier research pass named it, but it could not
  be re-verified.
- Chapter 2 citation roles: time/burden numbers → TALIS only; quality
  effects → García-Gallego et al.; AI-intervention framing → Ahmad et al.
  (never for numbers); no time mechanism claimed from García-Gallego; keep
  the SET-limitations sentence.
- Each chapter starts on a new page: check the body page count after any
  addition.
