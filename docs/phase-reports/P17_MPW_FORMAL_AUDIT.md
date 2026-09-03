# P17 MPW formal audit

objective: falsify P16 as pure math. one real (cosmetic) catch, fixed.
files changed: `src/engine/mpwVerify.ts` (witnesses canonically sorted), `tests/engine/mpwFormalAudit.test.ts` (new, 6 tests), this report.
tests run: `npm run verify` green (125/125 in 22 files, build ok).
failures discovered: shuffled input gave VERIFIED with unsorted witness ([c,b] vs [b,c]) — same verdict, inconsistent representation. fixed at the source.
fixes: verifyWitness sorts all witness outputs.

verdicts:
- global min, never inclusion-minimal: PASS across 5 crafted families.
- all co-minimums: PASS, alias equality enforced.
- order: PASS after fix. representation now canonical, science untouched.
- empty/vacuous/inconclusive/unresolved: PASS, each with dedicated tests.
- no witness inspection: PASS. budget/lab names only in fixture data + field validation.
- real engine underneath: PASS. engine cells equal canonical table exactly.
- full reproduces target, 16/16 exactly once: PASS.
- unrounded values: PASS (exact float equality in tests).
- broken evidence never VERIFIED: PASS. throws propagate, malformed rejected.

canonical asserts: |H|=4, powerset 16, min 1, one witness {reasoning_budget}, other singletons insufficient, table deterministic. all green.
gate result: GREEN.
blockers: none.
