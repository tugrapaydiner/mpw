# Anytime-Valid Robust Protocol Witnesses

## Problem

Fixed-trial robust-witness intervals are valid only when the number of runs is fixed independently of the observed outcomes. In practice, investigators may monitor results and stop when a witness appears, allocate more runs to uncertain subsets, or stop early for cost.

Naively reusing a fixed-time 95% interval after repeated monitoring inflates the false-certification risk.

## Time-uniform construction

For every protocol subset `S` in a complete predeclared family of size `m`, let `Y_(S,t)` be the `t`th Bernoulli indicator that a repeated evaluation reproduced the fixed target conclusion. Let `p_S` be its stable success probability.

At each positive sample size `t`, allocate error

```text
alpha_(S,t) = alpha / (m * t * (t+1)).
```

Because

```text
sum_{t=1}^infinity 1/(t(t+1)) = 1,
```

the total allocated error across every subset and every monitoring time is at most `alpha`.

Applying Hoeffding's one-sided bound at each pair gives

```text
L_(S,t) = max(0, pHat_(S,t)
                  - sqrt(log(1/alpha_(S,t)) / (2t))).
```

By a union bound, with probability at least `1-alpha`, every declared lower bound is below its corresponding true `p_S` simultaneously for all subsets and all positive monitoring times.

This supports optional stopping and adaptive allocation across the fixed subset family, provided each subset's observed sequence satisfies the declared i.i.d. Bernoulli model and future observations are not selectively hidden.

## Witness certification

Choose the target conclusion, robustness threshold `tau`, subset family, alpha, evaluation regime, and failure policy before monitoring.

At the current counts, a subset is robustly certified when

```text
L_(S,t_S) >= tau.
```

The generic exact search then identifies every globally minimum-cardinality currently certified subset.

A result with no certified subset is called `NO_CERTIFIED_WITNESS`, not `NO_WITNESS`. It means the current time-uniform lower bounds do not establish the threshold. A truly robust subset may exist but require more observations.

## Zero observations

A complete family can begin with zero trials for some or all subsets. Such rows receive:

- no empirical probability;
- no allocated positive-time error term;
- lower bound zero;
- no robust certification.

This permits honest adaptive allocation without deleting untested subsets from the familywise claim.

## What optional stopping is covered

The bound remains valid when the investigator:

- checks after every run;
- stops a subset when its lower bound clears the threshold;
- allocates the next run based on all past observed data;
- selects the minimum certified witness at any data-dependent time.

The coverage statement is possible because it was made simultaneously over all registered subset/time pairs before outcomes were observed.

## What is not covered

The guarantee does not survive silent changes to:

- target conclusion;
- robustness threshold;
- protocol schema or subset family;
- model or evaluator version;
- failure and retry policy;
- data inclusion rule;
- meaning of a reproduction success.

It also does not solve uncertainty in benchmark selection, historical publication validity, or omitted protocol dimensions.

## Conservatism

The `1/(t(t+1))` allocation is intentionally simple and can be very conservative. The lower bound pays for:

- every subset;
- every possible monitoring time;
- a distribution-free bounded-observation inequality.

Sharper confidence sequences based on betting martingales or mixture likelihood ratios may improve power, but they require a separate derivation, implementation validation, and clear model assumptions. This first method prioritizes transparent validity over aggressive certification.

## Count-based input

The implementation accepts only `successes` and `trials` for each subset. Raw Boolean sequences are not required for the bound, reducing memory from the number of runs to the number of protocol subsets.

Study archives should still preserve run-level evidence when auditability or dependence diagnostics require it.

## Implementation

- `src/research/anytimeRobustWitness.ts`
- `src/research/countRobustWitness.ts`
- `tests/research/anytimeRobustWitness.test.ts`
- `tests/research/countRobustWitness.test.ts`

Tests cover zero-observation starts, strong all-tie certification, fixed-time versus time-uniform conservatism, all-success evidence accumulation, input-order invariance, complete-family enforcement, and malformed counts.

## Scientific claim boundary

The method supports this conditional statement:

> For a fixed finite family and target under the declared stable i.i.d. Bernoulli repetition model, the reported lower bounds are simultaneously valid over all subsets and all monitoring times at the declared familywise error level.

It does not establish that real evaluation runs satisfy those assumptions. That requires a preregistered empirical study and diagnostics for drift, dependence, retries, and missing runs.
