# Minimum-Cost Protocol Witnesses

## Why cardinality is not always enough

Minimum cardinality treats every protocol coordinate as one equal unit. That is often useful and easy to audit, but coordinate granularity can make it misleading:

- changing an answer parser may be a one-line flag;
- replacing an agent scaffold may require a full implementation;
- rerunning a high-budget model may cost substantially more than changing a decoder option;
- one coordinate may bundle several operational interventions.

MPW therefore keeps cardinality as the primary default but supports a separate exact minimum declared-cost objective.

## Definition

Let `c(d)` be a predeclared non-negative integer cost for each exposed coordinate `d ∈ H`.

For a subset `S`, define

```text
cost(S) = sum_{d in S} c(d).
```

A minimum-cost witness minimizes `cost(S)` among all subsets satisfying the same declared sufficiency predicate. Every witness tied at the minimum total cost is returned, even when tied sets have different cardinalities.

The objective is **not** mixed silently with cardinality. A result identifies whether it is minimum-cardinality or minimum-declared-cost.

## Why costs are integers

The implementation requires non-negative safe integers because:

- exact equality of cost levels is part of all-tie recovery;
- arbitrary floating-point weights create unstable tie semantics;
- integer units can represent cents, milliseconds, token blocks, normalized engineering points, or another registered scale;
- overflow can be detected and rejected.

A project needing fractional units should scale a registered rational unit to integers rather than relying on approximate float equality.

## Exact search

All subsets are ordered by:

1. total declared cost;
2. cardinality;
3. canonical lexicographic subset key.

In minimum mode, the engine evaluates complete cost levels from zero upward. After the first sufficient cost level is fully evaluated, it stops and returns every tie at that level.

In landscape mode, every subset is evaluated.

No monotonicity assumption is made. A lower-cost subset can be insufficient while a higher-cost subset is sufficient, and adding a coordinate can remove sufficiency.

## Proof semantics

The result reports:

- `minimumCostProven`;
- `coMinimumCostComplete`;
- `landscapeExhaustive`;
- evaluated cost levels;
- evaluated and total subset counts;
- every evaluated subset with total cost and sufficiency.

A no-witness result requires a complete landscape. A budget ending inside a cost level cannot support an all-ties minimum-cost certificate and therefore fails instead of returning a partial winner.

## Examples

Suppose:

```text
cost(a) = 100
cost(b) = 1
cost(c) = 1
```

and either `{a}` or `{b,c}` is sufficient.

- minimum cardinality chooses `{a}`;
- minimum declared cost chooses `{b,c}`.

Neither answer is universally more correct. They solve different registered objectives.

If `cost(a)=2` instead, `{a}` and `{b,c}` are co-minimum cost witnesses and both must be returned.

Zero-cost coordinates are legal. If the empty set and `{a}` are both sufficient and `cost(a)=0`, both are co-minimum cost witnesses.

## Cost validity

Costs must be frozen before inspecting the witness landscape. Choosing weights after seeing the result is another specification search and can manufacture a preferred explanation.

A cost package should document:

- unit;
- measurement procedure;
- whether cost is monetary, computational, engineering, latency, or policy burden;
- uncertainty in the cost estimate;
- version and environment;
- whether costs are additive.

The current search assumes additive coordinate costs. Interactions in operational cost require either grouped coordinates or a future subset-cost function with a separately auditable representation.

## What minimum cost does not mean

A minimum-cost witness is not necessarily:

- the largest-effect change;
- easiest for every organization;
- the historical cause;
- ethically preferable;
- robust under stochastic reruns;
- stable under another coordinate schema.

Cost, effect restoration, robustness, and causal responsibility remain separate dimensions.

## Implementation and tests

- `src/research/costSearch.ts`
- `tests/research/costSearch.test.ts`

Tests cover cardinality-versus-cost disagreement, all cost ties, zero-cost coordinates, tight evaluation budgets, incomplete cost levels, no-witness proof, input-order invariance, missing/extra/negative/fractional costs, and safe-integer overflow.
