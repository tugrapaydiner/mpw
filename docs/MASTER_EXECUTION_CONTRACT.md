# Project Invariants

The historical filename is retained so existing links do not break. This document is no longer a numbered-prompt stop contract. It records the invariants that all research and engineering changes must preserve.

## Scientific integrity

1. The agent may choose experiments, but deterministic code computes statistics, conclusions, witness minimality, and certificate identities.
2. A protocol witness is descriptive and conditional on the declared protocol space, evidence, evaluator, estimand, uncertainty method, and conclusion rule.
3. Do not label a witness causal without a separate causal design and justified assumptions.
4. Return all globally co-minimum witnesses whenever global minimum cardinality is claimed.
5. `INCONCLUSIVE`, empty witness, no witness, incomplete search, invalid evidence, and verifier failure are distinct states.
6. Never infer monotonicity from convenience. A solver may exploit structure only when that structure is declared and validated.
7. Pointwise uncertainty for one configuration is not a post-selection guarantee for a searched family.
8. Negative, null, and criterion-failing results remain in the evidence record.

## Evidence language

Every material result must be labeled as one of:

- **VERIFIED BY EXECUTION** — the command, workflow, browser action, or experiment actually ran and its result was inspected;
- **VERIFIED BY SOURCE INSPECTION** — the implementation or artifact was traced, but the behavior was not independently executed in that context;
- **NOT YET VERIFIED** — available evidence does not establish the claim.

Content hashes prove content identity relative to a known digest. They do not establish publisher identity, truth, causal validity, or scientific quality.

## Git safety

- `main` is not modified by research-branch work.
- No force pushes or history rewrites.
- Milestones are committed only on coherent states.
- The branch must not be knowingly left broken.
- Generated evidence records must identify the source revision and execution context.

## Architecture

The scientific core remains independent of React and WebMCP:

```text
publication/package input
  -> finite protocol schema
  -> controlled substitution
  -> evaluator or recorded grid
  -> statistical analysis
  -> exact reconciliation search
  -> diagnostics
  -> portable certificate/verifier
```

Human UI and WebMCP handlers use shared application services. Neither interface duplicates scientific logic.

The canonical four-coordinate synthetic simulator is an adapter and tutorial fixture. It is not the definition of the generic research problem.

## Verification gates

A supported full gate includes, where applicable:

1. type checking;
2. linting;
3. unit, property, adversarial, and integration tests;
4. production build;
5. reconciliation benchmark;
6. generated-artifact drift check;
7. certificate content-integrity and scientific replay verification;
8. clean-clone reproduction.

A green subset is not represented as a green full gate.

Actual browser/WebMCP trials and probabilistic agent evaluations are separate from mocked or deterministic handler tests. Mocks establish contracts, not production compatibility.

## Change policy

Existing work has no preservation privilege. Weak abstractions, misleading terminology, stale documents, and decorative complexity may be removed or replaced.

New complexity must earn its place through at least one of:

- correctness;
- falsifiability;
- broader external applicability;
- stronger uncertainty handling;
- independent verification;
- security;
- reproducibility;
- measured user or agent benefit.

Adding files or features solely to make the project appear larger violates this contract.
