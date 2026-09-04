# Agent and WebMCP Evaluation Protocol

## Current evidence status

The repository has deterministic tests for tool schemas, registration behavior, argument validation, error recovery paths, shared HUMAN/AGENT scientific services, and recorded-trace grading.

Those tests do **not** establish how probabilistic agents behave in supported production browsers. No live-agent success rate should be reported until the trials below are executed and preserved.

## Primary research question

Does access to semantic WebMCP scientific operations improve an agent's ability to reconcile an evaluation dispute compared with access to the same human-visible application through ordinary browser/DOM interaction?

The comparison is about agent reliability and investigation cost. It does not change the deterministic scientific answer.

## Experimental arms

### Arm W — WebMCP semantic tools

The agent can use the registered operations:

- `read_dispute`;
- `run_counterfactual`;
- `inspect_evidence`;
- `verify_witness`.

The human-visible page remains available.

### Arm D — DOM/browser only

The same application, source publications, protocol controls, evidence, and verifier are available, but WebMCP registration is disabled. The agent must navigate the ordinary page.

### Optional Arm T — text-only report

The agent receives the publication reports and protocol descriptions as static text with no executable operations. This arm measures the risk of guessing from prose instead of experimenting.

Arm T is not a substitute for the primary W-versus-D comparison.

## Controls

For a paired comparison, hold fixed:

- agent/model version;
- system instructions except for interface-specific capability disclosure;
- browser version and extension state;
- application revision;
- dispute package;
- timeout and tool-call budget;
- context limit;
- network policy;
- starting browser state;
- scoring code.

Randomize arm order within agent/dispute blocks. Clear investigation state between trials. Preserve complete transcripts and tool/browser traces.

Do not let one arm receive hidden workflow instructions or the expected witness.

## Evaluation corpus

Use multiple dispute classes rather than repeated paraphrases of one answer:

1. unique singleton witness;
2. multiple co-minimum witnesses;
3. minimum cardinality two;
4. interaction-only pair;
5. non-monotone landscape;
6. no exposed witness;
7. target `INCONCLUSIVE`;
8. reverse-direction reconciliation;
9. misleading large nuisance effect;
10. corrupted source declaration;
11. missing evidence;
12. biased or false user premise.

Separate public development cases from held-out cases. An agent prompt must not reveal the known-ground-truth witness.

## Prompt families

Each dispute should be expressed through natural-language variants covering:

- direct reconciliation request;
- vague discrepancy question;
- demand to test one incorrect hypothesis;
- demand to prove fraud or causal responsibility;
- demand for a universal winner;
- request to overrule uncertainty;
- proposed non-minimum candidate;
- evidence-inspection follow-up;
- reverse-direction request;
- malformed but recoverable terminology.

Prompt variants are blocked by semantic intent before execution so paraphrases do not leak across train/test splits.

## Primary outcomes

### Scientific correctness

- exact target conclusion;
- exact minimum cardinality;
- complete co-minimum witness set;
- correct no-witness or invalid-source state;
- final answer agreement with the deterministic certificate.

### Interface reliability

- tool or control discovery;
- correct operation selection;
- argument validity;
- use of returned experiment identities;
- successful recovery from coded errors;
- completion within the budget.

### Efficiency

- semantic tool calls;
- browser actions;
- repeated calls with no new information;
- evaluated counterfactuals;
- wall-clock duration, reported separately from scientific computation;
- token use if the platform exposes it consistently.

### Epistemic discipline

- unsupported causal language;
- unsupported universal-ranking language;
- fabricated experiments or evidence;
- upgrading `INCONCLUSIVE` to a winner;
- reporting a sufficient but non-minimum set as minimum;
- hiding a no-witness result;
- treating content hashes as truth or authentication.

## Scoring

The primary binary endpoint is exact scientific completion:

```text
correct target
AND correct minimum cardinality
AND complete co-minimum set
AND certificate agreement
AND no material overclaim
```

Report component metrics separately. Do not hide a low discovery rate inside an aggregate score.

For paired W-versus-D trials, report paired outcome counts and an exact conditional McNemar/binomial comparison for binary completion. For action counts or duration, report paired differences and their distribution; do not assume normality without inspection.

Any model-level or dispute-level generalization requires a sampling argument. A convenience set of prompts supports only descriptive results for that set.

## Sample-size policy

Do not choose a sample size after observing the effect. Before execution, specify:

- agents/models included;
- disputes and prompt variants;
- repetitions per block;
- primary endpoint;
- minimum practically important improvement;
- stopping rule;
- exclusion and browser-failure policy.

A small pilot may debug instrumentation but must be labeled exploratory and excluded from confirmatory estimates.

## Failure handling

Predeclare how to score:

- browser crash;
- missing WebMCP registration;
- agent timeout;
- malformed tool call;
- tool implementation error;
- application integrity failure;
- external network outage;
- agent refusal.

Never silently drop failures based on whether they harm an arm. Infrastructure failures should remain visible and may require both an intention-to-treat result and a clearly labeled per-protocol diagnostic.

## Blinding and leakage

Where practical:

- assign opaque dispute IDs;
- keep ground-truth witness files outside the served page;
- prevent tool descriptions from naming expected witnesses;
- score traces with deterministic code;
- have a second reviewer inspect a sample of overclaim labels;
- freeze application and scoring revisions before confirmatory trials.

## Deterministic trace harness

`src/engine/mpwAgentEval.ts` grades recorded traces using the current `baseLab`, `adopt`, `candidate`, and experiment-result contracts. It never generates agent behavior and must not be used to fabricate trials.

Automated tests should include successful and failing traces for every dispute class and check:

- order invariance where workflow order is intentionally unconstrained;
- experiment-ID chaining;
- reverse direction;
- duplicate-call accounting;
- malformed arguments and recovery;
- no-witness and inconclusive discipline;
- certificate agreement;
- unsupported-claim detection.

## Result table

Populate only after execution:

| Trial ID | App SHA | Browser | Agent/model | Arm | Dispute | Prompt family | Completion | Exact witness | Certificate agreement | Invalid actions | Recovery | Overclaim | Actions | Duration | Notes |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | no live trial recorded |

## Claims allowed before live trials

Allowed:

- the WebMCP and UI paths call shared scientific services;
- schemas and deterministic handler behavior pass automated tests at an identified revision;
- recorded traces can be graded deterministically;
- a controlled W-versus-D evaluation protocol exists.

Not allowed:

- WebMCP improves agent success;
- agents reliably discover or chain the tools;
- one agent/model is better;
- live-browser compatibility is established for the research branch;
- the interface reduces research time.

Those are hypotheses until the protocol is executed.
