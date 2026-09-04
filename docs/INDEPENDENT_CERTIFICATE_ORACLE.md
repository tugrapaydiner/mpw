# Independent Certificate Reference Oracle

## Motivation

A scientific replay verifier can still share logic with the producer it is checking. If the certificate builder and replay path use the same erroneous search implementation, they may agree with each other while being wrong.

MPW therefore includes a second, deliberately simple reference oracle for complete finite reconciliation certificates.

## Verification layers

### Layer 1 — content integrity

The certificate wrapper is re-canonicalized and re-hashed. This detects content changes relative to the supplied digest and ID.

### Layer 2 — independent finite-proof oracle

`verifyCertificateWithReferenceOracle` does not call the production witness-search or reconciliation functions. From the certificate body alone, it independently:

1. validates the exposed coordinate set;
2. enumerates every subset by bitmask;
3. reconstructs the expected hybrid protocol for each direction and subset;
4. requires exactly one audit row per expected hybrid;
5. recomputes categorical sufficiency from observation and target labels;
6. recomputes the global minimum cardinality;
7. recomputes every co-minimum witness;
8. recomputes the selected candidate status;
9. checks subset-count and proof-completeness fields.

This layer verifies internal mathematical consistency of the recorded complete landscape. It does not rerun the underlying evaluator.

### Layer 3 — scientific evaluator replay

The existing certificate replay verifier executes the expected evaluator at both publication endpoints and across the complete finite landscape, then rebuilds the canonical certificate.

The strongest canonical verification therefore combines:

- content identity;
- an independent combinatorial reference oracle;
- evaluator replay against expected publication and evaluator identities.

## Why this is independent but limited

The reference oracle intentionally duplicates only a small amount of transparent logic:

- subset enumeration;
- exact endpoint substitution;
- categorical equality;
- minimum and all-tie extraction.

It does not reuse the optimized/general search path, production reconciliation service, or certificate builder.

It still shares the TypeScript runtime, JSON parser, canonicalization implementation, and certificate schema types. It is therefore an independent algorithmic check, not a formally verified implementation or independent-language reproduction.

## Failure modes detected

Adversarial tests cover rehashed changes to:

- sufficiency labels;
- hybrid protocol rows;
- minimum cardinality;
- minimum witness lists;
- candidate status;
- audit coverage and subset counts.

A party who changes scientific fields and recomputes the certificate hash still fails the reference oracle when the body is internally inconsistent.

## Failure modes not detected without evaluator replay

A complete but fabricated landscape can be internally consistent. The reference oracle alone cannot establish that:

- source observations came from real executions;
- evidence IDs identify complete evidence;
- recorded observations match an external evaluator;
- publishers are authentic;
- the protocol schema includes every consequential difference;
- the conclusion rule is scientifically appropriate.

Those require evaluator replay, evidence retrieval, authentication, and research-design review.

## Implementation

- `src/research/referenceCertificateOracle.ts`
- `tests/research/referenceCertificateOracle.test.ts`

The canonical certificate should pass both the reference oracle and scientific replay before the project describes it as replay-verified.
