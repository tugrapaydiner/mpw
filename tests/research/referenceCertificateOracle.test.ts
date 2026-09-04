import { describe, expect, it } from "vitest";
import {
  buildCanonicalReconciliationCertificate,
} from "../../src/engine/mpwCanonicalCertificate";
import { canonicalBytes } from "../../src/engine/mpwProvenance";
import { sha256Hex } from "../../src/engine/sha256";
import {
  buildReconciliationCertificate,
  type ProtocolReconciliationCertificate,
  type PublicationSnapshot,
} from "../../src/research/certificate";
import { verifyCertificateWithReferenceOracle } from "../../src/research/referenceCertificateOracle";
import type { FiniteProtocol, ProtocolSchema } from "../../src/research/protocol";

function rehash(
  certificate: ProtocolReconciliationCertificate
): ProtocolReconciliationCertificate {
  const canonical = canonicalBytes(certificate.body);
  const certificateHash = sha256Hex(canonical);
  return {
    ...certificate,
    canonical,
    certificateHash,
    certificateId: `mpw-v2-${certificateHash.slice(0, 16)}`,
  };
}

const schema: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: [
    { name: "x", values: [0, 1] },
    { name: "y", values: [0, 1] },
  ],
};
const protocolA: FiniteProtocol = { x: 0, y: 0 };
const protocolB: FiniteProtocol = { x: 1, y: 1 };

function observation(protocol: FiniteProtocol) {
  return {
    conclusion: protocol.x === 1 ? "TARGET" : "BASE",
    effect: protocol.x === 1 ? -0.1 : 0.1,
    evidenceId: `e:${protocol.x}:${protocol.y}`,
  };
}

function publication(
  label: "A" | "B",
  protocol: FiniteProtocol
): PublicationSnapshot {
  return {
    publicationId: `publication-${label}`,
    publicationHash: label === "A" ? "a".repeat(64) : "b".repeat(64),
    protocol,
    declaredObservation: observation(protocol),
  };
}

function genericCertificate() {
  return buildReconciliationCertificate({
    schema,
    publicationA: publication("A", protocolA),
    publicationB: publication("B", protocolB),
    evaluator: observation,
    evaluatorDescriptor: { kind: "ReferenceOracleTestEvaluator", version: 1 },
    direction: "A_TO_B",
    selectedCandidate: ["x"],
    limitations: ["test fixture"],
    maxEvaluations: 4,
  });
}

describe("independent certificate reference oracle", () => {
  it("independently reconstructs the canonical finite witness proof", () => {
    const certificate = buildCanonicalReconciliationCertificate({
      baseLab: "A",
      candidate: ["reasoning_budget"],
    });
    const result = verifyCertificateWithReferenceOracle(certificate);
    expect(result).toMatchObject({
      status: "REFERENCE_CERTIFICATE_ORACLE_VALID",
      checkedSubsets: 16,
      minimumCardinality: 1,
      minimumWitnesses: [["reasoning_budget"]],
      candidateStatus: "VERIFIED",
    });
  });

  it("agrees with a generic two-coordinate certificate", () => {
    const result = verifyCertificateWithReferenceOracle(genericCertificate());
    expect(result).toMatchObject({
      checkedSubsets: 4,
      minimumCardinality: 1,
      minimumWitnesses: [["x"]],
      candidateStatus: "VERIFIED",
    });
  });

  it("rejects rehashed sufficiency-label tampering", () => {
    const tampered = structuredClone(genericCertificate());
    tampered.body.audit[0].sufficient = !tampered.body.audit[0].sufficient;
    expect(() => verifyCertificateWithReferenceOracle(rehash(tampered))).toThrow(
      /audit\[0\]\.sufficient/
    );
  });

  it("rejects a rehashed hybrid protocol substitution error", () => {
    const tampered = structuredClone(genericCertificate());
    const row = tampered.body.audit.find((candidate) =>
      candidate.subset.includes("x")
    );
    expect(row).toBeDefined();
    if (!row) return;
    row.protocol = { ...row.protocol, x: 0 };
    expect(() => verifyCertificateWithReferenceOracle(rehash(tampered))).toThrow(
      /protocol/
    );
  });

  it("rejects rehashed minimum and candidate-status tampering", () => {
    const wrongMinimum = structuredClone(genericCertificate());
    wrongMinimum.body.decision.minimumCardinality = 2;
    expect(() =>
      verifyCertificateWithReferenceOracle(rehash(wrongMinimum))
    ).toThrow(/minimumCardinality/);

    const wrongStatus = structuredClone(genericCertificate());
    wrongStatus.body.decision.status = "NON_MINIMUM";
    expect(() => verifyCertificateWithReferenceOracle(rehash(wrongStatus))).toThrow(
      /decision\.status/
    );
  });

  it("requires full-landscape certificate coverage", () => {
    const tampered = structuredClone(genericCertificate());
    tampered.body.audit.pop();
    tampered.body.proof.evaluatedSubsets = 3;
    tampered.body.proof.totalSubsets = 3;
    tampered.body.proof.totalSubsetsExact = "3";
    expect(() => verifyCertificateWithReferenceOracle(rehash(tampered))).toThrow(
      /audit\.count|proof\.counts/
    );
  });
});
