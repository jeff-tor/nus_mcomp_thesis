"""Score local (Ollama) and hosted (Groq) agent-benchmark runs with ONE rubric.

Local rows come from the FYP repo's docs/benchmark_agent_models.csv (2026-08-20,
Ollama 0.20.2, M1 Max). Groq rows come from bench-groq-agent.js JSON output.
The original CSV's grounding_pct was hand-coded; it is NOT reused here. Both
sides are re-scored by the same regexes so the columns are comparable:

  grounded   (S2, S3)  answer states the stubbed score 5.2 AND names a stubbed
                       weak topic (recursion / list comprehensions)
  question   (S3)      answer poses a practice question: "true or false",
                       the stub's "base case", or lettered/numbered options
  tool_ok              every expected tool was called at least once

Cost per turn uses Groq's list prices (console.groq.com/docs/models, fetched
2026-09-27); output tokens include reasoning tokens, which are billed as output.

  python3 score.py <fyp-repo>/docs/benchmark_agent_models.csv groq_*.json
"""
import csv, json, re, sys, statistics as st
from collections import defaultdict

PRICE = {  # USD per 1M tokens (input, output)
    'openai/gpt-oss-120b': (0.15, 0.60),
    'openai/gpt-oss-20b':  (0.075, 0.30),
    'qwen/qwen3.8-27b':    (0.80, 4.00),
}

def grounded(t):
    return bool(re.search(r'\b5\.2\b', t)) and bool(re.search(r'recursion|list comprehension', t, re.I))

def question(t):
    return bool(re.search(r'true or false|base case|(^|\n)\s*(\(?[a-dA-D][\).:]|[1-4][\).])\s', t, re.I))

rows = []
for path in sys.argv[1:]:
    if path.endswith('.csv'):
        for r in csv.DictReader(open(path)):
            rows.append(dict(src='ollama', model=r['model'], scenario=r['scenario'],
                ms=int(r['wall_ms']), passes=int(r['agent_passes']), inTok=int(r['input_tokens']),
                outTok=int(r['output_tokens']), reasonTok=0, tps=float(r['gen_tokens_per_sec'] or 0),
                expected=int(r['tools_expected']), hits=int(r['tools_hit']),
                spurious=int(r['tools_spurious']), text=r['final_answer'], error=None))
    else:
        for r in json.load(open(path)):
            if r.get('error'):
                rows.append(dict(src='groq', model=r['model'], scenario=r['scenario'], error=r['error']))
                continue
            rows.append(dict(src='groq', model=r['model'], scenario=r['scenario'], ms=r['ms'],
                passes=r['passes'], inTok=r['inTok'], outTok=r['outTok'], reasonTok=r['reasonTok'],
                tps=r['tps'] or 0, expected=r['expected'], hits=r['toolHits'],
                spurious=r['extraTools'], text=r['text'], error=None))

groups = defaultdict(list)
for r in rows:
    groups[(r['src'], r['model'], r['scenario'])].append(r)

def med(xs):
    return st.median(xs) if xs else float('nan')

out = []
for (src, model, scen), rs in sorted(groups.items()):
    ok = [r for r in rs if not r['error']]
    n, nerr = len(rs), len(rs) - len(ok)
    pin, pout = PRICE.get(model, (0, 0))
    cost = [(r['inTok'] * pin + r['outTok'] * pout) / 1e6 for r in ok]
    row = dict(src=src, model=model, scenario=scen, n=n, errors=nerr,
        median_ms=med([r['ms'] for r in ok]),
        min_ms=min([r['ms'] for r in ok], default=None), max_ms=max([r['ms'] for r in ok], default=None),
        passes=med([r['passes'] for r in ok]), in_tok=med([r['inTok'] for r in ok]),
        out_tok=med([r['outTok'] for r in ok]), reason_tok=med([r['reasonTok'] for r in ok]),
        tps=med([r['tps'] for r in ok if r['tps']]),
        tool_ok=sum(r['hits'] == r['expected'] for r in ok), spurious=sum(r['spurious'] for r in ok),
        grounded=sum(grounded(r['text']) for r in ok) if scen in ('S2-one-tool', 'S3-multipart') else None,
        question=sum(question(r['text']) for r in ok) if scen == 'S3-multipart' else None,
        cost_usd_per_turn=med(cost) if pin else 0.0)
    out.append(row)

json.dump(out, open('scored.json', 'w'), indent=1)
cols = ['src', 'model', 'scenario', 'n', 'errors', 'median_ms', 'min_ms', 'max_ms', 'passes', 'in_tok',
        'out_tok', 'reason_tok', 'tps', 'tool_ok', 'spurious', 'grounded', 'question', 'cost_usd_per_turn']
print(' | '.join(cols))
for r in out:
    print(' | '.join(f'{r[c]:.6f}' if c == 'cost_usd_per_turn' else str(r[c]) for c in cols))
