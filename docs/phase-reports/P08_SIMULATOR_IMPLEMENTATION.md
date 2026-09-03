# P08 simulator implementation

objective: materialize the designed simulator as pinned fixtures + integrity tests. no crypto hashes.
files changed: `src/engine/mpwSimulator.ts` (+SIM_VERSION), `src/engine/mpwManifest.ts` (+protocolKey), `scripts/generate-fixtures.mts` (new), `data/generated/lab-{a,b}.core.json` (new), `data/fixtures/benchmark.json` (+version), `tests/fixtures/integrity.test.ts` (new), package fixtures script, gitignore receipts dump.
tests run: `npm run verify` green (typecheck, lint, 81/81 in 17 files, build).
failures discovered: script type casts for JsonValue records (fixed), nothing behavioral.
fixes: casts corrected.

coverage: 400 unique items (100/category), 16 unique protocol keys, 12,800 receipts, no dup/missing tuples, regen deterministic, reorder-invariant, parser-only-accepts, no-retry-never-retries, tool-irrelevant-items-untouched. engine regenerates from inputs; aggregates never source-of-truth.

provisional raw counts (NOT conclusions, no CIs): Lab A A=347 B=304. Lab B A=126 B=210. cores flagged provisional, ci null.
gate result: GREEN.
blockers: none.
