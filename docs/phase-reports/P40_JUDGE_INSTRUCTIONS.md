# P40 judge instructions

objective: judge-ready testing artifact, every claim pre-verified.
files changed: `docs/JUDGE_TESTING_INSTRUCTIONS.md` (new: full + Devpost-short), this report.
tests run: `npm run verify` green (192/192 in 30 files, build ok; no code touched).

verification performed (not claimed): fetched the live deployment —
`index.html` serves with relative asset paths; downloaded the full
deployed JS bundle and counted identifiers: read_dispute 5,
run_counterfactual 8, inspect_evidence 4, verify_witness 7,
reconciler_smoke_test 0, registerTool 2. the deployed code is exactly
the four approved tools on the top-level registration pattern.

instructions contain: live URL, no-login/no-key statements, recommended
environment + enable steps from current official docs, supported models,
canonical prompt, no-order-required rule, expected workflow and
canonical result (flagged grading-only, absent from tool descriptions),
reset, manual fallback, limitations, Devpost-short version.

gate result: GREEN (verify to confirm).
blockers: submission (human).
