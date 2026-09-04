# Research and Engineering Decisions

## Scientific core

- **D001 — deterministic authority:** agents and UI code never calculate or certify scientific results; they delegate to deterministic services.
- **D002 — descriptive terminology:** a protocol witness is an exposed counterfactual sufficiency result, not a causal attribution.
- **D003 — directional reconciliation:** A-to-B and B-to-A are separate computations and artifacts.
- **D004 — global minimum:** primary witness results minimize cardinality globally and return every co-minimum tie.
- **D005 — non-monotone by default:** exact search never assumes that adding substitutions preserves sufficiency.
- **D006 — proof levels are separate:** minimum proof, co-minimum completeness, and full-landscape exhaustiveness have distinct fields.
- **D007 — first-class null states:** empty witness, no witness, `INCONCLUSIVE`, incomplete evidence, invalid source, and verifier failure remain distinct.
- **D008 — categorical and numerical claims are separate:** reproducing a label does not imply reproducing target effect magnitude.

## Protocol architecture

- **D009 — generic finite schema:** core substitution/search accepts arbitrary finite categorical scalar coordinates.
- **D010 — simulator isolation:** coordinate-specific mechanism code remains in evaluator adapters, not the generic reconciler.
- **D011 — static-grid interoperability:** external complete endpoint grids use a versioned package with exact cube validation.
- **D012 — no arbitrary uploads yet:** general upload support waits for an explicit evidence, evaluator, authentication, and failure model.

## Statistics

- **D013 — paired estimand:** canonical model comparison uses paired item outcomes and reports `Delta = accuracy(A) - accuracy(B)`.
- **D014 — fixed-item scope:** the stratified bootstrap describes item-composition sensitivity, not repeated-run or universal model uncertainty.
- **D015 — selection-aware separation:** pointwise, simultaneous finite-family, and repeated-run robust analyses are separate outputs.
- **D016 — complementary exact diagnostic:** McNemar/binomial discordance is reported alongside effect estimates, not substituted for them.
- **D017 — robust witness threshold is preregistered:** repeated-run robust sufficiency uses a fixed probability threshold and complete family before selection.
- **D018 — conservative first robust method:** Bonferroni-Hoeffding lower bounds are used because their assumptions and guarantee are transparent; they are not claimed to be optimally powerful.

## Search and scale

- **D019 — exact minimum mode:** cardinality-ordered search completes the first sufficient level and then may stop.
- **D020 — landscape mode:** interactions, nuisance maps, portable full audits, and no-witness claims require the complete finite landscape.
- **D021 — black-box lower bound:** no general faster exact claim is made for arbitrary non-monotone sufficiency; query coverage is part of the certificate semantics.
- **D022 — heuristics propose, exact code verifies:** greedy, one-at-a-time, random, or model-guided strategies cannot issue a global minimum certificate without the required exact coverage.

## Provenance and certificates

- **D023 — canonical content:** portable artifacts use RFC 8785/JCS canonical bytes and SHA-256 identities.
- **D024 — no self-hash recursion:** a body never embeds the digest computed over itself.
- **D025 — integrity is not truth:** hashes establish content identity relative to a known digest, not authenticity, causal validity, or scientific quality.
- **D026 — replay is separate:** certificate content-integrity validation and scientific replay validation have different statuses.
- **D027 — request binding:** direction and selected candidate are bound into the certificate; unrelated successful requests cannot receive a canonical default artifact.
- **D028 — signatures are a separate layer:** future publisher authentication must not be confused with evidence replay.

## Human and agent interfaces

- **D029 — shared services:** React and WebMCP handlers use the same application services and engine.
- **D030 — semantic operations, not DOM macros:** tools expose publication, experiment, evidence, and verification operations.
- **D031 — small tool surface:** four current tools remain until executed agent studies justify splitting or adding operations; “exactly four” is not a scientific law.
- **D032 — untrusted source data:** publication strings and evidence metadata never become tool instructions or executable prompts.
- **D033 — mutable UI state is not scientific identity:** experiment and certificate identities derive from immutable declared inputs.
- **D034 — mocks are limited evidence:** deterministic handler and registration tests do not establish production-browser or live-agent performance.

## Evidence and product

- **D035 — synthetic fixture is a tutorial adapter:** it is retained for deterministic ground truth but cannot establish real-model conclusions.
- **D036 — external negative results remain:** the zero-of-five strict interaction result is reported alongside the five-of-five minimum-pair result.
- **D037 — benchmark before polish:** reconciliation landscapes, independent oracles, and failure cases have priority over animation or generic dashboard features.
- **D038 — research-first documentation:** challenge deadlines and submission workflow do not define the project identity.
- **D039 — no inflated readiness:** publication-grade language requires real external cases, repeated-run evidence, controlled agent trials, and independent reproduction.

## Git and verification

- **D040 — research branch isolation:** overhaul work does not modify or merge `main` without explicit human action.
- **D041 — no force push:** history is not rewritten during the audit.
- **D042 — exact evidence labels:** results are marked verified by execution, verified by source inspection, or not yet verified.
- **D043 — green revision specificity:** a prior green run does not prove a later commit; every reported gate names the exact revision.
