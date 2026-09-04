# Research Formalization

## 1. Object of study

Let a finite protocol schema contain coordinates

\[
D = \{d_1,\ldots,d_n\}, \qquad d_i \in V_i,
\]

where each `V_i` is a finite value set. A protocol configuration is

\[
\theta \in \Theta = \prod_{i=1}^{n} V_i.
\]

An evaluation system maps a protocol to item-level evidence and then to a reported conclusion:

\[
\theta \xrightarrow{E} X_\theta \xrightarrow{T} R_\theta \xrightarrow{g} C(\theta).
\]

- `E` is an executable evaluation or simulator.
- `X_θ` is item-level evidence, ideally paired across compared models.
- `T` is a statistical summary procedure.
- `R_θ` contains effects, uncertainty intervals, diagnostics, and provenance.
- `g` is an explicit conclusion rule, for example `MODEL_A`, `MODEL_B`, or `INCONCLUSIVE`.

The separation matters: a protocol difference may alter raw outcomes, the statistical summary, or only the final categorical decision. Reconciliation must not hide which level changed.

## 2. Two-source dispute

Let two source publications provide protocols `θ_A` and `θ_B`. The exposed difference set is

\[
H = \{d \in D : \theta_A[d] \ne \theta_B[d]\}.
\]

A dispute exists under a fixed conclusion rule when

\[
C(\theta_A) \ne C(\theta_B).
\]

Before reconciliation, each publication must be replayable or otherwise validated against its declared evidence. A source-integrity failure is not a reconciliation result.

## 3. Exact substitution operator

For any `S ⊆ H`, define the A-to-B hybrid

\[
\theta_{A\leftarrow B,S}[d] =
\begin{cases}
\theta_B[d] & d \in S,\\
\theta_A[d] & d \notin S.
\end{cases}
\]

Only coordinates in `S` may change. The reverse operator `θ_(B←A,S)` is defined analogously. Substitution must be validated as an invariant, not inferred from labels.

## 4. Categorical protocol witness

For direction `A→B`, a subset `S ⊆ H` is categorically sufficient when

\[
C(\theta_{A\leftarrow B,S}) = C(\theta_B).
\]

The **minimum-cardinality categorical protocol witnesses** are

\[
\mathcal{W}^{\mathrm{cat}}_{A\to B} =
\operatorname*{argmin}_{S\subseteq H}
\left\{|S| : C(\theta_{A\leftarrow B,S})=C(\theta_B)\right\}.
\]

If no subset is sufficient, the result is `UNRESOLVED_WITHIN_EXPOSED_SPACE`. If the empty set is sufficient, the sources do not form a categorical dispute under the current replayed rule, or the target category is already reproduced at the base.

The public term **Minimal Protocol Witness (MPW)** is retained as a domain label for members of this set, but it is not presented as a new causal primitive. Mathematically it is a minimum-cardinality contrastive counterfactual explanation over exposed protocol coordinates.

## 5. Minimum is not one thing

The engine must distinguish:

- **minimum cardinality:** minimizes the number of changed coordinates;
- **minimum cost:** minimizes `Σ_(d∈S) w_d` for declared non-negative costs;
- **inclusion minimality:** no strict subset is sufficient;
- **Pareto minimality:** non-dominated under several declared objectives.

The default MPW objective is minimum cardinality because it is transparent and requires no subjective weights. A cost objective is valid only when costs and their units are supplied by the publication package. Inclusion-minimal sets must never be reported as globally minimum-cardinality witnesses.

## 6. Co-minimums and asymmetry

Several subsets may tie at the global minimum. A correct exact result returns all of them.

In general,

\[
\mathcal{W}_{A\to B} \ne \mathcal{W}_{B\to A}.
\]

Asymmetry can arise from a non-linear conclusion map, interactions, an `INCONCLUSIVE` region, categorical coordinate values, or direction-dependent execution. Both directions should therefore be computed and labeled separately when both are scientifically meaningful.

## 7. Non-monotonicity

Sufficiency is not assumed monotone. It is possible that

\[
S \text{ is sufficient but } S\cup\{d\} \text{ is not sufficient}.
\]

For example, one change may reverse a ranking while a second change moves the interval back across zero. Therefore algorithms that prune supersets after finding a sufficient subset, or prune subsets after finding an insufficient set, are unsound unless a domain-specific monotonicity theorem is supplied and checked.

For an arbitrary black-box Boolean sufficiency oracle, no generic exact algorithm can avoid exponential worst-case query complexity. An adversary can place the only sufficient set at the last unqueried subset, or make no subset sufficient. Cardinality-first enumeration is thus an appropriate exact baseline. Structural acceleration is possible only with additional assumptions, encodings, or approximate/anytime semantics.

## 8. Proof-status vocabulary

Search results must report separate guarantees:

- `minimumProven`: every subset smaller than the returned cardinality was evaluated and found insufficient;
- `coMinimumComplete`: every subset at the winning cardinality was evaluated;
- `landscapeExhaustive`: every subset in `2^H` was evaluated;
- `evaluatedSubsets`: exact oracle-call count;
- `totalSubsets`: `2^|H|` when representable safely;
- `searchLimit`: declared dimension/evaluation cap.

A cardinality-first search can have the first two guarantees while `landscapeExhaustive=false`.

## 9. Beyond categorical equality

Categorical equality is useful for explaining a headline reversal, but it discards effect magnitude. The engine should report, not silently optimize, complementary quantities.

### 9.1 Effect restoration

Let `Δ(θ)` be the paired effect estimate. Define target distance

\[
d_\Delta(S) = |\Delta(\theta_{A\leftarrow B,S}) - \Delta(\theta_B)|.
\]

A normalized restoration fraction may be reported only when the denominator is non-zero:

\[
r_\Delta(S)=1-\frac{d_\Delta(S)}{|\Delta(\theta_A)-\Delta(\theta_B)|}.
\]

Because this quantity can be below zero or above one, it must not be clipped without disclosure. Raw effect distance remains the primary interpretable diagnostic.

### 9.2 Effect-matching witness

For a declared tolerance `ε ≥ 0`, an effect-matching witness satisfies

\[
d_\Delta(S) \le \varepsilon.
\]

The tolerance and units are part of the estimand. Overlap between two pointwise confidence intervals is not an equivalence test and is not used as the default effect-matching rule.

### 9.3 Robust witness

Let `P` be a predeclared set of admissible perturbations to scoring thresholds, benchmark strata, seeds, or model-run draws. A robust categorical witness satisfies the target conclusion for every `p ∈ P`:

\[
\forall p\in P,\quad C_p(\theta_{A\leftarrow B,S})=C_p(\theta_B).
\]

This is stronger than the current deterministic fixture. `P` must be explicit; “robust” is otherwise empty language.

### 9.4 Nuisance sensitivity

A dimension can materially change `Δ` without changing `C`. Such a dimension is not a categorical witness but may still be scientifically consequential. Report its effect movement and category-specific pattern as a nuisance/sensitivity diagnostic, not as a cause.

### 9.5 Interaction

For dimensions `x,y`, a simple conclusion-level interaction flag is present when neither singleton is sufficient but `{x,y}` is sufficient. Effect-scale interaction requires a declared contrast, for example

\[
I_{x,y}=\Delta_{xy}-\Delta_x-\Delta_y+\Delta_\varnothing.
\]

It should be reported in the same units as `Δ`, with uncertainty if inferential claims are made.

## 10. Statistical estimand and multiplicity

The canonical project resamples benchmark items while preserving category counts. Under a deterministic simulator this characterizes sensitivity to the finite item composition. It does **not** estimate repeated model-run variance, training variance, deployment drift, or universal model capability.

If the engine evaluates `m` protocol subsets and selects a witness using their intervals, individual 95% intervals do not provide a 95% statement about the selected witness. The family of conclusions is a multiple-inference object.

Two defensible modes are therefore distinguished:

1. **Descriptive deterministic mode.** Treat `C(θ)` as a deterministic rule on the fixed benchmark evidence. The witness is exact for that finite artifact, and the bootstrap is clearly labeled sensitivity analysis.
2. **Selection-aware inferential mode.** Use simultaneous confidence intervals or a familywise testing procedure over the predeclared protocol family, preserving the joint dependence induced by common items. A max-deviation bootstrap is a natural finite-family baseline; Romano-Wolf style stepdown procedures can improve power when their assumptions are met.

A witness should carry the inference mode and family definition. The project must not convert a pointwise interval into a post-selection confidence guarantee by wording alone.

## 11. What is scientifically inferred

A verified categorical MPW supports only this conditional statement:

> Within the declared finite protocol coordinates, fixed source values, evidence generator, benchmark, statistical procedure, and conclusion rule, changing exactly this minimum-cardinality coordinate set is sufficient to reproduce the target categorical conclusion.

It does not establish:

- actual causality in the source laboratories;
- that omitted protocol dimensions are irrelevant;
- that the target report is correct;
- universal model superiority;
- that the same witness will persist on new items or repeated stochastic runs;
- that cardinality is the scientifically preferred intervention cost.

## 12. Portable verification requirements

A portable reconciliation artifact needs enough information for an implementation independent of the UI to:

1. validate a versioned schema;
2. identify source packages and evidence by content hash;
3. reconstruct `H` and each hybrid exactly;
4. replay or validate every evaluated subset;
5. recompute effects, intervals, and conclusion labels;
6. recompute all minimum and co-minimum witnesses;
7. validate direction, candidate, proof-status fields, and search bounds;
8. recompute the artifact hash without self-reference.

A hash-only checker is a content-integrity checker, not a scientific replay verifier.
