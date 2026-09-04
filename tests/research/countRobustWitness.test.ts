import { describe, expect, it } from "vitest";
import { findCountBasedRobustProtocolWitnesses } from "../../src/research/countRobustWitness";
import { findExactRobustProtocolWitnesses } from "../../src/research/exactRobustWitness";
import { findRobustProtocolWitnesses } from "../../src/research/robustWitness";

const booleans = (successes: number, trials: number): boolean[] => [
  ...Array.from({ length: successes }, () => true),
  ...Array.from({ length: trials - successes }, () => false),
];

const counts = [
  { subset: [], successes: 10, trials: 200 },
  { subset: ["a"], successes: 200, trials: 200 },
  { subset: ["b"], successes: 190, trials: 200 },
  { subset: ["a", "b"], successes: 200, trials: 200 },
];

describe("count-based robust witness inference", () => {
  it("matches the raw Boolean Hoeffding implementation exactly", () => {
    const compact = findCountBasedRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      counts,
      threshold: 0.9,
      alpha: 0.05,
      method: "hoeffding",
    });
    const raw = findRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      repeatedOutcomes: counts.map((row) => ({
        subset: row.subset,
        trials: booleans(row.successes, row.trials),
      })),
      threshold: 0.9,
      alpha: 0.05,
    });
    expect(compact.search).toEqual(raw.search);
    expect(
      compact.rows.map((row) => ({
        subset: row.subset,
        trials: row.trials,
        successes: row.successes,
        empiricalProbability: row.empiricalProbability,
        pointwiseLowerBound: row.pointwiseLowerBound,
        simultaneousLowerBound: row.simultaneousLowerBound,
        threshold: row.threshold,
        robustlySufficient: row.robustlySufficient,
      }))
    ).toEqual(raw.rows);
  });

  it("matches the raw Boolean Clopper-Pearson implementation", () => {
    const compact = findCountBasedRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      counts,
      threshold: 0.9,
      alpha: 0.05,
      method: "clopper-pearson",
    });
    const raw = findExactRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      repeatedOutcomes: counts.map((row) => ({
        subset: row.subset,
        trials: booleans(row.successes, row.trials),
      })),
      threshold: 0.9,
      alpha: 0.05,
    });
    expect(compact.search).toEqual(raw.search);
    expect(compact.rows).toEqual(
      raw.rows.map((row) => ({
        subset: row.subset,
        successes: row.successes,
        trials: row.trials,
        empiricalProbability: row.empiricalProbability,
        pointwiseLowerBound: row.pointwiseExactLowerBound,
        simultaneousLowerBound: row.simultaneousExactLowerBound,
        threshold: row.threshold,
        robustlySufficient: row.robustlySufficient,
      }))
    );
  });

  it("accepts unequal fixed trial counts across subsets", () => {
    const result = findCountBasedRobustProtocolWitnesses({
      dimensions: ["x"],
      counts: [
        { subset: [], successes: 0, trials: 25 },
        { subset: ["x"], successes: 1_000, trials: 1_000 },
      ],
      threshold: 0.9,
      method: "clopper-pearson",
    });
    expect(result.certificationStatus).toBe("CERTIFIED_WITNESS_FOUND");
    expect(result.search.minimumWitnesses).toEqual([["x"]]);
  });

  it("does not call absence of certification a true no-witness result", () => {
    const result = findCountBasedRobustProtocolWitnesses({
      dimensions: ["x"],
      counts: [
        { subset: [], successes: 0, trials: 20 },
        { subset: ["x"], successes: 20, trials: 20 },
      ],
      threshold: 0.9,
      method: "hoeffding",
    });
    expect(result.certificationStatus).toBe("NO_CERTIFIED_WITNESS");
    expect(result.limitations.join(" ")).toMatch(/does not prove/);
  });

  it("is invariant to row, subset, dimension, and object-key order", () => {
    const first = findCountBasedRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      counts,
      threshold: 0.85,
    });
    const second = findCountBasedRobustProtocolWitnesses({
      dimensions: ["b", "a"],
      counts: [
        { trials: 200, successes: 200, subset: ["b", "a"] },
        { trials: 200, successes: 190, subset: ["b"] },
        { trials: 200, successes: 200, subset: ["a"] },
        { trials: 200, successes: 10, subset: [] },
      ],
      threshold: 0.85,
    });
    expect(second).toEqual(first);
  });

  it("rejects incomplete, duplicate, malformed, and extra-field count families", () => {
    expect(() =>
      findCountBasedRobustProtocolWitnesses({
        dimensions: ["a"],
        counts: [{ subset: [], successes: 0, trials: 10 }],
        threshold: 0.5,
      })
    ).toThrow(/incomplete/);
    expect(() =>
      findCountBasedRobustProtocolWitnesses({
        dimensions: [],
        counts: [
          { subset: [], successes: 0, trials: 10 },
          { subset: [], successes: 0, trials: 10 },
        ],
        threshold: 0.5,
      })
    ).toThrow(/duplicate/);
    expect(() =>
      findCountBasedRobustProtocolWitnesses({
        dimensions: [],
        counts: [{ subset: [], successes: 11, trials: 10 }],
        threshold: 0.5,
      })
    ).toThrow(/successes/);
    expect(() =>
      findCountBasedRobustProtocolWitnesses({
        dimensions: [],
        counts: [
          { subset: [], successes: 1, trials: 10, extra: true } as never,
        ],
        threshold: 0.5,
      })
    ).toThrow(/exactly/);
  });
});
