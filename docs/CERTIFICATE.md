# Reconciliation Certificates

## Verification levels

MPW certificate v2 deliberately separates two claims.

### Content integrity

`verifyCertificateIntegrity` checks:

- exact wrapper fields;
- certificate kind and schema version;
- RFC 8785/JCS canonical bytes;
- SHA-256 digest;
- deterministic certificate ID.

This establishes that the body matches the supplied content identity. It does not establish that the scientific fields are true.

### Scientific replay

`verifyCertificateReplay` additionally rebuilds the certificate with an expected evaluator and, when supplied, expected publication and evaluator identities. It recomputes:

- both source endpoint observations;
- the complete finite endpoint-substitution landscape required by the certificate;
- target conclusion;
- sufficiency of every audit row;
- global minimum cardinality;
- every co-minimum witness;
- selected candidate status;
- proof-completeness fields.

The result is `SCIENTIFIC_REPLAY_VALID` only when the reconstructed canonical body equals the supplied body.

## Request binding

A certificate binds its reconciliation direction and selected candidate. A successful B-to-A request cannot receive the canonical A-to-B artifact, and a non-minimum or insufficient candidate does not receive a verified certificate.

## Portable fields

The body records:

- objective and sufficiency semantics;
- protocol schema;
- publication endpoint identities and declarations;
- evaluator descriptor;
- direction;
- exposed and omitted differences;
- base and target replay observations;
- selected candidate;
- minimum cardinality and all minimum witnesses;
- search mode, evaluated count, total count, and proof flags;
- complete audit rows;
- explicit limitations;
- canonicalization and digest algorithms.

The JSON Schema is `schemas/reconciliation-certificate-v2.schema.json`.

## Standalone verification

```bash
npm run certificate:v2:write
npm run verify:certificate -- data/certificates/canonical-v2.json
```

Integrity-only validation is also available:

```bash
npm run verify:certificate -- data/certificates/canonical-v2.json --integrity-only
```

The canonical replay adapter is deterministic and bundled. A general external executable evaluator requires a separate trusted adapter and identity policy.

## Trust boundary

A certificate does not establish:

- publisher authenticity;
- truth of source measurements;
- absence of omitted protocol dimensions;
- causal responsibility;
- population generalization;
- correctness of an evaluator not independently trusted;
- software supply-chain integrity outside the declared identity boundary.

Signatures or attestations can authenticate an identity that controls a key, but they do not replace scientific replay or justify causal claims.

## Related package

`StaticProtocolGridPackage` provides a lower verification level for external finite grids. It validates content, schema, endpoint declarations, and cube completeness, then supports exact reconciliation over recorded observations. It does not replay underlying model runs.

See `docs/STATIC_PROTOCOL_GRID_PACKAGE.md`.
