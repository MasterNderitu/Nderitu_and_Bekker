# aviator-nderitu

Groups historical Aviator-style rounds by how many 1.0x instant crashes
occurred in the 10 rounds immediately before each round, and reports
the **real, observed** next-round outcome split for each group — with
sample size shown honestly, every time.

## Exactly what it computes

For every round in your history (after the first 10), it looks at the
10 preceding rounds and counts how many were exactly 1.0x. That count
(0 through 10) becomes a group. For each group, it reports what
fraction of the time the *next* round was at or above your threshold
(default 1.5x) — a literal count: "X times out of Y this exact pattern
occurred in your data."

## Usage

**Batch mode** — analyzes your whole dataset at once:
```bash
npm install
npm start                          # uses data/rounds.json, threshold 1.5
npx ts-node src/cli.ts data/rounds.json 1.5   # or specify explicitly
```

**Interactive mode** — type in your last 10 rounds, get a lookup of
the real historical stats for that exact pattern:
```bash
npm run check
```
Prompts for 10 numbers, each requiring exactly 2 decimal places
(e.g. `1.00`, `2.34`, `9.50`). Once entered, it counts how many were
`1.00` and looks up the **real historical outcomes** for that count
from `data/rounds.json` — this is a lookup against pre-computed
history, not a live prediction generated from what you typed. Your
input only selects which historical group gets shown.

Second CLI argument is the threshold (defaults to 1.5 if omitted) —
works the same way for both modes:
```bash
npm run check -- data/rounds.json 2.0
```

## Reading the output correctly

Every group's percentage is shown next to the **overall unconditional
rate** across all your data. That comparison is the whole point:

- If a group's percentage is close to the overall rate → the number of
  1.0x crashes in the previous 10 rounds isn't telling you anything
  extra about the next round.
- Small-sample groups (fewer than 5, fewer than 20 occurrences) are
  explicitly flagged as such. A percentage based on 2 data points is
  not a real rate — it's noise, and the output says so rather than
  hiding it behind a clean-looking number.

## What this tool is NOT

**This does not predict the next round.** It answers a factual,
countable question about your historical data — nothing more. If (as
expected for a properly implemented provably-fair game) the
percentages come out roughly the same across every group, that IS the
honest answer: the number of recent 1.0x crashes carries no
information about what comes next. That's not a limitation of this
tool — it's what independence actually looks like in real numbers.

For a rigorous statistical test of whether any apparent difference
between groups is real or just small-sample noise, run the
independence test in the companion `aviator-analysis` project against
the same data — it uses permutation testing to give you an actual
significance measure (a p-value) instead of eyeballing percentages.

## Test

```bash
npm test
```
