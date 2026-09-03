# P25 tool spec red team

objective: review the P24 spec as an agent-interface engineer, revise, no implementation.
files changed: `docs/WEBMCP_TOOL_SPEC.md` (revised), this report.
guidance used: Chrome build-tools page (goal -> initial state ->
role-play -> variance -> graceful recovery -> evals), imperative API +
site-tools pages re-read for annotations.
tests run: `npm run verify` green (176/176 in 27 files, build ok; no code touched).
failures discovered: three spec weaknesses, all fixed without new tools.

verdicts:
- orthogonal: PASS. context vs execute vs explain vs certify; read never simulates.
- read/run overlap: PASS, none.
- base/source semantics: WEAK -> FIXED. complement rule was implicit and
  verify's baseLab asymmetric. now: baseLab glossed as starting point,
  target always the other lab, adopt param renamed + complement stated.
- NL to enums: WEAK -> FIXED. added per-value glosses (budget/parser/
  retry/tools plain words) in conventions; no README needed.
- property descriptions: WEAK -> FIXED (were absent).
- answer leakage: PASS. four dims always listed together, never singled;
  worked example keeps the winner unnamed; grepped clean.
- cause language: PASS. no causal verbs anywhere in the spec.
- inspect useful: PASS, sharpened to "the numbers behind a result".
- verify standalone: PASS after adding target-derivation sentence.
- chaining: PASS. every link's key (dims, experimentId, subset) is
  produced by an earlier tool; read now also emits labs + strata.
- errors: FIXED per Chrome recovery guidance (every error names the fix;
  UNKNOWN_DISPUTE returns the valid id).
- flexibility: PASS. limit capped, empty adopt/candidate given defined
  meanings instead of bans.
- tool count: justified, 4 = context/act/explain/certify.
- canonical journey: role-played, completes.
- alternate orders: WEAK -> FIXED. disputeId was required everywhere,
  forcing read-first. now optional on TOOLS 2-4; cold verify degrades to
  informative statuses, never a dead end.

gate result: GREEN.
blockers: none.
