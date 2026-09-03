# Open Research Questions

Ranking uses three 1–5 judgments: **importance**, **novelty opportunity**, and **tractability**. The final priority is a qualitative synthesis, not a fake precision score.

| Rank | Question | Importance | Novelty opportunity | Tractability | Why it matters |
|---:|---|---:|---:|---:|---|
| 1 | How should minimum protocol witnesses be inferred after adaptive search over many stochastic counterfactuals? | 5 | 5 | 3 | Pointwise intervals do not transfer to the selected minimum. A useful method must control error while preserving power and co-minimum discovery. |
| 2 | What exact-search guarantees are possible for non-monotone, noisy sufficiency oracles under an experiment budget? | 5 | 5 | 2 | Arbitrary landscapes require exponential worst-case work; practical systems need honest anytime bounds or exploitable structure. |
| 3 | What benchmark best measures reconciliation quality rather than answer memorization? | 5 | 4 | 4 | A benchmark needs hidden landscapes, co-minimums, unresolved cases, corruption, and distribution shift. |
| 4 | How stable is a witness across benchmark resamples, repeated model runs, graders, and reasonable conclusion thresholds? | 5 | 4 | 4 | A deterministic singleton may be scientifically brittle even when exact for one artifact. |
| 5 | How can two publications reconcile when their protocol schemas differ or contain incomparable coordinates? | 5 | 4 | 3 | Real reports rarely expose the same schema. Alignment errors can dominate the witness result. |
| 6 | When, if ever, can a protocol witness support causal language? | 5 | 4 | 2 | Substitution sufficiency is counterfactual in an executable system, but observational publication differences and omitted dimensions block causal attribution. |
| 7 | How should minimum cardinality, operational cost, scientific plausibility, and reversibility be combined? | 4 | 3 | 4 | A one-coordinate change can be vastly more expensive or less meaningful than a two-coordinate change. |
| 8 | Can federated websites expose enough evidence to verify reconciliation without centralizing proprietary item-level data? | 5 | 5 | 2 | Real evaluations may be private, licensed, or too expensive to rerun. |
| 9 | How should publication identities be authenticated, not merely content-addressed? | 4 | 3 | 4 | Hashes detect change but do not establish who published an artifact or whether it is authorized. |
| 10 | How should adversarial publishers be handled when manifests, tool metadata, or evidence text contain prompt injection? | 5 | 4 | 3 | Browser agents carry cross-site context and may treat scientific text as instructions. |
| 11 | Can active experiment selection reduce average cost while retaining a certificate of exactness? | 4 | 4 | 3 | Heuristics can prioritize useful subsets, but exactness still requires a proof frontier unless structure is known. |
| 12 | How should interactions among categorical protocol coordinates be summarized without implying a causal model? | 4 | 3 | 4 | Pairwise interaction displays can miss higher-order reversals and invite overinterpretation. |
| 13 | Do WebMCP semantic operations measurably improve scientific-agent reliability over DOM-only interaction? | 4 | 4 | 4 | This is the strongest empirical justification for the browser interface and can be tested directly. |
| 14 | How should conclusion reconciliation work when sources report distributions, Pareto fronts, or task-specific rankings rather than one winner? | 4 | 4 | 2 | Real evaluations often resist a single categorical headline. |
| 15 | How can a portable certificate survive engine evolution while preserving replay semantics? | 4 | 3 | 4 | Schema and algorithm versions need migrations, archived implementations, and precise compatibility rules. |

## Near-term research program

### A. Selection-aware finite-family inference

Predeclare a finite protocol family, generate synchronized item-level resamples across all configurations, and construct simultaneous effect intervals using a max-deviation statistic. Compare pointwise, Bonferroni, max-deviation, and Romano-Wolf-style decisions on synthetic landscapes with known effects. Measure familywise false witness rate, power, witness-set coverage, and computational cost.

### B. Noisy non-monotone search

Model each subset evaluation as a stochastic oracle with confidence sequences. Develop an anytime algorithm that maintains lower and upper bounds on the minimum witness cardinality, returns `PROVEN`, `CANDIDATE_ONLY`, or `UNRESOLVED_UNDER_BUDGET`, and never silently upgrades a candidate to an exact result.

### C. Reconciliation benchmark

Generate deterministic and stochastic disputes with unique/co-minimum witnesses, higher-order interactions, no witness, source corruption, missing evidence, redundant coordinates, and non-monotone landscapes. Keep the reconciliation engine blind to ground truth and score exact set recovery plus calibrated abstention.

### D. Real-publication pilot

Define a minimal Evaluation Publication Package containing protocol schema, source configuration, item identities, paired outcomes or a rerun adapter, scoring configuration, engine versions, and content hashes. Convert two public evaluation implementations where licensing permits, then document every schema-alignment judgment.

### E. WebMCP comparative eval

For the same reconciliation tasks, compare agents using: (1) WebMCP only, (2) DOM/accessibility interaction only, and (3) both. Measure discovery, valid-call rate, experiment efficiency, certificate agreement, overclaim rate, latency, and recovery from stale or malformed state.

## Questions this repository cannot answer yet

- Whether protocol witnesses found in synthetic fixtures transfer to real evaluations.
- Whether the browser-agent workflow saves researcher time.
- Whether simultaneous inference retains enough power for practical witness discovery.
- Whether “protocol coordinate” schemas can be standardized across evaluation ecosystems.
- Whether independent publishers will expose sufficient item-level evidence or rerun capability.
