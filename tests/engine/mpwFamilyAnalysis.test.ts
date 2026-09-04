import { describe, expect, it } from "vitest";
import { analyzeCanonicalProtocolFamily } from "../../src/engine/mpwFamilyAnalysis";

describe("canonical 16-world family analysis", () => {
  it("reproduces every legacy pointwise interval before applying simultaneous inference", () => {
    const report = analyzeCanonicalProtocolFamily({ seed: "mpw-boot-v1", replicates: 500 });
    expect(report.family.familySize).toBe(16);
    expect(report.pointwiseCompatibility).toEqual({ checked: 16, exactMatches: 16, allMatched: true });
    expect(report.reconciliations.pointwise.A_TO_B.search).toMatchObject({
      status: "FOUND",
      minimumCardinality: 1,
      minimumWitnesses: [["reasoning_budget"]],
      proof: {
        minimumProven: true,
        coMinimumComplete: true,
        landscapeExhaustive: true,
      },
    });
  });

  it("reports pointwise and simultaneous reconciliation as distinct analyses", () => {
    const report = analyzeCanonicalProtocolFamily({ seed: "family-canonical-test", replicates: 500 });
    for (const mode of [report.reconciliations.pointwise, report.reconciliations.simultaneous]) {
      for (const direction of [mode.A_TO_B, mode.B_TO_A]) {
        expect(direction.search.proof.landscapeExhaustive).toBe(true);
        expect(direction.search.evaluatedSubsets).toBe(16);
      }
    }
    expect(report.family.method).toBe("synchronized-stratified-max-absolute-deviation-bootstrap");
    expect(report.family.limitations.join(" ")).toMatch(/model-run/);
  });
});
