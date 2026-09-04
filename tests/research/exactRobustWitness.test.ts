import { describe, expect, it } from "vitest";
import { findExactRobustProtocolWitnesses } from "../../src/research/exactRobustWitness";

const repeat = (successes: number, trials: number): boolean[] => [
  ...Array.from({ length: successes }, () => true),
  ...Array.from({ length: trials - successes }, () => false),
];

const row = (subset: string[], successes: number, trials: number) => ({
  subset,
  trials: repeat(successes, trials),
});

describe("exact familywise robust witnesses", () => {
  it("can certify a fixed-trial family that the Hoeffding reference leaves unresolved", () => {
    const result = findExactRobustProtocolWitnesses({
      dimensions: ["x"],
      threshold: 0.9,
      alpha: 0.05,
      repeatedOutcomes: [row([], 0, 100), row(["x"], 100, 100)],
    });
    expect(result.search).toMatchObject({
      status: "FOUND",
      minimumCardinality: 1,
      minimumWitnesses: [["x"]],
    });
    expect(result.referenceHoeffdingResult.search.status).toBe("NO_WITNESS");
    const exact = result.rows.find((candidate) => candidate.subset.join("+") === "x");
    expect(exact?.simultaneousExactLowerBound).toBeGreaterThan(0.9);
  });

  it("returns every exact co-minimum witness", () => {
    const result = findExactRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      threshold: 0.9,
      alpha: 0.05,
      repeatedOutcomes: [
        row([], 10, 200),
        row(["a"], 200, 200),
        row(["b"], 200, 200),
        row(["a", "b"], 200, 200),
      ],
    });
    expect(result.search.minimumCardinality).toBe(1);
    expect(result.search.minimumWitnesses).toEqual([["a"], ["b"]]);
    expect(result.search.proof).toMatchObject({
      minimumProven: true,
      coMinimumComplete: true,
      landscapeExhaustive: true,
    });
  });

  it("keeps simultaneous exact bounds no larger than pointwise exact bounds", () => {
    const result = findExactRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      threshold: 0,
      repeatedOutcomes: [
        row([], 50, 100),
        row(["a"], 80, 100),
        row(["b"], 90, 100),
        row(["a", "b"], 100, 100),
      ],
    });
    for (const candidate of result.rows) {
      expect(candidate.simultaneousExactLowerBound).toBeLessThanOrEqual(
        candidate.pointwiseExactLowerBound
      );
    }
  });

  it("is invariant to family input order through the shared validation path", () => {
    const forward = findExactRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      threshold: 0.8,
      repeatedOutcomes: [
        row([], 10, 100),
        row(["a"], 95, 100),
        row(["b"], 20, 100),
        row(["a", "b"], 97, 100),
      ],
    });
    const reverse = findExactRobustProtocolWitnesses({
      dimensions: ["b", "a"],
      threshold: 0.8,
      repeatedOutcomes: [
        row(["b", "a"], 97, 100),
        row(["b"], 20, 100),
        row(["a"], 95, 100),
        row([], 10, 100),
      ],
    });
    expect(reverse).toEqual(forward);
  });
});
