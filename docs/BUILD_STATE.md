# build state (updated 2026-09-03)

stack: React 19 + TS 5.9 + Vite 8 + Vitest 4. engine `src/engine/`, ui `src/ui/`.
gates: `npm run verify` = typecheck + lint + tests + build. green required, no exceptions.
tests: 56 passing, 11 files. seeds pinned (sim mpw-canonical-v1, boot mpw-boot-v1).
deploy: push main → pages workflow builds dist. live tunnel served dist for manual test.
head: c9587734a12616bac952341dc45f0b37d78fb7ec
open: pages action rerun after enabling, <3min demo video, devpost submit before 1pm PDT Sep 3, then freeze.
