# Baseline token audit (thesis §3.4.1)

Measures how the uncompressed first-pass agent prompt splits into its parts —
persona, LMS context, retrieved course material, conversation history, the
question, and tool definitions — for the 10 questions in `questions.csv`.

| File | What it is |
|---|---|
| `questions.csv` | The 10 audit questions (CS3241, ray tracing). Q2, Q3 and Q10 match the compression probe in §5.3.1. |
| `token-audit.js` | The measuring script. Runs inside the backend container. |
| `recording-sheet.csv` | Blank sheet with the same columns as the script's output, for notes or a manual run. |

## How it measures

The script grows the prompt one component at a time and reads Groq's exact
`prompt_tokens` after each step (each call asks for at most 8 output tokens):

1. persona + question → `t_system`, `t_query`
2. \+ LMS context (if `--context` is given) → `t_context`
3. \+ retrieved course material, compression **off** → `t_retrieved`, `chunks_retrieved`
4. \+ tool definitions (measured once) → `t_tools`
5. \+ conversation history (Q8 only, follows Q3) → `t_history`

`first_pass_input` is the full first-pass prompt; `retrieved_share_pct` is
`t_retrieved / first_pass_input`. The components sum to the total to within a
token or two of chat-template overhead, which is counted in `t_system`.

It uses the deployed code: retrieval from `server/rag.js`, tools from
`server/agentTools.js` (plus any connected MCP servers), and the persona from
`server/chat.js`, read at run time.

## Before you run

- The **Ollama tunnel must be up**: retrieval embeds each question with BGE-M3
  on the Mac. The script stops if retrieval returns nothing for Q1.
- CS3241 must be ingested (`course-materials/CS3241/ray-tracing.md`).
- The backend container must have `GROQ_API_KEY` set (it does when
  `LLM_PROVIDER=groq`).
- **Optional — LMS context:** in the app, open the chat for CS3241, then in the
  browser's DevTools → Network, click the `chat` request → Payload, copy the
  value of `context`, and save it as `context.txt`. Without it, `t_context` is 0.

## Run (on the EC2 host, in the directory with `docker-compose.yml`)

Copy the files to the host first (e.g. with `scp`), then:

```bash
docker compose cp exp/ch-token-audit/token-audit.js backend:/tmp/token-audit.js
docker compose cp exp/ch-token-audit/questions.csv backend:/tmp/questions.csv
docker compose cp context.txt backend:/tmp/context.txt        # optional
docker compose exec backend node /tmp/token-audit.js \
  --questions /tmp/questions.csv --course CS3241 \
  --out /tmp/token-audit-results.csv --context /tmp/context.txt
docker compose cp backend:/tmp/token-audit-results.csv .
docker compose cp backend:/tmp/token-audit-results.json .
```

Drop `--context /tmp/context.txt` if you did not capture it. The run takes
about 10 minutes: it paces itself under the free tier's 8,000 tokens per minute.

## After the run

- Optionally fill `passes_observed`: ask each question in the app with
  compression off and count passes in the server log (`docker compose logs
  backend`): one pass per batch of `TOOL` lines, plus one for the answer.
- Send `token-audit-results.csv` and `.json` back for the write-up in §3.4.1.
  The `.json` also holds a summary (mean chunks, mean retrieved tokens, mean
  first-pass input, retrieved share) and the generated Q3 answer used as Q8's
  history.

## Caveats for the write-up

- Token counts are for gpt-oss-20b's tokenizer; other model families count
  the same text differently (§5.3.3).
- The CS3241 corpus is small (314 words, about 3 chunks), so retrieval returns
  most of the file; a larger course would retrieve more context per question.
- Eq. 3.1 has no tool term; this audit measures `t_tools` separately because
  every agent pass sends the tool schemas.
