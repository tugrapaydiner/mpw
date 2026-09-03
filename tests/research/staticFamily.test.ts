import { describe, expect, it } from "vitest";
import {
  analyzeStaticEvaluationFamily,
  staticPackageHash,
  type StaticEvaluationFamilyPackage,
} from "../../src/research/staticFamily";

const items = Array.from({ length: 40 }, (_, index) => ({
  id: `item-${index}`,
  stratum: index < 20 ? "left" : "right",
}));

const packageFor = (omitWorld?: string): StaticEvaluationFamilyPackage => {
  const protocols = [
    ["base", { x: 0, y: 0 }],
    ["x", { x: 1, y: 0 }],
    ["y", { x: 0, y: 1 }],
    ["target", { x: 1, y: 1 }],
  ] as const;
  const worlds = protocols
    .filter(([id]) => id !== omitWorld)
    .map(([worldId, protocol]) => ({
      worldId,
      protocol,
      outcomes: items.map((item, index) => {
        const targetLike = protocol.x === 1;
        if (targetLike) {
          return { itemId: item.id, a: (index < 5 ? 1 : 0) as 0 | 1, b: (index < 35 ? 1 : 0) as 0 | 1 };
        }
        return { itemId: item.id, a: (index < 35 ? 1 : 0) as 0 | 1, b: (index < 5 ? 1 : 0) as 0 | 1 };
      }),
    }));
  return {
    kind: "StaticEvaluationFamilyPackage",
    schemaVersion: 1,
    familyId: "test-family",
    title: "Complete two-coordinate static family",
    benchmark: { id: "bench", version: "1", items },
    systems: { A: { id: "a", label: "A" }, B: { id: "b", label: "B" } },
    protocolSchema: {
      kind: "FiniteProtocolSchema",
      version: 1,
      coordinates: [
        { name: "x", values: [0, 1] },
        { name: "y", values: [0, 1] },
      ],
    },
    worlds,
    sources: { A: "base", B: "target" },
    analysis: { seed: "static-family-test", replicates: 500, confidence: 0.95 },
    provenance: { authenticity: "UNVERIFIED", notes: "test fixture" },
  };
};

describe("static evaluation family package", () => {
  it("replays a complete landscape and recovers both directions", () => {
    const result = analyzeStaticEvaluationFamily(packageFor(), "pointwise");
    expect(result.landscapeCoverage).toMatchObject({ complete: true, expectedHybridWorlds: 4, observedHybridWorlds: 4 });
    expect(result.directions.A_TO_B).toMatchObject({
      status: "RECONCILED",
      baseConclusion: "MODEL_A",
      targetConclusion: "MODEL_B",
      search: { minimumCardinality: 1, minimumWitnesses: [["x"]] },
    });
    expect(result.directions.B_TO_A).toMatchObject({
      status: "RECONCILED",
      baseConclusion: "MODEL_B",
      targetConclusion: "MODEL_A",
      search: { minimumCardinality: 1, minimumWitnesses: [["x"]] },
    });
  });

  it("refuses to infer a witness from a missing hybrid", () => {
    const result = analyzeStaticEvaluationFamily(packageFor("x"), "pointwise");
    expect(result.landscapeCoverage.complete).toBe(false);
    expect(result.directions.A_TO_B.status).toBe("INCOMPLETE_PROTOCOL_LANDSCAPE");
    expect(result.directions.A_TO_B.search).toBe(null);
  });

  it("fails closed on source declaration mismatch", () => {
    const pkg = packageFor();
    pkg.worlds[0].declaredConclusion = "MODEL_B";
    expect(() => analyzeStaticEvaluationFamily(pkg, "pointwise")).toThrow(/SOURCE_REPLAY_MISMATCH/);
  });

  it("rejects mismatched or duplicated item evidence", () => {
    const missing = packageFor();
    missing.worlds[0].outcomes.pop();
    expect(() => analyzeStaticEvaluationFamily(missing)).toThrow(/exactly 40 outcomes/);
    const duplicate = packageFor();
    duplicate.worlds[0].outcomes[1].itemId = duplicate.worlds[0].outcomes[0].itemId;
    expect(() => analyzeStaticEvaluationFamily(duplicate)).toThrow(/duplicates item/);
  });

  it("has deterministic content identity and binds provenance", () => {
    const pkg = packageFor();
    const first = staticPackageHash(pkg);
    expect(staticPackageHash(structuredClone(pkg))).toBe(first);
    pkg.provenance.notes = "changed";
    expect(staticPackageHash(pkg)).not.toBe(first);
  });
});
