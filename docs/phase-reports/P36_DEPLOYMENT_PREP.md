# P36 deployment prep

objective: prove the static production target, document it, stop.
files changed: `docs/DEPLOYMENT.md` (new), this report.
tests run: `npm run verify` green (192/192 in 30 files, build ok; no code touched).

proven this phase: `npm run build` emits `dist/index.html` (0.40KB) +
hashed relative assets; local static serve returns 200 for `/` (409B)
and the 237,754B JS bundle; src grepped clean for service workers,
document.domain, storage APIs, SubtleCrypto, network calls.

checklist: no key/db/auth/model-api/server ✓; direct / loads dispute
(auto-read on mount, code path) ✓; hard refresh safe (no router) ✓;
relative asset paths ✓; HTTPS via Pages ✓; no isolation-disabling
config ✓; graceful WebMCP detection ✓; manual app unaffected ✓;
certificate download verifies-before-save ✓; reset tested ✓; no
service worker ✓. primary platform/config chosen: Pages + existing
workflow (auto-deploy on main, Actions-tab confirmation, revert/forward
rollback — no backend so nothing else can break).

gate result: GREEN.
blockers: none.
