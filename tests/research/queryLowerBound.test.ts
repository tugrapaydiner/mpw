import { describe, expect, it } from "vitest";
import {
  assessMinimumCertificateCoverage,
  binomialCoefficientBigInt,
  demonstrateTightCardinalityBound,
  minimumWitnessCertificateQueryLowerBound,
  noWitnessCertificateQueryLowerBound,
} from "../../src/research/queryLowerBound";

describe("black-box exact-search query lower bounds", () => {
  it("computes exact binomial coefficients and certificate counts with bigint", () => {
    expect(binomialCoefficientBigInt(4, 0)).toBe(1n);
    expect(binomialCoefficientBigInt(4, 2)).toBe(6n);
    expect(binomialCoefficientBigInt(100, 50)).toBe(
      100891344545564193334812497256n
    );
    expect(minimumWitnessCertificateQueryLowerBound(4, 1)).toBe(5n);
    expect(minimumWitnessCertificateQueryLowerBound(4, 2)).toBe(11n);
    expect(noWitnessCertificateQueryLowerBound(4)).toBe(16n);
  });

  it("requires every subset through the claimed minimum cardinality", () => {
    const complete = assessMinimumCertificateCoverage({
      dimensions: ["a", "b", "c"],
      claimedMinimumCardinality: 1,
      queriedSubsets: [[], ["a"], ["b"], ["c"]],
    });
    expect(complete).toMatchObject({
      complete: true,
      requiredSubsets: 4,
      requiredQueryCountExact: "4",
    });

    const missing = assessMinimumCertificateCoverage({
      dimensions: ["c", "a", "b"],
      claimedMinimumCardinality: 1,
      queriedSubsets: [[], ["a"], ["c"]],
    });
    expect(missing.complete).toBe(false);
    expect(missing.missingSubsets).toEqual([["b"]]);
  });

  it("requires the entire powerset for a no-witness certificate", () => {
    const incomplete = assessMinimumCertificateCoverage({
      dimensions: ["a", "b"],
      claimedMinimumCardinality: null,
      queriedSubsets: [[], ["a"], ["b"]],
    });
    expect(incomplete).toMatchObject({
      complete: false,
      requiredSubsets: 4,
      requiredQueryCountExact: "4",
      missingSubsets: [["a", "b"]],
    });
  });

  it("shows the cardinality-ordered exact search meets the lower bound", () => {
    for (const [n, k] of [
      [0, 0],
      [4, 1],
      [4, 2],
      [8, 3],
    ] as const) {
      const result = demonstrateTightCardinalityBound(n, k);
      expect(result.tight).toBe(true);
      expect(BigInt(result.evaluatedSubsets)).toBe(BigInt(result.lowerBoundExact));
    }
  });

  it("rejects duplicate and malformed coverage claims", () => {
    expect(() =>
      assessMinimumCertificateCoverage({
        dimensions: ["a"],
        claimedMinimumCardinality: 0,
        queriedSubsets: [[], []],
      })
    ).toThrow(/duplicate queried subset/);
    expect(() =>
      assessMinimumCertificateCoverage({
        dimensions: ["a"],
        claimedMinimumCardinality: 1,
        queriedSubsets: [[], ["other"]],
      })
    ).toThrow(/unknown queried dimension/);
    expect(() => minimumWitnessCertificateQueryLowerBound(4, 5)).toThrow();
    expect(() => noWitnessCertificateQueryLowerBound(-1)).toThrow();
  });
});
