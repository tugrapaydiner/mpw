# P19 publication bundles

objective: finalized Lab A/B bundles with exact hash boundary, strict load path.
files changed: `src/engine/mpwPublication.ts` (new: core, envelope, finalize, verify), `scripts/finalize-publications.mts` (new), `data/publications/lab-{a,b}.bundle.json` (new, minted+self-checked), `tests/engine/mpwPublication.test.ts` (new, 10 tests), `docs/PROVENANCE_SPEC.md` (+boundary), `package.json` (+bundles script), this report. old `lab-{a,b}.json` untouched (existing tests consume them).
tests run: `npm run verify` green (144/144 in 24 files, build ok).
failures discovered: tsc union-spread + flatMap typing frictions (restructured to explicit loops, casts removed after); one swallowed markdown header in spec edit (restored).

design: core = metadata only, never a self-hash. envelope adds evidence section, four hashes, then manifestHash over {core, evidence, hashes} — nonrecursive. subset identified by matching protocol against the two lab worlds. loader regenerates all 800 receipts + stats from live engine, demands 100% item x model coverage, compares every hash and every declared value exactly.

tampers (all INVALID): receipt flipped, protocol 8192->4096, declared score halved (both via body hash and, with re-minted hashes, at the science gate itself), benchmark item renamed, zeroed/corrupt hashes, deleted evidence section. semantic reorder (keys recursively reversed) stays VALID.

bundle contents: schemaVersion 1, mpw-pub-lab-{a,b}/1, synthetic Lab A/B publishers, mpw-bench v1, both models, protocol+hash, sim/eval versions, evidenceHash (800 receipts, 400 items), declared result, integrity OK, manifest hash. no real trademarks (grepped).
gate result: GREEN.
blockers: none.
