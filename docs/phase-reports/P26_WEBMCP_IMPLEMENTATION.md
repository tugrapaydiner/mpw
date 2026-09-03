# P26 WebMCP implementation

objective: exactly the four approved tools on the proven registration pattern, smoke gone.
files changed: deleted `src/webmcp/smoke.ts`, `src/state/smokeStore.ts`, `tests/webmcp/mpwSmoke.test.ts`; rewrote `src/engine/mpwService.ts` (extended concise payloads, baseLab everywhere, error-code prefixes), `src/state/investigation.ts` (registry, disputeId checks, coded failures, extended verify), `src/webmcp/tools.ts` (four spec tools, AGENT caller), `src/app/App.tsx` (HUMAN caller, no smoke remnants), `src/types/index.ts` (+schema description), tests (`mpwWebmcp` rewritten 8, state suites updated), this report.
tests run: `npm run verify` green (174/174 in 26 files, build ok).
failures discovered: two wiring frictions (protocolForSubset import home, receipt field names vs engine truth — fixed from engine source), one code-mapping gap ("unknown candidate dim" unmapped — toCode extended), one lint rule (rethrow without cause — restructured to codeless throws + central mapping instead of touching tsconfig).

registration: `document.modelContext.registerTool(...)` top-level page only, P04 pattern kept. exactly four names, once-only flag, graceful no-webmcp, strict schemas, independent handler validation with all eight codes, service delegation proven by HUMAN/AGENT equality tests.

sizes (JSON bytes): read ~2.5k, run ~0.5k, inspect default ~3k, verify ~1k — all far under 8k caps pinned in tests. no receipt dumps.

handlers compute nothing: no stats/conclusion/minimum logic, no answer literals (grepped: budget appears only inside the shared four-dim enum + glosses).

PRODUCTION_WEBMCP_AUTOMATED=PASS (registration + delegation proven automated).
real-browser production gate: still pending (no live re-verification this phase).
gate result: GREEN.
blockers: none.
