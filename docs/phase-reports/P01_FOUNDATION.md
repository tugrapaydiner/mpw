# P01 foundation

objective: official snapshot, eligibility record, prescribed layout, strict TS + lint + scripts, sanity test, verify green.
files changed: layout moves (engine/types/webmcp/app/components/state), data/*.json, docs (SNAPSHOT, ELIGIBILITY, SPEC, CLAIMS, DECISIONS, BUILD_STATE, README placeholder), eslint config, package scripts, 2 new tests.
tests run: `npm ci` then `npm run verify` (typecheck, lint, 59 tests in 13 files, build).
failures discovered: stale types imports after move (3 files), ui-copy test path after move. both fixed, no behavior change.
fixes: import paths corrected, language test points at new App path.
gate result: GREEN. snapshot exists, eligibility truthful from git log, strict TS on, lint clean, tests 59/59, build ok, MIT present, docs consistent, no backend/db/api dep.
blockers: none in phase. release-side items (video, submit, freeze) stay human-side.
