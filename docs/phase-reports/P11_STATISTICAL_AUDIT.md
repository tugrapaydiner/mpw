# P11 statistical audit

objective: attack the stats as a skeptic. no features.
files changed: `tests/engine/stats.test.ts` (+3 regression tests), `docs/STATISTICAL_LIMITATIONS.md` (new), this report.
tests run: `npm run verify` green (typecheck, lint, 95/95 in 18 files, build).
failures discovered: none in the engine. my own import edits fumbled twice (duplicated lines), fixed before commit.

verdicts:
- paired: PASS. all-tie data gives exactly [0,0]; broken pairing would spread it.
- stratified: PASS. one live stratum pins CI to exactly 0.25.
- 400/replicate, 100/category: PASS. implied by the two exact-CI proofs.
- prng: PASS. documented mulberry32 + tuple hash; 100k-draw uniformity ratio under 1.25, range [0,1) so floor indexing is unbiased.
- percentile: PASS. pinned rule + tests.
- seed independence of point: PASS (existing).
- unrounded CI: PASS (existing micro-CI test).
- pp discipline: PASS. no % rendering anywhere; units docced.
- language: PASS. no population claims found; limits docced in three places now.
- overstatement: PASS, nothing to fix.

gate result: GREEN.
blockers: none.
