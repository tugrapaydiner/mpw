import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { evaluateSubset, simulateForSubset, conclusionForSubset } from "../src/engine/mpwSimulator";
import { findMinimumWitnesses } from "../src/engine/mpwWitness";
import { EXPOSED_DIMENSIONS } from "../src/engine/mpwFixture";

describe("simulator", () => {
  it("opposite winners for Lab A vs Lab B", () => {
    expect(evaluateSubset([]).conclusion).toBe("MODEL_A");
    expect(evaluateSubset([...EXPOSED_DIMENSIONS]).conclusion).toBe("MODEL_B");
  });

  it("only reasoning_budget alone flips", () => {
    const base = evaluateSubset([]);
    const ans = evaluateSubset(["answer_parser"]);
    expect(ans.conclusion).toBe("MODEL_A");
    expect(Math.abs(ans.stats.mean - base.stats.mean) >= 0.03).toBe(true);
    expect(evaluateSubset(["reasoning_budget"]).conclusion).toBe("MODEL_B");
    expect(evaluateSubset(["retry_policy"]).conclusion).toBe("MODEL_A");
    expect(evaluateSubset(["tool_access"]).conclusion).toBe("MODEL_A");
  });

  it("same subset gives same items", () => {
    expect(simulateForSubset(["reasoning_budget"])).toEqual(simulateForSubset(["reasoning_budget"]));
  });

  it("unique cardinality-1 MPW emerges from outcomes", () => {
    const target = conclusionForSubset([...EXPOSED_DIMENSIONS]);
    const res = findMinimumWitnesses({
      exposedDimensions: [...EXPOSED_DIMENSIONS],
      isSufficient: (s) => conclusionForSubset(s) === target,
    });
    expect(res.minimumCardinality).toBe(1);
    expect(res.minimumWitnesses).toEqual([["reasoning_budget"]]);
    expect(res.coMinimumWitnesses).toEqual([["reasoning_budget"]]);
  });

  it("never hardcodes the answer", async () => {
    const src = await readFile(new URL("../src/engine/mpwSimulator.ts", import.meta.url), "utf8");
    expect(src.includes("minimumCardinality")).toBe(false);
    expect(src.includes("INCONCLUSIVE")).toBe(false);
    expect(src.includes("2048")).toBe(false);
  });
});
