# build state (updated 2026-09-03, P45)

WEBMCP_SMOKE_REAL=PASS
PRODUCTION_WEBMCP_AUTOMATED=PASS
NEXT=video+submit first (phase map built, B/C rejected)
stack: React 19 + TS 5.9 strict + Vite 8 + Vitest 4 + eslint.
layout: src/{app,components,engine,state,types,webmcp}, data/{publications,fixtures}, scripts, tests/{engine,fixtures,webmcp}, docs/phase-reports.
gates: `npm run verify` = typecheck + lint + tests + build. green required.
tests: 193 passing, 31 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1). red-team suite: 6 mutation tests.
tools: exactly read_dispute/run_counterfactual/inspect_evidence/verify_witness via document.modelContext.registerTool; smoke removed.
services: src/state/investigation.ts wraps engine for HUMAN (ui) + AGENT (webmcp).
provenance: JCS via canonicalize@4.0.0 + pre-validation gate + sha256 identity hashes (see docs/PROVENANCE_SPEC.md).
bundles: finalized Lab A/B in data/publications/lab-{a,b}.bundle.json, `npm run bundles` to re-mint.
certificate: canonical fixture in data/certificates/canonical.json, `npm run certificate` to re-mint.
domain: exact vocabulary in `src/types/domain.ts`, strict validators in `src/engine/mpwValidate.ts`, runtime encodings unchanged.
fixtures: 12,800 receipts regenerable, cores in `data/generated/`, `npm run fixtures` to rebuild.
smoke: proven live (10 invocations, chrome inspector path). compat PASS recorded.
deploy: dist ready. pages workflow present.
head: 649a9b9f94b3c9caae97d024312018ca0bf605f4
open: demo video, submit, freeze.
