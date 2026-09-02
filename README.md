# Minimal Protocol Witness

Hey — I'm building this out step by step.

Right now it's just a clean starter so I have a good place to work from. I'll add to it in small commits as I figure out what I need.

## What I'm going for
- Keep it minimal
- Keep each step small and easy to follow
- Commit after each step so I can track how it grows

## Where I'm at
Step 1: I set up the repo with a README and gitignore.
Prompt 01: I added my deterministic core in vanilla JS (no deps) — I can generate item-level outcomes from a seed, rebuild them from counts, run paired stats with CI/p-value, and classify A>B / B>B / inconclusive. I verified it with `npm test` (9 tests passing). The LLM never calculates — WebMCP tools will call this code later.

## How I run it
- I need Node 20+ (I'm on Node 24).
- I run `npm test` to verify the deterministic core.

## Next
I'm going to add the witness search — I want to enumerate exposed protocol subsets, test sufficiency, prove the smallest one, return every co-minimum, and write a reproducible certificate.
