# build state (updated 2026-09-03, P21)

WEBMCP_SMOKE_REAL=PASS
NEXT=P22
stack: React 19 + TS 5.9 strict + Vite 8 + Vitest 4 + eslint.
layout: src/{app,components,engine,state,types,webmcp}, data/{publications,fixtures}, scripts, tests/{engine,fixtures,webmcp}, docs/phase-reports.
gates: `npm run verify` = typecheck + lint + tests + build. green required.
tests: 157 passing, 25 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1). red-team suite: 6 mutation tests.
provenance: JCS via canonicalize@4.0.0 + pre-validation gate + sha256 identity hashes (see docs/PROVENANCE_SPEC.md).
bundles: finalized Lab A/B in data/publications/lab-{a,b}.bundle.json, `npm run bundles` to re-mint.
certificate: canonical fixture in data/certificates/canonical.json, `npm run certificate` to re-mint.
domain: exact vocabulary in `src/types/domain.ts`, strict validators in `src/engine/mpwValidate.ts`, runtime encodings unchanged.
fixtures: 12,800 receipts regenerable, cores in `data/generated/`, `npm run fixtures` to rebuild.
smoke: proven live (10 invocations, chrome inspector path). compat PASS recorded.
deploy: dist ready. pages workflow present.
head: d785e200caba40f847719e40856289a31175e9fc
open: demo video, submit, freeze.
