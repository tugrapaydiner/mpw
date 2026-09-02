# Minimal Protocol Witness

Hey — I'm building this out step by step.

Right now it's just a clean starter so I have a good place to work from. I'll add to it in small commits as I figure out what I need.

## What I'm going for
- Keep it minimal
- Keep each step small and easy to follow
- Commit after each step so I can track how it grows

## Where I'm at
Step 1: I set up the repo with a README and gitignore.
Prompt 01: I added my deterministic core in vanilla JS (no deps) — I can generate item-level outcomes from a seed, rebuild them from counts, run paired stats with CI/p-value, and classify A>B / B>B / inconclusive. The LLM never calculates — WebMCP tools will call this code later.
MPW rule: I locked in what I mean by Minimal Protocol Witness in `docs/MPW_DEFINITION.md` — I mean the globally smallest set of exposed differences that flips me to the target conclusion, not just inclusion-minimal, and I return every tie. I built that search in `src/mpwWitness.js` and I prove the minimum with exhaustive counts.
Fixture: I locked in our setup in `src/mpwFixture.js` — 400 items, 4 strata, 4 dims, 16 combos. Lab A is 8192/tolerant/one-retry/standard, Lab B is 2048/strict/no-retry/restricted. All synthetic.
Simulator: rebuilt around `simulateItem` in `src/mpwSimulator.js` — hashed draws, no order dependence, parser only filters accepts. params in `docs/SIM_PARAMS.md`. uncertainty in `docs/UNCERTAINTY.md` — 10k stratified paired bootstrap, CI-only rule. verifier in `src/mpwVerify.js` checks all 16 hybrids byte-identical outside S. Lab A -> MODEL_A, Lab B -> MODEL_B, only reasoning_budget flips solo. witness states: VERIFIED / NOT_SUFFICIENT / NON_MINIMUM / UNRESOLVED, never forced. integrity gate first: sources must reproduce own headlines or it raises SOURCE_INTEGRITY_FAILURE. manifest core unhashed for now (`docs/MANIFEST.md`), hashes later. 38 passing.

## Limits
my CIs only cover resampling these items with the same category mix. not inference repeats, training, deployment, future benchmarks, or general capability. same note lives in `docs/UNCERTAINTY.md` and will go in the certificate.

## How I run it
- I need Node 20+ (I'm on Node 24).
- I run `npm test` to verify the deterministic core.

## Next
I run the full 16-protocol table next and write my certificate.
