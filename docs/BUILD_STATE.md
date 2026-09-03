# build state (updated 2026-09-03, P07)

WEBMCP_SMOKE_REAL=PASS
NEXT=P08
stack: React 19 + TS 5.9 strict + Vite 8 + Vitest 4 + eslint.
layout: src/{app,components,engine,state,types,webmcp}, data/{publications,fixtures}, scripts, tests/{engine,fixtures,webmcp}, docs/phase-reports.
gates: `npm run verify` = typecheck + lint + tests + build. green required.
tests: 73 passing, 16 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1).
domain: exact vocabulary in `src/types/domain.ts`, strict validators in `src/engine/mpwValidate.ts`, runtime encodings unchanged.
smoke: proven live (10 invocations, chrome inspector path). compat PASS recorded.
deploy: dist ready. pages workflow present.
head: b81db11a805ab2cd9aabff6064b0985b11d2bc90
open: demo video, submit, freeze.
