import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import {
  MODELS,
  STRATA,
  NUM_ITEMS,
  NUM_COMBINATIONS,
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  buildBenchmarkItems,
  protocolForSubset,
  listAllProtocolCombinations,
} from "../src/engine/mpwFixture";

describe("fixture", () => {
  it("benchmark is 400 paired items, 100 per stratum", () => {
    const items = buildBenchmarkItems();
    expect(items.length).toBe(400);
    expect(NUM_ITEMS).toBe(400);
    expect(STRATA.length).toBe(4);
    for (const s of STRATA) expect(s.count).toBe(100);
    expect(new Set(items.map((it) => it.id)).size).toBe(400);
    expect(buildBenchmarkItems()).toEqual(items);
    expect(MODELS).toContain("MODEL_A");
    expect(MODELS).toContain("MODEL_B");
  });

  it("canonical Lab A vs Lab B values", () => {
    expect([...EXPOSED_DIMENSIONS].sort()).toEqual(["answer_parser", "reasoning_budget", "retry_policy", "tool_access"]);
    expect(LAB_A_PROTOCOL.reasoning_budget).toBe(8192);
    expect(LAB_B_PROTOCOL.reasoning_budget).toBe(2048);
    expect(LAB_A_PROTOCOL.answer_parser).toBe("tolerant");
    expect(LAB_B_PROTOCOL.answer_parser).toBe("strict");
    expect(LAB_A_PROTOCOL.retry_policy).toBe("one-retry");
    expect(LAB_B_PROTOCOL.retry_policy).toBe("no-retry");
    expect(LAB_A_PROTOCOL.tool_access).toBe("standard");
    expect(LAB_B_PROTOCOL.tool_access).toBe("restricted");
  });

  it("subset adoption flips exactly the chosen dims", () => {
    expect(protocolForSubset([])).toEqual(LAB_A_PROTOCOL);
    expect(protocolForSubset([...EXPOSED_DIMENSIONS])).toEqual(LAB_B_PROTOCOL);
    const one = protocolForSubset(["answer_parser"]);
    expect(one.answer_parser).toBe("strict");
    expect(one.reasoning_budget).toBe(8192);
    expect(() => protocolForSubset(["nope"])).toThrow();
    expect(() => protocolForSubset(["answer_parser", "answer_parser"])).toThrow();
  });

  it("all 16 combinations enumerated once", () => {
    const combos = listAllProtocolCombinations();
    expect(combos.length).toBe(16);
    expect(NUM_COMBINATIONS).toBe(16);
    expect(new Set(combos.map((c) => [...c.subset].sort().join("+"))).size).toBe(16);
    const counts = [0, 0, 0, 0, 0];
    for (const c of combos) counts[c.subset.length]++;
    expect(counts).toEqual([1, 4, 6, 4, 1]);
  });

  it("uses no hidden randomness source", async () => {
    const src = await readFile(new URL("../src/engine/mpwFixture.ts", import.meta.url), "utf8");
    expect(src.includes("Math.random")).toBe(false);
    expect(src.includes("Date.now")).toBe(false);
  });
});
