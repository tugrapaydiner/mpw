import { describe, expect, it } from "vitest";
import {
  buildStaticProtocolGridPackage,
  type StaticGridWorld,
} from "../../src/research/staticGridPackage";
import { reconcileStaticProtocolGridPackageByCost } from "../../src/research/staticGridCostReconciliation";
import type { FiniteProtocol, ProtocolSchema } from "../../src/research/protocol";

const schema: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: [
    { name: "a", values: [0, 1], cost: 100 },
    { name: "b", values: [0, 1], cost: 1 },
    { name: "c", values: [0, 1], cost: 1 },
  ],
};
const protocolA: FiniteProtocol = { a: 0, b: 0, c: 0 };
const protocolB: FiniteProtocol = { a: 1, b: 1, c: 1 };

function observation(protocol: FiniteProtocol) {
  const sufficient =
    protocol.a === 1 || (protocol.b === 1 && protocol.c === 1);
  return {
    conclusion: sufficient ? "TARGET" : "BASE",
    effect: sufficient ? -0.2 : 0.1,
    evidenceId: `e:${protocol.a}:${protocol.b}:${protocol.c}`,
  };
}

function packageObject(customSchema: ProtocolSchema = schema) {
  const worlds: StaticGridWorld[] = [];
  for (const a of [0, 1]) {
    for (const b of [0, 1]) {
      for (const c of [0, 1]) {
        const protocol: FiniteProtocol = { a, b, c };
        worlds.push({ protocol, observation: observation(protocol) });
      }
    }
  }
  return buildStaticProtocolGridPackage({
    benchmark: { id: "cost-grid", version: 1 },
    protocolSchema: customSchema,
    publicationA: {
      publicationId: "a",
      publicationHash: "a".repeat(64),
      protocol: protocolA,
      declaredObservation: observation(protocolA),
    },
    publicationB: {
      publicationId: "b",
      publicationHash: "b".repeat(64),
      protocol: protocolB,
      declaredObservation: observation(protocolB),
    },
    worlds,
    limitations: ["synthetic cost-integration fixture"],
  });
}

describe("static grid minimum-cost reconciliation", () => {
  it("uses the same grid while producing a distinct cost objective", () => {
    const result = reconcileStaticProtocolGridPackageByCost(packageObject(), {
      direction: "A_TO_B",
    });
    expect(result).toMatchObject({
      objective: "minimum-declared-integer-cost",
      targetConclusion: "TARGET",
      costs: { a: 100, b: 1, c: 1 },
      search: {
        status: "FOUND",
        minimumCost: 2,
        minimumCostWitnesses: [["b", "c"]],
      },
    });
  });

  it("preserves direction and can produce a different reverse objective", () => {
    const result = reconcileStaticProtocolGridPackageByCost(packageObject(), {
      direction: "B_TO_A",
      mode: "landscape",
    });
    expect(result.direction).toBe("B_TO_A");
    expect(result.targetConclusion).toBe("BASE");
    expect(result.search.proof.landscapeExhaustive).toBe(true);
    expect(result.search.minimumCost).not.toBe(null);
  });

  it("fails closed when a differing coordinate lacks an integer cost", () => {
    const missingCost: ProtocolSchema = {
      ...schema,
      coordinates: schema.coordinates.map((coordinate) =>
        coordinate.name === "c"
          ? { name: coordinate.name, values: coordinate.values }
          : coordinate
      ),
    };
    expect(() =>
      reconcileStaticProtocolGridPackageByCost(packageObject(missingCost), {
        direction: "A_TO_B",
      })
    ).toThrow(/predeclared non-negative integer cost/);
  });

  it("fails closed on fractional costs even though generic schemas permit them", () => {
    const fractional: ProtocolSchema = {
      ...schema,
      coordinates: schema.coordinates.map((coordinate) =>
        coordinate.name === "b" ? { ...coordinate, cost: 0.5 } : coordinate
      ),
    };
    expect(() =>
      reconcileStaticProtocolGridPackageByCost(packageObject(fractional), {
        direction: "A_TO_B",
      })
    ).toThrow(/predeclared non-negative integer cost/);
  });
});
