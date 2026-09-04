# Statistical Limitations

The repository implements several distinct analyses. They must not be collapsed into one generic “95% confidence” claim.

## Fixed protocol, fixed benchmark

The category-stratified paired bootstrap resamples paired item outcomes within the declared strata and estimates sensitivity of `Delta = accuracy(A) - accuracy(B)` to benchmark-item composition.

It does not include:

- repeated stochastic model executions;
- training or checkpoint variation;
- grader variation unless encoded in item outcomes;
- tool or infrastructure nondeterminism across runs;
- benchmark-distribution drift;
- uncertainty in protocol-schema construction;
- omitted dimensions.

## Configuration-family search

Searching many protocol subsets and then selecting a witness makes a pointwise interval for one row insufficient as a familywise or post-selection guarantee.

The synchronized simultaneous bootstrap addresses the predeclared finite configuration family under the same fixed-item resampling model. It remains a bootstrap approximation and inherits the limitations above.

## Repeated-run robustness

The robust-witness method estimates the probability that a substitution reproduces a fixed target conclusion across repeated runs. Its simultaneous Bonferroni-Hoeffding lower bound requires:

- a predeclared target and complete subset family;
- i.i.d. Bernoulli reproduction indicators within each subset;
- stable evaluation conditions;
- non-selective handling of failed or missing runs.

It is conservative and may return no robust witness even after a small number of perfect repetitions.

The deterministic canonical fixture has no repeated independent model executions, so it cannot establish robust real-world witness membership.

## Exact paired diagnostic

The exact conditional McNemar/binomial calculation describes imbalance among discordant paired outcomes under its null. It complements the effect estimate. It does not replace effect-size reporting, solve configuration-family multiplicity, or justify universal model claims.

## Categorical versus numerical matching

A categorical witness only reproduces the target conclusion label. It may remain far from the target effect magnitude. Effect distance and restoration are reported separately and are not silently built into the categorical definition.

## Generalization

A finite synthetic benchmark does not support population claims about real models. A static external grid supports conclusions only over its recorded configurations unless item-level or executable evidence justifies more.

Detailed definitions and methods are in:

- `docs/STATISTICAL_METHODS.md`
- `docs/ROBUST_WITNESS_METHOD.md`
- `docs/ROBUST_WITNESS_SIMULATION.md`
- `docs/RESEARCH_FORMALIZATION.md`
