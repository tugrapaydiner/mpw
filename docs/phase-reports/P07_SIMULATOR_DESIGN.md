# P07 simulator design

objective: lock simulator design on paper, no implementation.
files changed: `docs/SIMULATOR_SPEC.md`, this report.
tests run: `npm run verify` green (unchanged code, 73/73, build ok).
failures discovered: none in code. one calibration risk noted, not a failure.
fixes: none.

content: entry signature, 6 item latents, 5 profile params, 4 protocol fields, 8-step mechanism order with parser/retry/tool isolation rules, exact tuple-hash randomness + bootstrap streams, interpretable canonical scenario, predeclared acceptance targets, material = 2pp, no headline tuning.

risk flagged for tuning phase: parser-only CI low margin is thin (~1pp). budget/tool/retry margins healthy.
gate result: GREEN (design complete, code untouched).
blockers: none.
