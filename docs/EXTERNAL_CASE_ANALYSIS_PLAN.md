# External Case Analysis Plan — Fragility Grid

**Plan version:** 1.1  
**Upstream repository:** `NikolaTesla-007/fragility-grid`  
**Pinned upstream commit:** `3f51444ead009d8351de1b6b19bf901c4da3d420`  
**Upstream paper:** *There Is No Neutral Harness: Modern LLM Leaderboards Are Manufactured by Config-Fragile Items*  
**Status:** revision 1.1 frozen before the first item-level study execution.

**Revision 1.1 clarification:** endpoint configurations are directional. Every eligible ordered `(base, target)` pair is enumerated, so a witness that exists only in one reconciliation direction is not silently missed. The portable derived package retains the complete eligible correctness-bit matrix in compact form so selection and validation can be replayed offline; it still excludes all question, answer, and gold-label text.

## Purpose

The synthetic MPW suite establishes algorithmic correctness because its witness landscapes have known ground truth. It cannot establish that protocol reconciliation is useful on independently produced model-evaluation evidence. This study tests the MPW machinery on an external, previously generated dataset containing a correctness bit for every model–item–harness configuration triple.

This is a **secondary analysis** of released evidence, not a rerun of the language models and not an independent replication of the upstream paper. It must not be described as causal evidence.

## Source and license boundary

The upstream repository is pinned by commit. The extraction process downloads the released record files and records a SHA-256 digest for every byte stream used.

The source JSONL embeds benchmark question text under the source benchmarks' licenses. MPW will not retain or redistribute question text, answer text, or gold labels. The derived package contains only:

- upstream commit and file paths;
- source-byte SHA-256 digests;
- model identifiers;
- benchmark/item identifiers;
- harness-configuration values;
- binary correctness outcomes.

The upstream MIT notice is retained in MPW's third-party documentation.

## Eligible evidence

All 12 released model identifiers, all four released benchmark strata, and all 24 **generation-scored** configurations are eligible. The two log-likelihood configurations are excluded because they do not form the same `format × permutation` Cartesian grid and would make coordinate substitution ambiguous.

Eligible protocol coordinates:

1. `format` — `letter_plain`, `letter_paren`, `digit_labels`, or `instruction`;
2. `permutation` — `p0` through `p5`.

A candidate dispute consists of an unordered model pair and an **ordered** `(base, target)` pair of endpoint configurations that differ in both coordinates. Both directions of every eligible endpoint diagonal are enumerated. Its four controlled worlds are therefore all present in the released grid:

- base `(format_A, permutation_A)`;
- format-only substitution `(format_B, permutation_A)`;
- permutation-only substitution `(format_A, permutation_B)`;
- full target `(format_B, permutation_B)`.

## Frozen split

Items are split independently within each benchmark stratum.

For each item, compute:

`SHA-256("mpw-fragility-grid-split-v1|" + benchmark + "|" + item_id)`.

Sort items in ascending digest order. The first `floor(n/2)` items in each benchmark form **discovery**; the remainder form **held-out validation**. The split is based only on identifiers, never outcomes.

## Discovery search

Enumerate every unordered model pair and every eligible ordered `(base, target)` pair of endpoint configurations. For model order `(model_a, model_b)`, define

`delta = accuracy(model_a) - accuracy(model_b)`.

A discovery candidate must satisfy all of the following:

1. base and target point estimates have opposite nonzero signs;
2. adopting format alone preserves the base sign;
3. adopting permutation alone preserves the base sign;
4. the full target has the target sign;
5. `min(abs(delta_base), abs(delta_target)) >= 0.005`;
6. the doubled smaller exact conditional binomial tail for each endpoint is at most `0.05`.

These rules identify an exploratory size-two interaction witness on discovery data. They are not a confidence statement about validation.

Rank eligible discovery candidates lexicographically by:

1. larger `min(abs(delta_base), abs(delta_target))`;
2. larger `min(abs(delta_format_only), abs(delta_permutation_only))`;
3. larger target absolute effect;
4. model IDs and endpoint keys in ascending code-unit order.

Retain the first five candidates. The first is the **primary held-out candidate**. This rank is frozen before any validation outcome is inspected.

## Held-out validation

Build the union of all unique `(model pair, configuration)` comparisons required by the five retained candidates. On the validation split, compute one synchronized, benchmark-stratified bootstrap resample plan across this entire finite family.

For each comparison, report:

- paired accuracy difference;
- pointwise percentile interval;
- one-step simultaneous maximum-absolute-deviation interval;
- exact discordant-pair counts and doubled smaller conditional-binomial tail.

A candidate validates as a size-two MPW only when, under the simultaneous interval conclusion rule:

1. base and target are decisive and opposite;
2. both singleton substitutions retain the base conclusion;
3. the full substitution matches the target conclusion;
4. exact search over `{format, permutation}` returns the unique witness `{"format", "permutation"}`.

The primary outcome is whether the discovery-rank-one candidate validates. The secondary outcome is the number of the five frozen candidates that validate. A failure, zero validated candidates, or an inconclusive endpoint is reported as such and does not cause the data-integrity job to rewrite the analysis plan.

## Evidence-integrity gates

The study aborts on any of the following:

- upstream commit or path mismatch;
- non-2xx download;
- duplicate model/item record;
- missing benchmark or model;
- item-set disagreement across models;
- missing or non-binary configuration bit;
- configuration legend not equal to a 4×6 generation grid plus the two declared log-likelihood configurations;
- benchmark counts not equal to ARC 1000, HellaSwag 1000, MMLU 1000, TruthfulQA 679;
- question or gold fields appearing in the derived package;
- derived package hash mismatch during replay.

## Interpretation boundary

Success would show that an externally generated finite harness grid contains a held-out protocol interaction that MPW can express and verify. It would not show that MPW discovers causes, that the selected model is universally superior, that the upstream study is correct, or that every real evaluation dispute has an exposed witness.

Failure would remain informative: it would show that a discovery interaction did not survive the frozen held-out rule and would constrain claims about robustness.
