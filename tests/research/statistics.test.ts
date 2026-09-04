import { describe, expect, it } from "vitest";
import {
  exactTwoSidedMcNemarP,
  pairedBinaryDiagnostics,
  simultaneousStratifiedPairedBootstrap,
  type FamilyConfigurationInput,
} from "../../src/research/statistics";

const configuration = (
  id: string,
  make: (index: number) => { a: 0 | 1; b: 0 | 1 }
): FamilyConfigurationInput => ({
  id,
  outcomes: Array.from({ length: 100 }, (_, index) => ({
    id: `item-${String(index).padStart(3, "0")}`,
    stratum: index < 50 ? "alpha" : "beta",
    ...make(index),
  })),
});

describe("paired binary diagnostics", () => {
  it("computes the exact conditional McNemar/binomial tail", () => {
    expect(exactTwoSidedMcNemarP(10, 0)).toBe(2 / 2 ** 10);
    expect(exactTwoSidedMcNemarP(0, 10)).toBe(2 / 2 ** 10);
    expect(exactTwoSidedMcNemarP(5, 5)).toBe(1);
    expect(exactTwoSidedMcNemarP(0, 0)).toBe(1);
  });

  it("reports overall and deterministic stratum-level discordance", () => {
    const outcomes = [
      { id: "2", stratum: "b", a: 1 as const, b: 0 as const },
      { id: "1", stratum: "a", a: 0 as const, b: 1 as const },
      { id: "3", stratum: "b", a: 1 as const, b: 1 as const },
      { id: "4", stratum: "a", a: 0 as const, b: 0 as const },
    ];
    const result = pairedBinaryDiagnostics(outcomes);
    expect(result).toMatchObject({ n: 4, bothCorrect: 1, bothWrong: 1, aOnly: 1, bOnly: 1, delta: 0 });
    expect(result.strata.map((row) => row.stratum)).toEqual(["a", "b"]);
  });
});

describe("simultaneous stratified paired bootstrap", () => {
  const positive = configuration("positive", (index) =>
    index < 60 ? { a: 1, b: 0 } : index < 80 ? { a: 0, b: 1 } : { a: 1, b: 1 }
  );
  const negative = configuration("negative", (index) =>
    index < 60 ? { a: 0, b: 1 } : index < 80 ? { a: 1, b: 0 } : { a: 0, b: 0 }
  );
  const nullCase = configuration("null", (index) =>
    index % 2 === 0 ? { a: 1, b: 0 } : { a: 0, b: 1 }
  );

  it("uses one predeclared family and returns reproducible simultaneous conclusions", () => {
    const first = simultaneousStratifiedPairedBootstrap([positive, negative, nullCase], {
      seed: "family-test",
      replicates: 500,
    });
    const second = simultaneousStratifiedPairedBootstrap([nullCase, positive, negative], {
      seed: "family-test",
      replicates: 500,
    });
    expect(second).toEqual(first);
    expect(first.configurations.map((row) => [row.id, row.simultaneous.conclusion])).toEqual([
      ["negative", "MODEL_B"],
      ["null", "INCONCLUSIVE"],
      ["positive", "MODEL_A"],
    ]);
    expect(first.criticalValue).toBeGreaterThan(0);
  });

  it("makes the family definition consequential rather than pretending intervals are independent", () => {
    const singleton = simultaneousStratifiedPairedBootstrap([positive], {
      seed: "family-width",
      replicates: 500,
    });
    const family = simultaneousStratifiedPairedBootstrap([positive, negative, nullCase], {
      seed: "family-width",
      replicates: 500,
    });
    expect(family.criticalValue).toBeGreaterThanOrEqual(singleton.criticalValue);
  });

  it("rejects misaligned items, changed strata, and duplicate configuration ids", () => {
    const missing = { ...positive, id: "missing", outcomes: positive.outcomes.slice(1) };
    expect(() => simultaneousStratifiedPairedBootstrap([positive, missing], { replicates: 100 })).toThrow(/items|missing/);
    const changed = {
      ...positive,
      id: "changed",
      outcomes: positive.outcomes.map((outcome, index) =>
        index === 0 ? { ...outcome, stratum: "other" } : outcome
      ),
    };
    expect(() => simultaneousStratifiedPairedBootstrap([positive, changed], { replicates: 100 })).toThrow(/stratum/);
    expect(() => simultaneousStratifiedPairedBootstrap([positive, positive], { replicates: 100 })).toThrow(/duplicate configuration/);
  });
});
