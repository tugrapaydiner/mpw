# deployment (P36)

primary platform: GitHub Pages (static only). one config:
`.github/workflows/deploy.yml`.

## runtime requirements: none

no API key, database, auth, model API, local server, network calls,
storage, cookies, or service worker. the bundle is pure static
html/css/js; all science computes in-page. SHA-256 is a dependency-free
in-repo implementation (TextEncoder UTF-8), so even Web Crypto is not
required — secure context still holds via HTTPS.

## build

- command: `npm run build` (typecheck + vite build).
- output: `dist/` (`index.html` + hashed `./assets/*`, relative paths).
- env vars: none. no `.env`, no secrets, no injected constants.
- single route: no router. `/` serves `index.html`; hard refresh safe;
  asset URLs are relative (`./assets/...`), subpath-safe.

## origin isolation posture

we set no headers and ship no config that could disable it: no
`document.domain`, no `Origin-Agent-Cluster: ?0`, no permissions-policy
changes, no service worker (avoids stale-cache risk by absence).
WebMCP feature detection is capability-based
(`document.modelContext ?? navigator.modelContext`) and degrades to a
one-line notice; the manual app, certificate download (Blob +
fingerprint-verified before save), and reset work identically without it.

## procedure (release)

1. `npm run verify` green on main.
2. `git add -A && git commit -m "<plain-words message>" && git push origin main`.
3. workflow builds + deploys automatically. confirm in repo Actions tab.
4. hard-refresh `https://tugrapaydiner.github.io/mpw/`; check the four
   site tools listed and the dispute auto-loaded.

## rollback

revert to the last green commit (`git revert <sha>` or push a fix
forward), push to main; Pages redeploys from the new tip. no data
migration exists (no backend, no storage).

## exact release commit procedure

each phase lands as: one work commit (plain-words message, never internal
phase codes), then one `point head at the pushed commit` state commit.
never force-push, never amend pushed history. `docs/BUILD_STATE.md:head`
always names the current public tip.
