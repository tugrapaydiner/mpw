import type { JsonValue } from "./mpwManifest.js";
import {
  BENCHMARK_ID,
  BENCHMARK_VERSION,
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  MODELS,
  NUM_ITEMS,
} from "./mpwFixture.js";
import { BOOT_ALGO_ID, BOOT_ALGO_VERSION, BOOT_REPLICATES, BOOT_SEED } from "./mpwCore.js";
import { SIM_SEED, SIM_VERSION } from "./mpwSimulator.js";
import {
  evidenceForProtocol,
  finalizePublication,
  verifyFinalizedBundle,
  type FinalizedPublicationBundle,
} from "./mpwPublication.js";
import type { Conclusion, Protocol } from "../types/index.js";
import {
  buildReconciliationCertificate,
  verifyCertificateReplay,
  type ProtocolReconciliationCertificate,
  type PublicationSnapshot,
} from "../research/certificate.js";
import {
  protocolValueEquals,
  validateProtocol,
  type FiniteProtocol,
  type ProtocolCoordinate,
  type ProtocolSchema,
} from "../research/protocol.js";
import type { ReconciliationObservation } from "../research/reconciliation.js";

const CANONICAL_DIMENSIONS = EXPOSED_DIMENSIONS as readonly (keyof Protocol & string)[];

export const CANONICAL_RECONCILIATION_LIMITATIONS = [
  "The replay result is conditional on the bundled synthetic benchmark, deterministic simulator, protocol schema, statistical rule, and exposed coordinates.",
  "SHA-256 content identity detects change but does not authenticate a publisher, establish truth, or support causal attribution.",
  "The item-stratified bootstrap describes finite-benchmark composition sensitivity; it does not include repeated model-run, training, or deployment variance.",
  "A categorical witness reproduces the target conclusion and need not reproduce the target effect magnitude exactly.",
] as const;

function coordinateFor(name: keyof Protocol & string): ProtocolCoordinate {
  const a = LAB_A_PROTOCOL[name];
  const b = LAB_B_PROTOCOL[name];
  const values = protocolValueEquals(a, b) ? [a] : [a, b];
  return {
    name,
    values,
    description: `Finite values declared by the two canonical source publications for ${name}.`,
  };
}

export const CANONICAL_PROTOCOL_SCHEMA: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: CANONICAL_DIMENSIONS.map(coordinateFor),
};

export function canonicalEvaluatorDescriptor(): Record<string, JsonValue> {
  return {
    kind: "DeterministicEvaluationAdapter",
    id: "mpw-canonical-evaluator",
    version: 2,
    benchmark: {
      id: BENCHMARK_ID,
      version: BENCHMARK_VERSION,
      items: NUM_ITEMS,
    },
    models: [...MODELS],
    simulator: {
      seed: SIM_SEED,
      version: SIM_VERSION,
    },
    statistics: {
      algorithm: BOOT_ALGO_ID,
      version: BOOT_ALGO_VERSION,
      seed: BOOT_SEED,
      replicates: BOOT_REPLICATES,
      inferenceMode: "fixed-benchmark-item-resampling",
    },
  };
}

function toFiniteProtocol(protocol: Protocol): FiniteProtocol {
  return Object.fromEntries(CANONICAL_DIMENSIONS.map((name) => [name, protocol[name]]));
}

function toCanonicalProtocol(protocol: FiniteProtocol): Protocol {
  validateProtocol(protocol, CANONICAL_PROTOCOL_SCHEMA);
  return Object.fromEntries(CANONICAL_DIMENSIONS.map((name) => [name, protocol[name]])) as Protocol;
}

function subsetRelativeToLabA(protocol: FiniteProtocol): string[] {
  return CANONICAL_DIMENSIONS.filter(
    (name) => !protocolValueEquals(protocol[name], LAB_A_PROTOCOL[name])
  ).sort();
}

export function evaluateCanonicalProtocol(
  protocol: FiniteProtocol
): ReconciliationObservation<Conclusion> {
  const canonicalProtocol = toCanonicalProtocol(protocol);
  const subset = subsetRelativeToLabA(protocol);
  const evidence = evidenceForProtocol(canonicalProtocol, subset);
  return {
    conclusion: evidence.summary.conclusion,
    effect: evidence.summary.delta,
    evidenceId: evidence.evidenceHash,
    metadata: {
      scoreA: evidence.summary.scoreA,
      scoreB: evidence.summary.scoreB,
      ciLow: evidence.summary.ciLow,
      ciHigh: evidence.summary.ciHigh,
      coverage: evidence.summary.coverage,
    },
  };
}

function publicationSnapshot(
  lab: "A" | "B",
  bundle: FinalizedPublicationBundle
): PublicationSnapshot<Conclusion> {
  const protocol = lab === "A" ? toFiniteProtocol(LAB_A_PROTOCOL) : toFiniteProtocol(LAB_B_PROTOCOL);
  const declared = bundle.core.declared;
  return {
    publicationId: bundle.core.publicationId,
    publicationHash: bundle.manifestHash,
    protocol,
    declaredObservation: {
      conclusion: declared.conclusion as Conclusion,
      effect: declared.delta,
      evidenceId: bundle.evidence.evidenceHash,
      metadata: {
        scoreA: declared.scoreA,
        scoreB: declared.scoreB,
        ciLow: declared.ciLow,
        ciHigh: declared.ciHigh,
        coverage: declared.coverage,
      },
    },
  };
}

export function canonicalPublicationSnapshots(): {
  A: PublicationSnapshot<Conclusion>;
  B: PublicationSnapshot<Conclusion>;
} {
  const bundleA = finalizePublication("Lab A");
  const bundleB = finalizePublication("Lab B");
  verifyFinalizedBundle(bundleA);
  verifyFinalizedBundle(bundleB);
  return {
    A: publicationSnapshot("A", bundleA),
    B: publicationSnapshot("B", bundleB),
  };
}

export function buildCanonicalReconciliationCertificate({
  baseLab,
  candidate,
}: {
  baseLab: "A" | "B";
  candidate: readonly string[];
}): ProtocolReconciliationCertificate<Conclusion> {
  const publications = canonicalPublicationSnapshots();
  const certificate = buildReconciliationCertificate({
    schema: CANONICAL_PROTOCOL_SCHEMA,
    publicationA: publications.A,
    publicationB: publications.B,
    evaluator: evaluateCanonicalProtocol,
    evaluatorDescriptor: canonicalEvaluatorDescriptor(),
    direction: baseLab === "A" ? "A_TO_B" : "B_TO_A",
    selectedCandidate: candidate,
    exposedDimensions: EXPOSED_DIMENSIONS,
    limitations: CANONICAL_RECONCILIATION_LIMITATIONS,
    maxEvaluations: 2 ** EXPOSED_DIMENSIONS.length,
  });
  if (certificate.body.decision.status !== "VERIFIED") {
    throw new Error(
      `CERTIFICATE_NOT_ISSUED: candidate status is ${certificate.body.decision.status}`
    );
  }
  const replay = verifyCanonicalReconciliationCertificate(certificate);
  if (replay.status !== "SCIENTIFIC_REPLAY_VALID") {
    throw new Error("CERTIFICATE_NOT_ISSUED: internal replay did not validate");
  }
  return certificate;
}

export function verifyCanonicalReconciliationCertificate(certificate: unknown) {
  const publications = canonicalPublicationSnapshots();
  return verifyCertificateReplay(certificate, {
    evaluator: evaluateCanonicalProtocol,
    expectedEvaluatorDescriptor: canonicalEvaluatorDescriptor(),
    expectedPublicationA: publications.A,
    expectedPublicationB: publications.B,
    maxEvaluations: 2 ** EXPOSED_DIMENSIONS.length,
  });
}
