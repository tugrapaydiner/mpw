import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import {
  buildCertificate,
  buildCertificateBody,
  canonicalCertificateInputs,
  verifyCertificate,
  withUiMetadata,
  LIMITATIONS,
  type CertificateInputs,
} from "../../src/engine/mpwCertificate";
import { canonicalize } from "../../src/engine/mpwManifest";
import { evidenceForProtocol } from "../../src/engine/mpwPublication";
import { LAB_A_PROTOCOL } from "../../src/engine/mpwFixture";
import type { Protocol } from "../../src/types/index";

const cloneInputs = (): CertificateInputs =>
  JSON.parse(JSON.stringify(canonicalCertificateInputs())) as CertificateInputs;

describe("certificate", () => {
  it("identical science gives same hash; wall-clock display never enters it", () => {
    const a = buildCertificate();
    const b = buildCertificate();
    expect(a.canonical).toBe(b.canonical);
    expect(a.certificateHash).toBe(b.certificateHash);
    expect(a.certificateId).toBe(b.certificateId);
    expect(a.certificateId.includes(a.certificateHash.slice(0, 16))).toBe(true);
    expect(a.canonical).toBe(canonicalize(a.body));
    const shownMorning = withUiMetadata(a, { displayedAt: "2026-01-01T00:00:00Z" });
    const shownNight = withUiMetadata(a, { displayedAt: "2026-12-31T23:59:59Z" });
    expect(shownMorning.certificateHash).toBe(shownNight.certificateHash);
    expect(JSON.stringify(a.body).toLowerCase().includes("displayedat")).toBe(false);
  });

  it("body has no clock anywhere in the module", async () => {
    const src = await readFile(new URL("../../src/engine/mpwCertificate.ts", import.meta.url), "utf8");
    expect(src.includes("Date.now")).toBe(false);
    const blob = JSON.stringify(buildCertificateBody()).toLowerCase();
    for (const k of ["displayedat", "downloadedat", "createdat", "timestamp", "wallclock"]) {
      expect(blob.includes(k)).toBe(false);
    }
  });

  it("committed canonical fixture verifies VALID", async () => {
    const fixture = JSON.parse(await readFile(new URL("../../data/certificates/canonical.json", import.meta.url), "utf8"));
    const r = verifyCertificate(fixture);
    expect(r.status).toBe("VALID");
    expect(buildCertificate().certificateHash).toBe(fixture.certificateHash);
  });

  it("changed evidence changes the hash", () => {
    const a = buildCertificate();
    const inputs = cloneInputs();
    const wx = inputs.witnessExperiment as NonNullable<CertificateInputs["witnessExperiment"]>;
    const flipped = evidenceForProtocol({ ...LAB_A_PROTOCOL } as Protocol, [], {
      flipReceipt: (r) => ({ ...r, finalCorrect: !r.finalCorrect }),
    });
    wx.evidenceHash = flipped.evidenceHash;
    wx.scoreA = flipped.summary.scoreA;
    expect(buildCertificate(inputs).certificateHash).not.toBe(a.certificateHash);
  });

  it("changed witness changes the hash", () => {
    const a = buildCertificate();
    const inputs = cloneInputs();
    const v = inputs.verification;
    v.selectedCandidate = ["answer_parser"];
    const wx = inputs.witnessExperiment as NonNullable<CertificateInputs["witnessExperiment"]>;
    wx.changedDimensions = ["answer_parser"];
    expect(buildCertificate(inputs).certificateHash).not.toBe(a.certificateHash);
  });

  it("missing limitation invalid", () => {
    const inputs = cloneInputs();
    const tampered = buildCertificate(inputs);
    const bod = tampered.body as unknown as { limitations: string[] };
    bod.limitations = bod.limitations.slice(0, 2);
    const { canonical, certificateHash, certificateId } = buildCertificateFromBody(bod);
    expect(() => verifyCertificate({ body: bod, canonical, certificateHash, certificateId })).toThrow(/CERT_INVALID/);
    expect(LIMITATIONS.length).toBe(3);
  });

  it("incomplete coverage prevents VERIFIED", () => {
    const inputs = cloneInputs();
    inputs.coverage = { expectedItems: 400, accountedItems: 399, percent: 99.75 };
    expect(() => verifyCertificate(buildCertificate(inputs))).toThrow(/CERT_INVALID/);
  });

  it("co-minimum witnesses retained end to end", () => {
    const inputs = cloneInputs();
    const v = inputs.verification;
    v.coMinimumWitnesses = [["reasoning_budget"], ["answer_parser"]];
    const audit = v.audit.find((r) => r.subset.join("+") === "answer_parser");
    if (audit) audit.sufficient = true;
    const r = verifyCertificate(buildCertificate(inputs));
    expect(r.status).toBe("VALID");
    const body = buildCertificate(inputs).body as unknown as { verification: { coMinimumWitnesses: string[][] } };
    expect(body.verification.coMinimumWitnesses).toEqual([["reasoning_budget"], ["answer_parser"]]);
  });

  it("UNRESOLVED certificate supported", () => {
    const inputs = cloneInputs();
    inputs.verification = {
      ...inputs.verification,
      status: "UNRESOLVED",
      minimumCardinality: null,
      coMinimumWitnesses: [],
      selectedCandidate: null,
    };
    inputs.witnessExperiment = null;
    expect(verifyCertificate(buildCertificate(inputs)).status).toBe("VALID");
  });

  it("INCONCLUSIVE target supported", () => {
    const inputs = cloneInputs();
    inputs.target = "INCONCLUSIVE";
    inputs.verification = {
      ...inputs.verification,
      status: "UNRESOLVED",
      minimumCardinality: null,
      coMinimumWitnesses: [],
      selectedCandidate: null,
    };
    inputs.witnessExperiment = null;
    expect(verifyCertificate(buildCertificate(inputs)).status).toBe("VALID");
  });
});

import { canonicalBytes } from "../../src/engine/mpwProvenance";
import { sha256Hex } from "../../src/engine/sha256";

function buildCertificateFromBody(body: unknown) {
  const canonical = canonicalBytes(body);
  const certificateHash = sha256Hex(canonical);
  return { body, canonical, certificateHash, certificateId: `mpw-${certificateHash.slice(0, 16)}` };
}
