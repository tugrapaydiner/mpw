# Statistical Methods and Claim Boundary

## 1. Estimand

For each benchmark item `i`, let `A_i` and `B_i` be paired binary correctness indicators for the two evaluated models under one protocol configuration. The reported effect is

\[
\widehat\Delta = \frac{1}{n}\sum_i (A_i-B_i),
\]

so positive values favor `MODEL_A` and negative values favor `MODEL_B`.

Pairing is essential: both model outcomes must refer to the same item identity, and each item must retain its declared benchmark stratum.

## 2. Fixed-configuration item bootstrap

The original engine uses a category-stratified paired nonparametric bootstrap:

1. split paired item outcomes by declared category;
2. within each category, sample the same number of paired items with replacement;
3. carry `A_i` and `B_i` together;
4. compute `Delta` for each replicate;
5. use the declared empirical percentile ranks for a 95% interval.

This answers a limited question: how sensitive is the observed paired accuracy difference to resampling the finite item composition while preserving category counts?

It does **not** incorporate:

- repeated stochastic model executions;
- training-seed or checkpoint variation;
- grader/model-judge variation unless represented at item level;
- benchmark-distribution drift;
- uncertainty about the protocol schema;
- uncertainty about omitted protocol coordinates.

The repository therefore calls this **fixed-benchmark item-resampling sensitivity**, not universal capability uncertainty.

## 3. Exact discordant-pair diagnostic

For each protocol, MPW also reports:

- both correct;
- both wrong;
- A-only correct;
- B-only correct;
- total discordant pairs;
- the exact conditional two-sided McNemar/binomial p-value under equal probability for the two discordant directions.

The p-value is

\[
\min\left(1,\;2\Pr\{X\le \min(n_{10},n_{01})\}\right),
\qquad X\sim\operatorname{Binomial}(n_{10}+n_{01}, 1/2).
\]

The probability definition is exact; the implementation evaluates the binomial tail in log space to avoid combinatorial overflow.

This diagnostic is complementary. It tests a paired marginal-equality null; it does not replace the effect estimate or its interval, and it does not solve protocol-search multiplicity.

## 4. Why pointwise intervals are insufficient after witness search

The canonical family contains 16 protocol configurations. Selecting the smallest subset whose individual 95% interval produces the target label is a data-dependent selection across that family. Individual 95% coverage for each fixed configuration does not imply 95% simultaneous coverage and does not become a 95% guarantee for the selected witness.

The deterministic MPW remains exactly defined for the fixed artifact and declared conclusion rule. The correction is about inferential interpretation: the project must not call the selected result “95% confident” merely because every row carries a pointwise 95% interval.

## 5. Synchronized simultaneous bootstrap

For the predeclared finite family, the research analysis adds a maximum-deviation bootstrap band:

1. validate that every configuration contains exactly the same item IDs and strata;
2. generate one stratified resample plan per replicate;
3. apply that same plan to every protocol configuration, preserving cross-configuration dependence;
4. compute each bootstrap effect `Delta*_j`;
5. record `M* = max_j |Delta*_j - Delta_j|`;
6. take the empirical 95th percentile `c` of `M*`;
7. report simultaneous intervals `[Delta_j-c, Delta_j+c]` for all predeclared configurations.

The repository names this procedure:

`synchronized-stratified-max-absolute-deviation-bootstrap`

and stores its seed, replicate count, PRNG identity, critical value, family members, and limitations in a machine-readable report.

The family analysis also recomputes the original pointwise interval for every world and requires an exact match before reporting the simultaneous result. This is a compatibility invariant, not an assumption.

## 6. Conclusion rule

For either a pointwise or simultaneous interval:

- lower bound greater than zero -> `MODEL_A`;
- upper bound less than zero -> `MODEL_B`;
- otherwise -> `INCONCLUSIVE`.

The witness search is rerun separately under the pointwise and simultaneous labels. The two results are not forced to agree.

## 7. Interpretation of simultaneous results

The max-deviation band is a nonparametric bootstrap approximation to simultaneous coverage over the **declared finite family**. It is stronger than independently reading 16 pointwise intervals, but it is not a finite-sample exact confidence set and it inherits the resampling-model limitations above.

Adding another protocol configuration after inspecting results changes the family and requires recomputation. Using the band for an unregistered family is invalid.

## 8. Effect restoration

Categorical reconciliation can hide magnitude differences. For a candidate `S`, the report also computes

\[
d_\Delta(S)=|\widehat\Delta(S)-\widehat\Delta_{target}|
\]

and, when the source gap is nonzero,

\[
r_\Delta(S)=1-\frac{d_\Delta(S)}{|\widehat\Delta_{base}-\widehat\Delta_{target}|}.
\]

The raw distance is primary. The restoration fraction is not clipped; values outside `[0,1]` can reveal overshoot or movement away from the target.

## 9. Reproducibility contract

The canonical family report records:

- all 16 protocol configurations;
- all paired point estimates;
- pointwise and simultaneous intervals;
- exact discordant-pair diagnostics overall and by stratum;
- the synchronized-bootstrap seed and replicate count;
- the familywise critical value;
- both A-to-B and B-to-A exact witness searches;
- proof completeness and evaluated-subset counts.

Generate it with:

```bash
npm run statistics:family:write
```

The intended output is `data/analysis/canonical-family-inference.json`.

## 10. Methods considered but not adopted as defaults

- **Unstratified bootstrap:** discards the canonical category-count design.
- **Independent bootstrap per protocol for simultaneous claims:** loses joint dependence across common items.
- **Confidence-interval overlap as effect equivalence:** interval overlap is not an equivalence test.
- **McNemar p-value as the sole decision rule:** hides effect magnitude and still requires multiplicity handling across the family.
- **A hierarchical Bayesian model:** potentially valuable for repeated stochastic runs and benchmark strata, but the canonical artifact does not contain the repeated-run structure needed to identify that model honestly.
- **Bonferroni-only intervals:** simple and valid under broad conditions but ignores dependence and is needlessly conservative for this synchronized finite family.
- **Post-hoc family definition:** invalidates the intended familywise interpretation.

## 11. References informing the correction

The design is informed by specification-curve/multiverse work on joint inference and by resampling-based familywise procedures, especially Simonsohn, Simmons, and Nelson (2020), Romano and Wolf (2005), and Westfall (2011). These methods motivate the correction; MPW does not claim to invent simultaneous resampling inference.
