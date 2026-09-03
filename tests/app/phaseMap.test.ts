import { describe, it, expect } from "vitest";
import { buildPhaseCells } from "../../src/app/phaseMap";
import { conclusionForSubset } from "../../src/engine/mpwSimulator";
import type { Subset } from "../../src/types";

describe("phase map", () => {
  it("all 16 plotted cells match the engine exactly", () => {
    const cells = buildPhaseCells();
    expect(cells.length).toBe(16);
    expect(cells.filter((c) => c.cardinality === 0).length).toBe(1);
    expect(cells.filter((c) => c.cardinality === 1).length).toBe(4);
    expect(cells.filter((c) => c.cardinality === 2).length).toBe(6);
    expect(cells.filter((c) => c.cardinality === 3).length).toBe(4);
    expect(cells.filter((c) => c.cardinality === 4).length).toBe(1);
    for (const c of cells) {
      expect(c.conclusion).toBe(conclusionForSubset([...c.subset] as Subset));
    }
    const minima = cells.filter((c) => c.isMinimum);
    expect(minima.length).toBe(1);
    expect(minima[0].subset).toEqual(["reasoning_budget"]);
    expect(cells.filter((c) => c.sufficient).length).toBeGreaterThan(1);
  });
});
