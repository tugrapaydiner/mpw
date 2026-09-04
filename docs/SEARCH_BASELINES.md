# Protocol-Search Baselines

## Question

Given an arbitrary finite, potentially non-monotone sufficiency oracle, which search procedures can recover **all globally minimum-cardinality witnesses**, and which procedures merely find a plausible sufficient subset?

The distinction matters. A sufficient subset is not necessarily minimum, and one minimum witness is not necessarily the complete co-minimum set.

## Strategies

The executable study compares:

- `exact-cardinality-landscape`: all subsets, ordered by cardinality, with complete landscape evidence;
- `one-at-a-time`: the empty subset and every singleton only;
- `first-sufficient-bitmask`: first sufficient subset in ordinary bitmask order;
- `greedy-effect-matching`: repeatedly add the coordinate whose observed effect is closest to the target effect;
- `budgeted-random-8`: evaluate at most eight deterministically shuffled subsets.

Heuristic strategies are not upgraded into exact methods when they happen to guess correctly. Every result separately records:

- exact witness-set recovery;
- minimum-cardinality recovery;
- co-minimum completeness;
- whether a global-minimum proof is present and sound;
- safe abstention;
- unsafe claims;
- evaluated-subset count.

## Two complementary test sets

### Authored adversarial cases

Named cases exercise singleton, size-two and size-three witnesses, co-minimums, non-monotonicity, bitmask-order traps, greedy nuisance traps, empty witnesses, unreachable targets, and large effect changes that do not reproduce the target conclusion.

### Complete three-coordinate census

For three coordinates there are eight subsets and therefore `2^(2^3) = 256` possible Boolean sufficiency functions. The study evaluates every one of them. This removes cherry-picking over the small complete universe.

Effect values used by the greedy strategy are generated from the pinned seed `mpw-search-census-effects-v1`. They are nuisance values and do not define sufficiency.

## Executed deterministic result

Across the complete 256-landscape census:

| Strategy | Exact full witness-set recovery | Certifiable exact recovery |
|---|---:|---:|
| exact-cardinality-landscape | 256/256 | 256/256 |
| one-at-a-time | 240/256 | 240/256 |
| first-sufficient-bitmask | 176/256 | 1/256 |
| greedy-effect-matching | 146/256 | 0/256 |
| budgeted-random-8 | 184/256 | 1/256 |

The counts are pinned by tests and a compact content-hash-linked summary. They characterize this complete three-coordinate Boolean universe, not real evaluation disputes.

## Interpretation boundary

This is algorithmic stress evidence, not an estimate of performance on real evaluation disputes. It establishes correctness or failure on the declared finite landscapes only.

The study supports one deliberately narrow conclusion: under arbitrary non-monotone sufficiency, the evaluated heuristics cannot generally certify the complete global minimum. The exact method can, at combinatorial cost.

## Reproduction

```bash
npm run research:baselines
npm run research:baselines:write
```

The written full artifact is `data/benchmarks/protocol-search-baselines.json`. The repository retains a compact summary at `data/benchmarks/protocol-search-baselines-summary.json`; CI regenerates and uploads the full artifact.
