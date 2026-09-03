# P12 16-world gate — ACCEPTED

objective: full formal stats on all 16 worlds, enforce predeclared targets, derive headlines.
files changed: `src/engine/mpwVerify.ts` (+deriveCanonicalDeclarations), `tests/engine/mpwVerify.test.ts` (+derived-headline test). no criteria touched.
tests run: `npm run verify` green (96/96 in 18 files, build ok).
failures discovered: none in gate. one reverted tune (below), no fallout.

16-world table (scores as proportions, delta + CI in pp):
- base | A .8675 B .7600 | +10.75 [5.50,16.00] MODEL_A
- answer_parser | .7875/.7225 | +6.50 [1.00,12.00] MODEL_A
- reasoning_budget | .6025/.7250 | -12.25 [-18.25,-6.25] MODEL_B
- retry_policy | .7975/.6650 | +13.25 [7.75,18.75] MODEL_A
- tool_access | .8150/.7125 | +10.25 [4.75,15.75] MODEL_A
- ap+rb | .5450/.6800 | -13.50 [-19.50,-7.50] MODEL_B
- ap+ret | .6925/.6275 | +6.50 [0.25,12.75] MODEL_A
- ap+tool | .7425/.6725 | +7.00 [1.25,12.75] MODEL_A
- rb+ret | .4325/.6150 | -18.25 [-24.00,-12.25] MODEL_B
- rb+tool | .5575/.6850 | -12.75 [-18.75,-6.50] MODEL_B
- ret+tool | .7325/.6025 | +13.00 [7.25,18.75] MODEL_A
- ap+rb+ret | .3675/.5800 | -21.25 [-27.00,-15.50] MODEL_B
- ap+rb+tool | .5025/.6400 | -13.75 [-20.00,-7.50] MODEL_B
- ap+ret+tool | .6350/.5675 | +6.75 [0.50,12.75] MODEL_A
- rb+ret+tool | .3700/.5600 | -19.00 [-24.75,-13.25] MODEL_B
- full | .3150/.5250 | -21.00 [-26.75,-15.25] MODEL_B

category splits (A/B correct per 100; multi quant instr tool):
- base: 85/75 87/73 84/74 91/82
- parser-only: 77/72 85/69 72/67 81/81
- budget-only: 44/73 60/69 72/73 65/75
- retry-only: 77/62 78/59 78/71 86/74
- tool-only: 83/74 86/72 83/74 74/65
- full: 20/54 24/49 51/61 31/46

gate checks: Lab A established ✓ (5.5pp buffer). Lab B established ✓. parser-only established + 4.25pp move ≥ 2pp ✓. budget-only flips ✓. retry-only established, +2.5pp move ✓. tool-only established, +0.5pp (small by design: 30% tool items) ✓. budget unique singleton ✓. parser-only low bound 1.00pp is the thinnest margin — displays as 1.0pp, acceptable, flagged since P07.

parameter changes: one attempted tune (A reliability .92→.93) moved almost nothing and would have broken the audited narrative, so reverted. final params byte-identical to P09 audit.

headlines: `deriveCanonicalDeclarations()` computes Lab A MODEL_A / Lab B MODEL_B from live stats; test pins equality with the publication files. nothing hand-authored.

gate result: GREEN.
blockers: none.
