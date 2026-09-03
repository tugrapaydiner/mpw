# P15 counterfactual audit

objective: attack the P14 engine for leaks, staleness, and direction bias.
files changed: `tests/engine/counterfactualAudit.test.ts` (new, 6 tests), this report.
tests run: `npm run verify` green (117/117 in 21 files, build ok).
failures discovered: none. all six audit tests passed first run.
fixes: none needed.

verdicts:
- only-selected-change: PASS, mechanically checked across all 16 subsets.
- leakage: PASS. engine imports data + simulator + stats + headline gate only. no witness/verdict/certificate imports, no winner/cache strings.
- identity: PASS. stable, order-free, changes with subset/labs/protocol, never sees ui metadata (not an input).
- P12 equality: PASS. all 16 engine means exactly equal the independently generated diagnostics — same semantics, no table reads (the table lives in a markdown file the code cannot see).
- stale cache: PASS. no cache exists; interleaved repeats identical.
- hidden fifth dim: PASS. diffProtocols surfaces unknown keys instead of absorbing them.
- reverse B->A: PASS. empty gives MODEL_B, full gives MODEL_A.

gate result: GREEN.
blockers: none.
