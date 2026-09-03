# WebMCP tool spec (P24, 2026-09-03)

design only. implementation follows in P25. exactly four tools, no micro-tools.

runtime facts re-verified 2026-09-03 in the official docs:
`document.modelContext.registerTool({name, description, inputSchema,
annotations, execute})` on the top-level page; ChatGPT built-in browser
supports the imperative API only (no declarative API, no iframes); target
Sol/Terra (Luna has WebMCP disabled); tools belong to the live page.
annotations observed in current doc examples: `readOnlyHint`,
`untrustedContentHint`. no other hint is named there, so no other hint is
specified here.

all four tools delegate to the shared application services
(`src/state/investigation.ts`, caller AGENT). science is byte-identical for
HUMAN and AGENT (proven P23). canonical flow read -> run -> inspect ->
verify is inferable from inputs/outputs and never enforced.

## conventions

- every schema: `type object`, `additionalProperties: false`, strict enums,
  arrays `uniqueItems: true`.
- failure envelope: `{ok: false, code, error}` with concise single-sentence
  error. success: `{ok: true, ...named payload}`.
- error codes:
  - recoverable bad input (fix args, retry): `UNKNOWN_DISPUTE`,
    `UNKNOWN_EXPERIMENT`, `UNKNOWN_PROTOCOL_DIMENSION`,
    `DUPLICATE_DIMENSION`, `INVALID_BASE_LAB`, `INVALID_CANDIDATE`.
  - scientific integrity failure (retry never helps, investigate):
    `SOURCE_INTEGRITY_FAILURE`, `EVIDENCE_INCOMPLETE`.
- shared enums: `baseLab: A | B`; `ProtocolDimension: reasoning_budget |
  answer_parser | retry_policy | tool_access`; category: the four stratum
  names from read_dispute.
- canonical dispute id (derived, never authored):
  `mpw-dispute-59b0f51c99bcffcd` = content hash of the two finalized
  publication hashes (`0dfd8b43eb82576c`, `63d6d1154a1aaa9b`).

## TOOL 1 — read_dispute

description: "Summarizes the active evaluation dispute: both labs'
conclusions with scores and intervals, benchmark identity, evidence
coverage, integrity status, and the protocol dimensions where the labs
differ."

input: `{disputeId: string}` required. unknown id -> `UNKNOWN_DISPUTE`.

output (concise):
`{disputeId, benchmark: {id, version}, models, sources: [{lab,
publicationId, conclusion, scoreA, scoreB, delta, ciLow, ciHigh,
coverage}], differences: ProtocolDimension[4], coverage: {expectedItems,
accountedItems, percent}, integrity: {status, checks: [{source, declared,
recomputed, match}]}}`.

the description names no dimension and no answer.

annotations: `readOnlyHint: true`.

## TOOL 2 — run_counterfactual

description: "Builds one hybrid protocol from a lab baseline by adopting
selected dimensions from the other lab, then runs the deterministic
synthetic evaluation with paired statistics."

input: `{disputeId: string, baseLab: A|B, adoptFromOtherLab:
ProtocolDimension[]}` all required, `minItems 0, maxItems 4`,
`uniqueItems true`. unknown dim -> `UNKNOWN_PROTOCOL_DIMENSION`,
duplicates -> `DUPLICATE_DIMENSION`, bad lab -> `INVALID_BASE_LAB`.

output (concise):
`{experimentId, disputeId, baseLab, changedDimensions, scoreA, scoreB,
delta, ciLow, ciHigh, conclusion, reproducesTarget, coverage}`.
`experimentId` is the content hash of the experiment and the lookup key
for TOOL 3.

annotations: `readOnlyHint: false` (honest: appends to the session
investigation history; the science itself is pure and repeatable).

## TOOL 3 — inspect_evidence

description: "Reads stored diagnostics for a completed experiment:
coverage, paired outcome counts, parser, retry and tool behavior, category
summary, and evidence hash."

input: `{experimentId: string}` required, plus optional `category` enum
(beneficial: slices one stratum) and optional `limit` integer 1..20,
default 5 (small samples only; hundreds of receipts are never default).
unknown id -> `UNKNOWN_EXPERIMENT`.

output:
`{experimentId, coverage, pairedCounts: {bothCorrect, bothWrong, aOnly,
bOnly}, parserFailures, retry: {retried, recovered}, tool: {needed,
penalized}, categorySummary: [{stratum, n, scoreA, scoreB}], sample:
[{id, stratum, a, b}], evidenceHash}`.

annotations: `readOnlyHint: true`.

## TOOL 4 — verify_witness

description: "Exhaustively checks every combination of the exposed
dimensions and decides whether a proposed candidate reproduces the target
conclusion with the smallest possible dimension set."

input: `{disputeId: string, baseLab: A|B, candidate: ProtocolDimension[]}`
all required. bad candidate -> `INVALID_CANDIDATE`.

output:
`{status: VERIFIED | NOT_SUFFICIENT | NON_MINIMUM | UNRESOLVED, target,
minimumCardinality, coMinimumWitnesses, subsetsEvaluated, subsetsTotal,
certificate: {id, hash} | null, limitation}` where `limitation` is one
concise line (minimality is conditional on the exposed dimensions,
fixture, scoring, and conclusion rule) and `certificate` is present only
on VERIFIED.

annotations: `readOnlyHint: false` (honest: records history and issues a
certificate on VERIFIED).

## worked example (live canonical values)

- read_dispute(`mpw-dispute-59b0f51c99bcffcd`) -> Lab A MODEL_A
  (.8675/.7600, +.1075, [.055,.16]) vs Lab B MODEL_B (.3150/.5250,
  -.2100, [-.2675,-.1525]), differences all four dimensions, coverage
  400/400/100, integrity OK.
- run_counterfactual(baseLab A, adopt [one dimension]) -> experiment id,
  scores, interval, conclusion, coverage 400.
- inspect_evidence(that id) -> paired counts, diagnostics, evidence hash.
- verify_witness(baseLab A, candidate [one dimension]) -> VERIFIED,
  target MODEL_B, minimum 1, co-minimums listed, 17 evaluated of 16
  subsets (16 exhaustive + 1 candidate), certificate id/hash.

## gaps vs current implementation (P25 work)

1. tools take no disputeId/baseLab; TOOL 3 takes subset, not experimentId.
2. no session experiment registry backing UNKNOWN_EXPERIMENT.
3. error codes unstructured (plain messages; only integrity has a code).
4. service outputs lack parser/retry/tool diagnostics, paired counts,
   evidence hashes, certificate on verify.
5. all four tools currently claim readOnlyHint true; TOOLS 2/4 must flip
   to false per this spec.
