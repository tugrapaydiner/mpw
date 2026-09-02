# uncertainty (pinned)

method: category-stratified paired bootstrap on Delta = acc(MODEL_A) - acc(MODEL_B)
replicates: 10000
PRNG: mulberry32, per-replicate seed = hash(`mpw-boot-v1|<r>`)
per replicate: per stratum, sample len(group) with replacement, keep a/b pairing, mean over 400
interval: 95% percentile, sorted means, low = idx floor(0.025*N), high = idx ceil(0.975*N)-1
rule: MODEL_A iff ciLow > 0, MODEL_B iff ciHigh < 0, else INCONCLUSIVE
never from point estimate. full precision inside, round only for display.
units: accuracies in percent, differences in percentage points (pp).

scope: CI covers resampling items with fixed category mix only.
not covered: inference repeats, training, deployment, future benchmarks, general capability.
must repeat this limit in README, docs, and the certificate.
