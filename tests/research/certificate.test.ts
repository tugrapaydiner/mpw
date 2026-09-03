import { describe, expect, it } from "vitest";
import { canonicalBytes } from "../../src/engine/mpwProvenance";
import { sha256Hex } from "../../src/engine/sha256";
import {
  buildReconciliationCertificate,
  verifyCertificateIntegrity,
  verifyCertificateReplay,
  type ProtocolReconciliationCertificate,
  type PublicationSnapshot,
} from "../../src/research/certificate";
import type { FiniteProtocol, ProtocolSchema } from "../../src/research/protocol";

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
const evaluate = (protocol: FiniteProtocol) => ({
  conclusion: protocol.x === 1 ? "TARGET" : "BASE",
  effect: protocol.x === 1 ? -0.1 + Number(protocol.y) * 0.02 : 0.1,
  evidenceId: `evidence:${protocol.x}:${protocol.y}`,
  metadata: { coverage: 20 },
});
const publication = (label: "A" | "B", protocol: FiniteProtocol): PublicationSnapshot => ({
  publicationId: `publication-${label}`,
  publicationHash: label === "A" ? "a".repeat(64) : "b".repeat(64),
  protocol,
  declaredObservation: evaluate(protocol),
});
const descriptor = { kind: "TestEvaluator", version: 1 } as const;

function build(direction: "A_TO_B" | "B_TO_A" = "A_TO_B", candidate: string[] = ["x"]) {
  return buildReconciliationCertificate({
    schema,
    publicationA: publication("A", protocolA),
    publicationB: publication("B", protocolB),
    evaluator: evaluate,
    evaluatorDescriptor: descriptor,
    direction,
    selectedCandidate: candidate,
    limitations: ["synthetic test fixture"],
    maxEvaluations: 4,
  });
}

function rehash(certificate: ProtocolReconciliationCertificate): ProtocolReconciliationCertificate {
  const canonical = canonicalBytes(certificate.body);
  const certificateHash = sha256Hex(canonical);
  return {
    ...certificate,
    canonical,
    certificateHash,
    certificateId: `mpw-v2-${certificateHash.slice(0, 16)}`,
  };
}

describe("portable reconciliation certificate", () => {
  it("separates byte integrity from deterministic scientific replay", () => {
    const certificate = build();
    expect(verifyCertificateIntegrity(certificate).status).toBe("CONTENT_INTEGRITY_VALID");
    expect(
      verifyCertificateReplay(certificate, {
        evaluator: evaluate,
        expectedEvaluatorDescriptor: descriptor,
        expectedPublicationA: publication("A", protocolA),
        expectedPublicationB: publication("B", protocolB),
        maxEvaluations: 4,
      }).status
    ).toBe("SCIENTIFIC_REPLAY_VALID");
    expect(certificate.body.proof).toMatchObject({
      minimumProven: true,
      coMinimumComplete: true,
      landscapeExhaustive: true,
      evaluatedSubsets: 4,
    });
  });

  it("rejects rehashed scientific tampering during replay", () => {
    const tampered = structuredClone(build());
    tampered.body.audit[0].observation.effect = 999;
    const authenticallyRehashed = rehash(tampered);
    expect(verifyCertificateIntegrity(authenticallyRehashed).status).toBe("CONTENT_INTEGRITY_VALID");
    expect(() => verifyCertificateReplay(authenticallyRehashed, { evaluator: evaluate, maxEvaluations: 4 })).toThrow(
      /CERTIFICATE_REPLAY_MISMATCH/
    );
  });

  it("binds the direction and selected candidate into the artifact", () => {
    const forward = build("A_TO_B", ["x"]);
    const reverse = build("B_TO_A", ["x"]);
    expect(forward.body.direction).toBe("A_TO_B");
    expect(reverse.body.direction).toBe("B_TO_A");
    expect(forward.body.decision.selectedCandidate).toEqual(["x"]);
    expect(reverse.body.decision.selectedCandidate).toEqual(["x"]);
    expect(forward.certificateHash).not.toBe(reverse.certificateHash);
  });

  it("records non-minimum candidates but does not call them verified", () => {
    const certificate = build("A_TO_B", ["x", "y"]);
    expect(certificate.body.decision.status).toBe("NON_MINIMUM");
    expect(certificate.body.decision.minimumWitnesses).toEqual([["x"]]);
  });

  it("refuses source declarations that fail evaluator replay", () => {
    const forgedB = publication("B", protocolB);
    forgedB.declaredObservation = { ...forgedB.declaredObservation, conclusion: "BASE" };
    expect(() =>
      buildReconciliationCertificate({
        schema,
        publicationA: publication("A", protocolA),
        publicationB: forgedB,
        evaluator: evaluate,
        evaluatorDescriptor: descriptor,
        direction: "A_TO_B",
        selectedCandidate: ["x"],
        maxEvaluations: 4,
      })
    ).toThrow(/SOURCE_REPLAY_MISMATCH/);
  });

  it("refuses a portable certificate when the finite landscape was not completed", () => {
    expect(() =>
      buildReconciliationCertificate({
        schema,
        publicationA: publication("A", protocolA),
        publicationB: publication("B", protocolB),
        evaluator: evaluate,
        evaluatorDescriptor: descriptor,
        direction: "A_TO_B",
        selectedCandidate: ["x"],
        maxEvaluations: 2,
      })
    ).toThrow(/CERTIFICATE_INCOMPLETE/);
  });
});
