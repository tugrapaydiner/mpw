import { describe, expect, it } from "vitest";
import { anytimeCardinalityWitnessSearch } from "../../src/research/anytimeSearch";

describe("honest anytime cardinality search", () => {
  it("returns an exact minimum only after completing the winning level", () => {
    const result = anytimeCardinalityWitnessSearch({
      dimensions: ["a", "b", "c"],
      maxEvaluations: 4,
      isSufficient: (subset) => subset.includes("b"),
    });
    expect(result).toMatchObject({
      status: "EXACT_MINIMUM",
      evaluatedSubsets: 4,
      completedCardinalities: [0, 1],
      minimumCardinalityLowerBound: 1,
      minimumCardinalityUpperBound: 1,
      minimumCardinality: 1,
      knownMinimumWitnesses: [["b"]],
      proof: {
        minimumCardinalityProven: true,
        coMinimumComplete: true,
        noWitnessProven: false,
      },
    });
  });

  it("proves the minimum cardinality but refuses complete-tie status mid-level", () => {
    const result = anytimeCardinalityWitnessSearch({
      dimensions: ["a", "b", "c"],
      maxEvaluations: 3,
      isSufficient: (subset) => subset.includes("a") || subset.includes("c"),
    });
    expect(result).toMatchObject({
      status: "PARTIAL_MINIMUM_TIES_INCOMPLETE",
      evaluatedSubsets: 3,
      completedCardinalities: [0],
      activeCardinality: 1,
      evaluatedAtActiveCardinality: 2,
      totalAtActiveCardinalityExact: "3",
      minimumCardinalityLowerBound: 1,
      minimumCardinalityUpperBound: 1,
      minimumCardinality: 1,
      knownMinimumWitnesses: [["a"]],
      proof: {
        minimumCardinalityProven: true,
        coMinimumComplete: false,
        noWitnessProven: false,
        landscapeExhaustive: false,
      },
    });
  });

  it("returns only a lower bound when no sufficient subset has been seen", () => {
    const result = anytimeCardinalityWitnessSearch({
      dimensions: ["a", "b", "c"],
      maxEvaluations: 4,
      isSufficient: (subset) => subset.length === 2,
    });
    expect(result).toMatchObject({
      status: "PARTIAL_NO_SUFFICIENT_OBSERVED",
      completedCardinalities: [0, 1],
      activeCardinality: 2,
      evaluatedAtActiveCardinality: 0,
      minimumCardinalityLowerBound: 2,
      minimumCardinalityUpperBound: null,
      minimumCardinality: null,
      knownMinimumWitnesses: [],
      proof: {
        minimumCardinalityProven: false,
        coMinimumComplete: false,
        noWitnessProven: false,
      },
    });
  });

  it("proves no witness only after exhausting the entire landscape", () => {
    const result = anytimeCardinalityWitnessSearch({
      dimensions: ["a", "b", "c"],
      maxEvaluations: 8,
      isSufficient: () => false,
    });
    expect(result).toMatchObject({
      status: "EXACT_NO_WITNESS",
      evaluatedSubsets: 8,
      totalSubsetsExact: "8",
      minimumCardinalityLowerBound: 4,
      minimumCardinalityUpperBound: null,
      minimumCardinality: null,
      proof: {
        minimumCardinalityProven: false,
        coMinimumComplete: false,
        noWitnessProven: true,
        landscapeExhaustive: true,
      },
    });
  });

  it("marks an exact full-set minimum as landscape exhaustive", () => {
    const result = anytimeCardinalityWitnessSearch({
      dimensions: ["a", "b", "c"],
      maxEvaluations: 8,
      isSufficient: (subset) => subset.length === 3,
    });
    expect(result.status).toBe("EXACT_MINIMUM");
    expect(result.minimumCardinality).toBe(3);
    expect(result.knownMinimumWitnesses).toEqual([["a", "b", "c"]]);
    expect(result.proof.landscapeExhaustive).toBe(true);
  });

  it("streams a 100-coordinate singleton proof without constructing the powerset", () => {
    const dimensions = Array.from({ length: 100 }, (_, index) =>
      `d${String(index).padStart(3, "0")}`
    );
    const result = anytimeCardinalityWitnessSearch({
      dimensions: [...dimensions].reverse(),
      maxEvaluations: 101,
      isSufficient: (subset) => subset.includes("d099"),
    });
    expect(result).toMatchObject({
      status: "EXACT_MINIMUM",
      evaluatedSubsets: 101,
      totalSubsetsExact: (1n << 100n).toString(),
      minimumCardinality: 1,
      knownMinimumWitnesses: [["d099"]],
      proof: { coMinimumComplete: true, landscapeExhaustive: false },
    });
  });

  it("is invariant to dimension input order", () => {
    const evaluate = (subset: readonly string[]) =>
      subset.includes("a") && subset.includes("c");
    const first = anytimeCardinalityWitnessSearch({
      dimensions: ["a", "b", "c", "d"],
      maxEvaluations: 11,
      isSufficient: evaluate,
    });
    const second = anytimeCardinalityWitnessSearch({
      dimensions: ["d", "c", "b", "a"],
      maxEvaluations: 11,
      isSufficient: evaluate,
    });
    expect(second).toEqual(first);
  });

  it("rejects malformed inputs and non-Boolean predicates", () => {
    expect(() =>
      anytimeCardinalityWitnessSearch({
        dimensions: ["a", "a"],
        maxEvaluations: 1,
        isSufficient: () => false,
      })
    ).toThrow(/duplicate dimension/);
    expect(() =>
      anytimeCardinalityWitnessSearch({
        dimensions: ["a"],
        maxEvaluations: 0,
        isSufficient: () => false,
      })
    ).toThrow(/positive safe integer/);
    expect(() =>
      anytimeCardinalityWitnessSearch({
        dimensions: ["a"],
        maxEvaluations: 1,
        isSufficient: () => 1 as unknown as boolean,
      })
    ).toThrow(/must return a boolean/);
  });
});
