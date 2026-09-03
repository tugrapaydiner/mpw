# P03 webmcp smoke implementation

objective: smallest real webmcp integration (temporary smoke tool only, no scientific tools touched).
files changed: `src/state/smokeStore.ts` (new), `src/webmcp/smoke.ts` (new), `src/webmcp/tools.ts` (once-guard), `src/app/App.tsx` (compat panel), `tests/webmcp/mpwSmoke.test.ts` (new).
tests run: `npm run verify` green (typecheck, lint, 63/63 in 14 files, build).

facts rechecked 2026-09-03 vs https://learn.chatgpt.com/docs/webmcp (unchanged, no DECISIONS update needed):
supported models Sol + Terra, Luna disabled; top-level page JS registration required; iframe + declarative unsupported; shape `registerTool({name, description, inputSchema, annotations, execute})`; annotations readOnlyHint used (smoke sets false: it visibly mutates the counter).

smoke tool: `reconciler_smoke_test`, `{message}` max 500, strict schema, handler validates, updates visible count + last message + one activity entry, no clock, no api, no iframe.
registration: top-level app code, module once-guards (remount-safe), no duplicate.
automated proof: no-crash without modelContext, exact name/schema, extra args rejected, state updates once, result correct, double-register yields already-registered.

deploy: dist built and ready. no creds here, so public deploy is MANUAL REQUIRED: enable Pages (settings → pages → GitHub Actions) or point any static host at dist. no login, no secrets, no server needed.
compat: NOT marked pass. needs a real browser session (see `docs/WEBMCP_MANUAL_TEST.md`).

gate result: GREEN on code, BLOCKED on live proof.
blockers: BLOCKED_PENDING_REAL_WEBMCP_SMOKE.
