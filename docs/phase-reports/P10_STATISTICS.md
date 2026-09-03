# P10 statistics

objective: pure deterministic stats, no ui/webmcp in the path.
files changed: `src/engine/mpwCore.ts` (pairing, percentile, resample helper, analyzeEvidence/analyzeCanonical, algo id/version; old bootstrap now delegates to the single path), `tests/engine/stats.test.ts` (new, 11 tests).
tests run: `npm run verify` green (typecheck, lint, 92/92 in 18 files, build).
failures discovered: two of my hand-computed test scenarios were miscalibrated (huge deltas, not borderline), one tsc union + one bad import path. all test-side or wiring, engine untouched by the fixes.
fixes: scenarios recalibrated to true borderline cases, return type pinned, import corrected.

coverage: repeatability, order invariance, ties→INCONCLUSIVE, A/B dominance, positive-point-but-crossing→INCONCLUSIVE, pairing rejects (unmatched/duplicate/missing/invalid), canonical 4x100 gate, percentile pinned, resample sizes+pairing, seed moves CI never the point, sub-display-precision CI still classifies, full struct fields.
gate result: GREEN.
blockers: none.
