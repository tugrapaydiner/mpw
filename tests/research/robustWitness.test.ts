import { describe, expect, it } from "vitest";
import {
  findRobustProtocolWitnesses,
  hoeffdingBernoulliLowerBound,
  type RepeatedSufficiencyRow,
} from "../../src/research/robustWitness";

const repeat = (successes: number, trials: number): boolean[] => [
  ...Array.from({ length: successes }, () => true),
  ...Array.from({ length: trials - successes }, () => false),
];

const row = (subset: string[], successes: number, trials = 1_000): RepeatedSufficiencyRow => ({
  subset,
  trials: repeat(successes, trials),
});

describe("familywise robust protocol witnesses", () => {
  it("recovers every co-minimum witness only after simultaneous lower bounds clear the threshold", () => {
    const result = findRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      threshold: 0.9,
      alpha: 0.05,
      repeatedOutcomes: [
        row([], 200),
        row(["a"], 960),
        row(["b"], 960),
        row(["a", "b"], 990),
      ],
    });
    expect(result.search).toMatchObject({
      status: "FOUND",
      minimumCardinality: 1,
      minimumWitnesses: [["a"], ["b"]],
      evaluatedSubsets: 4,
      proof: {
        minimumProven: true,
        coMinimumComplete: true,
        landscapeExhaustive: true,
      },
    });
    expect(result.rows.find((candidate) => candidate.subset.join("+") === "a")?.robustlySufficient).toBe(true);
    expect(result.perConfigurationAlpha).toBe(0.0125);
  });

  it("does not promote a perfect small sample into a high-probability witness", () => {
    const result = findRobustProtocolWitnesses({
      dimensions: ["x"],
      threshold: 0.9,
      alpha: 0.05,
      repeatedOutcomes: [row([], 0, 20), row(["x"], 20, 20)],
    });
    expect(result.rows.find((candidate) => candidate.subset.length === 1)).toMatchObject({
      empiricalProbability: 1,
      robustlySufficient: false,
    });
    expect(result.search.status).toBe("NO_WITNESS");
  });

  it("uses a simultaneous bound no larger than the corresponding pointwise bound", () => {
    const result = findRobustProtocolWitnesses({
      dimensions: ["a", "b", "c"],
      threshold: 0,
      repeatedOutcomes: [
        row([], 80, 100),
        row(["a"], 80, 100),
        row(["b"], 80, 100),
        row(["c"], 80, 100),
        row(["a", "b"], 80, 100),
        row(["a", "c"], 80, 100),
        row(["b", "c"], 80, 100),
        row(["a", "b", "c"], 80, 100),
      ],
    });
    for (const candidate of result.rows) {
      expect(candidate.simultaneousLowerBound).toBeLessThanOrEqual(candidate.pointwiseLowerBound);
    }
  });

  it("is invariant to dimension, row, and within-row trial order", () => {
    const rows = [
      row([], 5, 10),
      row(["a"], 9, 10),
      row(["b"], 8, 10),
      row(["a", "b"], 10, 10),
    ];
    const forward = findRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      threshold: 0.5,
      repeatedOutcomes: rows,
    });
    const reordered = findRobustProtocolWitnesses({
      dimensions: ["b", "a"],
      threshold: 0.5,
      repeatedOutcomes: rows
        .map((candidate) => ({
          subset: [...candidate.subset].reverse(),
          trials: [...candidate.trials].reverse(),
        }))
        .reverse(),
    });
    expect(reordered).toEqual(forward);
  });

  it("rejects incomplete, duplicate, malformed, and undeclared families", () => {
    expect(() =>
      findRobustProtocolWitnesses({
        dimensions: ["a", "b"],
        threshold: 0.5,
        repeatedOutcomes: [row([], 1, 1)],
      })
    ).toThrow(/incomplete/);
    expect(() =>
      findRobustProtocolWitnesses({
        dimensions: ["a"],
        threshold: 0.5,
        repeatedOutcomes: [row([], 1, 1), row([], 1, 1)],
      })
    ).toThrow(/duplicate/);
    expect(() =>
      findRobustProtocolWitnesses({
        dimensions: ["a"],
        threshold: 0.5,
        repeatedOutcomes: [row([], 1, 1), { subset: ["a"], trials: [true, 1 as never] }],
      })
    ).toThrow(/booleans/);
    expect(() =>
      findRobustProtocolWitnesses({
        dimensions: ["a"],
        threshold: 0.5,
        repeatedOutcomes: [row([], 1, 1), row(["other"], 1, 1)],
      })
    ).toThrow(/unknown subset dimension/);
  });

  it("matches known Hoeffding edge behavior", () => {
    expect(hoeffdingBernoulliLowerBound(0, 100, 0.05)).toBe(0);
    expect(hoeffdingBernoulliLowerBound(100, 100, 0.05)).toBeGreaterThan(0.87);
    expect(hoeffdingBernoulliLowerBound(100, 100, 0.05)).toBeLessThan(1);
    expect(() => hoeffdingBernoulliLowerBound(11, 10, 0.05)).toThrow();
    expect(() => hoeffdingBernoulliLowerBound(1, 10, 1)).toThrow();
  });
});
