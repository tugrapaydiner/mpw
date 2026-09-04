import { describe, expect, it } from "vitest";
import { exactWitnessSearch } from "../../src/research/search";

const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const key = (subset: readonly string[]): string => [...subset].sort(compare).join("+");

function allSubsets(dimensions: readonly string[]): string[][] {
  const sorted = [...dimensions].sort(compare);
  const subsets: string[][] = [];
  for (let mask = 0; mask < 2 ** sorted.length; mask++) {
    subsets.push(sorted.filter((_, index) => (mask & (1 << index)) !== 0));
  }
  return subsets.sort(
    (left, right) => left.length - right.length || compare(key(left), key(right))
  );
}

function expectedForLandscape(
  subsets: readonly string[][],
  landscapeMask: number
): { minimumCardinality: number | null; minimumWitnesses: string[][] } {
  const sufficient = subsets.filter((_, index) => (landscapeMask & (1 << index)) !== 0);
  if (sufficient.length === 0) {
    return { minimumCardinality: null, minimumWitnesses: [] };
  }
  const minimumCardinality = Math.min(...sufficient.map((subset) => subset.length));
  return {
    minimumCardinality,
    minimumWitnesses: sufficient
      .filter((subset) => subset.length === minimumCardinality)
      .map((subset) => [...subset]),
  };
}

function queryLowerBound(n: number, k: number | null): number {
  if (k === null) return 2 ** n;
  const choose = (nn: number, kk: number): number => {
    let result = 1;
    for (let index = 1; index <= kk; index++) {
      result = (result * (nn - kk + index)) / index;
    }
    return result;
  };
  let total = 0;
  for (let cardinality = 0; cardinality <= k; cardinality++) {
    total += choose(n, cardinality);
  }
  return total;
}

describe("exact search exhaustive model check", () => {
  it("matches an independent oracle on all 256 three-dimension landscapes", () => {
    const dimensions = ["a", "b", "c"];
    const subsets = allSubsets(dimensions);
    expect(subsets).toHaveLength(8);

    for (let landscapeMask = 0; landscapeMask < 2 ** subsets.length; landscapeMask++) {
      const truth = new Map(
        subsets.map((subset, index) => [
          key(subset),
          (landscapeMask & (1 << index)) !== 0,
        ])
      );
      const expected = expectedForLandscape(subsets, landscapeMask);
      const minimum = exactWitnessSearch({
        dimensions: ["c", "a", "b"],
        mode: "minimum",
        maxEvaluations: 8,
        isSufficient: (subset) => truth.get(key(subset)) ?? false,
      });
      const landscape = exactWitnessSearch({
        dimensions,
        mode: "landscape",
        maxEvaluations: 8,
        isSufficient: (subset) => truth.get(key(subset)) ?? false,
      });

      expect(minimum.minimumCardinality, `minimum cardinality mask=${landscapeMask}`).toBe(
        expected.minimumCardinality
      );
      expect(minimum.minimumWitnesses, `minimum witnesses mask=${landscapeMask}`).toEqual(
        expected.minimumWitnesses
      );
      expect(minimum.evaluatedSubsets, `minimum query count mask=${landscapeMask}`).toBe(
        queryLowerBound(dimensions.length, expected.minimumCardinality)
      );
      expect(minimum.proof.minimumProven).toBe(true);
      expect(minimum.proof.coMinimumComplete).toBe(true);
      expect(minimum.proof.landscapeExhaustive).toBe(
        minimum.evaluatedSubsets === subsets.length
      );

      expect(landscape.minimumCardinality, `landscape cardinality mask=${landscapeMask}`).toBe(
        expected.minimumCardinality
      );
      expect(landscape.minimumWitnesses, `landscape witnesses mask=${landscapeMask}`).toEqual(
        expected.minimumWitnesses
      );
      expect(landscape.evaluatedSubsets).toBe(8);
      expect(landscape.proof).toMatchObject({
        minimumProven: true,
        coMinimumComplete: true,
        landscapeExhaustive: true,
      });
    }
  });
});
