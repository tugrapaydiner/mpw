# Claim–Evidence Matrix

This matrix is the authoritative high-level ledger for public and research claims. A claim must not be strengthened merely because related code or documentation exists.

## Status vocabulary

- **VERIFIED BY EXECUTION:** the relevant command, workflow, or experiment ran at an identified revision and its output was inspected.
- **VERIFIED BY SOURCE INSPECTION:** the implementation or artifact was traced, but execution evidence for the stated context is absent or incomplete.
- **NOT YET VERIFIED:** the available evidence does not establish the claim.
- **NOT CLAIMED:** the project explicitly declines the statement.

## Scientific core

| Claim | Status | Evidence | Boundary |
|---|---|---|---|
| Protocol substitution changes exactly the selected exposed coordinates | VERIFIED BY EXECUTION | protocol property tests and reconciliation benchmark | Finite declared schema only |
| Exact search returns the global minimum cardinality | VERIFIED BY EXECUTION | known-ground-truth benchmark, exhaustive three-coordinate model check | Arbitrary finite black-box sufficiency within evaluation budget |
| Exact search returns every co-minimum witness | VERIFIED BY EXECUTION | exhaustive landscape model check and benchmark ties | Requires completion of the winning cardinality |
| Minimum proof and full-landscape exhaustiveness are distinct | VERIFIED BY EXECUTION | search proof-field tests | Terminological and implementation guarantee |
| Search is sound without assuming monotonicity | VERIFIED BY EXECUTION | non-monotone benchmark cases and exhaustive Boolean landscapes | Worst-case work remains combinatorial |
| A no-witness certificate may require all `2^n` subset queries | VERIFIED BY EXECUTION | formula tests and proof in exact-search lower-bound note | Arbitrary black-box non-monotone model |
| Cardinality-ordered minimum search meets the black-box query lower bound through the first sufficient level | VERIFIED BY EXECUTION | executable tight-bound demonstrations | Query count, not model-evaluation wall time |
| MPW identifies causal responsibility | NOT CLAIMED | formalization and limitations | Requires a separate causal design |

## Canonical fixture

| Claim | Status | Evidence | Boundary |
|---|---|---|---|
| Canonical item outcomes are synthetic and deterministic | VERIFIED BY SOURCE INSPECTION and execution tests | simulator code, pinned seeds, deterministic tests | Not evidence about real models |
| Both source declarations reproduce under their own protocols | VERIFIED BY EXECUTION | publication integrity and certificate replay tests | Canonical bundled evaluator only |
| The canonical A-to-B minimum witness is `reasoning_budget` | VERIFIED BY EXECUTION | complete 16-world replay and independent certificate oracle | Conditional on canonical fixture, evaluator, statistics, and categorical rule |
| The canonical result is robust across repeated real model runs | NOT YET VERIFIED | no real repeated-run dataset | Robust methodology exists but is not evidence for this fixture |
| The canonical model ranking generalizes to real systems | NOT CLAIMED | synthetic disclosure | No real-model interpretation |

## Statistical claims

| Claim | Status | Evidence | Boundary |
|---|---|---|---|
| Pointwise paired bootstrap preserves item pairing and stratum counts | VERIFIED BY EXECUTION | bootstrap and family-compatibility tests | Fixed observed benchmark items |
| Pointwise intervals are not post-selection guarantees | VERIFIED BY SOURCE INSPECTION | statistical derivation and methods review | General statistical limitation |
| Synchronized max-deviation bootstrap produces a simultaneous band for the predeclared finite family | VERIFIED BY EXECUTION | family analysis tests | Bootstrap approximation under item-resampling model |
| Exact conditional McNemar/binomial diagnostics are calculated from discordant pairs | VERIFIED BY EXECUTION | known-value tests | Paired marginal-equality diagnostic only |
| Hoeffding robust witnesses have simultaneous familywise lower-bound semantics | VERIFIED BY EXECUTION | formula tests and deterministic Monte Carlo diagnostics | Requires predeclared family and within-subset i.i.d. Bernoulli trials |
| Clopper–Pearson robust witnesses provide exact fixed-trial binomial lower bounds with Bonferroni family control | VERIFIED BY EXECUTION | beta/binomial inversion and robust-witness tests | Exact under fixed-trial binomial model; numerical inversion tolerance applies |
| Real evaluation repetitions satisfy the robust-witness assumptions | NOT YET VERIFIED | no preregistered repeated real-model study | Must be evaluated per study |
| MPW solves all uncertainty from benchmark and protocol selection | NOT CLAIMED | limitations | Target, benchmark, schema, and omitted-coordinate uncertainty remain |

## External applicability

| Claim | Status | Evidence | Boundary |
|---|---|---|---|
| A published external harness grid can be represented as a finite reconciliation landscape | VERIFIED BY EXECUTION | external Fragility Grid workflow | Recorded grid rows only |
| Five frozen external candidates had globally minimum cardinality-two categorical witnesses | VERIFIED BY EXECUTION | workflow run `33814044740`, job `100842076421`, artifact `9916109342` | Five selected candidates under declared categorical rule |
| Those five cases were strict interaction-only reversals | VERIFIED FALSE | zero of five passed the stricter singleton-invariance criterion | Negative result retained |
| The five cases are representative of evaluation disputes generally | NOT YET VERIFIED | no preregistered representative case frame | No prevalence estimate |
| An independent third party reproduced the external study | NOT YET VERIFIED | no external report | GitHub execution is not third-party reproduction |

## Portability and certificates

| Claim | Status | Evidence | Boundary |
|---|---|---|---|
| Static grid packages require every endpoint-substitution world exactly once | VERIFIED BY EXECUTION | missing, duplicate, out-of-cube, and exhaustive model-check tests | At most the declared implementation limit |
| Static packages are order-invariant under canonical normalization | VERIFIED BY EXECUTION | world-order tests | Semantically unordered world collection only |
| Static package hashes establish content identity | VERIFIED BY EXECUTION | canonicalization/hash tests | Relative to a known digest; not authenticity or truth |
| Certificate v2 binds direction and selected candidate | VERIFIED BY EXECUTION | forward/reverse and non-minimum tests | Canonical replay adapter and generic certificate builder |
| Certificate content-integrity validation detects un-rehashed changes | VERIFIED BY EXECUTION | tamper tests | An attacker can create a different identity by rehashing |
| Scientific replay detects rehashed scientific changes | VERIFIED BY EXECUTION | source, audit, publication, and evaluator replay tests | Requires an independently trusted evaluator and publication identities |
| The reference oracle independently recomputes finite proof semantics | VERIFIED BY EXECUTION | reference-oracle adversarial tests | Shares runtime/schema/canonicalization; not independent-language reproduction |
| Certificates authenticate publishers | NOT CLAIMED | trust model | Signatures/attestations are not implemented |

## WebMCP and agents

| Claim | Status | Evidence | Boundary |
|---|---|---|---|
| UI and WebMCP handlers delegate to shared application services | VERIFIED BY EXECUTION | HUMAN/AGENT equivalence tests | Same repository build |
| Tool arguments reject unknown and malformed protocol values | VERIFIED BY EXECUTION | schema and handler adversarial tests | Current tool surface |
| Source strings remain data rather than deterministic engine instructions | VERIFIED BY SOURCE INSPECTION and tests | structured result path and injection batteries | Does not prove probabilistic agent resistance |
| WebMCP improves agent completion versus DOM-only use | NOT YET VERIFIED | evaluation protocol exists; no live comparative trial | Requires controlled W-versus-D study |
| Supported production agents reliably discover and chain the tools | NOT YET VERIFIED | no current live-agent trial matrix | Mock registration is insufficient |
| Research branch works in every supported production browser | NOT YET VERIFIED | no cross-browser live matrix | Browser/API versions can change |

## Product and reproducibility

| Claim | Status | Evidence | Boundary |
|---|---|---|---|
| A clean clone can execute the deterministic repository gate | VERIFIED BY EXECUTION when tied to a recorded clean-clone report | reproduction driver and CI workflows | Must name exact revision/environment |
| Generated benchmark, family analysis, and certificate artifacts are content-addressable | VERIFIED BY EXECUTION | reproduction report hashes | Matching bytes, not scientific truth |
| The project is independently reproducible by an outside team | NOT YET VERIFIED | no third-party reproduction | Current tests remain author-controlled |
| MPW reduces real evaluation-reconciliation time | NOT YET VERIFIED | no controlled user or agent study | Product hypothesis |
| MPW is publication-grade | NOT YET VERIFIED | real repeated cases and independent validation missing | Current label: serious research prototype |

## Update rule

When new evidence arrives:

1. identify the exact claim;
2. record revision, command/study, input identity, and result;
3. update the narrowest supported row;
4. preserve contradictory or negative evidence;
5. do not promote adjacent claims automatically;
6. keep superseded evidence accessible.

A green test suite can upgrade an implementation claim. It cannot, by itself, upgrade an empirical claim about real agents, real models, users, causality, or external generalization.
