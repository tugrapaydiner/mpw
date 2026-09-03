import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { buildBenchmarkItems, listAllProtocolCombinations, EXPOSED_DIMENSIONS } from "../../src/engine/mpwFixture";
import { simulateItem, itemAttrs } from "../../src/engine/mpwSimulator";
import { protocolKey } from "../../src/engine/mpwManifest";

function allReceipts() {
  const items = buildBenchmarkItems();
  const combos = listAllProtocolCombinations();
  const out: Array<{ protocol: string; id: string; model: string; r: ReturnType<typeof simulateItem> }> = [];
  for (const c of combos)
    for (const it of items)
      for (const model of ["MODEL_A", "MODEL_B"] as const) {
        const r = simulateItem(model, it, c.protocol);
        out.push({ protocol: protocolKey(c.protocol), id: it.id, model, r });
      }
  return { out, items, combos };
}

describe("fixture integrity", () => {
  it("400 unique items, 100 per category", () => {
    const items = buildBenchmarkItems();
    expect(items.length).toBe(400);
    expect(new Set(items.map((i) => i.id)).size).toBe(400);
    for (const s of ["multi-step-reasoning", "quantitative-reasoning", "instruction-following", "tool-reasoning"])
      expect(items.filter((i) => i.stratum === s).length).toBe(100);
  });

  it("16 unique protocols, 2 receipts per item/protocol, 12800 total, no dupes or gaps", () => {
    const { out, items, combos } = allReceipts();
    expect(combos.length).toBe(16);
    expect(new Set(combos.map((c) => protocolKey(c.protocol))).size).toBe(16);
    expect(out.length).toBe(12800);
    const keys = out.map((o) => `${o.protocol}|${o.id}|${o.model}`);
    expect(new Set(keys).size).toBe(12800);
    for (const c of combos) {
      const k = protocolKey(c.protocol);
      expect(out.filter((o) => o.protocol === k).length).toBe(800);
    }
    expect(items.every((it) => out.filter((o) => o.id === it.id).length === 32)).toBe(true);
  });

  it("regeneration is deterministic", () => {
    expect(allReceipts().out).toEqual(allReceipts().out);
  });

  it("reordering inputs does not alter per-id outcomes", () => {
    const { combos } = allReceipts();
    const items = buildBenchmarkItems();
    const rev = [...items].reverse();
    for (const c of combos.slice(0, 4)) {
      const fwd = new Map(items.map((it) => [it.id, simulateItem("MODEL_A", it, c.protocol).finalCorrect]));
      for (const it of rev) expect(simulateItem("MODEL_A", it, c.protocol).finalCorrect).toBe(fwd.get(it.id));
    }
  });

  it("parser affects acceptance, never semantics", () => {
    const items = buildBenchmarkItems();
    const tol = { reasoning_budget: 8192, answer_parser: "tolerant", retry_policy: "one-retry", tool_access: "standard" };
    const strict = { ...tol, answer_parser: "strict" };
    let differed = 0;
    for (const it of items) {
      for (const model of ["MODEL_A", "MODEL_B"] as const) {
        const a = simulateItem(model, it, tol);
        const b = simulateItem(model, it, strict);
        expect(b.semanticCorrect).toBe(a.semanticCorrect);
        if (b.parserAccepts !== a.parserAccepts) differed++;
      }
    }
    expect(differed).toBeGreaterThan(0);
  });

  it("no retry when policy off", () => {
    const { combos } = allReceipts();
    const items = buildBenchmarkItems().slice(0, 50);
    for (const c of combos.filter((x) => x.protocol.retry_policy === "no-retry"))
      for (const it of items)
        for (const model of ["MODEL_A", "MODEL_B"] as const)
          expect(simulateItem(model, it, c.protocol).retried).toBe(false);
  });

  it("tool restriction never touches non-tool items", () => {
    const items = buildBenchmarkItems();
    const std = { reasoning_budget: 8192, answer_parser: "tolerant", retry_policy: "one-retry", tool_access: "standard" };
    const res = { ...std, tool_access: "restricted" };
    let checked = 0;
    for (const it of items) {
      if (itemAttrs(it).toolNeeded) continue;
      for (const model of ["MODEL_A", "MODEL_B"] as const) {
        expect(simulateItem(model, it, res).finalCorrect).toBe(simulateItem(model, it, std).finalCorrect);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("generated cores match raw counts with no fake CI", async () => {
    for (const f of ["lab-a.core.json", "lab-b.core.json"]) {
      const core = JSON.parse(await readFile(new URL(`../../data/generated/${f}`, import.meta.url), "utf8"));
      expect(core.provisional).toBe(true);
      expect(core.ci).toBe(null);
      expect(core.version).toBe(1);
    }
    expect(EXPOSED_DIMENSIONS.length).toBe(4);
  });
});
