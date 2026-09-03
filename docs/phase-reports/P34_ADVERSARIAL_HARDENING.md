# P34 adversarial hardening

objective: try to destroy the finished core across inputs, source data, edge science, and state.
files changed: `src/engine/mpwSimulator.ts` (+unknown-stratum guard), `src/state/investigation.ts` (+strict args objects), `tests/engine/adversarial.test.ts` + `tests/state/adversarialState.test.ts` (new, 9 tests), this report.
tests run: `npm run verify` green (192/192 in 30 files, build ok; one tsc null-arg friction fixed with casts).
failures discovered: two, both fixed.
1. REAL ESCAPE: unknown item stratum escaped as raw `TypeError: Cannot read properties of undefined (reading 'diff')` from `itemAttrs` via template lookup. fixed with a domain error at the boundary (`unknown stratum: X`); probe file removed after use.
2. service args accepted null/extra props by silent default/ignore. fixed: strict args-object check (null/array/extra prop -> INVALID_CANDIDATE) on all three state-changing ops.

coverage: 12 malformed service inputs (all coded, none escape), reverse-direction sanity, 7 reminted bundle mutations (each fires the right gate: kind/benchmark/models/protocolHash/declared/sim), dup/missing/wrong-category item sets, generic-verifier edges (pair-minimum VERIFIED with 3 co-minimums, empty UNRESOLVED), shuffle invariance, 10 hostile state calls (all coded), stale-id death across reset, 9-op mixed storm (3 rows, consecutive seqs, correct terminal status).

no silent scientific recovery observed: every mutation either fails coded or resolves to a verified status through the engine.
gate result: GREEN.
blockers: none.
