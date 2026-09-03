# Minimal Protocol Witness

answers one question: why do these two evaluation reports disagree?

two labs test the same models on the same benchmark, get opposite established conclusions. human + agent share this live page — same engine underneath — and hunt the smallest protocol difference that flips the result. audience + non-goals in `docs/PRODUCT.md`.

## What I'm going for
- Keep it minimal
- Keep each step small and easy to follow
- Commit after each step so I can track how it grows

## Where I'm at
stack: React + TypeScript + Vite + Vitest. engine in `src/engine/`, ui in `src/ui/`, same seeds so same numbers. no api, no db, no auth, no backend — static dist only.
Simulator: `simulateItem` in `src/engine/mpwSimulator.ts` — hashed draws, no order dependence, parser only filters accepts. params in `docs/SIM_PARAMS.md`. uncertainty in `docs/UNCERTAINTY.md` — 10k stratified paired bootstrap, CI-only rule. verifier in `src/engine/mpwVerify.ts` checks all 16 hybrids byte-identical outside S. Lab A -> MODEL_A, Lab B -> MODEL_B, only reasoning_budget flips solo. witness states: VERIFIED / NOT_SUFFICIENT / NON_MINIMUM / UNRESOLVED, never forced. integrity gate first: sources must reproduce own headlines or it raises SOURCE_INTEGRITY_FAILURE. manifest core unhashed for now (`docs/MANIFEST.md`), canonical order before any hash, cert body clock-free with content-hash id (`docs/CERTIFICATE.md`), ui meta outside. webmcp: 4 top-level tools in `src/engine/mpwTools.ts` per official site-tools docs (`docs/WEBMCP.md`), same service as the page. agent traces graded order-agnostic (`docs/AGENT_EVALS.md`). language guardrails in `docs/LANGUAGE.md`, enforced in tests. 56 passing.

## Limits
my CIs only cover resampling these items with the same category mix. not inference repeats, training, deployment, future benchmarks, or general capability. same note lives in `docs/UNCERTAINTY.md` and will go in the certificate.

## How I run it
- `npm test` (vitest, 56 passing), `npm run verify` (typecheck + lint + tests + build, all green to count), `npm run build` (static dist), `npm start` serves dist on 8000, `npm run dev` for local dev.
- needs Node 20+.

## Next
rebuilt on the new stack and live on the tunnel — refresh and re-fire one tool to confirm the bundle behaves.
