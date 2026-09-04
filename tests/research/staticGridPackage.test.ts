import { describe, expect, it } from "vitest";
import {
  buildStaticProtocolGridPackage,
  reconcileStaticProtocolGridPackage,
  verifyStaticProtocolGridPackage,
  type StaticGridWorld,
  type StaticProtocolGridPackage,
} from "../../src/research/staticGridPackage";
import type { FiniteProtocol, ProtocolSchema } from "../../src/research/protocol";

const schema: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: [
    { name: "x", values: [0, 1] },
    { name: "y", values: [0, 1] },
    { name: "z", values: ["off", "on"] },
  ],
};

const protocolA: FiniteProtocol = { x: 0, y: 0, z: "off" };
const protocolB: FiniteProtocol = { x: 1, y: 1, z: "on" };

function observation(protocol: FiniteProtocol) {
  const target = protocol.x === 1 && protocol.y === 1;
  const nuisance = protocol.z === "on" ? 0.03 : 0;
  return {
    conclusion: target ? "TARGET" : "BASE",
    effect: (target ? -0.12 : 0.08) + nuisance,
    evidenceId: `e:${protocol.x}:${protocol.y}:${protocol.z}`,
    metadata: { items: 100 },
  };
}

function worlds(): StaticGridWorld[] {
  const out: StaticGridWorld[] = [];
  for (const x of [0, 1]) {
    for (const y of [0, 1]) {
      for (const z of ["off", "on"]) {
        const protocol: FiniteProtocol = { x, y, z };
        out.push({ protocol, observation: observation(protocol) });
      }
    }
  }
  return out;
}

function build(inputWorlds: StaticGridWorld[] = worlds()) {
  return buildStaticProtocolGridPackage({
    benchmark: { id: "external-grid-test", version: 1, itemCount: 100 },
    protocolSchema: schema,
    publicationA: {
      publicationId: "publication-a",
      publicationHash: "a".repeat(64),
      protocol: protocolA,
      declaredObservation: observation(protocolA),
    },
    publicationB: {
      publicationId: "publication-b",
      publicationHash: "b".repeat(64),
      protocol: protocolB,
      declaredObservation: observation(protocolB),
    },
    worlds: inputWorlds,
    limitations: ["The grid records reported observations; it does not authenticate the publishers."],
  });
}

describe("static protocol-grid package", () => {
  it("validates a complete endpoint cube and recovers every global minimum", () => {
    const packageObject = build();
    expect(verifyStaticProtocolGridPackage(packageObject).status).toBe(
      "STATIC_GRID_PACKAGE_VALID"
    );
    const forward = reconcileStaticProtocolGridPackage(packageObject, {
      direction: "A_TO_B",
    });
    expect(forward.search).toMatchObject({
      status: "FOUND",
      minimumCardinality: 2,
      minimumWitnesses: [["x", "y"]],
      evaluatedSubsets: 8,
      proof: {
        minimumProven: true,
        coMinimumComplete: true,
        landscapeExhaustive: true,
      },
    });
    const reverse = reconcileStaticProtocolGridPackage(packageObject, {
      direction: "B_TO_A",
    });
    expect(reverse.search.minimumCardinality).toBe(1);
    expect(reverse.search.minimumWitnesses).toEqual([["x"], ["y"]]);
  });

  it("normalizes world order into one content identity", () => {
    const ordered = build(worlds());
    const reversed = build(worlds().reverse());
    expect(reversed).toEqual(ordered);
  });

  it("rejects missing, duplicate, and out-of-cube worlds", () => {
    expect(() => build(worlds().slice(1))).toThrow(/incomplete|missing/);
    expect(() => build([...worlds(), worlds()[0]])).toThrow(/duplicate/);
    const outside = worlds();
    outside[0] = {
      protocol: { x: 0, y: 0, z: "other" },
      observation: observation({ x: 0, y: 0, z: "other" }),
    };
    expect(() => build(outside)).toThrow(/protocol|value|schema/);
  });

  it("rejects source declarations that disagree with their endpoint rows", () => {
    expect(() =>
      buildStaticProtocolGridPackage({
        benchmark: { id: "forged", version: 1 },
        protocolSchema: schema,
        publicationA: {
          publicationId: "publication-a",
          publicationHash: "a".repeat(64),
          protocol: protocolA,
          declaredObservation: { ...observation(protocolA), conclusion: "TARGET" },
        },
        publicationB: {
          publicationId: "publication-b",
          publicationHash: "b".repeat(64),
          protocol: protocolB,
          declaredObservation: observation(protocolB),
        },
        worlds: worlds(),
      })
    ).toThrow(/publication A declaration/);
  });

  it("rejects byte tampering and does not confuse content integrity with truth", () => {
    const tampered = structuredClone(build()) as StaticProtocolGridPackage;
    tampered.body.worlds[0].observation.effect = 999;
    expect(() => verifyStaticProtocolGridPackage(tampered)).toThrow(
      /STATIC_GRID_PACKAGE_INVALID/
    );
    expect(tampered.body.limitations.join(" ")).toMatch(/does not authenticate/);
  });
});
