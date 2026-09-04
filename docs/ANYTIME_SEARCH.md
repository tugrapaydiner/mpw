# Honest Budget-Limited Witness Search

## Motivation

Exact full-landscape search is appropriate for four dimensions and useful for complete portable audits. It is not practical for arbitrary 50–100 coordinate spaces when each counterfactual evaluation is expensive.

A budget-limited search must not quietly return the best candidate seen and label it globally minimum. `anytimeCardinalityWitnessSearch` instead returns the strongest statement justified by the evaluated cardinality prefix.

## Search order

Dimensions are canonicalized, then subsets are streamed by:

1. cardinality from zero upward;
2. lexicographic combination order within a cardinality.

The implementation generates combinations lazily. It does not materialize the `2^n` powerset and can therefore evaluate, for example, the empty set and all 100 singleton candidates using 101 calls.

No monotonicity assumption is made.

## Result states

### `EXACT_MINIMUM`

Every subset smaller than the winning cardinality and every subset at the winning cardinality has been evaluated. Therefore:

- minimum cardinality is proven;
- every co-minimum witness is known;
- larger subsets need not be evaluated.

If the winning cardinality is `n`, the complete landscape has also been evaluated.

### `EXACT_NO_WITNESS`

Every subset has been evaluated and none is sufficient. This is the only state that proves no witness exists.

### `PARTIAL_MINIMUM_TIES_INCOMPLETE`

All smaller cardinalities are complete and at least one sufficient subset has been observed in the active cardinality, but the budget ended before that level was complete.

Therefore:

- the minimum cardinality is proven exactly;
- listed witnesses are known minimum witnesses;
- additional co-minimum witnesses may remain;
- no complete all-ties certificate is issued.

This state is stronger than a generic partial result and weaker than `EXACT_MINIMUM`.

### `PARTIAL_NO_SUFFICIENT_OBSERVED`

Every completed smaller cardinality is insufficient, but the budget ended before the active cardinality was complete and no sufficient candidate has yet been observed there.

The result provides:

- a lower bound on minimum cardinality;
- no finite upper bound unless another independently verified candidate is supplied;
- no witness certificate.

Absence of an observed witness is not evidence of no witness beyond the evaluated prefix.

## Proof fields

The result exposes:

- `minimumCardinalityLowerBound`;
- `minimumCardinalityUpperBound`;
- exact `minimumCardinality` when proven;
- `knownMinimumWitnesses`;
- completed cardinalities;
- active-cardinality progress;
- exact total subset count as a decimal string;
- `minimumCardinalityProven`;
- `coMinimumComplete`;
- `noWitnessProven`;
- `landscapeExhaustive`.

The total count uses `bigint` internally so a 100-coordinate space can report `2^100` without unsafe-number rounding.

## Relationship to the black-box lower bound

When the first sufficient cardinality is `k`, exact minimum and complete tie recovery require all subsets through `k` in the arbitrary black-box model. The anytime algorithm reaches `EXACT_MINIMUM` at exactly that proof boundary.

If the budget ends inside the level, the algorithm reports the precise partial state rather than pretending the lower bound was met.

## Proposal strategies

Model-guided, greedy, random, or domain-informed strategies can still be useful for finding an upper-bound candidate quickly. They should be represented separately from the exact prefix proof.

A future combined system can report:

- a verified lower bound from cardinality-prefix search;
- a verified sufficient candidate and upper bound from a proposal strategy;
- exact minimum only when lower and upper bounds meet;
- complete ties only when the entire winning level is resolved.

The current anytime implementation intentionally keeps proposal order deterministic and simple so its proof semantics remain transparent.

## Tests

- `tests/research/anytimeSearch.test.ts`

The tests cover all four states, tight level-completion budgets, full-set landscape exhaustiveness, 100-coordinate streaming, input-order invariance, and malformed/non-Boolean inputs.

## Claim boundary

Anytime search improves scalability of **honest partial information**. It does not evade the exponential worst-case exact-query requirement and does not turn heuristic candidates into global proofs.
