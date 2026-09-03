# build state (updated 2026-09-03, P01)

stack: React 19 + TS 5.9 strict + Vite 8 + Vitest 4 + eslint.
layout: src/{app,components,engine,state,types,webmcp}, data/{publications,fixtures}, scripts, tests/{engine,fixtures,webmcp}, docs/phase-reports.
gates: `npm run verify` = typecheck + lint + tests + build. green required.
tests: 59 passing, 13 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1).
deploy: push main → pages workflow builds dist.
head: 47ff6ebb1c7d368b9b98f835459930c694fb931e
open: P01 gate items resolved here; demo video + submit + freeze still human-side.
