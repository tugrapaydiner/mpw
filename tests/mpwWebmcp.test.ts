import { describe, it, expect } from "vitest";
import { TOOLS, registerWebMcpTools } from "../src/engine/mpwTools";
import { dispute, runCounterfactual, inspectEvidence, witness } from "../src/engine/mpwService";

const byName = (n: string) => TOOLS.find((t) => t.name === n)!;

describe("webmcp", () => {
  it("exactly four tools", () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual([
      "inspect_evidence",
      "read_dispute",
      "run_counterfactual",
      "verify_witness",
    ]);
  });

  it("descriptions leak nothing + no hidden workflow", () => {
    for (const t of TOOLS) {
      expect(t.description.includes("reasoning_budget")).toBe(false);
      expect(/step 1|must first|always call/i.test(t.description)).toBe(false);
    }
  });

  it("schemas are narrow", () => {
    for (const t of TOOLS) {
      expect(t.inputSchema.additionalProperties).toBe(false);
      expect(Array.isArray(t.inputSchema.required)).toBe(true);
      expect(t.annotations?.readOnlyHint).toBe(true);
    }
    expect(byName("run_counterfactual").inputSchema.required).toEqual(["subset"]);
    expect(byName("verify_witness").inputSchema.required).toEqual(["candidateSubset"]);
  });

  it("handlers validate on their own", async () => {
    const run = byName("run_counterfactual").execute;
    expect((await run({ subset: ["nope"] })).ok).toBe(false);
    expect((await run({ subset: [], extra: 1 })).ok).toBe(false);
    const ev = byName("inspect_evidence").execute;
    expect((await ev({ subset: [], limit: 99 })).ok).toBe(false);
    const vw = byName("verify_witness").execute;
    expect((await vw({ candidateSubset: ["nope"] })).ok).toBe(false);
  });

  it("tools + ui share the same service", async () => {
    const read = byName("read_dispute").execute;
    expect((await read({})).dispute).toEqual(dispute());
    const run = byName("run_counterfactual").execute;
    expect((await run({ subset: [] })).result).toEqual(runCounterfactual([]));
    const ev = byName("inspect_evidence").execute;
    expect((await ev({ subset: [], limit: 5 })).result).toEqual(inspectEvidence([], { stratum: null, limit: 5 }));
    const vw = byName("verify_witness").execute;
    expect((await vw({ candidateSubset: [] })).result).toEqual(witness([]));
  });

  it("evidence stays small", async () => {
    const ev = byName("inspect_evidence").execute;
    const r = (await ev({ subset: [] })).result as { sample: unknown[]; strata: unknown[] };
    expect(r.sample.length <= 5).toBe(true);
    expect(r.strata.length).toBe(4);
  });

  it("registration follows the official sample shape", async () => {
    const seen: Array<Record<string, unknown>> = [];
    (globalThis as Record<string, unknown>)["document"] = {
      modelContext: { registerTool: async (tool: Record<string, unknown>) => void seen.push(tool) },
    };
    try {
      const r = await registerWebMcpTools();
      expect(r.registered.length).toBe(4);
      for (const t of seen) {
        expect(t["name"] && t["description"] && t["inputSchema"] && typeof t["execute"] === "function").toBe(true);
        expect((t["annotations"] as { readOnlyHint: boolean })?.readOnlyHint).toBe(true);
      }
    } finally {
      delete (globalThis as Record<string, unknown>)["document"];
    }
  });
});
