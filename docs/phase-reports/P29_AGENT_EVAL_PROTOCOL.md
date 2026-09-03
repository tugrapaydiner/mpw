# P29 agent eval protocol

objective: eval protocol on paper. no trials run, none fabricated.
files changed: `docs/AGENT_EVALS.md` (new), this report.
tests run: `npm run verify` green (180/180 in 27 files, build ok; no code touched).
failures discovered: none. one automation gap noted, not fixed (out of scope).

content: deterministic/probabilistic split (CI owns the first;
transcripts own the second); ten per-trial measures; canonical prompt
with order-free passing behavior; evals A–H with expected behaviors
(fraud premise, minimal read, unexposed dimension, universal-smarter
refusal, INCONCLUSIVE respect, NON_MINIMUM reporting, malformed-input
recovery, experimentId chaining); trial table with nine PENDING rows.

gate result: GREEN.
blockers: human execution of T-CANON-01..T-H-01 on the deployed build.
