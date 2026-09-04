# Exact Witness Search: Black-Box Query Lower Bound

## Scope

This note concerns the most general MPW search problem:

- `H` contains `n` exposed protocol differences;
- each queried subset `S ⊆ H` returns an arbitrary Boolean sufficiency value;
- the conclusion landscape may be non-monotone;
- no algebraic, causal, smoothness, or decomposability structure is assumed;
- the required output is either every globally minimum-cardinality witness or a proof that no witness exists.

Under this oracle model, exponential behavior is not merely an implementation weakness. Some exact claims require exponentially many queries.

## Theorem 1: no-witness certificates

To certify that no sufficient subset exists for an arbitrary Boolean sufficiency map, an algorithm must query all `2^n` subsets in the worst case.

### Proof

Suppose an algorithm terminates after leaving some subset `U` unqueried and reports that no witness exists. Consider two sufficiency maps that agree on every queried subset:

1. every subset is insufficient;
2. every queried subset is insufficient, but `U` is sufficient.

The algorithm has observed the same transcript in both worlds but its no-witness answer is false in the second. Therefore every subset must be resolved before the no-witness claim is identified. Exhaustive enumeration meets the bound.

## Theorem 2: minimum cardinality plus all ties

Suppose the true minimum witness cardinality is `k`. To prove that cardinality and return **all** co-minimum witnesses under an arbitrary Boolean map, an algorithm must resolve every subset of cardinality at most `k` in the worst case.

The query lower bound is

`sum_(i=0)^k binomial(n,i)`.

### Proof

- If any subset of size below `k` remains unqueried, an alternative map can mark that subset sufficient while preserving all observed answers. The claimed minimum would then be too large.
- If any subset of size exactly `k` remains unqueried, an alternative map can mark it sufficient while preserving all observed answers. The algorithm's list of co-minimum witnesses would then be incomplete.

Thus every subset through cardinality `k` must be resolved. A cardinality-ordered search that completes the entire first sufficient level meets this lower bound on a worst-case landscape whose first successes occur at `k`.

## Consequence for the MPW algorithms

The repository distinguishes two exact modes:

- **minimum mode:** evaluate cardinalities from zero upward, finish the first sufficient level, and stop. It proves minimum cardinality and complete co-minimum recovery while avoiding unnecessary larger subsets.
- **landscape mode:** evaluate the entire powerset. It is required for interaction maps, nuisance diagnostics, full portable audit rows, and no-witness claims.

Calling minimum mode “full landscape exhaustive” would be incorrect. The certificate fields therefore distinguish:

- `minimumProven`;
- `coMinimumComplete`;
- `landscapeExhaustive`.

## Why monotone pruning is not used by default

If sufficiency were known to be monotone—once sufficient, every superset remains sufficient—then branch-and-bound, antichain methods, SAT/SMT encodings, or hitting-set formulations could exploit that structure.

MPW cannot assume monotonicity in general. Additional protocol substitutions can change a categorical conclusion away from the target, alter parsers, disable retries, introduce interactions, or move an interval through `INCONCLUSIVE`. The benchmark deliberately includes non-monotone landscapes.

A solver may use stronger methods only when the package declares and validates additional structure. Silently applying monotone pruning to an arbitrary conclusion map would make the minimum certificate unsound.

## What the lower bound does not say

The theorem does not imply that every practical reconciliation requires `2^n` expensive model evaluations.

Possible reductions include:

- caching and reusing already published grid rows;
- using minimum mode when a complete landscape is unnecessary;
- parallel evaluation;
- exploiting a proven monotone or decomposable class;
- batching model runs while preserving protocol identities;
- returning a budget-limited partial result without claiming an exact global minimum;
- using heuristic proposals that are subsequently verified exactly on a constrained candidate space.

The theorem applies to exact identification under an arbitrary black-box Boolean sufficiency map.

## Executable checks

The implementation is in:

- `src/research/queryLowerBound.ts`
- `tests/research/queryLowerBound.test.ts`

It provides exact `bigint` formulas, coverage checking for claimed certificates, and an executable demonstration that the repository's cardinality-ordered minimum search meets the lower bound when the first sufficient level is `k`.

The coverage checker intentionally verifies only that the required subsets were queried. A scientific verifier must separately validate each recorded sufficiency value, the target conclusion, endpoint identity, and the returned witness set.

## Research implication

The strongest scalable research direction is not to advertise a universally faster exact solver. It is to discover and validate structure in real protocol landscapes—monotonic regions, sparse interactions, factorization, or admissible lower bounds—that permits sound pruning while retaining an independently checkable certificate.
