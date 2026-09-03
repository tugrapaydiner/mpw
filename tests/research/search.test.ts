import { describe, expect, it } from "vitest";
import { binomialBigInt, exactWitnessSearch, powerSetSize } from "../../src/research/search";

describe("exact witness search", () => {
  it("proves a minimum without falsely claiming the whole landscape was enumerated", () => {
    const result = exactWitnessSearch({
      dimensions: ["c", "a", "b"],
      isSufficient: (subset) => subset.includes("b"),
      mode: "minimum",
    });
    expect(result.minimumWitnesses).toEqual([["b"]]);
    expect(result.evaluatedSubsets).toBe(4);
    expect(result.proof).toEqual({
      minimumProven: true,
      coMinimumComplete: true,
      landscapeExhaustive: false,
    });
  });

  it("returns every co-minimum and is independent of input order", () => {
    const run = (dimensions: string[]) =>
      exactWitnessSearch({
        dimensions,
        isSufficient: (subset) =>
          (subset.includes("a") && subset.includes("b")) ||
          (subset.includes("a") && subset.includes("c")),
      });
    expect(run(["a", "b", "c"]).minimumWitnesses).toEqual([
      ["a", "b"],
      ["a", "c"],
    ]);
    expect(run(["c", "b", "a"]).minimumWitnesses).toEqual(run(["a", "b", "c"]).minimumWitnesses);
  });

  it("does not assume monotonic sufficiency", () => {
    const sufficient = (subset: string[]) =>
      (subset.includes("x") && !subset.includes("y")) ||
      (subset.includes("x") && subset.includes("y") && subset.includes("z"));
    const result = exactWitnessSearch({ dimensions: ["x", "y", "z"], isSufficient: sufficient, mode: "landscape" });
    expect(result.minimumWitnesses).toEqual([["x"]]);
    expect(result.audit.find((row) => row.subset.join("+") === "x")?.sufficient).toBe(true);
    expect(result.audit.find((row) => row.subset.join("+") === "x+y")?.sufficient).toBe(false);
    expect(result.proof.landscapeExhaustive).toBe(true);
  });

  it("reports no witness only after a complete landscape proof", () => {
    const result = exactWitnessSearch({ dimensions: ["x", "y"], isSufficient: () => false });
    expect(result.status).toBe("NO_WITNESS");
    expect(result.evaluatedSubsets).toBe(4);
    expect(result.proof.landscapeExhaustive).toBe(true);
  });

  it("returns an honest partial state when the evaluation budget is exhausted", () => {
    const result = exactWitnessSearch({
      dimensions: ["a", "b", "c", "d"],
      isSufficient: (subset) => subset.includes("c") && subset.includes("d"),
      maxEvaluations: 3,
    });
    expect(result.status).toBe("LIMIT_REACHED");
    expect(result.minimumCardinality).toBe(null);
    expect(result.proof.minimumProven).toBe(false);
    expect(result.proof.landscapeExhaustive).toBe(false);
    expect(result.evaluatedSubsets).toBe(3);
  });

  it("uses exact combinatorial counts beyond safe JavaScript integer range", () => {
    expect(binomialBigInt(100, 2)).toBe(4950n);
    expect(powerSetSize(50).numeric).not.toBe(null);
    expect(powerSetSize(100).numeric).toBe(null);
    expect(powerSetSize(100).exact).toBe((1n << 100n).toString());
  });
});
