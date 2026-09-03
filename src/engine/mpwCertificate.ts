// deterministic structured certificate. every scientific field comes from
// the engine/verifier/provenance; no LLM-generated scientific fields exist.
// hashed body -> JCS canonical -> SHA-256 -> certificateHash -> certificateId.
// ui metadata (displayedAt) lives outside the body and never enters the hash.
import {
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  MODELS,
  STRATA,
  NUM_ITEMS,
  buildBenchmarkItems,
  protocolForSubset,
} from "./mpwFixture.js";
import { SIM_SEED, SIM_VERSION } from "./mpwSimulator.js";
import {
  BOOT_SEED,
  BOOT_REPLICATES,
  BOOT_ALGO_ID,
  BOOT_ALGO_VERSION,
  BOOT_CONFIDENCE,
  BOOT_PRNG_ID,
  BOOT_PRNG_VERSION,
} from "./mpwCore.js";
import { canonicalBytes, contentHash, hashExperiment, orderDims } from "./mpwProvenance.js";
import { sha256Hex } from "./sha256.js";
import type { JsonValue } from "./mpwManifest.js";
import { diffProtocols, experimentMeta } from "./mpwCounterfactual.js";
import { verifyCanonical, verifyCandidateWitness } from "./mpwVerify.js";
import { finalizePublication, evidenceForProtocol } from "./mpwPublication.js";
import type { Protocol } from "../types/index.js";

export const CERT_SCHEMA_VERSION = 1;
export const CERT_FORMAT_VERSION = 1;
export const ENGINE_VERSION = "mpw-engine/1";
export const CANON_SCHEME = "JCS";
export const CANON_SCHEME_VERSION = "RFC8785/canonicalize-4.0.0";
export const HASH_ALGO = "SHA-256";

export const LIMITATIONS: string[] = [
  "minimality is conditional on the exposed protocol dimensions, fixture, scoring, and conclusion rule",
  "bootstrap CI measures benchmark-item resampling under fixed category composition, not repeated model runs or universal model uncertainty",
  "synthetic model outcomes are not claims about real models",
];

export const CONCLUSIONS = ["MODEL_A", "MODEL_B", "INCONCLUSIVE"] as const;
export type Conclusion = (typeof CONCLUSIONS)[number];

export interface SourceBlock {
  publicationId: string;
  publicationHash: string;
  protocol: Record<string, JsonValue>;
  scoreA: number;
  scoreB: number;
  delta: number;
  ciLow: number;
  ciHigh: number;
  conclusion: string;
  coverage: number;
}

export interface VerificationBlock {
  status: "VERIFIED" | "NOT_SUFFICIENT" | "NON_MINIMUM" | "UNRESOLVED";
  minimumCardinality: number | null;
  coMinimumWitnesses: string[][];
  selectedCandidate: string[] | null;
  subsetsEvaluated: number;
  subsetsTotal: number;
  exhaustive: boolean;
  audit: Array<{ subset: string[]; cardinality: number; experimentId: string; conclusion: string; sufficient: boolean }>;
}

export interface WitnessExperimentBlock {
  protocol: Record<string, JsonValue>;
  changedDimensions: string[];
  experimentId: string;
  experimentHash: string;
  scoreA: number;
  scoreB: number;
  delta: number;
  ciLow: number;
  ciHigh: number;
  conclusion: string;
  evidenceHash: string;
  categories: Array<{ stratum: string; n: number; scoreA: number; scoreB: number }>;
}

export interface CertificateInputs {
  disputeId: string;
  sourceA: SourceBlock;
  sourceB: SourceBlock;
  differences: string[];
  target: Conclusion;
  verification: VerificationBlock;
  witnessExperiment: WitnessExperimentBlock | null;
  statistics: Record<string, JsonValue>;
  coverage: { expectedItems: number; accountedItems: number; percent: number };
}

export function canonicalStatistics(): Record<string, JsonValue> {
  return {
    method: BOOT_ALGO_ID,
    methodVersion: BOOT_ALGO_VERSION,
    prng: BOOT_PRNG_ID,
    prngVersion: BOOT_PRNG_VERSION,
    seed: BOOT_SEED,
    replicates: BOOT_REPLICATES,
    confidenceLevel: BOOT_CONFIDENCE,
    stratified: true,
    paired: true,
    strata: STRATA.map((s) => ({ name: s.name, count: s.count })),
  } as unknown as Record<string, JsonValue>;
}

function sourceBlockFromBundle(bundle: ReturnType<typeof finalizePublication>): SourceBlock {
  const d = bundle.core.declared;
  return {
    publicationId: bundle.core.publicationId,
    publicationHash: bundle.manifestHash,
    protocol: bundle.core.protocol,
    scoreA: d.scoreA,
    scoreB: d.scoreB,
    delta: d.delta,
    ciLow: d.ciLow,
    ciHigh: d.ciHigh,
    conclusion: d.conclusion,
    coverage: d.coverage,
  };
}

// dispute identity derives from the two publication hashes. no clock.
export function disputeIdFor(pubHashA: string, pubHashB: string): string {
  return `mpw-dispute-${contentHash({ a: pubHashA, b: pubHashB }).slice(0, 16)}`;
}

// full engine wiring for the canonical dispute. throws unless evidence
// coverage is 100%: a VERIFIED canonical certificate requires it.
export function canonicalCertificateInputs(selected: string[] = ["reasoning_budget"]): CertificateInputs {
  const bundleA = finalizePublication("Lab A");
  const bundleB = finalizePublication("Lab B");
  const sourceA = sourceBlockFromBundle(bundleA);
  const sourceB = sourceBlockFromBundle(bundleB);
  const v = verifyCanonical();
  const cand = verifyCandidateWitness(selected as never);
  if (cand.status !== "VERIFIED") throw new Error(`canonical candidate not verified: ${cand.status}`);
  const primary = [...(cand.minimumWitnesses[0] ?? selected)].sort();
  const hybrid = protocolForSubset(primary as never) as Protocol;
  const ev = evidenceForProtocol(hybrid, primary);
  const expId = hashExperiment({
    baseLab: "A",
    sourceLab: "B",
    subset: primary,
    protocol: { ...hybrid } as unknown as Record<string, JsonValue>,
    engine: experimentMeta() as unknown as Record<string, JsonValue>,
  });
  const universe = new Set(buildBenchmarkItems().map((i) => i.id));
  const accounted = new Set([
    ...evidenceForProtocol({ ...LAB_A_PROTOCOL } as Protocol, []).receipts.map((r) => r.id),
    ...evidenceForProtocol({ ...LAB_B_PROTOCOL } as Protocol, [...EXPOSED_DIMENSIONS]).receipts.map((r) => r.id),
  ]);
  const accountedCount = [...universe].filter((id) => accounted.has(id)).length;
  if (accountedCount !== NUM_ITEMS) throw new Error(`incomplete evidence coverage: ${accountedCount}/${NUM_ITEMS}`);
  return {
    disputeId: disputeIdFor(bundleA.manifestHash, bundleB.manifestHash),
    sourceA,
    sourceB,
    differences: diffProtocols(LAB_A_PROTOCOL, LAB_B_PROTOCOL) as string[],
    target: v.target as Conclusion,
    verification: {
      status: cand.status,
      minimumCardinality: cand.minimumCardinality,
      coMinimumWitnesses: cand.coMinimumWitnesses.map((s) => [...s]),
      selectedCandidate: [...selected].sort(),
      subsetsEvaluated: cand.checkedCount,
      subsetsTotal: cand.totalSubsets,
      exhaustive: cand.exhaustive,
      audit: v.table.map((r) => ({
        subset: orderDims(r.subset as string[]),
        cardinality: r.subset.length,
        experimentId: r.experimentId,
        conclusion: r.conclusion,
        sufficient: r.sufficient,
      })),
    },
    witnessExperiment: {
      protocol: { ...hybrid } as unknown as Record<string, JsonValue>,
      changedDimensions: [...primary],
      experimentId: expId,
      experimentHash: expId,
      scoreA: ev.summary.scoreA,
      scoreB: ev.summary.scoreB,
      delta: ev.summary.delta,
      ciLow: ev.summary.ciLow,
      ciHigh: ev.summary.ciHigh,
      conclusion: String(ev.summary.conclusion),
      evidenceHash: ev.evidenceHash,
      categories: ev.outcomes
        .reduce((acc: Array<{ stratum: string; n: number; scoreA: number; scoreB: number }>, o) => {
          let row = acc.find((c) => c.stratum === o.stratum);
          if (!row) {
            row = { stratum: o.stratum, n: 0, scoreA: 0, scoreB: 0 };
            acc.push(row);
          }
          row.n += 1;
          row.scoreA += o.a;
          row.scoreB += o.b;
          return acc;
        }, [])
        .map((c) => ({ stratum: c.stratum, n: c.n, scoreA: c.scoreA / c.n, scoreB: c.scoreB / c.n })),
    },
    statistics: canonicalStatistics(),
    coverage: { expectedItems: NUM_ITEMS, accountedItems: accountedCount, percent: (accountedCount / NUM_ITEMS) * 100 },
  };
}

export function buildCertificateBody(inputs: CertificateInputs = canonicalCertificateInputs()): Record<string, JsonValue> {
  const body = {
    kind: "ReconciliationCertificate",
    schemaVersion: CERT_SCHEMA_VERSION,
    formatVersion: CERT_FORMAT_VERSION,
    engineVersion: ENGINE_VERSION,
    simulatorVersion: SIM_VERSION,
    simulatorSeed: SIM_SEED,
    statistics: inputs.statistics,
    canonicalization: { scheme: CANON_SCHEME, version: CANON_SCHEME_VERSION },
    hashAlgorithm: HASH_ALGO,
    disputeId: inputs.disputeId,
    models: [...MODELS],
    sourceA: inputs.sourceA,
    sourceB: inputs.sourceB,
    differences: inputs.differences,
    target: inputs.target,
    verification: inputs.verification,
    witnessExperiment: inputs.witnessExperiment,
    coverage: inputs.coverage,
    limitations: [...LIMITATIONS],
  };
  return body as unknown as Record<string, JsonValue>;
}

export function certHash(canonical: string): string {
  return sha256Hex(canonical);
}

export function hashCertificateBody(body: Record<string, JsonValue>): string {
  return sha256Hex(canonicalBytes(body));
}

export function buildCertificate(inputs?: CertificateInputs) {
  const body = buildCertificateBody(inputs);
  const canonical = canonicalBytes(body);
  const certificateHash = certHash(canonical);
  return { body, canonical, certificateHash, certificateId: `mpw-${certificateHash.slice(0, 16)}` };
}

export function withUiMetadata<T extends object, U extends object>(cert: T, ui: U): T & { ui: U } {
  return { ...cert, ui: { ...ui } };
}

export interface CertCheck {
  check: string;
  pass: boolean;
  detail: string;
}

export interface CertError extends Error {
  code: "CERT_INVALID";
  checks: CertCheck[];
}

function certFail(checks: CertCheck[], detail: string): never {
  const err = new Error(`CERT_INVALID: ${detail}`) as CertError;
  err.code = "CERT_INVALID";
  err.checks = checks;
  throw err;
}

// deterministic verification: recompute body hash, validate every required
// integrity field. throws CERT_INVALID on the first failure.
export function verifyCertificate(wrapper: unknown): { status: "VALID"; certificateId: string; checks: CertCheck[] } {
  const checks: CertCheck[] = [];
  if (typeof wrapper !== "object" || wrapper === null || Array.isArray(wrapper)) {
    checks.push({ check: "wrapper.shape", pass: false, detail: "not an object" });
    certFail(checks, "wrapper not an object");
  }
  const w = wrapper as Record<string, unknown>;
  for (const k of ["body", "canonical", "certificateHash", "certificateId"]) {
    if (!(k in w)) {
      checks.push({ check: `wrapper.${k}`, pass: false, detail: "missing" });
      certFail(checks, `missing ${k}`);
    }
  }
  const body = w.body as Record<string, unknown>;
  const canonical = canonicalBytes(body);
  if (canonical !== w.canonical) {
    checks.push({ check: "hash.canonical", pass: false, detail: "canonical bytes differ" });
    certFail(checks, "canonical bytes differ");
  }
  checks.push({ check: "hash.canonical", pass: true, detail: `${canonical.length} bytes` });
  const recomputed = sha256Hex(canonical);
  if (recomputed !== w.certificateHash) {
    checks.push({ check: "hash.certificateHash", pass: false, detail: "hash mismatch" });
    certFail(checks, "certificate hash mismatch");
  }
  checks.push({ check: "hash.certificateHash", pass: true, detail: recomputed.slice(0, 12) });
  if (w.certificateId !== `mpw-${recomputed.slice(0, 16)}`) {
    checks.push({ check: "hash.certificateId", pass: false, detail: String(w.certificateId) });
    certFail(checks, "certificate id mismatch");
  }
  checks.push({ check: "hash.certificateId", pass: true, detail: String(w.certificateId) });

  const need = (path: string, cond: boolean, detail: string): void => {
    if (!cond) {
      checks.push({ check: path, pass: false, detail });
      certFail(checks, `${path}: ${detail}`);
    }
    checks.push({ check: path, pass: true, detail });
  };

  need("body.kind", body.kind === "ReconciliationCertificate", String(body.kind));
  need("body.schemaVersion", body.schemaVersion === CERT_SCHEMA_VERSION, String(body.schemaVersion));
  need("body.formatVersion", body.formatVersion === CERT_FORMAT_VERSION, String(body.formatVersion));
  need("body.engineVersion", body.engineVersion === ENGINE_VERSION, String(body.engineVersion));
  need("body.simulatorVersion", body.simulatorVersion === SIM_VERSION, String(body.simulatorVersion));
  need("body.hashAlgorithm", body.hashAlgorithm === HASH_ALGO, String(body.hashAlgorithm));
  const canon = body.canonicalization as Record<string, unknown>;
  need("body.canonicalization", canon?.scheme === CANON_SCHEME && canon?.version === CANON_SCHEME_VERSION, JSON.stringify(canon));
  need("body.disputeId", typeof body.disputeId === "string" && (body.disputeId as string).length > 0, String(body.disputeId));
  need("body.target", CONCLUSIONS.includes(body.target as Conclusion), String(body.target));

  const st = body.statistics as Record<string, unknown>;
  need("statistics.method", st?.method === BOOT_ALGO_ID && st?.methodVersion === BOOT_ALGO_VERSION, JSON.stringify(st?.method));
  need("statistics.prng", st?.prng === BOOT_PRNG_ID && st?.prngVersion === BOOT_PRNG_VERSION, JSON.stringify(st?.prng));
  need("statistics.design", st?.seed === BOOT_SEED && st?.replicates === BOOT_REPLICATES && st?.confidenceLevel === BOOT_CONFIDENCE, "seed/replicates/confidence");
  const strata = st?.strata as Array<{ name: string; count: number }>;
  need("statistics.strata", Array.isArray(strata) && strata.length === 4, `strata ${Array.isArray(strata) ? strata.length : "?"}`);

  for (const side of ["sourceA", "sourceB"] as const) {
    const s = body[side] as Record<string, unknown>;
    need(`${side}.publication`, typeof s?.publicationId === "string" && typeof s?.publicationHash === "string", side);
    need(`${side}.conclusion`, CONCLUSIONS.includes(s?.conclusion as Conclusion), String(s?.conclusion));
    for (const k of ["scoreA", "scoreB", "delta", "ciLow", "ciHigh", "coverage"]) {
      need(`${side}.${k}`, typeof s?.[k] === "number" && Number.isFinite(s[k] as number), String(s?.[k]));
    }
  }
  const a = body.sourceA as Record<string, unknown>;
  const b = body.sourceB as Record<string, unknown>;
  const derivedDiff = diffProtocols(
    a.protocol as never,
    b.protocol as never
  ) as string[];
  need("differences", JSON.stringify([...(body.differences as string[])].sort()) === JSON.stringify([...derivedDiff].sort()), JSON.stringify(body.differences));

  const v = body.verification as unknown as VerificationBlock;
  need("verification.status", ["VERIFIED", "NOT_SUFFICIENT", "NON_MINIMUM", "UNRESOLVED"].includes(v?.status), String(v?.status));
  need("verification.audit", Array.isArray(v?.audit) && v.audit.length === v.subsetsTotal, `audit ${v?.audit?.length}/${v?.subsetsTotal}`);
  // every audit row id recomputed from its own fields. no trust, just math.
  const meta = experimentMeta() as unknown as Record<string, JsonValue>;
  for (const row of v.audit) {
    const hybrid = protocolForSubset(row.subset as never) as Protocol;
    const want = hashExperiment({
      baseLab: "A",
      sourceLab: "B",
      subset: row.subset,
      protocol: { ...hybrid } as unknown as Record<string, JsonValue>,
      engine: meta,
    });
    need(`audit.${row.subset.join("+") || "base"}.id`, row.experimentId === want, "experiment id mismatch");
    need(`audit.${row.subset.join("+") || "base"}.card`, row.cardinality === row.subset.length, "cardinality mismatch");
  }

  const cov = body.coverage as { expectedItems: number; accountedItems: number; percent: number };
  need("coverage.numbers", cov?.expectedItems === NUM_ITEMS && cov?.accountedItems <= cov?.expectedItems, JSON.stringify(cov));
  if (v.status === "VERIFIED") {
    need("verification.minimum", v.minimumCardinality !== null && v.coMinimumWitnesses.length > 0, "no minimum");
    need("verification.selected", v.selectedCandidate !== null && v.coMinimumWitnesses.some((x) => JSON.stringify(x) === JSON.stringify(v.selectedCandidate)), JSON.stringify(v.selectedCandidate));
    need("coverage.verified", cov.percent === 100 && cov.accountedItems === cov.expectedItems, `${cov.accountedItems}/${cov.expectedItems}`);
    const wx = body.witnessExperiment as unknown as WitnessExperimentBlock;
    need("witness.present", wx !== null && typeof wx === "object", "missing witness experiment");
    need("witness.id", wx?.experimentId === wx?.experimentHash, "id/hash split");
    const whybrid = protocolForSubset(wx.changedDimensions as never) as Protocol;
    const wantId = hashExperiment({
      baseLab: "A",
      sourceLab: "B",
      subset: wx.changedDimensions,
      protocol: { ...whybrid } as unknown as Record<string, JsonValue>,
      engine: meta,
    });
    need("witness.experimentId", wx?.experimentId === wantId, "witness experiment id mismatch");
    need("witness.conclusion", wx?.conclusion === body.target, `${String(wx?.conclusion)} vs ${String(body.target)}`);
    need("witness.categories", Array.isArray(wx?.categories) && wx.categories.length === 4, "needs 4 category rows");
  } else {
    need("verification.unresolved", v.minimumCardinality === null || v.status !== "UNRESOLVED" || v.coMinimumWitnesses.length === 0, "unresolved must carry no witnesses");
  }

  const lims = body.limitations as string[];
  need("limitations", Array.isArray(lims) && lims.length === LIMITATIONS.length && LIMITATIONS.every((l, i) => lims[i] === l), "limitations altered");

  return { status: "VALID", certificateId: String(w.certificateId), checks };
}
