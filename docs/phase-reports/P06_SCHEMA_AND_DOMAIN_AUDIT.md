# P06 schema + domain audit

objective: strict runtime validation for all domain JSON, hostile-audit the domain, no features.
files changed: `src/engine/mpwValidate.ts` (new), `src/engine/mpwService.ts` (boundaries use it), `data/fixtures/benchmark.json` (version), `tests/engine/validate.test.ts` (new), this report.
tests run: `npm run verify` green (typecheck, lint, 73/73 in 16 files, build).
failures discovered: my service edit left a stray body fragment (syntax error), plus a stale types import. both mine, both fixed, caught by verify before commit.
fixes: fragment removed, import corrected.

audit verdicts:
- inconclusive flows everywhere: type + classifier + service passthrough. PASS.
- multiple co-minimums representable: arrays + tests. PASS.
- unresolved exists: generic verifier + test. PASS.
- non_minimum vs not_sufficient distinct: separate branches + dedicated test. PASS.
- budget hard-code: none. only fixture data + generic divisor, no winner branches. PASS.
- cause fields: only inside notClaimed denial strings. PASS.
- direction: canonical path is A->B by design, generic verifier proves reverse works (min 0 via empty set, tested). PASS.
- precision vs display: no toFixed in engine, full floats in body, rounding only at presentation. PASS.
- validation: versions, ids, enums, dims, counts, NaN/Infinity, booleans, extras, category counts, dup models, protocol values, receipt refs all rejected with deterministic messages; no coercion. PASS.

gate result: GREEN. no BLOCKER/HIGH open.
blockers: none.
