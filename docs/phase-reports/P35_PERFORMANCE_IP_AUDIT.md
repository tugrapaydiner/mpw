# P35 performance + IP audit

objective: prove the demo is fast enough and the tree is clean. no features.
files changed: `scripts/measure-perf.mts` (new), `docs/DEPENDENCIES_AND_LICENSES.md` (new), this report.
tests run: `npm run verify` green (192/192 in 30 files, build ok; one .mts generic-syntax fix).

performance (local, single run, ms): dispute read ~65-108, 10k bootstrap
~30, counterfactual run ~240, all-16 verification + certificate ~2950,
standalone certificate ~2075. static bundle 238KB (75KB gzip). verdict:
no optimization needed — the slowest demo beat (verify, ~3s) fits narration
in a sub-3-minute video; everything else is instant. no caching added, no
science touched. memoization unnecessary.

dependencies: 3 prod (react/react-dom MIT, canonicalize Apache-2.0 — all
required, all used), 8 dev-only. zero unused. npm audit: 0 vulns prod, 0
full tree. no upgrades (nothing to fix; no blind churn).

IP: MIT LICENSE covers our source only (stated in the doc, no ownership
claimed over deps). no bundled third-party assets of any kind; system
fonts + original css; synthetic names only; platform names are factual
doc references. src grepped clean for commercial model names, logos,
graphics, music, external fonts.

gate result: GREEN.
blockers: none.
