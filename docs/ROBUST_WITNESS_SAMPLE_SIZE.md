# Robust-Witness Best-Case Sample-Size Planning

## Purpose

Before running a repeated evaluation, the study should answer a basic feasibility question:

> At the planned familywise confidence level and robustness threshold, could even an all-success sequence certify a witness with this many runs?

If the answer is no, the study is underpowered by construction. No observed sequence can do better than all successes.

`minimumBestCaseRobustWitnessTrials` calculates the smallest trial count at which the most favorable possible count—`successes = trials`—can clear the registered threshold.

This is a **best-case feasibility bound**, not a power calculation. Real studies normally require more runs because their true reproduction probability is below one and observed failures lower the confidence bound.

## Supported methods

### Fixed-time Hoeffding

For a family of size `m`, error level `alpha`, and all-success empirical rate one, the Bonferroni-Hoeffding lower bound is

```text
1 - sqrt(log(m/alpha)/(2n)).
```

The smallest feasible count for threshold `tau` is

```text
ceil(log(m/alpha) / (2(1-tau)^2)).
```

subject to a final exact numerical check.

### Fixed-time Clopper–Pearson

With all `n` trials successful and per-configuration error `alpha/m`, the one-sided exact lower bound is

```text
(alpha/m)^(1/n).
```

The smallest feasible count is

```text
ceil(log(alpha/m) / log(tau)).
```

for `0 < tau < 1`, again verified numerically.

### Anytime-valid Hoeffding

The time-uniform method allocates

```text
alpha / (m*n*(n+1))
```

at monitoring time `n`. Because `n` also appears inside the logarithm, the minimum is found by bounded doubling followed by binary search.

Anytime monitoring generally requires more best-case observations than a fixed-time analysis because it protects every possible stopping time.

## Interpretation

Suppose the output says the fixed-time exact method needs at least 55 all-success runs. Then:

- 54 runs can never certify the threshold, even if all 54 succeed;
- 55 perfect successes are mathematically capable of certification;
- a study with true success probability below one may require substantially more than 55 runs;
- the result says nothing about expected cost, power, or stopping time without a declared true-probability model.

## Family-size effect

Larger protocol families spend the error budget across more candidate subsets and therefore cannot require fewer best-case runs under these Bonferroni procedures.

This is one reason to define the candidate family scientifically rather than exposing hundreds of arbitrary implementation flags. Shrinking the family after observing results, however, invalidates the registered familywise interpretation.

## Threshold effect

As `tau` approaches one, the required count grows rapidly. A robustness threshold of exactly one cannot be certified from finite Bernoulli data with nonzero confidence error, so the planner requires `tau < 1`.

A threshold of zero is trivially feasible at one trial but is rarely scientifically useful; the returned interpretation still warns that this is not a power analysis.

## Planning beyond the best case

A full prospective design should also specify a minimum scientifically plausible true reproduction probability `p* > tau` and calculate:

- probability of certification by the planned fixed count;
- expected stopping time for an anytime-valid design;
- probability of recovering the exact minimum and every tie;
- total run cost across the complete family;
- sensitivity to failures, drift, and unequal allocation.

Those calculations require a declared alternative model and should be separated from the assumption-free best-case feasibility check.

## Implementation and tests

- `src/research/robustWitnessPlanning.ts`
- `tests/research/robustWitnessPlanning.test.ts`

Tests check analytic fixed-time formulas, exact minimality of the returned count, bounded search for the anytime method, monotonicity with threshold/family size, cap failures, and invalid study parameters.

## Claim boundary

The planner prevents impossible study designs. It does not establish that a feasible design has adequate statistical power or that real repeated evaluations satisfy the Bernoulli assumptions.
