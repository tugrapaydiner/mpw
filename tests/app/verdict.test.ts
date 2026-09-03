import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { experimentVerdict, subsetsLine } from "../../src/app/verdict";

describe("product wording", () => {
  it("verdict lines match the contract", () => {
    expect(experimentVerdict({ subset: [], reproducesTarget: false })).toBe("No change applied; baseline result.");
    expect(experimentVerdict({ subset: ["answer_parser"], reproducesTarget: false })).toBe(
      "Effect detected; target conclusion not reproduced."
    );
    expect(experimentVerdict({ subset: ["reasoning_budget"], reproducesTarget: true })).toBe("Target conclusion reproduced.");
    expect(subsetsLine({ subsetsTotal: 16 })).toBe("16 / 16 exposed protocol subsets evaluated");
  });

  it("banned phrases appear nowhere in ui wording sources", async () => {
    for (const f of ["../../src/app/App.tsx", "../../src/app/verdict.ts"]) {
      const src = await readFile(new URL(f, import.meta.url), "utf8");
      expect(src.toLowerCase().includes("parser failed")).toBe(false);
      expect(src.toLowerCase().includes("cause found")).toBe(false);
    }
  });
});
