# build state (updated 2026-09-03, P14)

WEBMCP_SMOKE_REAL=PASS
NEXT=P15
stack: React 19 + TS 5.9 strict + Vite 8 + Vitest 4 + eslint.
layout: src/{app,components,engine,state,types,webmcp}, data/{publications,fixtures}, scripts, tests/{engine,fixtures,webmcp}, docs/phase-reports.
gates: `npm run verify` = typecheck + lint + tests + build. green required.
tests: 111 passing, 20 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1).
domain: exact vocabulary in `src/types/domain.ts`, strict validators in `src/engine/mpwValidate.ts`, runtime encodings unchanged.
fixtures: 12,800 receipts regenerable, cores in `data/generated/`, `npm run fixtures` to rebuild.
smoke: proven live (10 invocations, chrome inspector path). compat PASS recorded.
deploy: dist ready. pages workflow present.
head: 724440a5e508f11ab7f7bc834d06506b7d6dab43
open: demo video, submit, freeze.
