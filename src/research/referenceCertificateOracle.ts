import { canonicalBytes } from "../engine/mpwProvenance.js";
import {
  verifyCertificateIntegrity,
  type CertificateDecisionStatus,
  type ProtocolReconciliationCertificate,
} from "./certificate.js";
import type { FiniteProtocol, ProtocolSchema } from "./protocol.js";

export interface ReferenceCertificateOracleCheck {
  check: string;
  pass: boolean;
  detail: string;
}

export interface ReferenceCertificateOracleError extends Error {
  code: "REFERENCE_CERTIFICATE_ORACLE_INVALID";
  checks: ReferenceCertificateOracleCheck[];
}

export interface ReferenceCertificateOracleResult {
  status: "REFERENCE_CERTIFICATE_ORACLE_VALID";
  certificateId: string;
  checkedSubsets: number;
  minimumCardinality: number | null;
  minimumWitnesses: string[][];
  candidateStatus: CertificateDecisionStatus;
  checks: ReferenceCertificateOracleCheck[];
}

const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const subsetKey = (subset: readonly string[]): string =>
  JSON.stringify([...subset].sort(compare));
const sameCanonical = (left: unknown, right: unknown): boolean =>
  canonicalBytes(left) === canonicalBytes(right);

function fail(
  checks: ReferenceCertificateOracleCheck[],
  check: string,
  detail: string
): never {
  checks.push({ check, pass: false, detail });
  const error = new Error(
    `REFERENCE_CERTIFICATE_ORACLE_INVALID: ${check}: ${detail}`
  ) as ReferenceCertificateOracleError;
  error.code = "REFERENCE_CERTIFICATE_ORACLE_INVALID";
  error.checks = checks;
  throw error;
}

function pass(
  checks: ReferenceCertificateOracleCheck[],
  check: string,
  detail: string
): void {
  checks.push({ check, pass: true, detail });
}

function normalizeDimensions(
  dimensions: readonly string[],
  schema: ProtocolSchema,
  checks: ReferenceCertificateOracleCheck[]
): string[] {
  if (!Array.isArray(dimensions)) {
    return fail(checks, "dimensions.shape", "exposed dimensions must be an array");
  }
  if (dimensions.length > 20) {
    return fail(checks, "dimensions.limit", `${dimensions.length} exceeds 20`);
  }
  const schemaNames = new Set(schema.coordinates.map((coordinate) => coordinate.name));
  const seen = new Set<string>();
  for (const dimension of dimensions) {
    if (typeof dimension !== "string" || !schemaNames.has(dimension)) {
      return fail(checks, "dimensions.value", `unknown dimension ${String(dimension)}`);
    }
    if (seen.has(dimension)) {
      return fail(checks, "dimensions.duplicate", dimension);
    }
    seen.add(dimension);
  }
  const normalized = [...seen].sort(compare);
  pass(checks, "dimensions", `${normalized.length} unique schema coordinates`);
  return normalized;
}

function normalizeSubset(
  subset: readonly string[],
  dimensions: readonly string[],
  checks: ReferenceCertificateOracleCheck[],
  where: string
): string[] {
  if (!Array.isArray(subset)) return fail(checks, `${where}.shape`, "not an array");
  const allowed = new Set(dimensions);
  const seen = new Set<string>();
  for (const dimension of subset) {
    if (typeof dimension !== "string" || !allowed.has(dimension)) {
      return fail(checks, `${where}.value`, `unknown dimension ${String(dimension)}`);
    }
    if (seen.has(dimension)) return fail(checks, `${where}.duplicate`, dimension);
    seen.add(dimension);
  }
  return [...seen].sort(compare);
}

function allSubsets(dimensions: readonly string[]): string[][] {
  const subsets: string[][] = [];
  for (let mask = 0; mask < 2 ** dimensions.length; mask++) {
    subsets.push(dimensions.filter((_, index) => (mask & (1 << index)) !== 0));
  }
  return subsets.sort(
    (left, right) =>
      left.length - right.length || compare(subsetKey(left), subsetKey(right))
  );
}

function expectedHybrid(
  base: FiniteProtocol,
  source: FiniteProtocol,
  subset: readonly string[]
): FiniteProtocol {
  const hybrid: FiniteProtocol = { ...base };
  for (const dimension of subset) hybrid[dimension] = source[dimension];
  return hybrid;
}

function expectedCandidateStatus({
  candidate,
  sufficientByKey,
  minimumWitnessKeys,
  hasWitness,
}: {
  candidate: string[] | null;
  sufficientByKey: ReadonlyMap<string, boolean>;
  minimumWitnessKeys: ReadonlySet<string>;
  hasWitness: boolean;
}): CertificateDecisionStatus {
  if (!hasWitness) return "NO_WITNESS";
  if (candidate === null) return "UNSELECTED";
  const key = subsetKey(candidate);
  if (!sufficientByKey.get(key)) return "NOT_SUFFICIENT";
  if (!minimumWitnessKeys.has(key)) return "NON_MINIMUM";
  return "VERIFIED";
}

export function verifyCertificateWithReferenceOracle(
  wrapper: unknown
): ReferenceCertificateOracleResult {
  const checks: ReferenceCertificateOracleCheck[] = [];
  const integrity = verifyCertificateIntegrity(wrapper);
  pass(checks, "content.integrity", integrity.certificateId);
  const certificate = wrapper as ProtocolReconciliationCertificate<string>;
  const body = certificate.body;
  if (body.proof.searchMode !== "landscape" || !body.proof.landscapeExhaustive) {
    return fail(
      checks,
      "proof.landscape",
      "reference oracle requires a complete finite landscape"
    );
  }
  const dimensions = normalizeDimensions(body.exposedDimensions, body.protocolSchema, checks);
  const subsets = allSubsets(dimensions);
  const expectedCount = subsets.length;
  if (body.audit.length !== expectedCount) {
    return fail(
      checks,
      "audit.count",
      `${body.audit.length} rows, expected ${expectedCount}`
    );
  }
  if (
    body.proof.evaluatedSubsets !== expectedCount ||
    body.proof.totalSubsetsExact !== String(expectedCount) ||
    body.proof.totalSubsets !== expectedCount
  ) {
    return fail(
      checks,
      "proof.counts",
      `${body.proof.evaluatedSubsets}/${body.proof.totalSubsetsExact}/${String(body.proof.totalSubsets)}`
    );
  }
  pass(checks, "proof.counts", `${expectedCount} complete rows`);

  const basePublication =
    body.direction === "A_TO_B" ? body.publications.A : body.publications.B;
  const targetPublication =
    body.direction === "A_TO_B" ? body.publications.B : body.publications.A;
  if (
    body.decision.targetConclusion !== targetPublication.declaredObservation.conclusion ||
    body.sourceReplay.target.conclusion !== targetPublication.declaredObservation.conclusion ||
    body.sourceReplay.base.conclusion !== basePublication.declaredObservation.conclusion
  ) {
    return fail(
      checks,
      "endpoint.conclusions",
      "decision/source replay differs from publication endpoint declarations"
    );
  }
  pass(checks, "endpoint.conclusions", `${body.sourceReplay.base.conclusion} -> ${body.sourceReplay.target.conclusion}`);

  const auditByKey = new Map<string, (typeof body.audit)[number]>();
  const sufficientByKey = new Map<string, boolean>();
  for (const [index, row] of body.audit.entries()) {
    const subset = normalizeSubset(row.subset, dimensions, checks, `audit[${index}].subset`);
    const key = subsetKey(subset);
    if (auditByKey.has(key)) {
      return fail(checks, "audit.duplicate", key);
    }
    const expectedProtocol = expectedHybrid(
      basePublication.protocol,
      targetPublication.protocol,
      subset
    );
    if (!sameCanonical(row.protocol, expectedProtocol)) {
      return fail(checks, `audit[${index}].protocol`, key);
    }
    const expectedSufficient =
      row.observation.conclusion === body.decision.targetConclusion;
    if (row.sufficient !== expectedSufficient) {
      return fail(
        checks,
        `audit[${index}].sufficient`,
        `${row.sufficient} differs from categorical equality ${expectedSufficient}`
      );
    }
    auditByKey.set(key, clone(row));
    sufficientByKey.set(key, expectedSufficient);
  }
  const missing = subsets.filter((subset) => !auditByKey.has(subsetKey(subset)));
  if (missing.length > 0) {
    return fail(checks, "audit.coverage", `${missing.length} required subset(s) missing`);
  }
  pass(checks, "audit.coverage", `${auditByKey.size} unique expected hybrids`);

  const sufficient = subsets.filter(
    (subset) => sufficientByKey.get(subsetKey(subset)) === true
  );
  const minimumCardinality =
    sufficient.length === 0
      ? null
      : Math.min(...sufficient.map((subset) => subset.length));
  const minimumWitnesses =
    minimumCardinality === null
      ? []
      : sufficient
          .filter((subset) => subset.length === minimumCardinality)
          .map((subset) => [...subset]);
  const reportedWitnesses = body.decision.minimumWitnesses.map((witness, index) =>
    normalizeSubset(witness, dimensions, checks, `decision.minimumWitnesses[${index}]`)
  );
  if (body.decision.minimumCardinality !== minimumCardinality) {
    return fail(
      checks,
      "decision.minimumCardinality",
      `${String(body.decision.minimumCardinality)} != ${String(minimumCardinality)}`
    );
  }
  if (!sameCanonical(reportedWitnesses, minimumWitnesses)) {
    return fail(
      checks,
      "decision.minimumWitnesses",
      `${JSON.stringify(reportedWitnesses)} != ${JSON.stringify(minimumWitnesses)}`
    );
  }
  if (!body.proof.minimumProven || !body.proof.coMinimumComplete) {
    return fail(
      checks,
      "proof.minimum",
      "complete audit requires minimumProven and coMinimumComplete"
    );
  }
  pass(
    checks,
    "decision.minimum",
    minimumCardinality === null
      ? "no sufficient subset"
      : `cardinality ${minimumCardinality}, ${minimumWitnesses.length} witness(es)`
  );

  const candidate =
    body.decision.selectedCandidate === null
      ? null
      : normalizeSubset(
          body.decision.selectedCandidate,
          dimensions,
          checks,
          "decision.selectedCandidate"
        );
  const minimumWitnessKeys = new Set(minimumWitnesses.map(subsetKey));
  const candidateStatus = expectedCandidateStatus({
    candidate,
    sufficientByKey,
    minimumWitnessKeys,
    hasWitness: minimumCardinality !== null,
  });
  if (body.decision.status !== candidateStatus) {
    return fail(
      checks,
      "decision.status",
      `${body.decision.status} != ${candidateStatus}`
    );
  }
  pass(checks, "decision.status", candidateStatus);

  return {
    status: "REFERENCE_CERTIFICATE_ORACLE_VALID",
    certificateId: integrity.certificateId,
    checkedSubsets: expectedCount,
    minimumCardinality,
    minimumWitnesses,
    candidateStatus,
    checks,
  };
}
