import { describe, expect, it } from "vitest";
import {
  artifactPublicKeyFingerprint,
  buildArtifactIdentityStatement,
  signArtifactIdentity,
  verifyArtifactIdentitySignature,
} from "../../src/research/artifactSignature";

async function keyPair(): Promise<CryptoKeyPair> {
  const generated = await globalThis.crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  );
  if (!("privateKey" in generated) || !("publicKey" in generated)) {
    throw new Error("expected an asymmetric key pair");
  }
  return generated;
}

const statement = () =>
  buildArtifactIdentityStatement({
    artifactKind: "ProtocolReconciliationCertificate",
    artifactId: "mpw-v2-0123456789abcdef",
    artifactHash: "a".repeat(64),
    issuer: "Example Evaluation Lab",
  });

describe("detached artifact identity signatures", () => {
  it("authenticates an artifact identity against an expected public key", async () => {
    const keys = await keyPair();
    const signed = await signArtifactIdentity({
      statement: statement(),
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    });
    const result = await verifyArtifactIdentitySignature(signed, {
      expectedPublicKey: keys.publicKey,
      expectedArtifactKind: "ProtocolReconciliationCertificate",
      expectedArtifactId: "mpw-v2-0123456789abcdef",
      expectedArtifactHash: "a".repeat(64),
      expectedIssuer: "Example Evaluation Lab",
    });
    expect(result).toMatchObject({
      status: "ARTIFACT_SIGNATURE_VALID",
      artifactId: "mpw-v2-0123456789abcdef",
      artifactHash: "a".repeat(64),
      keyFingerprint: signed.keyFingerprint,
    });
    expect(result.limitation).toMatch(/does not establish scientific truth/);
  });

  it("rejects a valid signature when the relying party trusts a different key", async () => {
    const signer = await keyPair();
    const attacker = await keyPair();
    const signed = await signArtifactIdentity({
      statement: statement(),
      privateKey: signer.privateKey,
      publicKey: signer.publicKey,
    });
    await expect(
      verifyArtifactIdentitySignature(signed, {
        expectedPublicKey: attacker.publicKey,
      })
    ).rejects.toThrow(/not anchored to the expected key/);
  });

  it("rejects statement tampering even when wrapper fields still look plausible", async () => {
    const keys = await keyPair();
    const signed = await signArtifactIdentity({
      statement: statement(),
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    });
    const tampered = structuredClone(signed);
    tampered.statement.artifactHash = "b".repeat(64);
    await expect(
      verifyArtifactIdentitySignature(tampered, {
        expectedPublicKey: keys.publicKey,
      })
    ).rejects.toThrow(/canonical bytes differ/);
  });

  it("rejects a recomputed wrapper identity when the cryptographic signature is stale", async () => {
    const keys = await keyPair();
    const signed = await signArtifactIdentity({
      statement: statement(),
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    });
    const tampered = structuredClone(signed);
    tampered.statement.issuer = "Different Lab";
    tampered.canonicalStatement = JSON.stringify(tampered.statement);
    await expect(
      verifyArtifactIdentitySignature(tampered, {
        expectedPublicKey: keys.publicKey,
      })
    ).rejects.toThrow(/canonical bytes differ|verification failed/);
  });

  it("demonstrates that self-signing is not trust without the expected key", async () => {
    const trusted = await keyPair();
    const attacker = await keyPair();
    const attackerSignature = await signArtifactIdentity({
      statement: statement(),
      privateKey: attacker.privateKey,
      publicKey: attacker.publicKey,
    });
    expect(
      await verifyArtifactIdentitySignature(attackerSignature, {
        expectedPublicKey: attacker.publicKey,
      })
    ).toMatchObject({ status: "ARTIFACT_SIGNATURE_VALID" });
    await expect(
      verifyArtifactIdentitySignature(attackerSignature, {
        expectedPublicKey: trusted.publicKey,
      })
    ).rejects.toThrow(/expected key/);
  });

  it("uses deterministic Ed25519 signatures for identical statement and key", async () => {
    const keys = await keyPair();
    const first = await signArtifactIdentity({
      statement: statement(),
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    });
    const second = await signArtifactIdentity({
      statement: statement(),
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
    });
    expect(second).toEqual(first);
  });

  it("uses a canonical public-key fingerprint", async () => {
    const keys = await keyPair();
    const first = await artifactPublicKeyFingerprint(keys.publicKey);
    const exported = await globalThis.crypto.subtle.exportKey("jwk", keys.publicKey);
    const imported = await globalThis.crypto.subtle.importKey(
      "jwk",
      exported,
      { name: "Ed25519" },
      true,
      ["verify"]
    );
    expect(await artifactPublicKeyFingerprint(imported)).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects malformed artifact identities and non-Ed25519 keys", async () => {
    expect(() =>
      buildArtifactIdentityStatement({
        artifactKind: "x",
        artifactId: "y",
        artifactHash: "not-a-hash",
        issuer: "z",
      })
    ).toThrow(/SHA-256/);

    const hmac = await globalThis.crypto.subtle.generateKey(
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign", "verify"]
    );
    await expect(artifactPublicKeyFingerprint(hmac)).rejects.toThrow(/Ed25519 public/);
  });
});
