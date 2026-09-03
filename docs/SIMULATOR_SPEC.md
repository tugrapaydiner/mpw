# simulator spec (design locks behavior; tuning permitted later)

entry: `simulateItem(modelProfile, item, protocol)` -> item receipt. no aggregate tables anywhere.

## item latents (minimal, interpretable)

baseDifficulty, reasoningDemand, formattingFragility, retryRecoverability, toolDependency (bool per item), category.

## model profile

baseCompetence, reasoningEfficiency, formattingReliability, retryRecovery, toolCompetence.

## protocol

reasoningBudget (tokens), answerParser (tolerant|strict), retryPolicy (0|1), toolAccess (standard|restricted).

## mechanism order

1. effective difficulty/support from baseDifficulty + reasoningDemand vs budget.
2. first-attempt semantic success (threshold draw).
3. tool effect only where toolDependency holds.
4. retry only if policy allows + item recoverable: fresh deterministic retry draw.
5. final semantic answer.
6. output canonicality draw.
7. parser policy filters acceptance only. never touches semantics.
8. finalCorrect.

hard rules: parser never changes semantics; no retry when policy off; toolAccess never touches non-tool items.

## randomness (exact)

`u01(seed, itemId, modelId, stage) = FNV1a32("seed|item|model|stage") / 2^32`.
bootstrap: per-replicate stream `mulberry32(FNV1a32("bootSeed|r"))`, stratified resampling.
no Math.random anywhere. reordering arrays or evaluating protocols in any order cannot change any draw.

## canonical scenario (interpretable, not headline-tuned)

MODEL_A: higher ceiling at high budget, compute-sensitive, slightly formatting-fragile.
MODEL_B: lower peak at abundant budget, robust at low budget, stronger formatting reliability.
retry/tool: smaller genuine effects.

## acceptance targets (predeclared, tune later)

- Lab A established A. Lab B established B.
- parser-only from A: established A, |Δ change| >= 2pp ("material" defined now).
- budget-only: established B. unique singleton MPW.
- retry-only: established A, nonzero visible effect.
- tool-only: established A, nonzero visible effect.
- established results need modest CI safety margin, not knife-edge. never tune exact headline percentages.

current calibration note: parser-only CI low sits ~1pp above zero — thin, flagged for the later tuning pass.
