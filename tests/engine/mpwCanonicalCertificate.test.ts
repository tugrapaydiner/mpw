import { describe, expect, it } from "vitest";
import {
  buildCanonicalReconciliationCertificate,
  verifyCanonicalReconciliationCertificate,
} from "../../src/engine/mpwCanonicalCertificate";
import { witness } from "../../src/engine/mpwService";
import { canonicalBytes } from "../../src/engine/mpwProvenance";
import { sha256Hex } from "../../src/engine/sha256";
import type { ProtocolReconciliationCertificate } from "../../src/research/certificate";

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

describe("canonical reconciliation certificate v2", () => {
  it("binds and replays the forward witness across all 16 protocol worlds", () => {
    const certificate = buildCanonicalReconciliationCertificate({
      baseLab: "A",
      candidate: ["reasoning_budget"],
    });
    expect(certificate.body.direction).toBe("A_TO_B");
    expect(certificate.body.decision.status).toBe("VERIFIED");
    expect(certificate.body.decision.selectedCandidate).toEqual(["reasoning_budget"]);
    expect(certificate.body.proof).toMatchObject({
      minimumProven: true,
      coMinimumComplete: true,
      landscapeExhaustive: true,
      evaluatedSubsets: 16,
      totalSubsets: 16,
    });
    expect(certificate.body.audit).toHaveLength(16);
    expect(verifyCanonicalReconciliationCertificate(certificate).status).toBe("SCIENTIFIC_REPLAY_VALID");
  });

  it("binds a reverse-direction request to a reverse-direction certificate", () => {
    const reverseSearch = witness([], "B");
    expect(reverseSearch.minimumWitnesses.length).toBeGreaterThan(0);
    const candidate = reverseSearch.minimumWitnesses[0];
    const certificate = buildCanonicalReconciliationCertificate({ baseLab: "B", candidate });
    expect(certificate.body.direction).toBe("B_TO_A");
    expect(certificate.body.decision.selectedCandidate).toEqual([...candidate].sort());
    expect(certificate.body.decision.minimumWitnesses).toContainEqual([...candidate].sort());
    expect(verifyCanonicalReconciliationCertificate(certificate).status).toBe("SCIENTIFIC_REPLAY_VALID");
  });

  it("does not issue a certificate for a non-sufficient or non-minimum request", () => {
    expect(() =>
      buildCanonicalReconciliationCertificate({ baseLab: "A", candidate: ["answer_parser"] })
    ).toThrow(/CERTIFICATE_NOT_ISSUED/);
    expect(() =>
      buildCanonicalReconciliationCertificate({
        baseLab: "A",
        candidate: ["reasoning_budget", "answer_parser"],
      })
    ).toThrow(/CERTIFICATE_NOT_ISSUED/);
  });

  it("rejects a rehashed change to a scientific audit row", () => {
    const tampered = structuredClone(
      buildCanonicalReconciliationCertificate({ baseLab: "A", candidate: ["reasoning_budget"] })
    );
    tampered.body.audit[0].observation.metadata = {
      ...tampered.body.audit[0].observation.metadata,
      scoreA: 0,
    };
    const authenticallyRehashed = rehash(tampered);
    expect(() => verifyCanonicalReconciliationCertificate(authenticallyRehashed)).toThrow(
      /CERTIFICATE_REPLAY_MISMATCH/
    );
  });

  it("rejects a rehashed publication identity substitution", () => {
    const tampered = structuredClone(
      buildCanonicalReconciliationCertificate({ baseLab: "A", candidate: ["reasoning_budget"] })
    );
    tampered.body.publications.A.publicationHash = "0".repeat(64);
    const authenticallyRehashed = rehash(tampered);
    expect(() => verifyCanonicalReconciliationCertificate(authenticallyRehashed)).toThrow(
      /publication\.A\.identity/
    );
  });
});
