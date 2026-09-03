# submission draft (P41) — project name: PROJECT_NAME_UNSET

## ONE-SENTENCE SUMMARY

Two published evaluations disagree on the same benchmark; PROJECT_NAME_UNSET lets a
human and a browser agent jointly rerun the protocol differences as controlled
experiments and certifies the smallest change that reproduces the disagreement.

## SHORT DESCRIPTION

PROJECT_NAME_UNSET reconciles contradictory model-evaluation reports. Lab A and Lab B
test the same two models on the same 400 synthetic items and reach opposite conclusions
because their protocols differ in four settings. The page exposes the dispute as four
WebMCP tools; the human and the agent run hybrid experiments together until the
deterministic engine verifies the global minimum-cardinality witness and issues a
content-hashed certificate. All demonstration model outputs are synthetic and
deterministic — not claims about real AI models.

## WHAT IT DOES

- Shows two conflicting evaluation reports side by side with scores, intervals, and
  the four protocol differences.
- Lets the human or the agent build hybrid protocols (adopt any subset of the other
  lab's settings) and executes them in a deterministic simulator with paired bootstrap
  statistics.
- Verifies any proposed explanation against all 16 protocol combinations and reports
  VERIFIED / NOT_SUFFICIENT / NON_MINIMUM / UNRESOLVED with every tied minimum kept.
- Issues a hash-identified Reconciliation Certificate (full audit table, witness
  experiment, coverage 400/400, stated limitations) that downloads as verifiable JSON.

## PROBLEM

Evaluation outcomes depend on harness and protocol choices: scaffold-only swings up to
15 points on SWE-bench Verified (Epoch AI, 2026), harness-selected leaderboard winners
(fragility grid, 2026), rank flips on every alignment benchmark tested (SafetyRepro,
2026). Reconciling two conflicting reports today means weeks of manual reimplementation
with no standard artifact. (Sources: docs/IMPACT_AND_PRIOR_ART.md.)

## WHY WEBMCP

The dispute is an interactive investigation, not a document. WebMCP lets the agent
operate the same experiment controls the human clicks — reading the dispute, running
hybrids, inspecting evidence, verifying witnesses — against shared live state, instead
of screen-scraping charts or working from a pasted summary.

## HOW WEBMCP IMPROVES UX

One page, one state, two investigators. The human ticks boxes; the agent calls tools;
both see the same trace, evidence, verification, and certificate update immediately.
No chat transcripts to reconcile, no screenshots to compare.

## WHAT HUMAN + AGENT CAN DO TOGETHER

What neither does well alone: the human brings the question ("which difference
matters?") and judgment; the agent brings exhaustive follow-through (trying
combinations, chaining experiment ids into evidence inspection, checking the
candidate). Difficult before: jointly running controlled protocol experiments inside
a live benchmark page, with every step recorded and certified.

## HOW IT WORKS

Top-level `document.modelContext.registerTool` registers exactly four tools. Handlers
validate independently, then call shared application services (caller AGENT; the UI
uses the same services as HUMAN). All science — simulator, stratified paired
bootstrap (10k replicates, fixed strata), powerset verifier, JCS canonicalization,
SHA-256, certificate minting — runs deterministically in-page. No backend, no keys.

## SCIENTIFIC ENGINE

400 synthetic items (4×100 strata), two model profiles, tuple-hashed draws;
CI-only conclusion rule; source-integrity reproduction gates; 16-world exhaustive
verification (minimum 1, unique witness `{reasoning_budget}`, target MODEL_B);
finalized publication bundles with nonrecursive hash boundaries; clock-free
certificate verified by `verifyCertificate`. 192 automated tests, pinned seeds,
byte-identical rebuilds.

## CHALLENGES

Making the agent unable to cheat: tool descriptions never name the answer; the
minimum is always recomputed, never stored; hashes prove identity, not truth.
Making absence graceful: the manual app works fully without WebMCP. Making claims
honest: every limitation (conditional minimality, resampling scope, synthetic data)
is printed in the UI and the certificate.

## WHAT WE LEARNED

A capable agent with repo access answers from the answer key instead of running
experiments — so trials must constrain evidence to page tools only. And: the
scientifically load-bearing work was the validation gates (integrity first,
coverage 100%, exact-value compares), not the headline algorithm.

## WHAT'S NEXT

Human-run live trials (protocol ready in docs/AGENT_EVALS.md), gallery collision
check once published, then frozen for judging.

## TESTING INSTRUCTIONS SHORT VERSION

Open the URL (no login). In a WebMCP browser (ChatGPT desktop app, Sol or Terra)
check Site tools shows the four tools, then send: “These two evaluations disagree.
Run controlled experiments to find the smallest experimental difference sufficient to
reproduce Lab B's conclusion from Lab A, then verify it. Trust neither report.” Any
order passes. Expect the verified minimum witness `{reasoning_budget}` with
certificate. Without WebMCP the same flow works manually; reset restores pristine
state.
