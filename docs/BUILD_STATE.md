# build state (updated 2026-09-03, P10)

WEBMCP_SMOKE_REAL=PASS
NEXT=P11
stack: React 19 + TS 5.9 strict + Vite 8 + Vitest 4 + eslint.
layout: src/{app,components,engine,state,types,webmcp}, data/{publications,fixtures}, scripts, tests/{engine,fixtures,webmcp}, docs/phase-reports.
gates: `npm run verify` = typecheck + lint + tests + build. green required.
tests: 92 passing, 18 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1).
domain: exact vocabulary in `src/types/domain.ts`, strict validators in `src/engine/mpwValidate.ts`, runtime encodings unchanged.
fixtures: 12,800 receipts regenerable, cores in `data/generated/`, `npm run fixtures` to rebuild.
smoke: proven live (10 invocations, chrome inspector path). compat PASS recorded.
deploy: dist ready. pages workflow present.
head: c0fdc8e5a657d224a84cdda15ea11452c8748197
open: demo video, submit, freeze.
