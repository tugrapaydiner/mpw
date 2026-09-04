# Exact Familywise Robust Witness Method

## Purpose

The robust-witness problem asks whether a protocol substitution reproduces a predeclared target conclusion with probability at least `tau` across repeated stochastic evaluations.

`src/research/exactRobustWitness.ts` implements a fixed-trial exact-binomial version of this analysis. It is sharper than the repository's Hoeffding reference bound when the Bernoulli/binomial assumptions are appropriate.

## Data model

For each subset `S` in the complete predeclared family `2^H`, observe `x_S` target-reproducing runs among `n_S` attempted runs.

The method assumes:

- the family, target, threshold, alpha, and stopping rule were fixed before outcomes were inspected;
- within each subset, the reproduction indicators are i.i.d. Bernoulli trials with probability `p_S`;
- trial failures and missing runs follow a predeclared handling policy;
- model, benchmark, evaluator, and infrastructure regime remain stable enough for the fixed-trial binomial interpretation.

## Pointwise lower bound

For `x > 0`, the one-sided Clopper–Pearson lower bound `L` at error level `alpha` solves

```text
P_{p=L}[X >= x] = alpha,
X ~ Binomial(n,p).
```

For `x = 0`, the lower bound is zero. For `x = n`, the solution is

```text
L = alpha^(1/n).
```

The implementation evaluates the binomial upper tail through the regularized incomplete beta function and numerically inverts it by bisection. Edge cases and inversion identities are tested.

“Exact” refers to the finite-sample binomial coverage construction. Floating-point evaluation still has an explicit numerical tolerance.

## Simultaneous familywise bound

For a family of `m = 2^|H|` subsets, the method uses per-configuration error level

```text
alpha_S = alpha / m.
```

Each subset receives a one-sided Clopper–Pearson lower bound at `alpha_S`. By the union bound, simultaneous lower coverage across the complete predeclared family is at least `1-alpha`, without requiring independence between different protocol subsets.

A subset is robustly sufficient when its simultaneous exact lower bound satisfies

```text
L_S >= tau.
```

The ordinary exact witness search then returns every globally minimum-cardinality robustly sufficient subset.

## Why retain the Hoeffding result

The exact method returns the corresponding Hoeffding analysis on the same counts as a reference. This serves two purposes:

- it exposes how much power is gained from the fixed-trial binomial model;
- it prevents the project from presenting one interval construction without a transparent conservative comparison.

Hoeffding requires fewer numerical assumptions but is often much wider. Clopper–Pearson is exact under the binomial model, yet still conservative—especially after Bonferroni correction.

## Post-selection interpretation

The simultaneous bounds are computed for the complete family before minimum-witness selection. This supports a familywise statement over that registered family.

It does not address:

- an adaptively chosen target conclusion;
- benchmark selection;
- protocol-schema uncertainty;
- omitted coordinates;
- outcome-dependent stopping;
- changing model or grader versions;
- causal attribution.

## Numerical implementation

The implementation is dependency free:

- Lanczos approximation for `log Gamma`;
- continued-fraction evaluation of the regularized incomplete beta function;
- exact binomial-tail identity;
- bounded bisection for inversion;
- analytic handling of zero and all-success cases.

The trial count is capped to avoid unbounded numerical work.

## Tests

- `tests/research/binomialBounds.test.ts`
- `tests/research/exactRobustWitness.test.ts`

The test suite checks:

- analytic edge cases;
- binomial-tail inversion;
- monotonicity in observed successes;
- Bonferroni ordering;
- beta-function identities;
- exact co-minimum recovery;
- a case where exact fixed-trial inference certifies a robust witness while Hoeffding remains unresolved;
- input-order invariance;
- invalid counts and probabilities.

## Claim boundary

This module supports a methodology claim:

> Given a complete predeclared finite protocol family and fixed-trial Bernoulli repetitions satisfying the stated assumptions, MPW can identify minimum robust witnesses using Bonferroni-adjusted one-sided Clopper–Pearson lower bounds.

It does not establish that the canonical deterministic witness or any real external witness satisfies those assumptions. That requires executed repeated evaluations under a frozen design.
