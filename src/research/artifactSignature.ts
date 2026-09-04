import { canonicalBytes } from "../engine/mpwProvenance.js";
import { sha256Hex } from "../engine/sha256.js";

export const ARTIFACT_IDENTITY_STATEMENT_KIND = "ArtifactIdentityStatement" as const;
export const ARTIFACT_IDENTITY_STATEMENT_VERSION = 1 as const;
export const ARTIFACT_SIGNATURE_KIND = "SignedArtifactIdentity" as const;
export const ARTIFACT_SIGNATURE_VERSION = 1 as const;
export const ARTIFACT_SIGNATURE_ALGORITHM = "Ed25519" as const;

export interface ArtifactIdentityStatement {
  kind: typeof ARTIFACT_IDENTITY_STATEMENT_KIND;
  version: typeof ARTIFACT_IDENTITY_STATEMENT_VERSION;
  artifactKind: string;
  artifactId: string;
  artifactHash: string;
  issuer: string;
  purpose: "artifact-content-authentication";
}

export interface SignedArtifactIdentity {
  kind: typeof ARTIFACT_SIGNATURE_KIND;
  version: typeof ARTIFACT_SIGNATURE_VERSION;
  algorithm: typeof ARTIFACT_SIGNATURE_ALGORITHM;
  statement: ArtifactIdentityStatement;
  canonicalStatement: string;
  keyFingerprint: string;
  signatureBase64Url: string;
  signatureId: string;
}

export interface ArtifactSignatureVerification {
  status: "ARTIFACT_SIGNATURE_VALID";
  signatureId: string;
  artifactId: string;
  artifactHash: string;
  keyFingerprint: string;
  checks: Array<{ check: string; pass: true; detail: string }>;
  limitation: string;
}

export interface ArtifactSignatureError extends Error {
  code: "ARTIFACT_SIGNATURE_INVALID";
  checks: Array<{ check: string; pass: boolean; detail: string }>;
}

const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const encoder = new TextEncoder();

function subtle(): SubtleCrypto {
  const value = globalThis.crypto?.subtle;
  if (!value) throw new Error("Web Crypto SubtleCrypto is unavailable");
  return value;
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: unknown,
  expected: readonly string[],
  name: string
): Record<string, unknown> {
  const object = record(value, name);
  const actual = Object.keys(object).sort(compare);
  const wanted = [...expected].sort(compare);
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(
      `${name} keys differ: got [${actual.join(",")}], expected [${wanted.join(",")}]`
    );
  }
  return object;
}

function nonEmpty(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function sha256(value: unknown, name: string): string {
  const string = nonEmpty(value, name);
  if (!/^[0-9a-f]{64}$/.test(string)) {
    throw new Error(`${name} must be a lowercase SHA-256 digest`);
  }
  return string;
}

function normalizeStatement(value: unknown): ArtifactIdentityStatement {
  const statement = exactKeys(
    value,
    ["kind", "version", "artifactKind", "artifactId", "artifactHash", "issuer", "purpose"],
    "statement"
  );
  if (
    statement.kind !== ARTIFACT_IDENTITY_STATEMENT_KIND ||
    statement.version !== ARTIFACT_IDENTITY_STATEMENT_VERSION ||
    statement.purpose !== "artifact-content-authentication"
  ) {
    throw new Error("statement kind, version, or purpose is invalid");
  }
  return {
    kind: ARTIFACT_IDENTITY_STATEMENT_KIND,
    version: ARTIFACT_IDENTITY_STATEMENT_VERSION,
    artifactKind: nonEmpty(statement.artifactKind, "statement.artifactKind"),
    artifactId: nonEmpty(statement.artifactId, "statement.artifactId"),
    artifactHash: sha256(statement.artifactHash, "statement.artifactHash"),
    issuer: nonEmpty(statement.issuer, "statement.issuer"),
    purpose: "artifact-content-authentication",
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index++) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("signatureBase64Url is not canonical base64url");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("signatureBase64Url cannot be decoded");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (toBase64Url(bytes) !== value) {
    throw new Error("signatureBase64Url is not in canonical form");
  }
  return bytes;
}

async function normalizedPublicJwk(publicKey: CryptoKey): Promise<{
  kty: "OKP";
  crv: "Ed25519";
  x: string;
}> {
  if (publicKey.type !== "public" || publicKey.algorithm.name !== ARTIFACT_SIGNATURE_ALGORITHM) {
    throw new Error("publicKey must be an Ed25519 public CryptoKey");
  }
  const jwk = await subtle().exportKey("jwk", publicKey);
  if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || typeof jwk.x !== "string") {
    throw new Error("exported public key is not an Ed25519 OKP JWK");
  }
  return { kty: "OKP", crv: "Ed25519", x: jwk.x };
}

export async function artifactPublicKeyFingerprint(
  publicKey: CryptoKey
): Promise<string> {
  return sha256Hex(canonicalBytes(await normalizedPublicJwk(publicKey)));
}

export function buildArtifactIdentityStatement({
  artifactKind,
  artifactId,
  artifactHash,
  issuer,
}: {
  artifactKind: string;
  artifactId: string;
  artifactHash: string;
  issuer: string;
}): ArtifactIdentityStatement {
  return normalizeStatement({
    kind: ARTIFACT_IDENTITY_STATEMENT_KIND,
    version: ARTIFACT_IDENTITY_STATEMENT_VERSION,
    artifactKind,
    artifactId,
    artifactHash,
    issuer,
    purpose: "artifact-content-authentication",
  });
}

export async function signArtifactIdentity({
  statement: statementInput,
  privateKey,
  publicKey,
}: {
  statement: ArtifactIdentityStatement;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}): Promise<SignedArtifactIdentity> {
  const statement = normalizeStatement(statementInput);
  if (privateKey.type !== "private" || privateKey.algorithm.name !== ARTIFACT_SIGNATURE_ALGORITHM) {
    throw new Error("privateKey must be an Ed25519 private CryptoKey");
  }
  const keyFingerprint = await artifactPublicKeyFingerprint(publicKey);
  const canonicalStatement = canonicalBytes(statement);
  const signature = new Uint8Array(
    await subtle().sign(
      ARTIFACT_SIGNATURE_ALGORITHM,
      privateKey,
      encoder.encode(canonicalStatement)
    )
  );
  const signatureBase64Url = toBase64Url(signature);
  const body = {
    kind: ARTIFACT_SIGNATURE_KIND,
    version: ARTIFACT_SIGNATURE_VERSION,
    algorithm: ARTIFACT_SIGNATURE_ALGORITHM,
    statement,
    canonicalStatement,
    keyFingerprint,
    signatureBase64Url,
  };
  const signatureId = `mpw-signature-v1-${sha256Hex(canonicalBytes(body)).slice(0, 16)}`;
  return { ...body, signatureId };
}

function signatureFailure(
  checks: Array<{ check: string; pass: boolean; detail: string }>,
  check: string,
  detail: string
): never {
  checks.push({ check, pass: false, detail });
  const error = new Error(
    `ARTIFACT_SIGNATURE_INVALID: ${check}: ${detail}`
  ) as ArtifactSignatureError;
  error.code = "ARTIFACT_SIGNATURE_INVALID";
  error.checks = checks;
  throw error;
}

export async function verifyArtifactIdentitySignature(
  wrapper: unknown,
  {
    expectedPublicKey,
    expectedArtifactKind,
    expectedArtifactId,
    expectedArtifactHash,
    expectedIssuer,
  }: {
    expectedPublicKey: CryptoKey;
    expectedArtifactKind?: string;
    expectedArtifactId?: string;
    expectedArtifactHash?: string;
    expectedIssuer?: string;
  }
): Promise<ArtifactSignatureVerification> {
  const checks: Array<{ check: string; pass: boolean; detail: string }> = [];
  let object: Record<string, unknown>;
  try {
    object = exactKeys(
      wrapper,
      [
        "kind",
        "version",
        "algorithm",
        "statement",
        "canonicalStatement",
        "keyFingerprint",
        "signatureBase64Url",
        "signatureId",
      ],
      "signature wrapper"
    );
  } catch (error) {
    return signatureFailure(checks, "wrapper.shape", (error as Error).message);
  }
  if (
    object.kind !== ARTIFACT_SIGNATURE_KIND ||
    object.version !== ARTIFACT_SIGNATURE_VERSION ||
    object.algorithm !== ARTIFACT_SIGNATURE_ALGORITHM
  ) {
    return signatureFailure(checks, "wrapper.identity", "kind, version, or algorithm differs");
  }
  checks.push({ check: "wrapper.identity", pass: true, detail: "Ed25519 signature v1" });
  let statement: ArtifactIdentityStatement;
  try {
    statement = normalizeStatement(object.statement);
  } catch (error) {
    return signatureFailure(checks, "statement.shape", (error as Error).message);
  }
  const canonicalStatement = canonicalBytes(statement);
  if (object.canonicalStatement !== canonicalStatement) {
    return signatureFailure(checks, "statement.canonical", "canonical bytes differ");
  }
  checks.push({ check: "statement.canonical", pass: true, detail: `${canonicalStatement.length} bytes` });

  const expectedFingerprint = await artifactPublicKeyFingerprint(expectedPublicKey);
  if (object.keyFingerprint !== expectedFingerprint) {
    return signatureFailure(checks, "key.fingerprint", "signature is not anchored to the expected key");
  }
  checks.push({ check: "key.fingerprint", pass: true, detail: expectedFingerprint });

  const expectedFields: Array<[string, string | undefined, string]> = [
    ["artifact.kind", expectedArtifactKind, statement.artifactKind],
    ["artifact.id", expectedArtifactId, statement.artifactId],
    ["artifact.hash", expectedArtifactHash, statement.artifactHash],
    ["issuer", expectedIssuer, statement.issuer],
  ];
  for (const [check, expected, actual] of expectedFields) {
    if (expected !== undefined && expected !== actual) {
      return signatureFailure(checks, check, `${actual} != ${expected}`);
    }
    if (expected !== undefined) checks.push({ check, pass: true, detail: actual });
  }

  let signature: Uint8Array;
  try {
    signature = fromBase64Url(nonEmpty(object.signatureBase64Url, "signatureBase64Url"));
  } catch (error) {
    return signatureFailure(checks, "signature.encoding", (error as Error).message);
  }
  const valid = await subtle().verify(
    ARTIFACT_SIGNATURE_ALGORITHM,
    expectedPublicKey,
    signature,
    encoder.encode(canonicalStatement)
  );
  if (!valid) return signatureFailure(checks, "signature.cryptographic", "Ed25519 verification failed");
  checks.push({ check: "signature.cryptographic", pass: true, detail: `${signature.length} bytes` });

  const signatureBody = {
    kind: object.kind,
    version: object.version,
    algorithm: object.algorithm,
    statement,
    canonicalStatement,
    keyFingerprint: object.keyFingerprint,
    signatureBase64Url: object.signatureBase64Url,
  };
  const signatureId = `mpw-signature-v1-${sha256Hex(canonicalBytes(signatureBody)).slice(0, 16)}`;
  if (object.signatureId !== signatureId) {
    return signatureFailure(checks, "signature.id", `${String(object.signatureId)} != ${signatureId}`);
  }
  checks.push({ check: "signature.id", pass: true, detail: signatureId });

  return {
    status: "ARTIFACT_SIGNATURE_VALID",
    signatureId,
    artifactId: statement.artifactId,
    artifactHash: statement.artifactHash,
    keyFingerprint: expectedFingerprint,
    checks: checks as Array<{ check: string; pass: true; detail: string }>,
    limitation:
      "A valid signature authenticates control of the independently trusted key over the signed artifact identity; it does not establish scientific truth, causality, or completeness.",
  };
}
