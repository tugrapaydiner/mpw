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
Fixture: I locked in our exact setup in `src/mpwFixture.js` — 2 synthetic models (MODEL_A, MODEL_B), 400 paired items (100 per stratum across 4 strata), 4 binary exposed dims (reasoning_budget, answer_parser, retry_policy, tool_access), so 16 combos. Lab A is high/8192 + tolerant + one-retry + standard, Lab B is low/2048 + strict + no-retry + restricted. All synthetic, not claims about real models. I verified it with `npm test` (22 tests passing).

## How I run it
- I need Node 20+ (I'm on Node 24).
- I run `npm test` to verify the deterministic core.

## Next
I'm going to add the deterministic simulator that maps each of the 16 protocols to item-level outcomes, so I can show the opposite Lab A / Lab B conclusions and then run the witness search for real.
