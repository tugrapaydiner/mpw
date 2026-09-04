import { describe, expect, it } from "vitest";
import { exactMinimumCostWitnessSearch } from "../../src/research/costSearch";

const contains = (subset: readonly string[], dimension: string): boolean =>
  subset.includes(dimension);

describe("exact minimum-cost witness search", () => {
  it("can prefer a larger-cardinality witness with lower declared cost", () => {
    const result = exactMinimumCostWitnessSearch({
      dimensions: ["a", "b", "c"],
      costs: { a: 100, b: 1, c: 1 },
      isSufficient: (subset) =>
        contains(subset, "a") ||
        (contains(subset, "b") && contains(subset, "c")),
    });
    expect(result).toMatchObject({
      status: "FOUND",
      minimumCost: 2,
      minimumCostWitnesses: [["b", "c"]],
      proof: {
        minimumCostProven: true,
        coMinimumCostComplete: true,
        landscapeExhaustive: false,
      },
    });
  });

  it("returns every tie at the globally minimum cost", () => {
    const result = exactMinimumCostWitnessSearch({
      dimensions: ["a", "b", "c"],
      costs: { a: 2, b: 1, c: 1 },
      isSufficient: (subset) =>
        contains(subset, "a") ||
        (contains(subset, "b") && contains(subset, "c")),
    });
    expect(result.minimumCost).toBe(2);
    expect(result.minimumCostWitnesses).toEqual([["a"], ["b", "c"]]);
  });

  it("handles zero-cost coordinates without dropping co-minimums", () => {
    const result = exactMinimumCostWitnessSearch({
      dimensions: ["a", "b"],
      costs: { a: 0, b: 1 },
      isSufficient: (subset) => subset.length === 0 || contains(subset, "a"),
    });
    expect(result.minimumCost).toBe(0);
    expect(result.minimumCostWitnesses).toEqual([[], ["a"]]);
    expect(result.evaluatedCostLevels).toEqual([0]);
  });

  it("stops cleanly when the tight budget exactly completes the winning level", () => {
    const result = exactMinimumCostWitnessSearch({
      dimensions: ["a", "b"],
      costs: { a: 1, b: 1 },
      isSufficient: (subset) => subset.length === 1,
      maxEvaluations: 3,
    });
    expect(result.minimumCost).toBe(1);
    expect(result.minimumCostWitnesses).toEqual([["a"], ["b"]]);
    expect(result.evaluatedSubsets).toBe(3);
  });

  it("fails rather than claiming a minimum when the budget ends inside a cost level", () => {
    expect(() =>
      exactMinimumCostWitnessSearch({
        dimensions: ["a", "b"],
        costs: { a: 1, b: 1 },
        isSufficient: (subset) => contains(subset, "a"),
        maxEvaluations: 2,
      })
    ).toThrow(/not proven within evaluation budget/);
  });

  it("requires the full landscape to report no witness", () => {
    const result = exactMinimumCostWitnessSearch({
      dimensions: ["a", "b"],
      costs: { a: 1, b: 2 },
      isSufficient: () => false,
      mode: "landscape",
      maxEvaluations: 4,
    });
    expect(result).toMatchObject({
      status: "NO_WITNESS",
      minimumCost: null,
      minimumCostWitnesses: [],
      evaluatedSubsets: 4,
      proof: { landscapeExhaustive: true },
    });
  });

  it("is invariant to dimension and cost-object key order", () => {
    const first = exactMinimumCostWitnessSearch({
      dimensions: ["a", "b", "c"],
      costs: { a: 3, b: 1, c: 2 },
      isSufficient: (subset) => contains(subset, "b") && contains(subset, "c"),
    });
    const second = exactMinimumCostWitnessSearch({
      dimensions: ["c", "a", "b"],
      costs: { c: 2, a: 3, b: 1 },
      isSufficient: (subset) => contains(subset, "b") && contains(subset, "c"),
    });
    expect(second).toEqual(first);
  });

  it("rejects missing, extra, negative, fractional, and overflowing costs", () => {
    expect(() =>
      exactMinimumCostWitnessSearch({
        dimensions: ["a", "b"],
        costs: { a: 1 },
        isSufficient: () => false,
      })
    ).toThrow(/cost keys/);
    expect(() =>
      exactMinimumCostWitnessSearch({
        dimensions: ["a"],
        costs: { a: 1, other: 2 },
        isSufficient: () => false,
      })
    ).toThrow(/cost keys/);
    expect(() =>
      exactMinimumCostWitnessSearch({
        dimensions: ["a"],
        costs: { a: -1 },
        isSufficient: () => false,
      })
    ).toThrow(/non-negative safe integer/);
    expect(() =>
      exactMinimumCostWitnessSearch({
        dimensions: ["a"],
        costs: { a: 0.5 },
        isSufficient: () => false,
      })
    ).toThrow(/non-negative safe integer/);
    expect(() =>
      exactMinimumCostWitnessSearch({
        dimensions: ["a", "b"],
        costs: { a: Number.MAX_SAFE_INTEGER, b: 1 },
        isSufficient: () => false,
      })
    ).toThrow(/safe integer range/);
  });
});
