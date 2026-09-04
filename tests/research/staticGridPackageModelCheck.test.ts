import { describe, expect, it } from "vitest";
import {
  buildStaticProtocolGridPackage,
  reconcileStaticProtocolGridPackage,
  type StaticGridWorld,
} from "../../src/research/staticGridPackage";
import type { FiniteProtocol, ProtocolSchema } from "../../src/research/protocol";

const dimensions = ["a", "b", "c"] as const;
const schema: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: dimensions.map((name) => ({ name, values: [0, 1] })),
};
const protocolA: FiniteProtocol = { a: 0, b: 0, c: 0 };
const protocolB: FiniteProtocol = { a: 1, b: 1, c: 1 };
const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const subsetKey = (subset: readonly string[]): string =>
  [...subset].sort(compare).join("+");

function allSubsets(): string[][] {
  const subsets: string[][] = [];
  for (let mask = 0; mask < 8; mask++) {
    subsets.push(dimensions.filter((_, index) => (mask & (1 << index)) !== 0));
  }
  return subsets.sort(
    (left, right) =>
      left.length - right.length || compare(subsetKey(left), subsetKey(right))
  );
}

function protocolForSubset(subset: readonly string[]): FiniteProtocol {
  const selected = new Set(subset);
  return Object.fromEntries(
    dimensions.map((dimension) => [dimension, selected.has(dimension) ? 1 : 0])
  );
}

function subsetForProtocol(protocol: FiniteProtocol): string[] {
  return dimensions.filter((dimension) => protocol[dimension] === 1);
}

function expectedWitnesses(
  truth: ReadonlyMap<string, string>,
  direction: "A_TO_B" | "B_TO_A"
): { minimumCardinality: number | null; minimumWitnesses: string[][] } {
  const subsets = allSubsets();
  const baseProtocolSubset = direction === "A_TO_B" ? [] : [...dimensions];
  const targetProtocolSubset = direction === "A_TO_B" ? [...dimensions] : [];
  const target = truth.get(subsetKey(targetProtocolSubset));
  if (!target) throw new Error("missing target conclusion");
  const sufficient = subsets.filter((candidate) => {
    const selected = new Set(candidate);
    const worldSubset =
      direction === "A_TO_B"
        ? candidate
        : dimensions.filter((dimension) => !selected.has(dimension));
    return truth.get(subsetKey(worldSubset)) === target;
  });
  void baseProtocolSubset;
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

describe("static grid package exhaustive model check", () => {
  it("matches an independent oracle in both directions for all 256 landscapes", () => {
    const subsets = allSubsets();
    for (let landscapeMask = 0; landscapeMask < 256; landscapeMask++) {
      const truth = new Map(
        subsets.map((subset, index) => [
          subsetKey(subset),
          (landscapeMask & (1 << index)) !== 0 ? "ONE" : "ZERO",
        ])
      );
      const worlds: StaticGridWorld[] = subsets.map((subset) => {
        const protocol = protocolForSubset(subset);
        return {
          protocol,
          observation: {
            conclusion: truth.get(subsetKey(subset))!,
            effect: landscapeMask / 256 + subset.length / 100,
            evidenceId: `landscape:${landscapeMask}:world:${subsetKey(subset) || "empty"}`,
          },
        };
      });
      const packageObject = buildStaticProtocolGridPackage({
        benchmark: { id: "package-model-check", version: 1, landscapeMask },
        protocolSchema: schema,
        publicationA: {
          publicationId: `a-${landscapeMask}`,
          publicationHash: landscapeMask.toString(16).padStart(64, "0"),
          protocol: protocolA,
          declaredObservation: worlds.find(
            (world) => subsetForProtocol(world.protocol).length === 0
          )!.observation,
        },
        publicationB: {
          publicationId: `b-${landscapeMask}`,
          publicationHash: (landscapeMask + 256).toString(16).padStart(64, "0"),
          protocol: protocolB,
          declaredObservation: worlds.find(
            (world) => subsetForProtocol(world.protocol).length === 3
          )!.observation,
        },
        worlds: [...worlds].reverse(),
        limitations: ["exhaustive software model check"],
      });

      for (const direction of ["A_TO_B", "B_TO_A"] as const) {
        const expected = expectedWitnesses(truth, direction);
        const actual = reconcileStaticProtocolGridPackage(packageObject, {
          direction,
          searchMode: "landscape",
        });
        expect(
          actual.search.minimumCardinality,
          `cardinality mask=${landscapeMask} direction=${direction}`
        ).toBe(expected.minimumCardinality);
        expect(
          actual.search.minimumWitnesses,
          `witnesses mask=${landscapeMask} direction=${direction}`
        ).toEqual(expected.minimumWitnesses);
        expect(actual.search.evaluatedSubsets).toBe(8);
        expect(actual.search.proof).toMatchObject({
          minimumProven: true,
          coMinimumComplete: true,
          landscapeExhaustive: true,
        });
      }
    }
  });
});
