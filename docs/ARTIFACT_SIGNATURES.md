# Detached Artifact Signatures

## Purpose

MPW uses SHA-256 content identities for reproducibility and tamper detection relative to a known digest. A content hash alone does not answer who published the digest.

`SignedArtifactIdentity` adds a detached Ed25519 signature over a small canonical statement binding:

- artifact kind;
- artifact ID;
- artifact SHA-256;
- issuer label;
- authentication purpose.

The signature is verified against a public key supplied by the relying party, not a key trusted merely because it appears beside the signature.

## Trust model

A valid signature establishes:

> the holder of the private key corresponding to the independently trusted public key signed this exact artifact identity statement.

It does not establish:

- that the issuer label is truthful;
- that the key belongs to the claimed organization unless anchored separately;
- that the artifact's scientific contents are correct;
- that evidence is complete;
- that the protocol schema has no omissions;
- causality or generalization.

A malicious party can generate its own key and self-sign arbitrary content. Such a signature is cryptographically valid against the attacker's public key and untrusted against the relying party's expected key. The test suite demonstrates both outcomes.

## Statement

The signed statement is:

```json
{
  "kind": "ArtifactIdentityStatement",
  "version": 1,
  "artifactKind": "...",
  "artifactId": "...",
  "artifactHash": "64 lowercase hex characters",
  "issuer": "...",
  "purpose": "artifact-content-authentication"
}
```

It is serialized with RFC 8785/JCS before signing.

No wall-clock timestamp is inserted automatically. Time, validity period, revocation, release channel, and transparency-log position require an explicit higher-level policy rather than nondeterministic hidden metadata.

## Public-key fingerprint

The verifier exports the Ed25519 public key as an OKP JWK and canonicalizes only:

```json
{
  "kty": "OKP",
  "crv": "Ed25519",
  "x": "..."
}
```

The SHA-256 of those canonical bytes is the key fingerprint recorded in the signature wrapper. The relying party still needs an external way to decide which fingerprint is trusted.

Possible trust anchors include:

- a repository release policy;
- an organization website served through an authenticated channel;
- a transparency log;
- a signed key-transition statement;
- an institutional certificate or attestation system.

MPW does not currently operate such a trust service.

## Signature wrapper

The wrapper records:

- kind and version;
- algorithm (`Ed25519`);
- normalized statement;
- canonical statement bytes as text;
- key fingerprint;
- canonical base64url signature;
- content-derived signature ID.

The JSON Schema is:

`schemas/signed-artifact-identity-v1.schema.json`

## Verification order

`verifyArtifactIdentitySignature`:

1. requires exact wrapper fields;
2. validates the statement and SHA-256 shape;
3. recomputes canonical statement bytes;
4. derives the fingerprint of the expected public key;
5. checks any expected artifact kind, ID, hash, and issuer supplied by the relying party;
6. verifies the Ed25519 signature;
7. recomputes the signature ID.

The expected key is mandatory. A wrapper cannot make itself trusted by embedding a replacement key.

## Relationship to scientific replay

Signatures and scientific replay answer different questions:

- **content hash:** are these the same canonical bytes as the referenced artifact?
- **signature:** did the expected key sign this artifact identity?
- **scientific replay:** does an expected evaluator reproduce the recorded scientific result?
- **research review:** are the estimand, assumptions, protocol schema, and claims defensible?

A high-assurance publication flow may require all four.

## Key management

Private keys must never be committed to the repository or placed in browser-delivered source. Signing should occur in a protected release environment or external key service.

The current module accepts `CryptoKey` objects and contains no key storage, key generation policy, rotation service, or revocation registry.

A production signing policy must specify:

- authorized keys;
- offline or hardware protection;
- rotation and compromise procedure;
- validity periods;
- revocation publication;
- threshold or multi-party signing where appropriate;
- audit and transparency records.

## Browser and runtime support

The implementation uses the Web Crypto `SubtleCrypto` Ed25519 interface. Runtime support must be tested at the exact release browser and Node versions. A deterministic unit test in Node does not establish compatibility in every production browser.

## Tests

`tests/research/artifactSignature.test.ts` covers:

- successful verification against the expected key;
- wrong-key rejection;
- statement tampering;
- stale signatures after content changes;
- self-signing versus external trust;
- deterministic Ed25519 signatures for the same key and statement;
- canonical public-key fingerprints;
- malformed hashes and non-Ed25519 keys.

## Claim boundary

Until a real publisher key is independently anchored and used in a release process, this module is verified authentication machinery, not evidence that existing MPW publications were authored by a particular institution.
