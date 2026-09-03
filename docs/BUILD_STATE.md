# build state (updated 2026-09-03, P18)

WEBMCP_SMOKE_REAL=PASS
NEXT=P19
stack: React 19 + TS 5.9 strict + Vite 8 + Vitest 4 + eslint.
layout: src/{app,components,engine,state,types,webmcp}, data/{publications,fixtures}, scripts, tests/{engine,fixtures,webmcp}, docs/phase-reports.
gates: `npm run verify` = typecheck + lint + tests + build. green required.
tests: 134 passing, 23 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1).
provenance: JCS via canonicalize@4.0.0 + pre-validation gate + sha256 identity hashes (see docs/PROVENANCE_SPEC.md).
domain: exact vocabulary in `src/types/domain.ts`, strict validators in `src/engine/mpwValidate.ts`, runtime encodings unchanged.
fixtures: 12,800 receipts regenerable, cores in `data/generated/`, `npm run fixtures` to rebuild.
smoke: proven live (10 invocations, chrome inspector path). compat PASS recorded.
deploy: dist ready. pages workflow present.
head: 69c6718e0e9a5740aad03913e35bdf6cd9cba803
open: demo video, submit, freeze.
