# build state (updated 2026-09-03, P12)

WEBMCP_SMOKE_REAL=PASS
NEXT=P13
stack: React 19 + TS 5.9 strict + Vite 8 + Vitest 4 + eslint.
layout: src/{app,components,engine,state,types,webmcp}, data/{publications,fixtures}, scripts, tests/{engine,fixtures,webmcp}, docs/phase-reports.
gates: `npm run verify` = typecheck + lint + tests + build. green required.
tests: 96 passing, 18 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1).
domain: exact vocabulary in `src/types/domain.ts`, strict validators in `src/engine/mpwValidate.ts`, runtime encodings unchanged.
fixtures: 12,800 receipts regenerable, cores in `data/generated/`, `npm run fixtures` to rebuild.
smoke: proven live (10 invocations, chrome inspector path). compat PASS recorded.
deploy: dist ready. pages workflow present.
head: c0fe0b290e840d36d9ec8a89084283e4885b2bf3
open: demo video, submit, freeze.
