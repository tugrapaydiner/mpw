# Robust-Witness Monte Carlo Validation

## Purpose

`findRobustProtocolWitnesses` has an analytic simultaneous lower-bound guarantee under its declared Bernoulli assumptions. A separate deterministic simulation validates that the software implementation behaves consistently with that guarantee and makes its error events explicit.

The simulation is not evidence about real models. It is an implementation study over known Bernoulli probabilities.

## Design

For every subset in a complete finite family, a scenario declares the true probability that a repeated evaluation reproduces a fixed target conclusion. Each Monte Carlo replication:

1. creates a pinned independent pseudo-random stream for each subset;
2. draws the declared number of Bernoulli repetitions;
3. runs the production robust-witness implementation;
4. records simultaneous-bound coverage failure;
5. records false robust-sufficiency certification;
6. records exact recovery of the true minimum cardinality and every true co-minimum witness;
7. records whether the method returned no witness.

The seed includes the study seed, replication number, and canonical subset key. Input order therefore does not alter draws.

## Metrics

### Simultaneous coverage failure

A replication fails simultaneous coverage when at least one reported familywise lower bound exceeds that subset's declared true reproduction probability.

The analytic construction controls this event at level `alpha` under its assumptions. The observed Monte Carlo frequency is a diagnostic of the implementation, not a new proof.

### False certification

A replication has a false certification when any subset with true reproduction probability below the predeclared threshold is labeled robustly sufficient.

Because robust sufficiency requires the simultaneous lower bound to clear the threshold, false certification is contained within a simultaneous lower-bound coverage failure for a below-threshold configuration.

### Exact minimum recovery

Recovery is counted only when both are correct:

- the global minimum cardinality;
- the complete set of co-minimum witnesses.

A conservative method can have valid error control while low recovery power. These properties are reported separately.

## Included scenarios

Automated tests include:

- a complete null family in which every true reproduction probability is below the robustness threshold;
- a strong unique singleton witness with a sufficient superset;
- deterministic repetition under a pinned seed;
- incomplete-grid and unsafe-size rejection.

The tests require false-certification and simultaneous-coverage failure frequencies not to exceed the declared level in the pinned runs. They also require high recovery in the strong-signal case and high no-witness recovery in the null family.

These thresholds are regression guards for deterministic simulation outputs. They do not turn a finite Monte Carlo run into a universal validation theorem.

## Implementation

- `src/research/robustWitnessSimulation.ts`
- `tests/research/robustWitnessSimulation.test.ts`

The simulator caps replications and trials per subset so hostile inputs cannot request unbounded work through this research utility.

## Interpretation boundary

A successful simulation supports the statement:

> Under the declared synthetic Bernoulli scenarios and pinned implementation, observed familywise-bound and false-certification behavior was consistent with the conservative design.

It does not support:

- a claim that real evaluation repetitions are i.i.d.;
- a claim that the target conclusion is known without uncertainty;
- a claim that the canonical deterministic witness is robust;
- a claim that the method is optimally powerful;
- causal attribution;
- a general benchmark-population inference.

## Next empirical step

The meaningful next study is a preregistered repeated-run evaluation in which run failures, grader variation, tool nondeterminism, model versions, stopping rules, and the target definition are fixed before outcomes are inspected. The deterministic simulation supplies a tested analysis path for that study; it does not replace it.
