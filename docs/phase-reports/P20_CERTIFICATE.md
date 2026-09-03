# P20 certificate

objective: deterministic structured certificate, fully engine-built, verifiable.
files changed: `src/engine/mpwCertificate.ts` (rewrite: inputs, canonical wiring, verifyCertificate), `src/engine/mpwPublication.ts` (+evidenceForProtocol shared helper), `src/engine/mpwCore.ts` (+PRNG identity), `scripts/mint-certificate.mts` (new), `data/certificates/canonical.json` (new fixture, self-checked), `tests/engine/mpwCertificate.test.ts` (rewrite, 10 tests), `package.json` (+certificate script), this report.
tests run: `npm run verify` green (151/151 in 24 files, build ok).
failures discovered: protocolForSubset imported from wrong module (fixed), dead legacy helper removed before commit.

body: schema/format/engine/sim versions, stats method+PRNG+seed+10k+95%+4 strata, JCS/canonicalize-4.0.0, SHA-256, dispute id from publication hashes, both sources (pub id/hash, protocol, scores, delta, CI, conclusion, coverage), derived differences, target, verification (status/min/all co-minimums/selected/evaluated/total/16-row audit), witness experiment (protocol/dims/id+hash/scores/CI/conclusion/evidenceHash/4 category rows), coverage 400/400/100, three mandatory limitations verbatim. no clock anywhere (grepped + blob-scanned).

verifyCertificate: recomputes canonical bytes + hash + id, pins versions/method/seed/replicates/confidence/strata, re-derives differences, recomputes all 16 audit experiment ids + witness id from subset fields, demands selected-in-co-minimums and 100% coverage for VERIFIED, exact limitations match. 77 checks on the canonical fixture.

required cases: same science same hash, displayedAt variants same hash, flipped evidence moves hash, changed witness moves hash, dropped limitation CERT_INVALID, 399/400 coverage rejects VERIFIED, 2 co-minimums retained VALID, UNRESOLVED VALID, INCONCLUSIVE target VALID.
gate result: GREEN.
blockers: none.
