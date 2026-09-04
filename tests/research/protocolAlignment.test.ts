import { describe, expect, it } from "vitest";
import {
  alignFiniteProtocol,
  alignProtocolPair,
  validateFiniteProtocolAlignment,
  type FiniteProtocolAlignment,
} from "../../src/research/protocolAlignment";
import type { ProtocolSchema } from "../../src/research/protocol";

const targetSchema: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: [
    { name: "budget", values: ["low", "high"] },
    { name: "parser", values: ["strict", "tolerant"] },
  ],
};

const sourceSchemaA: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: [
    { name: "token_limit", values: [2048, 8192] },
    { name: "parse_mode", values: ["exact", "lenient"] },
    { name: "temperature", values: [0] },
  ],
};

const sourceSchemaB: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: [
    { name: "thinking", values: ["short", "long"] },
    { name: "answer_extraction", values: [0, 1, 2] },
  ],
};

function alignmentA(): FiniteProtocolAlignment {
  return {
    kind: "FiniteProtocolAlignment",
    version: 1,
    sourceSchema: sourceSchemaA,
    targetSchema,
    coordinates: [
      {
        targetCoordinate: "budget",
        sourceCoordinate: "token_limit",
        values: [
          { source: 2048, target: "low" },
          { source: 8192, target: "high" },
        ],
        rationale: "The source reports the token budget directly.",
      },
      {
        targetCoordinate: "parser",
        sourceCoordinate: "parse_mode",
        values: [
          { source: "exact", target: "strict" },
          { source: "lenient", target: "tolerant" },
        ],
      },
    ],
    notes: ["temperature is intentionally not represented in the canonical schema"],
  };
}

function alignmentB(): FiniteProtocolAlignment {
  return {
    kind: "FiniteProtocolAlignment",
    version: 1,
    sourceSchema: sourceSchemaB,
    targetSchema,
    coordinates: [
      {
        targetCoordinate: "budget",
        sourceCoordinate: "thinking",
        values: [
          { source: "short", target: "low" },
          { source: "long", target: "high" },
        ],
      },
      {
        targetCoordinate: "parser",
        sourceCoordinate: "answer_extraction",
        values: [
          { source: 0, target: "strict" },
          { source: 1, target: "tolerant" },
          { source: 2, target: "tolerant" },
        ],
      },
    ],
  };
}

describe("finite protocol alignment", () => {
  it("renames coordinates and explicitly normalizes values", () => {
    const result = alignFiniteProtocol(
      { token_limit: 8192, parse_mode: "exact", temperature: 0 },
      alignmentA()
    );
    expect(result.alignedProtocol).toEqual({ budget: "high", parser: "strict" });
    expect(result.unmappedSourceCoordinates).toEqual(["temperature"]);
    expect(result.lossyTargetCoordinates).toEqual([]);
    expect(result.unusedTargetValues).toEqual({});
  });

  it("reports many-to-one value normalization as lossy", () => {
    const result = alignFiniteProtocol(
      { thinking: "long", answer_extraction: 2 },
      alignmentB()
    );
    expect(result.alignedProtocol).toEqual({ budget: "high", parser: "tolerant" });
    expect(result.lossyTargetCoordinates).toEqual(["parser"]);
    expect(result.unmappedSourceCoordinates).toEqual([]);
  });

  it("aligns two heterogeneous publications into one target schema", () => {
    const result = alignProtocolPair({
      protocolA: { token_limit: 8192, parse_mode: "lenient", temperature: 0 },
      alignmentA: alignmentA(),
      protocolB: { thinking: "short", answer_extraction: 0 },
      alignmentB: alignmentB(),
    });
    expect(result.protocolA).toEqual({ budget: "high", parser: "tolerant" });
    expect(result.protocolB).toEqual({ budget: "low", parser: "strict" });
    expect(result.reportA.unmappedSourceCoordinates).toEqual(["temperature"]);
    expect(result.reportB.lossyTargetCoordinates).toEqual(["parser"]);
  });

  it("canonicalizes coordinate mapping order to the target schema", () => {
    const shuffled = alignmentA();
    shuffled.coordinates.reverse();
    const validated = validateFiniteProtocolAlignment(shuffled);
    expect(validated.coordinates.map((mapping) => mapping.targetCoordinate)).toEqual([
      "budget",
      "parser",
    ]);
  });

  it("rejects a missing target mapping and source-coordinate reuse", () => {
    const missing = alignmentA();
    missing.coordinates.pop();
    expect(() => validateFiniteProtocolAlignment(missing)).toThrow(/map every target/);

    const reused = alignmentA();
    reused.coordinates[1].sourceCoordinate = "token_limit";
    expect(() => validateFiniteProtocolAlignment(reused)).toThrow(/reused/);
  });

  it("requires complete one-to-one coverage of every source value", () => {
    const missingValue = alignmentA();
    missingValue.coordinates[0].values.pop();
    expect(() => validateFiniteProtocolAlignment(missingValue)).toThrow(/exactly once/);

    const duplicateValue = alignmentA();
    duplicateValue.coordinates[0].values = [
      { source: 2048, target: "low" },
      { source: 2048, target: "high" },
    ];
    expect(() => validateFiniteProtocolAlignment(duplicateValue)).toThrow(
      /exactly once|duplicate source/
    );
  });

  it("rejects values outside either declared domain", () => {
    const badSource = alignmentA();
    badSource.coordinates[0].values[0].source = 4096;
    expect(() => validateFiniteProtocolAlignment(badSource)).toThrow(/source domain/);

    const badTarget = alignmentA();
    badTarget.coordinates[0].values[0].target = "medium";
    expect(() => validateFiniteProtocolAlignment(badTarget)).toThrow(/target domain/);
  });

  it("rejects a source protocol that violates its source schema", () => {
    expect(() =>
      alignFiniteProtocol(
        { token_limit: 4096, parse_mode: "exact", temperature: 0 },
        alignmentA()
      )
    ).toThrow(/token_limit/);
  });

  it("rejects two alignments with different target schemas", () => {
    const changed = alignmentB();
    changed.targetSchema = {
      ...targetSchema,
      coordinates: [
        ...targetSchema.coordinates,
        { name: "retry", values: [false, true] },
      ],
    };
    changed.coordinates.push({
      targetCoordinate: "retry",
      sourceCoordinate: "answer_extraction",
      values: [
        { source: 0, target: false },
        { source: 1, target: true },
        { source: 2, target: true },
      ],
    });
    expect(() =>
      alignProtocolPair({
        protocolA: { token_limit: 8192, parse_mode: "exact", temperature: 0 },
        alignmentA: alignmentA(),
        protocolB: { thinking: "short", answer_extraction: 0 },
        alignmentB: changed,
      })
    ).toThrow(/same canonical target schema|reused/);
  });

  it("rejects unexpected properties and malformed notes", () => {
    expect(() =>
      validateFiniteProtocolAlignment({
        ...alignmentA(),
        extra: true,
      })
    ).toThrow(/unexpected property/);
    expect(() =>
      validateFiniteProtocolAlignment({
        ...alignmentA(),
        notes: [1],
      })
    ).toThrow(/array of strings/);
  });
});
