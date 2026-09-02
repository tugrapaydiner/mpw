# Minimal Protocol Witness (MPW) — exact definition I build to

> I use the public term “Minimal Protocol Witness” only with this exact meaning. When I write code I prefer the precise internal names `minimumCardinality`, `minimumWitnesses`, `coMinimumWitnesses`.

## 1. What I mean, operationally and mathematically

Given:
- a fixed set `D` of **exposed protocol differences** (e.g. `["scoring-rule", "tie-handling", "item-filter"]`),
- a fixed base protocol (Lab A),
- a fixed target qualitative conclusion (Lab B's conclusion),
- a deterministic sufficiency predicate `isSufficient(S)` that is true iff adopting exactly the subset `S ⊆ D` on top of base reproduces the target conclusion under my fixed fixture + simulator/evaluator + scoring rule + uncertainty method + conclusion rule,

then an MPW result is:

- `minimumCardinality` = min { |S| : S ⊆ D and `isSufficient(S)` is true }, or null if no subset is sufficient,
- `minimumWitnesses` = ALL subsets S ⊆ D with |S| = `minimumCardinality` and `isSufficient(S)` true,
- `coMinimumWitnesses` = same set as `minimumWitnesses` (I keep both names so it's explicit I return every tie, not one example).

That's a **globally minimum-cardinality** subset. I prove it by exhausting the exposed protocol space in increasing cardinality order (see `src/mpwWitness.js`).

## 2. What I don't confuse it with

“Inclusion-minimal” only means “no strict subset of this set is sufficient.” That is weaker and I never substitute it.

Tiny example I test against:
- D = {a, b, c}
- sufficient sets = {a, b} and {c}
- {a, b} IS inclusion-minimal (neither {a} nor {b} alone works), but it is NOT an MPW.
- The only MPW is {c}, so `minimumCardinality` = 1 and `minimumWitnesses` = [["c"]].

If several different subsets tie at the global minimum (say {a,b} and {a,c} both work and nothing of size 0–1 works), I return ALL of them. I never pick one and drop the rest.

## 3. What an MPW is NOT

An MPW result is NOT:
- the true cause,
- a proof of universal causality,
- proof one lab was dishonest,
- proof one model is universally superior.

It's only “the smallest exposed change that flips my deterministic fixture to the target conclusion.”

## 4. What its validity is conditional on

Every MPW I report is conditional on all of these staying fixed:
1. exposed protocol dimensions (`D`),
2. fixed evaluation fixture (items, seeds, counts),
3. simulator / evaluator,
4. scoring rule,
5. uncertainty method,
6. conclusion rule.

If any of those change, I recompute. My Reconciliation Certificate must list all six so someone else can reproduce the claim.

## 5. How I enforce this in code

- Deterministic search only: `src/mpwWitness.js` → `findMinimumWitnesses({ exposedDimensions, isSufficient })`.
- The LLM/agent never decides sufficiency by judgment. `isSufficient` must be pure deterministic code (it will call `src/mpwCore.js` stats + conclusion rule).
- I enumerate cardinalities 0 → n and only stop after I finish the whole winning cardinality, so ties can't hide.
- I report `checkedCount` / `totalSubsets` / `searchedCardinalities` as my exhaustiveness proof.
- I cap exhaustive search at n = 20 dimensions (2^20 ≈ 1M checks) so the proof stays feasible. Above that I throw instead of guessing.

Related: `docs/MASTER_EXECUTION_CONTRACT.md` (my build rules), `src/mpwCore.js` (my stats + conclusion rule).
