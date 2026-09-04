# External Harness-Grid Study Results

## Status

**VERIFIED BY EXECUTION** through the repository's `External Fragility Grid Study` GitHub Actions workflow.

- workflow run: `33814044740`
- workflow head: `bcd9482062f7f908475aebf9ab5c37d4107ad8ff`
- artifact: `9916109342`
- artifact digest: `sha256:abb4252d0fe541f372fd11afec4d46e3116f369001f8169b47bcbee980260e3c`
- compact machine-readable ledger: `data/external/fragility-grid-study-result.json`

The candidate set and analysis rules were frozen before execution. The raw derived files remain attached to the workflow run; the repository ledger records the observed result and its provenance.

## Registered questions

The study deliberately separated two claims that are easy to conflate.

### Minimum-witness question

For each frozen external endpoint pair, does the declared finite protocol grid contain a globally minimum witness of cardinality two?

This is the MPW question. It asks whether substituting both selected protocol coordinates is sufficient to reproduce the target conclusion and whether no smaller subset is sufficient under the declared rule.

### Strict-interaction question

Does the pair reproduce the target while **neither** singleton substitution changes the base conclusion?

This is a stronger condition. It describes a pure two-coordinate interaction relative to the categorical conclusion map. A two-coordinate minimum witness does not imply this condition: a singleton may change the base conclusion without reaching the target conclusion.

## Executed result

| Quantity | Observed result |
|---|---:|
| frozen candidates | 5 |
| candidates with a globally minimum cardinality-two witness | 5 |
| candidates passing the strict interaction criterion | 0 |

The external study therefore produced a mixed result:

- **Supported:** all five frozen candidates retained a globally minimum two-coordinate witness under the declared MPW sufficiency rule.
- **Not supported:** none established the stronger pure-interaction claim.

This negative result is scientifically useful. It prevents the project from silently relabeling minimum-cardinality reconciliation as interaction discovery.

## Why the distinction matters

Suppose the base conclusion is `MODEL_A`, one singleton produces `INCONCLUSIVE`, and the pair produces target conclusion `MODEL_B`. The pair can still be the minimum set sufficient to reproduce `MODEL_B`, because neither singleton reaches `MODEL_B`. But the pair fails the strict criterion that both singleton conclusions equal the original base conclusion.

Accordingly, MPW should report:

1. categorical sufficiency relative to the target;
2. global minimum cardinality;
3. singleton and lower-order conclusions;
4. interaction diagnostics separately.

It should never infer a mechanistic interaction merely from witness cardinality.

## Reproduction boundary

The workflow checks out the frozen analysis revision, installs locked dependencies, verifies the repository, executes the external study runner, and uploads derived artifacts. Reproduction requires the external source revision and network-accessible data declared by the workflow and study plan.

The compact ledger is not presented as an independent reproduction of the raw artifact. Its role is to make the result non-ephemeral and to bind the public claim to the exact workflow run and artifact digest.

## Limitations

- Five selected cases do not establish prevalence in the population of model-evaluation disagreements.
- Endpoint and coordinate selection can affect whether an MPW exists.
- A finite observed grid cannot establish behavior outside the grid.
- Categorical equality can conceal large effect-size differences.
- The external study establishes descriptive reconciliation, not causal responsibility.
- The absence of strict interaction in these five cases does not imply interactions are absent generally.

## Consequence for the project

The result strengthens MPW as a **reconciliation** construct while narrowing any interaction language. Future external studies should preregister and report minimum-witness recovery, effect restoration, lower-order conclusion changes, and strict interaction as separate outcomes.
