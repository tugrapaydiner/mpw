# P14 counterfactual engine

objective: pure controlled counterfactuals with derived diffs, hybrid invariant, stable ids.
files changed: `src/engine/mpwCounterfactual.ts` (new: diffProtocols, constructHybrid, runCounterfactual, experimentId), `src/engine/mpwService.ts` (delegates, single path kept), `tests/engine/counterfactual.test.ts` (new, 8 tests).
tests run: `npm run verify` green (111/111 in 20 files, build ok).
failures discovered: stats key mismatch (analysis says delta, engine first read mean), strict-dim friction at service/test boundaries. both wiring, engine math untouched.
fixes: key corrected, request accepts validated strings and narrows internally.

coverage: diff derives exactly the four; empty==base and full==source bit-for-bit; all singletons + all 16; hybrid changes only selected dims; order-free ids; dup/unknown/bad-lab rejected; integrity failure blocks; repeats identical; no table lookups anywhere (every result freshly simulated).
gate result: GREEN.
blockers: none.
