# build state (updated 2026-09-03, P03)

status: BLOCKED_PENDING_REAL_WEBMCP_SMOKE. do NOT mark webmcp compat pass yet.
stack: React 19 + TS 5.9 strict + Vite 8 + Vitest 4 + eslint.
layout: src/{app,components,engine,state,types,webmcp}, data/{publications,fixtures}, scripts, tests/{engine,fixtures,webmcp}, docs/phase-reports.
gates: `npm run verify` = typecheck + lint + tests + build. green required.
tests: 63 passing, 14 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1).
smoke: temporary `reconciler_smoke_test` + compat panel live in dist, awaiting real browser proof.
deploy: dist ready. public deploy MANUAL REQUIRED (pages workflow present, needs enabling).
head: 8aaa79e45066a6ed872070bdbf0fff6e043d851d
open: real smoke proof, demo video, submit, freeze.
