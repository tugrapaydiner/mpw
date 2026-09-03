import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { experimentVerdict, subsetsLine, categoryInsight } from "../../src/app/verdict";
import { inspectEvidence } from "../../src/engine/mpwService";

describe("product wording", () => {
  it("verdict lines match the contract", () => {
    expect(experimentVerdict({ subset: [], reproducesTarget: false })).toBe("No change applied; baseline result.");
    expect(experimentVerdict({ subset: ["answer_parser"], reproducesTarget: false })).toBe(
      "Effect detected; target conclusion not reproduced."
    );
    expect(experimentVerdict({ subset: ["reasoning_budget"], reproducesTarget: true })).toBe("Target conclusion reproduced.");
    expect(subsetsLine({ subsetsTotal: 16 })).toBe("16 / 16 exposed protocol subsets evaluated");
  });

  it("category insight is deterministic and cause-free", () => {
    const cats = [
      { stratum: "multi-step-reasoning", n: 100, accA: 0.44, accB: 0.73 },
      { stratum: "quantitative-reasoning", n: 100, accA: 0.6, accB: 0.69 },
      { stratum: "instruction-following", n: 100, accA: 0.72, accB: 0.73 },
      { stratum: "tool-reasoning", n: 100, accA: 0.65, accB: 0.75 },
    ];
    expect(categoryInsight(cats, -0.1225)).toBe(
      "Largest measured shift in multi step reasoning (Δ -0.29 vs overall Δ -0.1225)."
    );
    expect(categoryInsight(cats, -0.28)).toBe(null);
    expect(categoryInsight([], 0.1)).toBe(null);
    const live = inspectEvidence(["reasoning_budget"], "A", {});
    const overall = live.categorySummary.reduce((s, c) => s + (c.accA - c.accB) * c.n, 0) / 400;
    const said = categoryInsight(live.categorySummary, overall);
    expect(said?.includes("multi step reasoning")).toBe(true);
    expect(/caus|because|drives/.test(said ?? "")).toBe(false);
  });

  it("banned phrases appear nowhere in ui wording sources", async () => {
    for (const f of ["../../src/app/App.tsx", "../../src/app/verdict.ts", "../../src/app/instrument.css"]) {
      const src = await readFile(new URL(f, import.meta.url), "utf8");
      expect(src.toLowerCase().includes("parser failed")).toBe(false);
      expect(src.toLowerCase().includes("cause found")).toBe(false);
    }
  });
});
