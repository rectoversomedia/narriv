# Narriv evaluation

| Script | Measures | Needs |
|---|---|---|
| `intelligence-eval.mjs` | Deterministic risk/recommendation checks (bands, citation validity, determinism). No AI calls. | nothing |
| `run-model-eval.mjs` | Live analysis on the reference set: consistency with stored predictions, latency, cost; **accuracy only over human-reviewed items** (reported as insufficient below 30). | production API (demo workspace) |
| `reference/label-tools.mjs` | Human labelling round-trip for the reference set. | reviewers |

## Labelling the reference set (owner action)

Accuracy cannot be claimed from consistency alone. To get accuracy numbers:

1. `node eval/reference/label-tools.mjs export --set ref-v1`
   writes `reference/labels-ref-v1-items.csv` and `-pairs.csv`. The sheets are
   blind (no model predictions).
2. Reviewers fill `sentiment` (positive / negative / neutral / mixed),
   `severity` (low / medium / high / critical) and, for pairs, `sameNarrative`
   (yes / no). Leave a cell blank when unsure; blanks are never defaulted.
3. `node eval/reference/label-tools.mjs import --set ref-v1 --reviewer "Name"`
   validates every row and writes `review.*` into the reference set. Existing
   reviews are kept unless `--force` is passed.
4. `ref-v1` has 26 items; accuracy metrics need at least 30 reviewed items, so
   extend the set with `reference/build-reference-set.mjs` (new version, e.g.
   `ref-v2`) before or after labelling.
5. Re-run `run-model-eval.mjs`; the report will include per-class precision,
   recall and F1 once enough items are reviewed.

## Premium (Opus 5.5) arm

`run-model-eval.mjs` records the premium arm as "not run" unless
`/api/ai/providers` reports Anthropic configured and a premium tier routed.
That requires `ANTHROPIC_API_KEY` and `AI_MODEL_PREMIUM=claude-opus-5-5` in the
backend environment. Routine tasks stay on the economical default.
