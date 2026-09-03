import { describe, it, expect } from "vitest";
import { findMinimumWitnesses } from "../../src/engine/mpwWitness";
import { verifyWitness, verifyCanonical } from "../../src/engine/mpwVerify";
import { runCounterfactual } from "../../src/engine/mpwCounterfactual";
import { EXPOSED_DIMENSIONS } from "../../src/engine/mpwFixture";
import type { ProtocolDimension } from "../../src/types/domain";

const DIMS = [...EXPOSED_DIMENSIONS] as ProtocolDimension[];

// property-style sweep over crafted sufficiency families on 3 dims.
const FAMILIES: Array<{ sufficient: string[][]; min: number | null; count: number }> = [
  { sufficient: [[], ["a"]], min: 0, count: 1 },
  { sufficient: [["a", "b", "c"]], min: 3, count: 1 },
  { sufficient: [["a", "b"], ["a", "c"], ["a", "b", "c"]], min: 2, count: 2 },
  { sufficient: [["b"], ["c"], ["a", "b"], ["a", "c"]], min: 1, count: 2 },
  { sufficient: [], min: null, count: 0 },
];

describe("mpw formal audit", () => {
  it("global min beats inclusion-minimal on every family", () => {
    for (const f of FAMILIES) {
      const set = new Set(f.sufficient.map((s) => [...s].sort().join("+")));
      const r = findMinimumWitnesses({
        exposedDimensions: ["a", "b", "c"],
        isSufficient: (s) => set.has([...s].sort().join("+")),
      });
      expect(r.minimumCardinality).toBe(f.min);
      expect(r.minimumWitnesses.length).toBe(f.count);
      expect(r.coMinimumWitnesses).toEqual(r.minimumWitnesses);
    }
  });

  it("shuffled input never changes the verdict", () => {
    const pred = (s: string[]) => s.includes("b") && s.includes("c");
    const r1 = verifyWitness({ candidateSubset: ["b", "c"], exposedDimensions: ["a", "b", "c"], isSufficient: pred });
    const r2 = verifyWitness({ candidateSubset: ["c", "b"], exposedDimensions: ["c", "b", "a"], isSufficient: pred });
    expect(r1.status).toBe("VERIFIED");
    expect(r2.status).toBe("VERIFIED");
    expect(r2.minimumWitnesses).toEqual([["b", "c"]]);
  });

  it("already-equal conclusions reconcile vacuously, honestly", () => {
    const r = verifyWitness({ candidateSubset: [], exposedDimensions: ["a", "b"], isSufficient: () => true });
    expect(r.status).toBe("VERIFIED");
    expect(r.minimumCardinality).toBe(0);
    expect(r.minimumWitnesses).toEqual([[]]);
  });

  it("broken predicates can never mint VERIFIED", () => {
    expect(() =>
      verifyWitness({ candidateSubset: ["a"], exposedDimensions: ["a"], isSufficient: () => { throw new Error("boom"); } })
    ).toThrow(/boom/);
    expect(() =>
      verifyWitness({ candidateSubset: "a" as never, exposedDimensions: ["a"], isSufficient: () => true })
    ).toThrow();
  });

  it("canonical fixture asserts hold exactly", () => {
    expect(DIMS.length).toBe(4);
    const v = verifyCanonical();
    expect(v.totalSubsets).toBe(16);
    expect(v.minimumCardinality).toBe(1);
    expect(v.minimumWitnesses).toEqual([["reasoning_budget"]]);
    for (const d of DIMS.filter((x) => x !== "reasoning_budget")) {
      const row = v.table.find((r) => r.subset.join("+") === d);
      expect(row?.sufficient).toBe(false);
    }
    const snap = v.table.map((r) => `${r.subset.join("+")}:${r.conclusion}:${r.sufficient}`).join("|");
    expect(verifyCanonical().table.map((r) => `${r.subset.join("+")}:${r.conclusion}:${r.sufficient}`).join("|")).toBe(snap);
    expect(v.checkedCount).toBe(v.totalSubsets);
  });

  it("engine conclusions match the canonical table cell by cell", () => {
    const v = verifyCanonical();
    for (const row of v.table) {
      const r = runCounterfactual({ baseLab: "A", sourceLab: "B", subset: row.subset as ProtocolDimension[] });
      expect(r.conclusion).toBe(row.conclusion);
      expect(r.stats.mean).toBe(row.mean);
    }
  });
});
