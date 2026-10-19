#!/usr/bin/env python3
"""score.py — unblind and summarise the answer-quality evaluation (thesis RQ2).

Usage:
    python3 score.py <scored-sheet.csv> <key.json> <raw.json> [--out summary]

Reads the scoring sheet you filled in (blind, as A/B), maps A/B back to
uncompressed/compressed with key.json, joins the token and latency figures in
raw.json, and writes <out>.json and <out>.md.

Rubric (see README.md):
    correct_A / correct_B      2 correct and complete, 1 partly correct, 0 wrong
    cites_A / cites_B          Y if the answer draws on or cites the course material
    not_covered_A / _B         off-syllabus only: Y if it says the material does not cover it
    preferred                  optional: A, B or tie

AI-assisted review (option B): if the sheet carries provisional scores
(suggested_correct_A / _B, suggested_cites_A / _B, suggested_not_covered_A / _B),
every row must be marked reviewed = Y by the author, and the summary reports
how many provisional scores the author changed.
"""
import csv
import json
import math
import sys
from statistics import mean

CONDS = ("uncompressed", "compressed")


def die(msg):
    sys.exit(f"score.py: {msg}")


def yn(v, field, qid, required):
    v = (v or "").strip().upper()
    if v in ("Y", "YES"):
        return True
    if v in ("N", "NO"):
        return False
    if required:
        die(f"{qid}: {field} must be Y or N (got {v!r})")
    return None


def sign_test(wins, losses):
    """Exact two-sided sign test, ties dropped."""
    n = wins + losses
    if n == 0:
        return None
    k = min(wins, losses)
    p = sum(math.comb(n, i) for i in range(k + 1)) / 2 ** n
    return min(1.0, 2 * p)


def pct(x, n):
    return round(100 * x / n, 1) if n else None


def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    out = "summary"
    if "--out" in argv:
        out = argv[argv.index("--out") + 1]
        args = [a for a in args if a != out]
    if len(args) != 3:
        die(__doc__)
    sheet_path, key_path, raw_path = args

    with open(sheet_path, newline="", encoding="utf-8") as f:
        sheet = list(csv.DictReader(f))
    key = json.load(open(key_path))
    raw = {r["id"]: r for r in json.load(open(raw_path))["results"]}

    assisted = bool(sheet) and "suggested_correct_A" in sheet[0]
    if assisted:
        unreviewed = [s["id"] for s in sheet if (s.get("reviewed") or "").strip().upper() not in ("Y", "YES")]
        if unreviewed:
            die("these rows are not marked reviewed = Y by the author: " + ", ".join(unreviewed))
    changes = {"checked": 0, "changed": 0, "changed_ids": []}
    rows = []
    for s in sheet:
        if assisted:
            for f in ("correct", "cites", "not_covered"):
                for label in ("A", "B"):
                    sug = (s.get(f"suggested_{f}_{label}") or "").strip().upper()
                    fin = (s.get(f"{f}_{label}") or "").strip().upper()
                    if sug == "" and fin == "":
                        continue
                    changes["checked"] += 1
                    if sug != fin:
                        changes["changed"] += 1
                        changes["changed_ids"].append(f"{s['id']}:{f}_{label}")
        qid = s["id"]
        if qid not in key or qid not in raw:
            die(f"{qid}: missing from key.json or raw.json")
        k, r = key[qid], raw[qid]
        off = r["kind"] == "off-syllabus"
        rec = {"id": qid, "kind": r["kind"], "tag": r["tag"]}
        for label in ("A", "B"):
            cond = k[label]
            c = (s.get(f"correct_{label}") or "").strip()
            if not off:
                if c not in ("0", "1", "2"):
                    die(f"{qid}: correct_{label} must be 0, 1 or 2 (got {c!r})")
                rec[f"{cond}_correct"] = int(c)
            rec[f"{cond}_cites"] = yn(s.get(f"cites_{label}"), f"cites_{label}", qid, not off)
            rec[f"{cond}_not_covered"] = yn(s.get(f"not_covered_{label}"), f"not_covered_{label}", qid, off)
        pref = (s.get("preferred") or "").strip().upper()
        rec["preferred"] = k.get(pref) if pref in ("A", "B") else ("tie" if pref == "TIE" else None)
        for cond in CONDS:
            g = r[cond]
            rec[f"{cond}_prompt_tokens"] = g["prompt_tokens"]
            rec[f"{cond}_completion_tokens"] = g["completion_tokens"]
            rec[f"{cond}_latency_ms"] = g["latency_ms"]
        rec["compression_ms"] = r["compressed"].get("compression_ms")
        rec["compressed_empty"] = bool(r.get("compression") and r["compression"].get("empty"))
        rec["chunks"] = r["chunks_retrieved"]
        rows.append(rec)

    ins = [x for x in rows if x["kind"] == "in-syllabus"]
    offs = [x for x in rows if x["kind"] == "off-syllabus"]

    def quality(sub):
        res = {"n": len(sub)}
        for cond in CONDS:
            cs = [x[f"{cond}_correct"] for x in sub]
            res[cond] = {
                "mean_correct": round(mean(cs), 2) if cs else None,
                "fully_correct_pct": pct(sum(c == 2 for c in cs), len(cs)),
                "wrong_pct": pct(sum(c == 0 for c in cs), len(cs)),
                "cites_pct": pct(sum(bool(x[f"{cond}_cites"]) for x in sub), len(sub)),
            }
        wins = sum(x["compressed_correct"] > x["uncompressed_correct"] for x in sub)
        losses = sum(x["compressed_correct"] < x["uncompressed_correct"] for x in sub)
        res["paired"] = {"compressed_better": wins, "same": len(sub) - wins - losses,
                         "compressed_worse": losses, "sign_test_p": sign_test(wins, losses)}
        return res

    def cost(sub):
        res = {}
        for cond in CONDS:
            res[cond] = {
                "mean_prompt_tokens": round(mean(x[f"{cond}_prompt_tokens"] for x in sub)),
                "mean_completion_tokens": round(mean(x[f"{cond}_completion_tokens"] for x in sub)),
                "mean_latency_ms": round(mean(x[f"{cond}_latency_ms"] for x in sub)),
            }
        u, c = res["uncompressed"]["mean_prompt_tokens"], res["compressed"]["mean_prompt_tokens"]
        res["prompt_reduction_pct"] = pct(u - c, u)
        cm = [x["compression_ms"] for x in sub if x["compression_ms"] is not None]
        res["mean_compression_ms"] = round(mean(cm)) if cm else None
        return res

    summary = {
        "in_syllabus": quality(ins),
        "in_syllabus_by_tag": {t: quality([x for x in ins if x["tag"] == t])
                               for t in sorted({x["tag"] for x in ins})},
        "in_syllabus_compressed_to_empty": sum(x["compressed_empty"] for x in ins),
        "off_syllabus": {"n": len(offs), **{
            cond: {"says_not_covered_pct": pct(sum(bool(x[f"{cond}_not_covered"]) for x in offs), len(offs))}
            for cond in CONDS}},
        "cost_in_syllabus": cost(ins),
        "preferences": {p: sum(x["preferred"] == p for x in rows) for p in ("uncompressed", "compressed", "tie")},
        "scoring": ({"method": "author, with AI-suggested provisional scores reviewed by the author",
                     "provisional_scores": changes["checked"], "changed_by_author": changes["changed"],
                     "changed": changes["changed_ids"]} if assisted else {"method": "author"}),
        "rows": rows,
    }
    json.dump(summary, open(f"{out}.json", "w"), indent=2)

    q, c = summary["in_syllabus"], summary["cost_in_syllabus"]
    md = ["# Answer-quality summary", "",
          f"In-syllabus questions: {q['n']}; off-syllabus: {len(offs)}.", "",
          "| Metric (in-syllabus) | Uncompressed | Compressed |", "|---|---|---|",
          f"| Mean correctness (0–2) | {q['uncompressed']['mean_correct']} | {q['compressed']['mean_correct']} |",
          f"| Fully correct | {q['uncompressed']['fully_correct_pct']}% | {q['compressed']['fully_correct_pct']}% |",
          f"| Wrong | {q['uncompressed']['wrong_pct']}% | {q['compressed']['wrong_pct']}% |",
          f"| Cites the material | {q['uncompressed']['cites_pct']}% | {q['compressed']['cites_pct']}% |",
          f"| Mean prompt tokens | {c['uncompressed']['mean_prompt_tokens']} | {c['compressed']['mean_prompt_tokens']} |",
          f"| Mean output tokens | {c['uncompressed']['mean_completion_tokens']} | {c['compressed']['mean_completion_tokens']} |",
          f"| Mean generation latency (ms) | {c['uncompressed']['mean_latency_ms']} | {c['compressed']['mean_latency_ms']} |",
          "",
          f"Prompt reduction: {c['prompt_reduction_pct']}%; mean compression overhead: {c['mean_compression_ms']} ms.",
          f"Paired: compressed better {q['paired']['compressed_better']}, same {q['paired']['same']}, "
          f"worse {q['paired']['compressed_worse']} (sign test p = {q['paired']['sign_test_p']}).",
          f"In-syllabus questions compressed to no context: {summary['in_syllabus_compressed_to_empty']}.",
          "", "By tag:"]
    for t, v in summary["in_syllabus_by_tag"].items():
        md.append(f"- {t} (n={v['n']}): mean correctness {v['uncompressed']['mean_correct']} → "
                  f"{v['compressed']['mean_correct']}; paired better/same/worse "
                  f"{v['paired']['compressed_better']}/{v['paired']['same']}/{v['paired']['compressed_worse']}")
    o = summary["off_syllabus"]
    md += ["", f"Off-syllabus, says the material does not cover it: uncompressed "
               f"{o['uncompressed']['says_not_covered_pct']}%, compressed {o['compressed']['says_not_covered_pct']}%."]
    sc = summary["scoring"]
    md += ["", f"Scoring: {sc['method']}" + (f"; the author changed {sc['changed_by_author']} of "
                                              f"{sc['provisional_scores']} provisional scores." if assisted else ".")]
    open(f"{out}.md", "w").write("\n".join(md) + "\n")
    print("\n".join(md))


if __name__ == "__main__":
    main(sys.argv)
