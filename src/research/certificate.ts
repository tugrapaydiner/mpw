import type { JsonValue } from "../engine/mpwManifest.js";
import { canonicalBytes } from "../engine/mpwProvenance.js";
import { sha256Hex } from "../engine/sha256.js";
import {
  type FiniteProtocol,
  type ProtocolSchema,
  normalizeSubset,
  protocolDifferences,
  protocolKey,
  validateProtocol,
  validateProtocolSchema,
} from "./protocol.js";
import {
  reconcileDirection,
  type ProtocolEvaluator,
  type ReconciliationDirection,
  type ReconciliationObservation,
  type ReconciliationResult,
} from "./reconciliation.js";

export const RECONCILIATION_CERTIFICATE_KIND = "ProtocolReconciliationCertificate" as const;
export const RECONCILIATION_CERTIFICATE_SCHEMA_VERSION = 2 as const;
export const RECONCILIATION_CERTIFICATE_HASH_ALGORITHM = "SHA-256" as const;
export const RECONCILIATION_CERTIFICATE_CANONICALIZATION = "RFC8785/JCS" as const;

export type CertificateDecisionStatus =
  | "VERIFIED"
  | "NOT_SUFFICIENT"
  | "NON_MINIMUM"
  | "NO_WITNESS"
  | "UNSELECTED";

export interface PublicationSnapshot<Conclusion extends string = string> {
  publicationId: string;
  publicationHash: string;
  protocol: FiniteProtocol;
  declaredObservation: ReconciliationObservation<Conclusion>;
}

export interface CertificateAuditRow<Conclusion extends string = string> {
  subset: string[];
  protocol: FiniteProtocol;
  observation: ReconciliationObservation<Conclusion>;
  sufficient: boolean;
}

export interface ProtocolReconciliationCertificateBody<Conclusion extends string = string> {
  kind: typeof RECONCILIATION_CERTIFICATE_KIND;
  schemaVersion: typeof RECONCILIATION_CERTIFICATE_SCHEMA_VERSION;
  hashAlgorithm: typeof RECONCILIATION_CERTIFICATE_HASH_ALGORITHM;
  canonicalization: typeof RECONCILIATION_CERTIFICATE_CANONICALIZATION;
  objective: { kind: "minimum-cardinality"; sufficiency: "categorical-conclusion-equality" };
  direction: ReconciliationDirection;
  evaluator: Record<string, JsonValue>;
  protocolSchema: ProtocolSchema;
  publications: { A: PublicationSnapshot<Conclusion>; B: PublicationSnapshot<Conclusion> };
  exposedDimensions: string[];
  omittedDifferences: string[];
  sourceReplay: {
    base: ReconciliationObservation<Conclusion>;
    target: ReconciliationObservation<Conclusion>;
  };
  decision: {
    status: CertificateDecisionStatus;
    targetConclusion: Conclusion;
    selectedCandidate: string[] | null;
    minimumCardinality: number | null;
    minimumWitnesses: string[][];
  };
  proof: {
    searchMode: "landscape";
    minimumProven: boolean;
    coMinimumComplete: boolean;
    landscapeExhaustive: boolean;
    evaluatedSubsets: number;
    totalSubsets: number | null;
    totalSubsetsExact: string;
  };
  audit: CertificateAuditRow<Conclusion>[];
  limitations: string[];
}

export interface ProtocolReconciliationCertificate<Conclusion extends string = string> {
  body: ProtocolReconciliationCertificateBody<Conclusion>;
  canonical: string;
  certificateHash: string;
  certificateId: string;
}

export interface BuildReconciliationCertificateOptions<Conclusion extends string = string> {
  schema: ProtocolSchema;
  publicationA: PublicationSnapshot<Conclusion>;
  publicationB: PublicationSnapshot<Conclusion>;
  evaluator: ProtocolEvaluator<Conclusion>;
  evaluatorDescriptor: Record<string, JsonValue>;
  direction: ReconciliationDirection;
  selectedCandidate?: readonly string[] | null;
  exposedDimensions?: readonly string[];
  limitations?: readonly string[];
  maxEvaluations?: number;
}

export interface CertificateCheck {
  check: string;
  pass: boolean;
  detail: string;
}

export interface CertificateVerificationError extends Error {
  code: "CERTIFICATE_INVALID" | "CERTIFICATE_REPLAY_MISMATCH";
  checks: CertificateCheck[];
}

export interface ReplayVerificationOptions<Conclusion extends string = string> {
  evaluator: ProtocolEvaluator<Conclusion>;
  expectedEvaluatorDescriptor?: Record<string, JsonValue>;
  expectedPublicationA?: PublicationSnapshot<Conclusion>;
  expectedPublicationB?: PublicationSnapshot<Conclusion>;
  maxEvaluations?: number;
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sameSubset = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);
const sameCanonical = (a: unknown, b: unknown): boolean => canonicalBytes(a) === canonicalBytes(b);

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function direction(value: unknown): asserts value is ReconciliationDirection {
  if (value !== "A_TO_B" && value !== "B_TO_A") throw new Error(`invalid direction: ${String(value)}`);
}

function verificationFailure(
  code: CertificateVerificationError["code"],
  checks: CertificateCheck[],
  check: string,
  detail: string
): never {
  checks.push({ check, pass: false, detail });
  const error = new Error(`${code}: ${check}: ${detail}`) as CertificateVerificationError;
  error.code = code;
  error.checks = checks;
  throw error;
}

function checked(checks: CertificateCheck[], check: string, detail: string): void {
  checks.push({ check, pass: true, detail });
}

function normalizeObservation<Conclusion extends string>(
  observation: ReconciliationObservation<Conclusion>
): ReconciliationObservation<Conclusion> {
  record(observation, "observation");
  if (typeof observation.conclusion !== "string" || observation.conclusion.length === 0) {
    throw new Error("observation.conclusion must be a non-empty string");
  }
  if (observation.effect !== undefined && !Number.isFinite(observation.effect)) {
    throw new Error("observation.effect must be finite");
  }
  if (observation.evidenceId !== undefined &&
      (typeof observation.evidenceId !== "string" || observation.evidenceId.length === 0)) {
    throw new Error("observation.evidenceId must be a non-empty string");
  }
  if (observation.metadata !== undefined) {
    record(observation.metadata, "observation.metadata");
    for (const [key, value] of Object.entries(observation.metadata)) {
      const valid = value === null || typeof value === "string" || typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value));
      if (!valid) throw new Error(`observation.metadata.${key} must be a finite JSON scalar`);
    }
  }
  return clone(observation);
}

function normalizePublication<Conclusion extends string>(
  publication: PublicationSnapshot<Conclusion>,
  schema: ProtocolSchema,
  label: string
): PublicationSnapshot<Conclusion> {
  record(publication, label);
  if (typeof publication.publicationId !== "string" || publication.publicationId.length === 0) {
    throw new Error(`${label}.publicationId must be non-empty`);
  }
  if (!/^[0-9a-f]{64}$/.test(publication.publicationHash)) {
    throw new Error(`${label}.publicationHash must be a lowercase SHA-256 digest`);
  }
  validateProtocol(publication.protocol, schema);
  return {
    publicationId: publication.publicationId,
    publicationHash: publication.publicationHash,
    protocol: { ...publication.protocol },
    declaredObservation: normalizeObservation(publication.declaredObservation),
  };
}

function candidateDecision<Conclusion extends string>(
  result: ReconciliationResult<Conclusion>,
  requested: readonly string[] | null | undefined
): { status: CertificateDecisionStatus; candidate: string[] | null } {
  if (result.search.status === "NO_WITNESS") return { status: "NO_WITNESS", candidate: null };
  if (requested === null || requested === undefined) return { status: "UNSELECTED", candidate: null };
  const candidate = normalizeSubset(requested, result.exposedDimensions);
  const row = result.evaluations.find((entry) => sameSubset(entry.subset, candidate));
  if (!row) throw new Error("selected candidate was not evaluated");
  if (!row.sufficient) return { status: "NOT_SUFFICIENT", candidate };
  if (!result.search.minimumWitnesses.some((witness) => sameSubset(witness, candidate))) {
    return { status: "NON_MINIMUM", candidate };
  }
  return { status: "VERIFIED", candidate };
}

function bodyFromResult<Conclusion extends string>(
  options: {
    schema: ProtocolSchema;
    publicationA: PublicationSnapshot<Conclusion>;
    publicationB: PublicationSnapshot<Conclusion>;
    evaluatorDescriptor: Record<string, JsonValue>;
    direction: ReconciliationDirection;
    selectedCandidate?: readonly string[] | null;
    limitations: readonly string[];
  },
  result: ReconciliationResult<Conclusion>
): ProtocolReconciliationCertificateBody<Conclusion> {
  const decision = candidateDecision(result, options.selectedCandidate);
  return {
    kind: RECONCILIATION_CERTIFICATE_KIND,
    schemaVersion: RECONCILIATION_CERTIFICATE_SCHEMA_VERSION,
    hashAlgorithm: RECONCILIATION_CERTIFICATE_HASH_ALGORITHM,
    canonicalization: RECONCILIATION_CERTIFICATE_CANONICALIZATION,
    objective: { kind: "minimum-cardinality", sufficiency: "categorical-conclusion-equality" },
    direction: options.direction,
    evaluator: clone(options.evaluatorDescriptor),
    protocolSchema: clone(options.schema),
    publications: { A: clone(options.publicationA), B: clone(options.publicationB) },
    exposedDimensions: [...result.exposedDimensions],
    omittedDifferences: [...result.omittedDifferences],
    sourceReplay: { base: clone(result.base), target: clone(result.target) },
    decision: {
      status: decision.status,
      targetConclusion: result.target.conclusion,
      selectedCandidate: decision.candidate,
      minimumCardinality: result.search.minimumCardinality,
      minimumWitnesses: result.search.minimumWitnesses.map((witness) => [...witness]),
    },
    proof: {
      searchMode: "landscape",
      minimumProven: result.search.proof.minimumProven,
      coMinimumComplete: result.search.proof.coMinimumComplete,
      landscapeExhaustive: result.search.proof.landscapeExhaustive,
      evaluatedSubsets: result.search.evaluatedSubsets,
      totalSubsets: result.search.totalSubsets,
      totalSubsetsExact: result.search.totalSubsetsExact,
    },
    audit: result.evaluations.map((entry) => ({
      subset: [...entry.subset],
      protocol: { ...entry.protocol },
      observation: clone(entry.observation),
      sufficient: entry.sufficient,
    })),
    limitations: [...options.limitations],
  };
}

export function buildReconciliationCertificate<Conclusion extends string = string>(
  options: BuildReconciliationCertificateOptions<Conclusion>
): ProtocolReconciliationCertificate<Conclusion> {
  direction(options.direction);
  if (typeof options.evaluator !== "function") throw new Error("evaluator must be a function");
  record(options.evaluatorDescriptor, "evaluatorDescriptor");
  canonicalBytes(options.evaluatorDescriptor);
  const limitations = options.limitations ?? [];
  if (!Array.isArray(limitations) || limitations.some((item) => typeof item !== "string")) {
    throw new Error("limitations must be an array of strings");
  }
  validateProtocolSchema(options.schema);
  const publicationA = normalizePublication(options.publicationA, options.schema, "publicationA");
  const publicationB = normalizePublication(options.publicationB, options.schema, "publicationB");
  if (!sameCanonical(normalizeObservation(options.evaluator(publicationA.protocol)), publicationA.declaredObservation)) {
    throw new Error("SOURCE_REPLAY_MISMATCH: publication A declaration differs from evaluator replay");
  }
  if (!sameCanonical(normalizeObservation(options.evaluator(publicationB.protocol)), publicationB.declaredObservation)) {
    throw new Error("SOURCE_REPLAY_MISMATCH: publication B declaration differs from evaluator replay");
  }
  const base = options.direction === "A_TO_B" ? publicationA : publicationB;
  const target = options.direction === "A_TO_B" ? publicationB : publicationA;
  const result = reconcileDirection({
    schema: options.schema,
    baseProtocol: base.protocol,
    sourceProtocol: target.protocol,
    evaluator: options.evaluator,
    direction: options.direction,
    exposedDimensions: options.exposedDimensions,
    searchMode: "landscape",
    maxEvaluations: options.maxEvaluations ?? 1_000_000,
  });
  if (!result.search.proof.landscapeExhaustive) {
    throw new Error("CERTIFICATE_INCOMPLETE: portable certificates require the complete finite landscape");
  }
  const body = bodyFromResult({ ...options, publicationA, publicationB, limitations }, result);
  const canonical = canonicalBytes(body as unknown as JsonValue);
  const certificateHash = sha256Hex(canonical);
  return { body, canonical, certificateHash, certificateId: `mpw-v2-${certificateHash.slice(0, 16)}` };
}

export function verifyCertificateIntegrity(
  wrapper: unknown
): { status: "CONTENT_INTEGRITY_VALID"; certificateId: string; checks: CertificateCheck[] } {
  const checks: CertificateCheck[] = [];
  let outer: Record<string, unknown>;
  try { outer = record(wrapper, "certificate wrapper"); }
  catch (error) { return verificationFailure("CERTIFICATE_INVALID", checks, "wrapper.shape", (error as Error).message); }
  const required = ["body", "canonical", "certificateHash", "certificateId"].sort(compare);
  const keys = Object.keys(outer).sort(compare);
  if (JSON.stringify(keys) !== JSON.stringify(required)) {
    return verificationFailure("CERTIFICATE_INVALID", checks, "wrapper.keys", keys.join(","));
  }
  checked(checks, "wrapper.keys", "exact");
  let body: Record<string, unknown>;
  try { body = record(outer.body, "certificate body"); }
  catch (error) { return verificationFailure("CERTIFICATE_INVALID", checks, "body.shape", (error as Error).message); }
  if (body.kind !== RECONCILIATION_CERTIFICATE_KIND ||
      body.schemaVersion !== RECONCILIATION_CERTIFICATE_SCHEMA_VERSION ||
      body.hashAlgorithm !== RECONCILIATION_CERTIFICATE_HASH_ALGORITHM ||
      body.canonicalization !== RECONCILIATION_CERTIFICATE_CANONICALIZATION) {
    return verificationFailure("CERTIFICATE_INVALID", checks, "body.identity", "kind, version, hash, or canonicalization differs");
  }
  checked(checks, "body.identity", "v2 / SHA-256 / RFC8785-JCS");
  let canonical: string;
  try { canonical = canonicalBytes(body); }
  catch (error) { return verificationFailure("CERTIFICATE_INVALID", checks, "body.canonicalizable", (error as Error).message); }
  if (outer.canonical !== canonical) {
    return verificationFailure("CERTIFICATE_INVALID", checks, "wrapper.canonical", "canonical bytes differ");
  }
  checked(checks, "wrapper.canonical", `${canonical.length} bytes`);
  const hash = sha256Hex(canonical);
  if (outer.certificateHash !== hash) {
    return verificationFailure("CERTIFICATE_INVALID", checks, "wrapper.certificateHash", "SHA-256 differs");
  }
  const id = `mpw-v2-${hash.slice(0, 16)}`;
  if (outer.certificateId !== id) {
    return verificationFailure("CERTIFICATE_INVALID", checks, "wrapper.certificateId", String(outer.certificateId));
  }
  checked(checks, "wrapper.hash-and-id", id);
  return { status: "CONTENT_INTEGRITY_VALID", certificateId: id, checks };
}

function expected(checks: CertificateCheck[], name: string, actual: unknown, wanted: unknown): void {
  if (!sameCanonical(actual, wanted)) {
    verificationFailure("CERTIFICATE_REPLAY_MISMATCH", checks, name, "canonical content differs");
  }
  checked(checks, name, "match");
}

export function verifyCertificateReplay<Conclusion extends string = string>(
  wrapper: unknown,
  options: ReplayVerificationOptions<Conclusion>
): { status: "SCIENTIFIC_REPLAY_VALID"; certificateId: string; checks: CertificateCheck[] } {
  const integrity = verifyCertificateIntegrity(wrapper);
  const checks = [...integrity.checks];
  const certificate = wrapper as ProtocolReconciliationCertificate<Conclusion>;
  const body = certificate.body;
  try {
    direction(body.direction);
    validateProtocolSchema(body.protocolSchema);
    validateProtocol(body.publications.A.protocol, body.protocolSchema);
    validateProtocol(body.publications.B.protocol, body.protocolSchema);
  } catch (error) {
    return verificationFailure("CERTIFICATE_REPLAY_MISMATCH", checks, "protocol.schema", (error as Error).message);
  }
  checked(checks, "protocol.schema", "finite schema and endpoints valid");
  if (options.expectedEvaluatorDescriptor) expected(checks, "evaluator.identity", body.evaluator, options.expectedEvaluatorDescriptor);
  if (options.expectedPublicationA) expected(checks, "publication.A.identity", body.publications.A, options.expectedPublicationA);
  if (options.expectedPublicationB) expected(checks, "publication.B.identity", body.publications.B, options.expectedPublicationB);
  let rebuilt: ProtocolReconciliationCertificate<Conclusion>;
  try {
    rebuilt = buildReconciliationCertificate({
      schema: body.protocolSchema,
      publicationA: body.publications.A,
      publicationB: body.publications.B,
      evaluator: options.evaluator,
      evaluatorDescriptor: body.evaluator,
      direction: body.direction,
      selectedCandidate: body.decision.selectedCandidate,
      exposedDimensions: body.exposedDimensions,
      limitations: body.limitations,
      maxEvaluations: options.maxEvaluations ?? 1_000_000,
    });
  } catch (error) {
    return verificationFailure("CERTIFICATE_REPLAY_MISMATCH", checks, "science.rebuild", (error as Error).message);
  }
  checked(checks, "science.rebuild", "source declarations and finite landscape recomputed");
  if (rebuilt.canonical !== certificate.canonical) {
    verificationFailure(
      "CERTIFICATE_REPLAY_MISMATCH",
      checks,
      "science.replay",
      "source replay, audit landscape, witness decision, or proof differs"
    );
  }
  checked(checks, "science.replay", `${body.audit.length} protocol configurations recomputed`);
  const differences = protocolDifferences(
    body.publications.A.protocol,
    body.publications.B.protocol,
    body.protocolSchema
  );
  const exposed = normalizeSubset(body.exposedDimensions, differences);
  const identical = protocolKey(body.publications.A.protocol, body.protocolSchema) ===
    protocolKey(body.publications.B.protocol, body.protocolSchema);
  checked(checks, "science.endpoint-difference", identical ? "protocol-identical" : `${exposed.length}/${differences.length} exposed`);
  return { status: "SCIENTIFIC_REPLAY_VALID", certificateId: integrity.certificateId, checks };
}
