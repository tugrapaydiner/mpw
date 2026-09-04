# Static Protocol Grid Package

## Purpose

A `StaticProtocolGridPackage` is the smallest portable input format currently supported by the generic reconciliation core. It represents two publication endpoints and the complete finite cube formed by substituting exactly the protocol coordinates on which those endpoints differ.

This format moves MPW beyond the canonical in-bundle simulator. A package can be produced from an external harness grid, a multiverse analysis, or another evaluation system and reconciled without importing MPW's synthetic model profiles.

It is intentionally narrower than an arbitrary evaluation-upload format.

## What it contains

Version 1 contains:

- benchmark metadata;
- a typed finite protocol schema;
- publication A and B identifiers, content hashes, protocols, and declared observations;
- one structured observation for every endpoint-substitution world;
- explicit limitations;
- RFC 8785/JCS canonical bytes and a SHA-256 content identity.

The package requires exactly `2^|H|` worlds, where `H` is the set of coordinates on which the two source protocols differ. Every world must use one endpoint value for every differing coordinate. Duplicate, missing, and outside-cube worlds are rejected.

The package supports categorical and numeric finite values. It is not restricted to the canonical four binary protocol dimensions.

## Validation guarantees

`verifyStaticProtocolGridPackage` establishes:

1. exact wrapper shape and version identity;
2. valid finite schema and endpoint protocols;
3. exact endpoint-cube completeness;
4. unique protocol worlds;
5. agreement between each publication declaration and its endpoint row;
6. deterministic world ordering;
7. canonical-byte, SHA-256, and package-id integrity.

`reconcileStaticProtocolGridPackage` then delegates to the same generic exact reconciliation engine used by other research adapters. It supports both `A_TO_B` and `B_TO_A`, all co-minimum witnesses, empty witnesses, no-witness results, and non-monotone landscapes.

## What it does not establish

A valid static package does **not** establish that:

- a publisher is authentic;
- the reported observations are true;
- an underlying model was actually run;
- item-level evidence is complete;
- the protocol coordinates are causal;
- unexposed dimensions are irrelevant;
- the benchmark generalizes to another population.

Content hashing detects a changed package only relative to a known identity. A party able to alter content and recompute the hash can produce a different internally valid package. Authentication, signatures, attestations, and evidence replay are separate layers.

## Static versus executable reconciliation

Static reconciliation is appropriate when a complete protocol grid has already been evaluated and published. It verifies the combinatorial reconciliation claim over those rows.

Executable reconciliation is stronger when a trusted evaluator can rerun requested hybrids from item-level inputs. The existing v2 reconciliation certificate demonstrates deterministic replay for the canonical evaluator, but a general executable publication-package standard remains future work.

Federated reconciliation—where independent sites execute their own protocol operations—requires additional identity, availability, versioning, and adversarial-publisher rules and is not claimed by version 1.

## Scientific interpretation

The result remains directional and conditional:

> a globally minimum-cardinality subset of the exposed endpoint differences whose exact substitution makes the recorded conclusion equal the target publication's recorded conclusion.

It is a descriptive statement over the declared grid. It is not, by itself, a causal explanation of why the original publications disagreed.

## Complexity

The endpoint cube contains `2^|H|` rows. Version 1 rejects more than 20 differing coordinates instead of silently accepting a package that is impractical to validate exactly. This cap is an engineering limit, not an algorithmic theorem.

Under an arbitrary non-monotone conclusion map, a no-witness claim can require inspecting every row. The package therefore records a complete finite cube rather than pretending a monotone shortcut exists.

## Verification

The implementation and adversarial tests are:

- `src/research/staticGridPackage.ts`
- `tests/research/staticGridPackage.test.ts`

The tests cover forward and reverse reconciliation, all co-minimum recovery, world-order invariance, missing/duplicate/outside-cube rejection, endpoint-declaration mismatch, and hash tampering.
