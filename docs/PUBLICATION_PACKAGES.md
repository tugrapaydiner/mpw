# Evaluation Publication Packages

## Purpose

MPW's canonical simulator is a tutorial and deterministic regression fixture. A serious reconciliation system must also accept externally produced item-level evidence without pretending that two endpoint scorecards are enough to identify a minimum protocol witness.

The first external boundary is `StaticEvaluationFamilyPackage` version 1, defined by:

- `schemas/static-evaluation-family-v1.schema.json`;
- `src/research/staticFamily.ts`;
- `scripts/analyze-static-family.mts`.

## Required evidence

A package declares:

- a finite typed protocol schema;
- two fixed systems being compared;
- one benchmark item universe with immutable item IDs and strata;
- multiple protocol worlds;
- paired binary outcomes for every item in every world;
- two source worlds that define the disagreement;
- a predeclared bootstrap seed, replicate count, and confidence level;
- provenance strings and an explicit authenticity status.

Every world must contain the identical item universe. Duplicate item IDs, missing outcomes, changed strata, duplicated protocols, unsupported values, oversized arrays, malformed declarations, and extra properties fail closed.

## Identifiability gate

Let the two source protocols differ on `H`. Exact minimum-witness recovery requires the source-endpoint hybrid for every subset of `H` needed by the declared search. Version 1 currently requires the complete finite endpoint landscape.

If a required hybrid world is absent, the result is:

`INCOMPLETE_PROTOCOL_LANDSCAPE`

not a guessed witness and not an optimistic extrapolation.

This distinction is central:

- **Observed disagreement:** two source worlds produce different conclusions.
- **Identifiable minimum witness:** the supplied evidence supports exact evaluation of every relevant candidate and proves the minimum.

The former does not imply the latter.

## Inference modes

The analyzer computes both pointwise and synchronized simultaneous intervals for the package's predeclared world family. The caller chooses which conclusion map defines the reconciliation run:

```bash
npx vite-node scripts/analyze-static-family.mts package.json --mode=pointwise
npx vite-node scripts/analyze-static-family.mts package.json --mode=simultaneous
```

A source's optional `declaredConclusion` is replayed against the selected inference mode. A mismatch raises `SOURCE_REPLAY_MISMATCH`.

## Trust boundary

Content hashing answers whether the package bytes and normalized scientific fields changed. Replaying the package answers whether its declarations follow from the supplied outcomes and method. Neither operation establishes that:

- the named publisher created the package;
- the upstream measurements were honestly produced;
- the systems have the claimed identities;
- an omitted protocol coordinate is irrelevant;
- the benchmark supports population-level capability claims.

`provenance.authenticity` is therefore explicit and currently limited to `UNVERIFIED` or `LOCALLY_ATTESTED`. Cryptographic publisher signatures and transparency logs are future work, not implied by SHA-256 identity.

## Why arbitrary uploads are not implemented

An unrestricted upload UI would add attack surface and suggest a level of interoperability the project has not earned. The versioned package and CLI establish the scientific contract first. A future UI importer should be a thin client over the same validator and should retain size limits, untrusted-content labeling, and the identifiability gate.

## Future package modes

Three architectures remain distinct:

1. **Static reconciliation:** a complete finite family of item-level outcomes is supplied.
2. **Executable reconciliation:** the publisher supplies a reproducible runner for requested protocol worlds.
3. **Federated reconciliation:** independent sites expose constrained scientific operations and signed evidence references.

Version 1 implements only the first. It does not claim to solve executable or federated trust.
