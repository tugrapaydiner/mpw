# P23 state audit

objective: break P22 as a hostile reviewer. one real catch, fixed.
files changed: `src/state/investigation.ts` (clone boundaries), `tests/state/stateAudit.test.ts` (new, 8 tests), this report.
tests run: `npm run verify` green (176/176 in 27 files, build ok).
failures discovered: op results were live references into stored state. mutating a returned experiment corrupted history (proven by the new test against the old shape). fixed: structuredClone at every store/return boundary, both directions.

charge-by-charge:
- duplicated science: CLEAR. state layer holds zero stats/sim/bootstrap code; grepped imports only.
- caller affecting science: CLEAR. no caller/source branch anywhere (grepped); caller lands only in activity source. proven: HUMAN service result === AGENT tool result for run and verify, byte-equal.
- stale cert surviving change: CLEAR. new experiments / non-verified re-verifies stale; repeats and views do not (correct: no science change). reset nulls the cert; post-reset re-verify mints the identical id (no stale ids).
- duplicate rows: CLEAR. dedup key is sorted-subset JSON; rapid 6-op sequence gives 3 rows + 3 repeat events, seqs 1..7.
- reset incompleteness: CLEAR. fresh === post-reset (P22) and listeners survive (UI stays subscribed).
- mutable fixtures: CLEAR. LAB_A/B + SOURCE_PUBLICATIONS byte-identical across ops + reset; returned science now cloned.
- timestamp identity: CLEAR. no Date/clock in state (grepped); seq only.
- races: CLEAR. fully synchronous module; rapid sequence deterministic.
- unknown inspection: CLEAR. ok:false, error recorded, no view stored.
- verify before read: ACCEPTED BY DESIGN. engine enforces source integrity on every call, so standalone verify is safe; state records it honestly with dispute still null. tested.

gate result: GREEN.
blockers: none.
