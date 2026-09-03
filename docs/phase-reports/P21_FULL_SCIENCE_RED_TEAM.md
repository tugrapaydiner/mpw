# P21 full science red team — verdict: NO BLOCKER, NO HIGH. one real catch, fixed.

objective: break the chain item/model -> simulator -> publications -> stats -> integrity -> counterfactuals -> MPW -> provenance -> certificate as a hostile reviewer.
files changed: `src/engine/mpwPublication.ts` (+protocol shape gate), `src/engine/mpwCertificate.ts` (+protocol key gate), `tests/engine/redTeam.test.ts` (new, 6 mutation tests), this report.
tests run: `npm run verify` green (157/157 in 25 files, build ok; one lint unused-import caught and fixed during the phase).
failures discovered (exactly one): the finalized-bundle loader checked protocol hashes but never protocol SHAPE. a fifth key with re-minted hashes loaded VALID. fixed at both trust boundaries (bundle + certificate), with a test that re-mints hashes around the smuggled dim so only the structural gate can fire.

charge-by-charge:
- hard-coded aggregates/MPW: CLEAR. P12 constants appear in no src file; table lives in markdown the code cannot read (P15).
- causal/universal language: CLEAR. engine has only disclaimers; UI copy grepped clean; "proof" hits are compat/exhaustion wording + hash-scope denial.
- unpaired/unstratified bootstrap: CLEAR, re-read firsthand. paired diffs carried as units, per-stratum same-size resampling, binary/stratum/id validation, "no rounding" holds (tripwire test: all science values integral at 1/400).
- rounded science: CLEAR. no toFixed/round/parse in the path (Math.round is integer-combinatorics float cleanup).
- declarations reproduced: CLEAR. exact full-precision compare at both publication and bundle layers; flipped headline fails everywhere.
- hidden variable: CAUGHT + FIXED (above). simulator takes no lab id; budget literal is a documented divisor (P09).
- lab-id dependence: CLEAR. lab literals only select fixture subsets/protocols, never branch mechanism.
- evidence omission: CLEAR. 800/800 + 400x2 coverage gates; removal collapses all layers (tested).
- co-minimums: CLEAR (P17 + P20 retention test).
- inclusion-min vs global-min: CLEAR (P17 family sweep).
- forced explanation: CLEAR. UNRESOLVED path end to end, cert supports it.
- hash as truth: CLEAR. scope denials in code + limitations in body; validity is consistency, never endorsement.
- timestamps: CLEAR. no clock in engine/cert (grepped + blob-scanned); displayedAt outside body only.
- order-sensitive hashes: CLEAR. normalization + recursive-reorder-stays-VALID tests; manifest localeCompare sorts are legacy, not in hash paths.
- silent coercion: CLEAR. validators throw; `as never` casts are runtime no-ops behind runtime guards (checkSubset, dim checks, exact keys).
- synthetic as real: CLEAR. disclaimers in fixture header, certificate limitations, no banned UI copy.

rebuild: `fixtures` + `bundles` + `certificate` re-ran byte-identical (same bundle/cert hashes, no data diff). determinism holds end to end.
gate result: GREEN. no scientific BLOCKER/HIGH issue.
blockers: none.
