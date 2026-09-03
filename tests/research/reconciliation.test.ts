import { describe, expect, it } from "vitest";
import { reconcileBidirectional, reconcileDirection } from "../../src/research/reconciliation";
import type { FiniteProtocol, ProtocolSchema } from "../../src/research/protocol";

const schema: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: [
    { name: "x", values: [0, 1] },
    { name: "y", values: [0, 1] },
    { name: "hidden", values: [0, 1] },
  ],
};
const a: FiniteProtocol = { x: 0, y: 0, hidden: 0 };
const b: FiniteProtocol = { x: 1, y: 1, hidden: 1 };

describe("reconciliation", () => {
  it("distinguishes an unresolved exposed space from a source replay failure", () => {
    const result = reconcileDirection({
      schema,
      baseProtocol: a,
      sourceProtocol: b,
      exposedDimensions: ["x", "y"],
      evaluator: (protocol) => ({
        conclusion: protocol.hidden === 1 ? "TARGET" : "BASE",
        effect: protocol.hidden === 1 ? -0.1 : 0.1,
      }),
      searchMode: "landscape",
    });
    expect(result.target.conclusion).toBe("TARGET");
    expect(result.search.status).toBe("NO_WITNESS");
    expect(result.omittedDifferences).toEqual(["hidden"]);
  });

  it("reports effect distance and an unclipped restoration fraction", () => {
    const result = reconcileDirection({
      schema,
      baseProtocol: a,
      sourceProtocol: b,
      evaluator: (protocol) => ({
        conclusion: protocol.x === 1 ? "TARGET" : "BASE",
        effect: protocol.x === 1 ? -0.05 + Number(protocol.y) * 0.02 : 0.1,
      }),
    });
    expect(result.search.minimumWitnesses).toEqual([["x"]]);
    expect(result.witnessDiagnostics[0].effectDistanceToTarget).toBeCloseTo(0.02);
    expect(result.witnessDiagnostics[0].restorationFraction).toBeLessThan(1);
  });

  it("computes and labels direction-specific witnesses", () => {
    const result = reconcileBidirectional({
      schema,
      protocolA: a,
      protocolB: b,
      evaluator: (protocol) => {
        const x = protocol.x === 1;
        const y = protocol.y === 1;
        return { conclusion: x || y ? "B" : "A" };
      },
    });
    expect(result.aToB.search.minimumWitnesses).toEqual([["x"], ["y"]]);
    expect(result.bToA.search.minimumWitnesses).toEqual([["x", "y"]]);
    expect(result.asymmetric).toBe(true);
  });
});
