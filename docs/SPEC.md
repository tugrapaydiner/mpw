# MPW Research System Specification

## 1. Purpose

MPW studies how differing evaluation protocols can produce incompatible conclusions for the same compared systems. It represents protocol differences explicitly, evaluates or consumes controlled hybrid configurations, and verifies globally minimum exposed substitutions sufficient to reproduce a target conclusion.

The system is a reconciliation instrument. It does not decide which publication is true, which model is universally superior, or which protocol coordinate caused the historical disagreement.

## 2. Core objects

### Protocol schema

A protocol schema is a finite ordered set of named coordinates. Each coordinate declares a non-empty finite set of JSON-scalar values and may include a description or non-negative cost.

The generic core supports categorical, Boolean, numeric, and null scalar values. Simulator-specific semantics do not belong in the substitution or search layer.

### Publication endpoint

A publication endpoint contains:

- an identity and content hash;
- a protocol satisfying the schema;
- a declared structured observation;
- enough evidence or an evaluator to validate the declaration at the claimed verification level.

### Observation

An observation contains a non-empty categorical conclusion and may include a finite effect, evidence identity, and finite JSON-scalar metadata.

### Direction

Reconciliation is directional:

- `A_TO_B`: start at publication A and substitute values from B;
- `B_TO_A`: start at publication B and substitute values from A.

The two results may differ.

## 3. Witness definition

Let `H` be the protocol coordinates on which two source endpoints differ. For `S ⊆ H`, the hybrid protocol starts from the chosen base and substitutes exactly the source values on `S`.

A categorical witness is sufficient when the hybrid conclusion equals the target endpoint conclusion.

The primary exact objective minimizes cardinality and returns every co-minimum witness. The empty set is legal. If no exposed subset is sufficient, the result is `NO_WITNESS` rather than a fabricated explanation.

Categorical equality does not imply target-effect equality. Effect distance, restoration, nuisance movement, and interactions are diagnostics rather than hidden changes to the primary objective.

## 4. Search guarantees

The engine supports:

- **minimum mode:** completes every subset through the first sufficient cardinality;
- **landscape mode:** evaluates the complete endpoint-substitution powerset.

Proof fields distinguish minimum proof, co-minimum completeness, and full-landscape exhaustiveness.

No monotonicity assumption is made by default. Exact black-box search is combinatorial in the worst case; budget-limited or approximate procedures must not claim a global proof they did not perform.

## 5. Statistical modes

The project keeps distinct:

1. deterministic conclusions for a fixed artifact;
2. pointwise item-resampling intervals for one fixed protocol;
3. simultaneous intervals over a predeclared finite configuration family;
4. robust target-reproduction inference from repeated stochastic runs.

The canonical paired bootstrap resamples paired model outcomes within declared benchmark strata. It does not represent repeated model-run or training uncertainty.

The robust-witness method uses a predeclared threshold and familywise Bonferroni-Hoeffding lower bounds. It applies only when repeated-run assumptions and complete-family evidence are supplied.

## 6. Input modes

### Canonical executable fixture

The tutorial adapter contains two synthetic model profiles, 400 synthetic items in four strata, and four protocol coordinates. It exists for deterministic verification and does not make claims about real systems.

### Static protocol grid

A `StaticProtocolGridPackage` carries the complete endpoint-substitution cube from an external evaluation grid. It supports exact descriptive reconciliation without importing the canonical simulator.

Static package verification establishes schema, cube completeness, endpoint agreement, and content identity. It does not authenticate the publisher or replay underlying model executions.

### Executable and federated packages

A general executable publication package and federated reconciliation between independent sites remain research directions. They require stronger evaluator identity, availability, authentication, failure, versioning, and adversarial-publisher rules.

## 7. Certificates

A certificate must bind:

- schema and objective;
- direction;
- publication identities and endpoints;
- evaluator identity where replay is claimed;
- exposed and omitted differences;
- selected candidate;
- all minimum witnesses;
- proof completeness;
- audit observations;
- limitations;
- canonicalization and hash identity.

Content-integrity verification and scientific replay verification are separate statuses.

## 8. Human and agent interfaces

Human UI and WebMCP tools delegate to the same application services. The agent selects operations but does not calculate scientific outputs.

The semantic workflow is:

```text
inspect publications
  -> inspect protocol space
  -> run or read controlled experiments
  -> inspect evidence
  -> verify candidate/global minimum
  -> export and replay certificate
```

Tool descriptions expose capabilities, not expected answers. Source-controlled strings remain untrusted data.

## 9. Security

All external inputs are schema validated, size bounded where work can grow, and treated as data. Unknown properties and duplicate coordinates are rejected. The UI must not render untrusted HTML. Mutable browser state must not determine scientific identities.

A package hash is not an authentication mechanism. Signatures and attestations, if added, must be layered separately.

## 10. Evidence and claim boundaries

Allowed claims are limited to the exact executed or inspected evidence. In particular:

- synthetic results remain synthetic;
- static-grid results remain conditional on recorded rows;
- statistical guarantees state their sampling assumptions and family scope;
- live-agent and production-browser performance remain unverified until executed;
- external negative results are retained.

The authoritative detailed formulation is `docs/RESEARCH_FORMALIZATION.md`. Research context and unresolved questions are in `docs/RESEARCH_LANDSCAPE.md` and `docs/OPEN_RESEARCH_QUESTIONS.md`.
