# phase: react migration + verify gate

objective: move to React+TS+Vite+Vitest with identical engine behavior.
files changed: engine typed under `src/engine/`, react ui in `src/ui/`, vitest suites in `tests/`, vite/eslint/ts configs, static dist deploy.
tests run: `npm run verify` (typecheck, lint, 56 tests, build).
failures: ts7 vs linter (downgraded to ts5), pages subpath assets (relative base), serve root on spaced paths, manifest ordering test (inner subsets now sorted).
fixes: all in, verify green.
gate result: GREEN.
blockers: pages rerun, demo video, submit by 1pm PDT Sep 3, then freeze.
commit: c9587734a12616bac952341dc45f0b37d78fb7ec
