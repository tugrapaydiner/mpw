# Contributing to MPW

MPW welcomes corrections, new reconciliation fixtures, external adapters, statistical methods, verifier improvements, and browser-agent evaluations. Contributions are reviewed primarily for scientific integrity and reproducibility, not code volume.

## Before changing code

Read:

- `docs/MASTER_EXECUTION_CONTRACT.md`
- `docs/RESEARCH_FORMALIZATION.md`
- `docs/CLAIM_EVIDENCE_MATRIX.md`
- `docs/THREATS_TO_VALIDITY.md`
- `docs/SECURITY_MODEL.md`

A change that violates the claim boundary is not accepted merely because its tests pass.

## Development setup

```bash
git clone https://github.com/tugrapaydiner/mpw.git
cd mpw
npm ci
npm run verify
```

Use Node.js 20 or later. The research CI currently executes on Node.js 22.

## Required contribution evidence

### Scientific engine changes

Provide:

- the estimand or formal property affected;
- assumptions;
- failure states;
- targeted tests;
- at least one independent oracle, property test, known value, or mutation that could falsify the implementation;
- documentation of any changed claim.

### Search algorithms

State whether the algorithm is:

- exact or heuristic;
- minimum-proof complete;
- co-minimum complete;
- full-landscape exhaustive;
- dependent on monotonicity or another structural assumption;
- budget limited.

A heuristic may propose candidates but must not emit a global certificate without exact coverage sufficient for that claim.

### Statistical methods

State:

- sampling unit;
- target estimand;
- pointwise or simultaneous scope;
- selection procedure;
- stopping rule;
- missing/failure handling;
- finite-sample or asymptotic guarantee;
- known limitations.

Include known-value or coverage tests where feasible. Do not replace an interpretable method with a more complicated one without showing what scientific question improves.

### External cases

Follow `docs/EXTERNAL_CASE_SELECTION_PROTOCOL.md`. Include source identities, transformations, licenses/usage basis, exclusions, and negative outcomes. Do not choose a categorical rule or protocol schema after seeing which one produces the preferred witness.

### WebMCP or agent claims

Mocked handlers prove contracts only. Claims about discovery, completion, efficiency, or safety require executed trials under `docs/AGENT_EVALS.md` with complete traces and exact application/model/browser revisions.

### Portable artifacts

Update runtime validators, JSON Schema, examples, migration notes, and tamper tests together. Hashes prove content identity, not authenticity or truth.

## Tests

Run before submitting:

```bash
npm run verify
```

For research-facing changes, also run the relevant benchmark, family analysis, certificate replay, or reproduction driver. Record exact commands and revision.

Tests should fail for a meaningful bug. Prefer:

- properties over restating implementation;
- independent oracles over self-comparison;
- alternate landscapes over one canonical answer;
- hostile and malformed inputs;
- deterministic seeds with documented scope;
- exact comparisons for canonical bytes and identities;
- tolerant numerical comparisons only when mathematically justified.

Do not weaken a failing scientific test solely to obtain green CI. Explain and justify any changed threshold.

## Code guidelines

- Keep the generic research core independent of React and WebMCP.
- Keep simulator-specific coordinate behavior outside generic protocol/search modules.
- Validate all external boundaries.
- Avoid hidden mutable scientific state.
- Do not use `Math.random`, wall-clock values, or locale-dependent ordering inside deterministic identities.
- Avoid `any`; explain unavoidable unsafe casts.
- Keep result objects structured and versioned.
- Bound work before iterating over attacker-controlled arrays.
- Add complexity only when it improves correctness, falsifiability, portability, security, reproducibility, or measured workflow quality.

## Documentation and claims

Use exact evidence labels:

- VERIFIED BY EXECUTION
- VERIFIED BY SOURCE INSPECTION
- NOT YET VERIFIED

Do not use “first,” “caused,” “proved the lab wrong,” “universal winner,” “publication-grade,” or equivalent language without evidence specifically supporting that statement.

Update `docs/CLAIM_EVIDENCE_MATRIX.md` when a public claim changes.

## Commit structure

Prefer coherent green milestones. Commit messages should state the scientific or engineering purpose, for example:

```text
fix: bind certificates to reconciliation direction
research: add exact search lower-bound oracle
test: model-check non-monotone witness recovery
docs: narrow external-grid interpretation
```

Do not force-push shared research branches or rewrite evidence history to hide failed attempts.

## Review checklist

A reviewer should be able to answer:

1. What claim or risk does this change address?
2. What assumption was introduced?
3. What would make the result fail?
4. Does the test exercise that failure?
5. Is the result exact, approximate, or heuristic?
6. Is uncertainty pointwise, simultaneous, or absent?
7. Does the artifact bind all relevant identities?
8. Are negative results preserved?
9. Can another person reproduce the change?
10. Did documentation become more accurate rather than more promotional?
