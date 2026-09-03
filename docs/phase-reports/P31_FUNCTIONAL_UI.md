# P31 functional UI

objective: product interface on real state/data, no styling push, no fake values.
files changed: `src/app/App.tsx` (rewrite: dispute cards, differences, controlled test, diagnostics, verification, certificate, trace/activity), `src/app/verdict.ts` (new: exact verdict wording), `tests/app/verdict.test.ts` (new, 2 tests), this report.
tests run: `npm run verify` green (182/182 in 28 files, build ok).
failures discovered: my own verdict.ts comment tripped the banned-phrase scan (fixed by rewording; the scan works).

interface: header strip (same benchmark/models/opposite conclusions + synthetic disclaimer); side-by-side Lab A/B cards with real scores/delta/CI/conclusion; four protocol-difference rows with live values; controlled-test card (changed dims from→to, everything-else-constant note, live engine numbers, verdict line); evidence diagnostics; verification (16/16 line, cardinality, witnesses, status, HUMAN/AGENT request tag vs SYSTEM verified tag); certificate (readable view, hash, limitations, copy + download — download path runs buildCertificate then verifyCertificate before serializing, so the file verifies by construction); trace + source-tagged activity; concise WebMCP compat note; reset. dispute auto-loads on mount through the HUMAN service path. no sidebar/accounts/chat/leaderboard — single page.

wording: parser case "Effect detected; target conclusion not reproduced.", budget case "Target conclusion reproduced.", banned phrases pinned absent by test.

one deliberate deviation: spec wrote Retry "1 ↔ 0"; engine values are one-retry/no-retry, and "no fake values" outranks the mock — UI renders actual values.

gate result: GREEN.
blockers: none.
