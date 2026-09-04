import { describe, expect, it } from "vitest";
import {
  anytimeHoeffdingBernoulliLowerBound,
  findAnytimeValidRobustProtocolWitnesses,
} from "../../src/research/anytimeRobustWitness";

describe("anytime-valid robust witness inference", () => {
  it("starts with zero lower bounds when no subset has been sampled", () => {
    const result = findAnytimeValidRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      counts: [
        { subset: [], successes: 0, trials: 0 },
        { subset: ["a"], successes: 0, trials: 0 },
        { subset: ["b"], successes: 0, trials: 0 },
        { subset: ["a", "b"], successes: 0, trials: 0 },
      ],
      threshold: 0.9,
    });
    expect(result.certificationStatus).toBe("NO_CERTIFIED_WITNESS");
    expect(result.rows.every((row) => row.anytimeLowerBound === 0)).toBe(true);
    expect(result.rows.every((row) => row.allocatedError === null)).toBe(true);
  });

  it("certifies a strong singleton while preserving all co-minimum ties", () => {
    const result = findAnytimeValidRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      counts: [
        { subset: [], successes: 0, trials: 2_000 },
        { subset: ["a"], successes: 2_000, trials: 2_000 },
        { subset: ["b"], successes: 2_000, trials: 2_000 },
        { subset: ["a", "b"], successes: 2_000, trials: 2_000 },
      ],
      threshold: 0.9,
      alpha: 0.05,
    });
    expect(result.certificationStatus).toBe("CERTIFIED_WITNESS_FOUND");
    expect(result.search.minimumCardinality).toBe(1);
    expect(result.search.minimumWitnesses).toEqual([["a"], ["b"]]);
    expect(result.search.proof).toMatchObject({
      minimumProven: true,
      coMinimumComplete: true,
      landscapeExhaustive: true,
    });
  });

  it("is more conservative than fixed-time familywise Hoeffding monitoring", () => {
    const anytime = anytimeHoeffdingBernoulliLowerBound({
      successes: 950,
      trials: 1_000,
      alpha: 0.05,
      familySize: 4,
    });
    const fixedRadius = Math.sqrt(Math.log(4 / 0.05) / (2 * 1_000));
    const fixedLower = 0.95 - fixedRadius;
    expect(anytime.lowerBound).toBeLessThan(fixedLower);
    expect(anytime.allocatedError).toBeCloseTo(
      0.05 / (4 * 1_000 * 1_001),
      20
    );
  });

  it("increases along the all-success path as evidence accumulates", () => {
    const bounds = [10, 100, 1_000, 10_000].map((trials) =>
      anytimeHoeffdingBernoulliLowerBound({
        successes: trials,
        trials,
        alpha: 0.05,
        familySize: 2,
      }).lowerBound
    );
    for (let index = 1; index < bounds.length; index++) {
      expect(bounds[index]).toBeGreaterThan(bounds[index - 1]);
    }
  });

  it("is invariant to row and dimension order", () => {
    const first = findAnytimeValidRobustProtocolWitnesses({
      dimensions: ["a", "b"],
      counts: [
        { subset: [], successes: 10, trials: 100 },
        { subset: ["a"], successes: 1_000, trials: 1_000 },
        { subset: ["b"], successes: 100, trials: 1_000 },
        { subset: ["a", "b"], successes: 1_000, trials: 1_000 },
      ],
      threshold: 0.8,
    });
    const second = findAnytimeValidRobustProtocolWitnesses({
      dimensions: ["b", "a"],
      counts: [
        { subset: ["b", "a"], successes: 1_000, trials: 1_000 },
        { subset: ["b"], successes: 100, trials: 1_000 },
        { subset: ["a"], successes: 1_000, trials: 1_000 },
        { subset: [], successes: 10, trials: 100 },
      ],
      threshold: 0.8,
    });
    expect(second).toEqual(first);
  });

  it("rejects malformed counts and an incomplete monitored family", () => {
    expect(() =>
      findAnytimeValidRobustProtocolWitnesses({
        dimensions: ["a"],
        counts: [{ subset: [], successes: 0, trials: 0 }],
        threshold: 0.5,
      })
    ).toThrow(/incomplete/);
    expect(() =>
      findAnytimeValidRobustProtocolWitnesses({
        dimensions: [],
        counts: [{ subset: [], successes: 1, trials: 0 }],
        threshold: 0.5,
      })
    ).toThrow(/successes/);
    expect(() =>
      anytimeHoeffdingBernoulliLowerBound({
        successes: 1,
        trials: -1,
        alpha: 0.05,
        familySize: 1,
      })
    ).toThrow(/trials/);
  });
});
