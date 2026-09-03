# P44 optional-feature decision (human overrode the P43 gate; video still pending)

rule: a stable 90-point core beats a fragile 94-point concept. scored harshly.

## A. phase-boundary visualization

renders the 16-subset lattice colored by conclusion (MODEL_A / MODEL_B),
marking the flip boundary and the minimum witness. read-only view of the
existing verifyCanonical table; zero new science, zero new tools.
- upside: medium. makes exhaustiveness visible in one glance; strongest
  demo moment after the certificate. helps Execution + Creativity (+1).
- implementation risk: low. pure presentational component over data the
  app already holds; no state, service, or engine changes.
- scientific risk: none, if it renders table conclusions verbatim with
  the same glyph+text discipline (no color-only encoding).
- WebMCP compat risk: none. UI-only, no tool/schema changes.
- demo value: high. one screenshot-worthy frame; 10 seconds of narration.
- time/scope cost: small (one component + CSS + wording test).
- rollback: trivial (delete component, restore previous panel).
- recommend: BUILD — the only candidate with high demo value and
  near-zero blast radius.

## B. deterministic efficient experiment planner

suggests the next subset to try (singleton-first / binary-search order).
- upside: low-medium. fewer calls per investigation; but efficiency is not
  a judging criterion, and the current loop already completes in seconds.
- implementation risk: medium. new advisory surface inside investigation
  state; must stay advisory-only or it contradicts the agent-autonomy story.
- scientific risk: low if advisory (verification stays exhaustive), but any
  bug that skips subsets would be catastrophic to the core claim.
- WebMCP compat risk: low-medium. a fifth tool vs UI-only hint — either
  dilutes the four-tool contract or adds hidden agent guidance.
- demo value: low. "the app suggested what I was going to try" is weak TV.
- time/scope cost: medium (ordering logic + state + tests + spec updates).
- rollback: moderate (touches investigation + spec + tests).
- recommend: SKIP. marginal upside, real narrative cost, touches the core.

## C. optional Chrome-only cross-origin WebMCP research mode

exposes tools cross-origin (exposedTo/fromOrigins) for iframe embedding.
- upside: low. demonstrates advanced API knowledge, but judges evaluate
  the main page; ChatGPT's browser does not discover iframe tools at all,
  so the flagship environment gains nothing.
- implementation risk: high. permissions policy, origin gating, two
  registration paths, doubled test matrix.
- scientific risk: none directly, but a second serving path doubles the
  chance of serving stale/divergent state.
- WebMCP compat risk: high. directly contradicts the P28 audited posture
  (top-level only, no iframe dependency) that judges may verify.
- demo value: near zero. invisible in the canonical demo flow.
- time/scope cost: large.
- rollback: painful (security posture + docs + tests all touched).
- recommend: SKIP. all risk, no demo.

## decision: BUILD A only, after the video exists

A is approved for implementation on one condition: the current core is
submitted/recorded first, so a stable fallback always exists. B and C are
rejected. not SKIP ALL — A clears the bar.
