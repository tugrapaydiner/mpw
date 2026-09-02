# sim params (all synthetic, tuned demo fixture)

seed: `mpw-canonical-v1`
draws: `u01 = hash(seed|item|model|stage) / 2^32`, order-independent, no Math.random

## models

| model | base | efficiency | reliability | retry | tool |
|---|---|---|---|---|---|
| MODEL_A | 0.92 | 0.35 | 0.92 | 0.55 | 0.55 |
| MODEL_B | 0.79 | 0.88 | 0.94 | 0.5 | 0.62 |

A starts stronger but needs budget. B is leaner and holds up when budget drops.

## strata

| stratum | diff | demand | frag | need | rec |
|---|---|---|---|---|---|
| multi-step | 0.35 | 0.9 | 0.3 | 0.1 | 0.6 |
| quantitative | 0.35 | 0.85 | 0.35 | 0.15 | 0.6 |
| instruction | 0.25 | 0.3 | 0.8 | 0.05 | 0.4 |
| tool | 0.3 | 0.5 | 0.4 | 0.9 | 0.5 |

per-item jitter ±0.1 on diff/demand/frag/rec, toolNeeded sampled once per item.

## how one item runs

```
budgetFactor = reasoning_budget / 8192
reasonPenalty = demand * (1 - budgetFactor) * (1 - efficiency)
toolPenalty = toolNeeded && restricted ? (1 - tool) * 0.4 : 0
pSem = base - difficulty * 0.45 - reasonPenalty - toolPenalty
pCan = reliability - fragility * 0.1
sem = u(sem) < pSem
canonical = u(fmt) < pCan
accepts = canonical || parser == tolerant
first = sem && accepts
```

parser never touches `sem`, only `accepts`.

retry: only if `one-retry` and first failed. recovery chance = `retry * recoverability`, then one fresh fmt draw + same parser rule.

## emergent check (not encoded)

- Lab A -> A wins, Lab B -> B wins
- only reasoning_budget alone flips to B
- answer_parser alone stays A win with material margin shift
- full search gives unique `{reasoning_budget}`
