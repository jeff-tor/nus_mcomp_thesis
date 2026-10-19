# Answer-quality evaluation of compression (thesis RQ2, §5.1 / §5.3)

Does extractive compression change the quality of the assistant's answers?
Each of 24 IT5001 questions is answered twice by the deployed agent model —
once with the retrieved course material in full, once compressed — and you
score both answers **blind** against a reference answer.

| File | What it is |
|---|---|
| `questions.csv` | 20 in-syllabus questions (all six IT5001 lectures, with reference answers and source files) and 4 off-syllabus questions. Each in-syllabus question is tagged `code` (the key fact sits in code, which the compressor strips) or `prose`. |
| `answer-quality.js` | Runs inside the backend container and generates both answers per question. |
| `score.py` | After scoring: unblinds A/B and computes the results for the thesis. |

## How the two answers differ

Both answers use the production persona (`server/chat.js`), the same retrieved
chunks (top 5, cosine distance ≤ 0.6, as in `server/rag.js`), gpt-oss-20b at
temperature 0, and **no tools**, so the only difference is the context:

- **uncompressed** — every retrieved chunk in full;
- **compressed** — RECOMP-lite sentence selection (top 6 sentences, score ≥ 0.5),
  or no context at all when no sentence qualifies (selective augmentation).

## Before you run

- The **Ollama tunnel must be up** (retrieval and compression both embed with
  BGE-M3 on the Mac): `./aws/tunnel-check.sh` in the system repo.
- IT5001 must be ingested. On EC2, in `/opt/studyai`, it should appear here:

```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT course_code, COUNT(*) FROM course_material_chunks GROUP BY 1 ORDER BY 1;"'
```

  If it does not, run `docker compose exec -T backend node ingest.js`.

## Run

**On your Mac**, from the thesis repository folder — copy the files to EC2:

```bash
ssh -i ~/.ssh/virtual-teaching-assistant-ec2.pem ec2-user@3.88.138.16 'mkdir -p ~/answer-quality'
```

```bash
scp -i ~/.ssh/virtual-teaching-assistant-ec2.pem exp/ch-answer-quality/answer-quality.js exp/ch-answer-quality/questions.csv ec2-user@3.88.138.16:~/answer-quality/
```

**On EC2**, in `/opt/studyai`:

```bash
docker compose cp ~/answer-quality/answer-quality.js backend:/tmp/answer-quality.js
```

```bash
docker compose cp ~/answer-quality/questions.csv backend:/tmp/aq-questions.csv
```

```bash
docker compose exec backend node /tmp/answer-quality.js --questions /tmp/aq-questions.csv --course IT5001 --outdir /tmp/aq
```

It takes about 20–25 minutes: 48 answers, paced under the free tier's 8,000
tokens per minute. Then copy the results out:

```bash
docker compose cp backend:/tmp/aq ~/answer-quality/results
```

**On your Mac** — download them:

```bash
scp -r -i ~/.ssh/virtual-teaching-assistant-ec2.pem ec2-user@3.88.138.16:~/answer-quality/results ~/Downloads/aq-results
```

You get `scoring-sheet.csv`, `answers.md`, `key.json` and `raw.json`.
**Do not open `key.json`** until you have finished scoring.

## Score (about 1–2 hours)

Read `answers.md` (easier on the eye) and enter scores in
`scoring-sheet.csv` (Excel or Numbers; save as CSV, UTF-8). For each question,
score answer A and answer B independently against the reference answer:

| Column | Values | Meaning |
|---|---|---|
| `correct_A`, `correct_B` | `2` / `1` / `0` | **2** correct and complete; **1** partly correct (misses a key point of the reference, or a minor error); **0** wrong, or claims the material does not cover something it does. Leave blank for off-syllabus questions. |
| `cites_A`, `cites_B` | `Y` / `N` | Does the answer draw on or mention the course material? |
| `not_covered_A`, `not_covered_B` | `Y` / `N` | Off-syllabus only: does it say the course material does not cover the question? |
| `preferred` | `A` / `B` / `tie` | Optional: which answer would you rather a student received? |
| `notes` | free text | Anything notable, e.g. "B states the wrong result for -7 // 2". |

Judge correctness against the reference, not against your own preferred
explanation: an answer that is correct but goes beyond the reference still
scores 2.

### Scoring with AI-suggested provisional scores (the method used here)

The scores in this thesis are the author's, with AI assistance disclosed:

1. Before `key.json` is opened, an AI assistant fills `suggested_correct_*`,
   `suggested_cites_*` and `suggested_not_covered_*` for every answer, with a
   one-line justification in `reason_A` / `reason_B`, and copies the
   suggestions into the final score columns as a starting point.
2. The author reads every answer against the reference, accepts or changes
   each score in the final columns (`correct_*`, `cites_*`, `not_covered_*`),
   and marks the row `reviewed` = `Y`.
3. `score.py` refuses to run while any row is not marked reviewed, and reports
   how many provisional scores the author changed.

Report it as: *scored blind by the author, with provisional scores suggested
by an AI assistant (Claude Opus 5.5) and reviewed by the author, who changed N
of M provisional scores.*

## Summarise

On your Mac, in the results folder:

```bash
python3 score.py scoring-sheet.csv key.json raw.json --out summary
```

(Use the path to `score.py` in this folder.) It writes `summary.md` and
`summary.json`: mean correctness per condition, fully-correct and wrong rates,
paired better/same/worse counts with a sign test, the same split by `code`
and `prose` questions, off-syllabus behaviour, and prompt tokens, output
tokens and latency per condition. Send the results folder back for the
write-up.

## Caveats for the write-up

- One rater (you), and 20 in-syllabus questions on one course: indicative, not
  conclusive. Blind A/B scoring removes one source of bias, not all.
- Answers are generated without tools, isolating the effect of the retrieved
  context; in production the agent may also call tools.
- Temperature 0 makes the comparison repeatable; production uses the
  provider's default.
