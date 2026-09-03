# P13 source integrity

objective: each publication must reproduce itself at full precision before any reconciliation.
files changed: `src/engine/mpwFixture.ts` (benchmark/eval ids, universe hash), `src/engine/mpwSimulator.ts` (+simulateForProtocol), `src/engine/mpwVerify.ts` (deep publication + cross-source scope checks), `data/publications/*.json` (full declared stats, versions, universe), `tests/engine/sourceIntegrity.test.ts` (new, 8 tampers), data/fixture test updates.
tests run: `npm run verify` green (104/104 in 19 files, build ok).
failures discovered: my service edit left a stray fragment (fixed), a dropped type import (fixed), and the old no-answer test banned protocol field names the deep check legitimately needs (test refined to ban answer literals, not field access).
fixes: all in, no behavior drift.

coverage: tampered score, wrong protocol, wrong benchmark version, universe mismatch, model mismatch, hidden fifth dim, partial-dim scope, valid sources pass, full hybrid deep-equals direct Lab B simulation including exact CI.
gate result: GREEN. reconciliation never proceeds past a failing source.
blockers: none.
