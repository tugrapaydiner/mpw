# impact and prior art (P38, 2026-09-03)

researched from primary sources today. no confirmation bias: the strongest
adjacent work is cited as limiting our novelty, not hidden.

## REAL PROBLEM

evaluation outcomes depend on harness/protocol/scaffolding — now a
headline 2026 empirical consensus, not our conjecture:
- Epoch AI benchmark-reliability study: scaffold-only variation up to
  15pp on SWE-bench Verified; scaffold choice "the single biggest
  impact"; same model scores 74–80% across libraries (the-decoder.com,
  2026-01-10).
- Zhang et al., "Stop Comparing LLM Agents Without Disclosing the
  Harness" (arXiv 2605.23950): harness undisclosed, rarely held constant;
  same model ranks above or below competitors by harness alone.
- Harness-Bench (arXiv 2605.27922): 5,194 trajectories; capability must
  be reported at model–harness configuration level.
- Fragility grid (arXiv 2608.21382): 4 of 12 models each reach rank one
  under some defensible harness; "the choice of harness selects the
  winner"; most-discriminative items are the most fragile.
- SafetyRepro (arXiv 2605.25492): configuration alone flips pairwise
  verdicts on every alignment benchmark tested (all six orderings of
  three models reachable on XSTest).
- GAIA scaffold study (arXiv 2606.08529): within-model scaffold gaps to
  28pp; sensitivity grows with capability at hard levels.
- Reasoning benchmarks (arXiv 2504.07086): decoding/seed/prompt/hardware
  sensitivity; RL gains mostly vanish under re-evaluation.
- lm-eval lessons (Zou et al., arXiv 2405.14782): telephone game from
  benchmark to reimplementation; Benchmark Lottery (Dehghani et al.).
- Unified evaluation framework position (arXiv 2602.03238 / 2605.27898):
  scores conflate model with stack; standardize the substrate.

conflicting reports + irreproducibility are therefore real, current,
expensive problems — not strawmen.

## PRIMARY AUDIENCE

evaluation researchers and engineers choosing harnesses; benchmark
designers; leaderboard readers making deployment decisions; agent-interface
builders (WebMCP) who need agents to operate evaluations, not just read
about them.

## CURRENT MANUAL WORKFLOW

read two conflicting reports → suspect the harness → reimplement both
setups → grid-search configurations by hand → argue about which difference
matters. weeks of work, no standard artifact, conclusion usually prose.

## WHY CURRENT WEB UX IS INADEQUATE

leaderboards print one number from one harness (fragility grid: "the order
is not in the data"); reports are static PDFs; nothing on the web lets a
reader AND an agent jointly rerun the harness variations and certify which
difference flips the verdict.

## RELEVANT PRIOR ART

- harness-effect empirics: all of the above.
- method: multiverse analysis in ML (NeurIPS 2022, GP-surrogate search
  over config spaces); specification curves (Simonsohn et al., 2020);
  fairness multiverse (Simson et al., FAccT 2024); decision-maker
  multiverse dashboards (Antwerp IRUA).
- systems: Agent-Native Research Artifacts, Liu et al. (arXiv 2604.24658)
  + ARA-Labs repo — executable claims, exploration graphs, machine
  verification seals. closest systems prior.
- standards: NIST AI RMF 1.0 MEASURE (document TEVV, uncertainty,
  limitations, deployment-context validity) + GenAI Profile. we align;
  it is guidance, not a competing system.

## DIRECT COLLISION SEARCH

WebMCP Challenge gallery (webmcp.devpost.com/project-gallery): NOT YET
PUBLISHED by the managers — collision check impossible as of 2026-09-03.
no existing system found that starts from two conflicting web-published
evaluations AND exposes experimental ops to browser agents AND runs
protocol counterfactuals AND verifies a global minimum-cardinality
sufficient witness. multiverse work never targets minimum-sufficiency;
ARA never does counterfactual witness search or browser-agent tooling.

## WHAT IS NOT NOVEL

harness-dependence itself; bootstrap CIs; exhaustive subset search;
JCS/SHA provenance; tool-calling agents; the executable-artifact idea.

## NARROW CONTRIBUTION

one deterministic instrument that operationalizes the 2026
harness-awareness consensus: conflicting published evaluations in,
browser-agent-operable counterfactual protocol search,
verified global-minimum sufficient witness out, content-hashed
certificate, human and agent sharing one audited state.

## UNSAFE CLAIMS (never make)

causality ("budget causes…"), universality ("MODEL_B is better"),
real-model claims, "first to notice harness effects", "first
executable science", any ranking of real systems.

## REMAINING DIFFERENTIATION

minimum-sufficiency witness + certificate + WebMCP-native operation +
full determinism in one loop. defensible while the gallery stays dark;
recheck the moment it publishes.

## SOURCES

all URLs above (arxiv + doi + nist.gov + devpost), fetched 2026-09-03.
positioning recommendation: frame as applied instrument for the
harness-awareness consensus, never as discoverer of the problem. no
product changes made here; any repositioning needs human decision.

urgency note: challenge deadline is 2026-09-03 1:00pm PDT — today.
submit + freeze take precedence over further research.
