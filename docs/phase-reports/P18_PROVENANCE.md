# P18 provenance

objective: deterministic canonicalization + content hashes before publication hashes.
files changed: `src/engine/mpwProvenance.ts` (new), `src/engine/mpwManifest.ts` (single path), `src/engine/mpwCertificate.ts` (cert via provenance), `tests/engine/mpwProvenance.test.ts` (new, 9 tests), `package.json` (+canonicalize), `docs/PROVENANCE_SPEC.md` (new), this report.
tests run: `npm run verify` green (134/134 in 23 files, build ok).
failures discovered: duplicate import from overlapping edits (fixed), TS narrowing blocked object spread in hashExperiment (fixed with explicit fields).

decision: adopted `canonicalize@4.0.0` (JCS/RFC 8785, Apache-2.0, zero deps, typed). probed before trusting: sorts keys, keeps arrays, NaN throws, undefined silently dropped — hence mandatory pre-validation gate. project-specific parts (rejection gate, normalization order) documented as such, never labeled RFC/JCS.

coverage: sha256 standard vectors, JCS vectors, rejection of 11 non-JSON shapes, key-order irrelevance across all six hashes, receipt/item reorder irrelevance, strata/models order material, receipt/protocol/score changes move hashes, repeat stability, experimentId cross-check.

note: multi-dim experiment ids now order dims by EXPOSED declaration order (was alphabetical). no ids pinned in tests/data, all consumers self-consistent.
gate result: GREEN.
blockers: none.
