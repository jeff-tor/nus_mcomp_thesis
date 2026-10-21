# The AI-Powered Omniscient Teacher Assistant

LaTeX source of the CP5105 capstone report for the NUS Master of Computing
(General Track), 2026. The system described in it is deployed as StudyAI:
<https://jeff-tor.github.io/fyp-virtual-teaching-assistant/>.

## Build

Requires a TeX distribution with `pdflatex` and `biber` (e.g. MacTeX or TeX Live).

```bash
./build.sh
```

The output is `CP5105-Thesis-Report.pdf`.

## Layout

| Path | Contents |
|---|---|
| `main.tex` | Title page, front matter and chapter order |
| `chapters/` | Abstract, Chapters 1–6, acknowledgements, Appendices A–C |
| `references.bib` | Bibliography (biblatex/biber) |
| `pic/` | Figures: TikZ sources per chapter, exported architecture diagrams in `pic/appendix/` |
| `exp/` | Evaluation scripts and results: token audit, answer-quality evaluation, LLM provider benchmark |
| `demo/` | Narration script for the demo video |
| `nusthesis.cls`, `_global_settings.tex` | Document class and shared settings |
| `TODO.md` | Remaining items before submission |

## Credits

The document class is adapted from the
[nusthesis template](https://github.com/streamjoin/nusthesis) by Qian Lin, via
the [NUS MSc. PHM template](https://github.com/arnold117/nus_phm_thesis), both
under the MIT License (see [LICENSE](LICENSE)).
