# Open Research Questions

The questions below are ranked for the current MPW system, after establishing the generic finite formalization, black-box exact-search lower bounds, static-grid interoperability, simultaneous fixed-item analysis, and repeated-run robust-witness methods.

Scores use 1–10 scales:

- **Importance:** value to trustworthy evaluation reconciliation;
- **Novelty potential:** chance that a strong answer contributes more than routine engineering;
- **Tractability:** chance of meaningful progress with available methods and realistic data.

A high novelty score is not a novelty claim.

## Ranked agenda

| Rank | Question | Importance | Novelty potential | Tractability |
|---:|---|---:|---:|---:|
| 1 | How should uncertainty be quantified after adaptive protocol experimentation and minimum-witness selection? | 10 | 9 | 5 |
| 2 | What is a useful robust-witness definition when both hybrid and target endpoint conclusions vary across repeated runs? | 10 | 8 | 6 |
| 3 | Which verifiable structural assumptions permit sound exact-search pruning in real non-monotone protocol landscapes? | 9 | 9 | 5 |
| 4 | How should protocol schemas be aligned when publications expose different, nested, or semantically ambiguous coordinates? | 9 | 8 | 6 |
| 5 | Under what designs can descriptive protocol sufficiency support causal responsibility claims? | 10 | 8 | 4 |
| 6 | How can independently operated publishers support federated reconciliation with authenticity, privacy, and replay? | 9 | 8 | 5 |
| 7 | What is the real-world distribution of witness size, multiplicity, asymmetry, and no-witness outcomes? | 9 | 7 | 7 |
| 8 | Do semantic WebMCP operations improve scientific agent reliability over DOM-only investigation? | 8 | 7 | 8 |
| 9 | How should adversarial, strategically incomplete, or mutually inconsistent publishers be handled? | 9 | 8 | 5 |
| 10 | What objective should replace cardinality when protocol changes differ greatly in cost, scope, or semantic granularity? | 8 | 6 | 8 |

## 1. Post-selection inference after adaptive experimentation

### Problem

The finite simultaneous bootstrap handles a predeclared configuration family. Real investigators and agents often choose the next hybrid after seeing earlier outcomes, stop early when a promising witness appears, and may revise the protocol schema.

The selected witness is therefore affected by:

- family search;
- adaptive experiment choice;
- optional stopping;
- target or threshold choice;
- schema revision;
- benchmark and model selection.

### Research target

Develop confidence sets or error guarantees for witness membership, minimum cardinality, or target reproduction under an explicit adaptive design.

Possible directions include always-valid confidence sequences, selective inference, closed testing, e-values, or sample splitting between proposal and verification.

### Falsifiable milestone

A method should control a predeclared error event in simulation over non-monotone landscapes and retain useful power relative to full-family Bonferroni analysis.

## 2. Robust witnesses with stochastic targets

### Problem

The current robust methods assume a fixed target conclusion and estimate the probability that each hybrid reproduces it. In repeated real evaluations, the target endpoint itself can move between `MODEL_A`, `MODEL_B`, and `INCONCLUSIVE`.

### Research target

Define and compare at least three estimands:

1. probability of matching a fixed publication conclusion;
2. probability of matching the target endpoint in the same paired run environment;
3. probability that hybrid and target effects are equivalent within a registered tolerance.

The paired-run version may better account for shared run-level shocks, but its scientific interpretation differs from reproducing a historical publication claim.

### Falsifiable milestone

Construct repeated-run data where the definitions yield different minimum witnesses and show which decision problem each one solves.

## 3. Sound exact pruning under verifiable structure

### What is already resolved

Under an arbitrary black-box non-monotone Boolean sufficiency map:

- proving no witness can require all `2^n` queries;
- proving minimum cardinality `k` and every co-minimum witness can require all subsets through cardinality `k`.

A universally faster exact algorithm is therefore impossible without additional information.

### Open problem

Which structures occur in actual evaluation-protocol landscapes and can be validated cheaply enough to support sound pruning?

Candidates include:

- monotone regions with certified boundaries;
- sparse low-order interactions;
- decomposable coordinate blocks;
- Lipschitz effect maps with conclusion margins;
- admissible surrogate lower bounds;
- counterexample-guided SAT/SMT encodings;
- partial orders over protocol capability.

### Falsifiable milestone

Define a nontrivial landscape class, prove an exact query reduction for that class, test a validator that rejects violations, and measure prevalence on frozen real grids.

## 4. Heterogeneous protocol-schema alignment

### Problem

Two reports rarely expose identical coordinate names and value domains. One may report “agent scaffold,” another separately reports prompt template, retry controller, tool policy, and parser.

Alignment can create or destroy apparent minimum witnesses.

### Research target

Develop versioned mappings with:

- one-to-one, one-to-many, and partially observed coordinates;
- semantic uncertainty;
- explicit lossy transformations;
- incompatible-value states;
- sensitivity over alternative defensible alignments.

### Falsifiable milestone

A blinded pair of curators should independently align a real dispute; the system should quantify how alignment disagreement changes the witness set.

## 5. From counterfactual sufficiency to causal responsibility

### Problem

Protocol substitution inside an evaluator shows what the evaluator would output under a controlled configuration. It does not by itself show why two historical reports differed, especially when implementation versions, populations, and hidden variables differ.

### Research target

State conditions under which a protocol witness supports a causal claim, possibly using structural causal models, randomized protocol interventions, mediator definitions, and transport assumptions.

### Falsifiable milestone

Create synthetic causal worlds with identical observed endpoint grids but different true causal responsibility, demonstrating which additional interventions distinguish them.

## 6. Federated reconciliation

### Problem

Independent publishers may be unable or unwilling to release raw item outcomes. A central MPW service should not automatically receive their credentials, private data, or arbitrary evaluator code.

### Research target

Design a federated protocol in which sites expose bounded scientific operations and return attestable evidence while preserving:

- publisher and evaluator identity;
- version pinning;
- request authorization and compute budgets;
- private item data;
- failure and availability semantics;
- reproducible certificates;
- resistance to selective response.

### Falsifiable milestone

Two independently deployed sites should complete a reconciliation whose final certificate can be checked without trusting the coordinating agent.

## 7. Empirical distribution of reconciliation landscapes

### Problem

The project does not yet know whether real disputes usually have singleton witnesses, high-order interactions, multiple ties, direction asymmetry, or no exposed witness.

### Research target

Run a preregistered external case series under `EXTERNAL_CASE_SELECTION_PROTOCOL.md` and publish the complete denominator.

### Required outcomes

Report witness size, tie count, effect restoration, pointwise/simultaneous/robust disagreement, no-witness rate, invalid-source rate, runtime, and exclusions.

The existing five-candidate external grid study is a transfer test, not a prevalence sample.

## 8. WebMCP versus DOM-only investigation

### Problem

Semantic tools are intuitively attractive, but the project has not shown that they improve real agent behavior.

### Research target

Execute the paired evaluation in `AGENT_EVALS.md` across multiple agents, disputes, and prompt families.

### Primary outcomes

Exact scientific completion, certificate agreement, invalid-action rate, recovery, overclaim, evaluated configurations, browser actions, and duration.

### Falsifiable milestone

WebMCP should show a registered practically important improvement or the project should narrow its interface claim.

## 9. Adversarial publishers

### Problem

A publisher can provide internally consistent but selectively incomplete evidence, redefine coordinates strategically, serve different results to different callers, or sign a misleading package.

### Research target

Study:

- completeness proofs;
- transparency logs;
- challenge protocols;
- cross-publisher consistency checks;
- selective-response detection;
- adversarial schema construction;
- authentication versus truth.

### Falsifiable milestone

Build an adversarial publisher benchmark and measure which attacks evade content-integrity, static-grid, replay, and federated checks.

## 10. Beyond cardinality

### Problem

Changing a parser flag and replacing an entire scaffold each count as one coordinate under cardinality. Coordinate granularity can therefore dominate the result.

### Research target

Compare:

- minimum cardinality;
- minimum declared cost;
- Pareto fronts over cost and target-effect distance;
- robust minimum cost;
- group or hierarchy-aware objectives.

### Guardrail

Weights and coordinate groups must be registered before examining the witness. An objective chosen after seeing results is another specification search.

## Recommended next study sequence

1. Freeze an external case frame and protocol-alignment review process.
2. Collect repeated, paired endpoint and hybrid runs for a small tractable family.
3. Compare fixed-target, paired-target, and effect-equivalence robust witnesses.
4. Separate proposal data from exact verification data.
5. Run WebMCP-versus-DOM agent trials on the same frozen disputes.
6. Use resulting landscapes to test candidate structure-aware search assumptions.
7. Invite an independent reproduction before making prevalence or workflow-efficiency claims.

The next score increase will come primarily from executed external evidence, not additional synthetic feature count.
