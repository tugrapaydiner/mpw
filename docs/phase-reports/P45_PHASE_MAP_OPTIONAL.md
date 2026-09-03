# P45 phase map (approved optional A)

objective: secondary visualization from live engine results only.
files changed: `src/app/phaseMap.ts` (new: cell builder over verifyCanonical), `src/app/App.tsx` (+map section), `src/app/instrument.css` (+cell styles), `tests/app/phaseMap.test.ts` (new), this report.
tests run: `npm run verify` green (193/193 in 31 files, build ok).

design: all 16 subsets grouped by cardinality 0–4; each cell shows subset,
glyph + conclusion text (never color-only), minimum ring + tag. caption
states the regime message and the no-interpolation guarantee. renders only
after verification (memoized, one verifyCanonical pass). MPW untouched as
core product.

proof: plotted-cell test cross-checks all 16 conclusions against
conclusionForSubset plus cardinality counts (1/4/6/4/1) and the unique
minimum. clarity/performance/reliability unharmed: no new science, no
service/state/tool changes, ~2s one-time compute inside the existing
verification beat.

gate result: GREEN (verify to confirm).
blockers: none.
