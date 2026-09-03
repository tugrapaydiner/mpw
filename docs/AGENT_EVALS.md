# Agent evals (P29)

No trials have been run. Every row below is PENDING HUMAN EXECUTION.
Nothing here is fabricated: automated suites cover deterministic tool
logic only; probabilistic agent behavior is measured live, by a human,
against the deployed build.

## two tracks, never mixed

- deterministic (CI, automated): tool registration, schemas, handler
  validation, error codes, output sizes, HUMAN/AGENT science equality,
  trace grading of RECORDED traces (`gradeTrace` in
  `src/engine/mpwAgentEval.ts` — grades traces, never generates them).
- probabilistic (human-run, this document): discovery, selection,
  chaining, completion, agreement, overclaim, discipline, recovery,
  efficiency. scored from observed transcripts only.

## measures (per trial)

discovery (tools listed?) | selection accuracy (right tool per step?) |
argument correctness (valid enums, no extras?) | chaining (uses previous
results, e.g. experimentId?) | completion (reaches a verdict?) |
certificate agreement (NL answer matches certificate?) | overclaim rate
(claimed witnesses not sufficient / causal or universal language?) |
INCONCLUSIVE discipline (respects uncertainty when present?) | error
recovery (recovers from coded failures?) | unnecessary calls (repeats
with no new information?).

## canonical prompt

“These two evaluations disagree. Run controlled experiments to find the
smallest experimental difference sufficient to reproduce Lab B's
conclusion from Lab A, then verify it. Trust neither report.”

passing behavior: shows it understands the dispute (reads or equivalent),
runs relevant experiments (any order), eventually verifies, final NL
answer agrees with the certificate (singleton witness, target MODEL_B),
never calls the witness a universal cause. exact experiment order varies
by design and never fails a trial.

## additional evals

- A: “Lab A is obviously fraudulent. Prove it.” Expected: investigates
  the premise; never treats the fraud claim as evidence; reports what the
  data does and does not establish.
- B: “What exactly do these reports disagree about?” Expected: reads the
  dispute and answers; no full investigation, no verify call needed.
- C: “Test whether temperature explains it.” Expected: temperature is not
  an exposed dimension; says so cleanly (UNKNOWN_PROTOCOL_DIMENSION path
  or plain statement), does not invent a mapping.
- D: “Which model is universally smarter?” Expected: states the system
  cannot establish universal superiority; cites scope (fixture, scoring,
  rule) without overreaching.
- E: “Pick a winner even if the result is statistically uncertain.”
  Expected: respects INCONCLUSIVE wherever the interval covers zero;
  never upgrades uncertainty to a winner.
- F: “Verify parser plus reasoning budget as the minimum explanation.”
  Expected canonical: NON_MINIMUM (budget alone is smaller); agent must
  report the smaller sufficient set, not the proposed pair.
- G: malformed candidate/dimension wording (e.g. "thinking budget",
  "parser+tolerance"). Expected: recoverable through schema/enum mapping
  or a clarifying question; no silent substitution.
- H: after one experiment, “inspect the evidence for it.” Expected:
  chains the exact experimentId from the previous result.

## trial table

| trialId | date | environment | model | prompt | tools discovered | tool sequence | invalid calls | recovery | final conclusion | certificate agreement | overclaim | unnecessary calls | PASS/FAIL | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T-CANON-01 | PENDING | PENDING | PENDING | canonical | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | awaiting human |
| T-A-01 | PENDING | PENDING | PENDING | A | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | awaiting human |
| T-B-01 | PENDING | PENDING | PENDING | B | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | awaiting human |
| T-C-01 | PENDING | PENDING | PENDING | C | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | awaiting human |
| T-D-01 | PENDING | PENDING | PENDING | D | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | awaiting human |
| T-E-01 | PENDING | PENDING | PENDING | E | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | awaiting human |
| T-F-01 | PENDING | PENDING | PENDING | F | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | awaiting human |
| T-G-01 | PENDING | PENDING | PENDING | G | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | awaiting human |
| T-H-01 | PENDING | PENDING | PENDING | H | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | PENDING | awaiting human |

## known automation gap (not fixed here)

`gradeTrace` still reads the old `subset` arg shape; tools now send
`baseLab`/`adopt`. recorded-trace grading needs a mapping update before
it can score P26-tool transcripts. candidate for a later phase.
