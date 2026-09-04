# Robust Protocol Witnesses Under Repeated Evaluations

## Status

This document defines an additional research method for **repeated stochastic evaluations**. It does not replace the deterministic MPW definition and it is not retroactively applied to the canonical synthetic demo, which contains one deterministic outcome per item and no repeated independent model runs.

## Motivation

For a deterministic artifact, a subset either reproduces the target conclusion or it does not. Real model evaluations can vary across repeated executions because of sampling, nondeterministic tools, infrastructure, graders, or other run-level variation.

Calling a subset a stable explanation after one favorable run would be misleading. The relevant quantity is instead the probability that the same protocol substitution reproduces a target conclusion under a predeclared repetition regime.

## Definition

Let `H` be the exposed protocol differences and let the target conclusion be fixed before examining repeated outcomes.

For every `S ⊆ H`, define independent Bernoulli indicators

`Y_(S,r) = 1` if repeated run `r` under the exact hybrid for `S` reproduces the target conclusion, and `0` otherwise.

Let

`p_S = P(Y_(S,r) = 1)`.

Choose before observing the repetitions:

- a robustness threshold `tau` in `[0,1]`;
- a familywise error level `alpha` in `(0,1)`;
- the complete finite family of `m = 2^|H|` subsets.

For `n_S` repeated trials and empirical rate `pHat_S`, the one-sided Hoeffding lower bound at level `alpha/m` is

`L_S = max(0, pHat_S - sqrt(log(m/alpha) / (2 n_S)))`.

By Hoeffding's inequality and the union bound, with probability at least `1-alpha`, every declared configuration simultaneously satisfies `p_S >= L_S`. Independence across different subsets is not required for the union bound; the i.i.d. Bernoulli assumption is within each subset.

A subset is **robustly sufficient** when

`L_S >= tau`.

A robust minimum witness is a globally minimum-cardinality robustly sufficient subset. All subsets tying at the minimum cardinality are returned.

## Why the family is complete

The method rejects missing subset rows. A global minimum claim over `H` cannot be made from only the promising configurations while silently omitting smaller or unfavorable candidates.

The finite family must also be fixed before inspecting the repeated outcomes. Adding configurations after observing results changes the multiplicity correction and requires recomputation.

## Why this method is conservative

The Bonferroni-Hoeffding construction was selected as a transparent, dependency-free first method because it:

- provides a simple simultaneous lower-bound guarantee;
- permits unequal trial counts across subsets;
- does not require independence across protocol configurations;
- avoids fitting an unidentifiable hierarchical model to the deterministic demo;
- fails safely when repetitions are too few.

It can be substantially conservative. A small collection of perfect runs may still produce no robust witness. That is expected behavior, not a bug.

Sharper alternatives—exact binomial confidence sequences, beta-binomial or hierarchical models, sequential designs, and resampling methods preserving cross-configuration dependence—need their assumptions and stopping rules specified separately.

## Assumptions

The implemented guarantee requires:

1. the target conclusion and complete subset family were fixed in advance;
2. within each subset, repeated reproduction indicators are i.i.d. Bernoulli trials;
3. the model versions, benchmark, evaluator, tools, infrastructure regime, and conclusion rule remain stable across repetitions;
4. missing or failed runs are not silently dropped based on their outcomes;
5. the reported trial count is the number of attempted repetitions under the declared handling policy.

When these assumptions are implausible, the numeric lower bound should not be interpreted as a calibrated probability guarantee.

## Relation to deterministic MPW

The two objects answer different questions:

- **Deterministic MPW:** What is the smallest exposed substitution sufficient to reproduce the target conclusion in this fixed artifact?
- **Robust protocol witness:** What is the smallest exposed substitution whose probability of target reproduction is simultaneously lower-bounded above a predeclared threshold under repeated runs?

A deterministic MPW can fail to be robust. Several deterministic co-minimum witnesses can also differ in their robust lower bounds.

Neither definition establishes causality or excludes unexposed confounding.

## Post-selection protection

The simultaneous lower bounds are computed for the entire predeclared family before the minimum witness is selected. This avoids treating a pointwise lower bound for the selected subset as if it automatically covered the search procedure.

This protection is conditional on the declared family and repeated-run model. It does not solve uncertainty in the target publication, benchmark selection, protocol-schema construction, or omitted dimensions.

## Implementation

- `src/research/robustWitness.ts`
- `tests/research/robustWitness.test.ts`

The implementation records empirical probabilities, pointwise and simultaneous lower bounds, the per-configuration alpha allocation, exact minimum-search proof fields, assumptions, and limitations.

Tests verify co-minimum recovery, rejection of misleading small perfect samples, simultaneous-versus-pointwise ordering, deterministic input-order invariance, complete-family enforcement, malformed-input rejection, and known Hoeffding edge behavior.

## Required future empirical work

This method becomes evidence-bearing only after repeated real evaluations are run under a predeclared protocol. The next serious study should compare:

- deterministic witness membership;
- robust witness membership across thresholds;
- trial counts required for useful lower bounds;
- sensitivity to run-failure handling;
- stability across benchmark strata and evaluation environments.

Until such a study exists, this module is a verified methodology implementation, not a claim that the canonical witness is robust in real deployments.
