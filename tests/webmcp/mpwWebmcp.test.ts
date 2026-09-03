import { describe, it, expect, beforeEach } from "vitest";
import { TOOLS, registerWebMcpTools, __resetWebmcpRegistrationForTests } from "../../src/webmcp/tools";
import { __resetInvestigationForTests } from "../../src/state/investigation";

const byName = (n: string) => TOOLS.find((t) => t.name === n)!;

function fakeContext(captured: Array<Record<string, unknown>>) {
  (globalThis as Record<string, unknown>)["document"] = {
    modelContext: { registerTool: async (tool: Record<string, unknown>) => void captured.push(tool) },
  };
}

function clearContext() {
  delete (globalThis as Record<string, unknown>)["document"];
  delete (globalThis as Record<string, unknown>)["navigator"];
}

beforeEach(() => {
  clearContext();
  __resetInvestigationForTests();
  __resetWebmcpRegistrationForTests();
});

describe("webmcp", () => {
  it("exactly four approved tools, no smoke, no duplicates", () => {
    expect(TOOLS.map((t) => t.name).sort()).toEqual([
      "inspect_evidence",
      "read_dispute",
      "run_counterfactual",
      "verify_witness",
    ]);
    expect(TOOLS.some((t) => t.name.includes("smoke"))).toBe(false);
    expect(new Set(TOOLS.map((t) => t.name)).size).toBe(4);
  });

  it("descriptions leak nothing + no hidden workflow", () => {
    for (const t of TOOLS) {
      expect(t.description.includes("reasoning_budget")).toBe(false);
      expect(/step 1|must first|always call/i.test(t.description)).toBe(false);
      expect(/do not|don't|never/i.test(t.description)).toBe(false);
      expect(/caus/i.test(t.description)).toBe(false);
    }
  });

  it("schemas are narrow", () => {
    for (const t of TOOLS) {
      expect(t.inputSchema.additionalProperties).toBe(false);
      expect(Array.isArray(t.inputSchema.required)).toBe(true);
    }
    expect(byName("run_counterfactual").inputSchema.required).toEqual(["baseLab", "adopt"]);
    expect(byName("verify_witness").inputSchema.required).toEqual(["baseLab", "candidate"]);
    expect(byName("inspect_evidence").inputSchema.required).toEqual(["experimentId"]);
  });

  it("annotations honest: reads true, state-updating false", () => {
    expect(byName("read_dispute").annotations?.readOnlyHint).toBe(true);
    expect(byName("inspect_evidence").annotations?.readOnlyHint).toBe(true);
    expect(byName("run_counterfactual").annotations?.readOnlyHint).toBe(false);
    expect(byName("verify_witness").annotations?.readOnlyHint).toBe(false);
  });

  it("handlers validate on their own with codes", async () => {
    const run = byName("run_counterfactual").execute;
    expect(((await run({ baseLab: "A", adopt: ["nope"] })) as { code: string }).code).toBe("UNKNOWN_PROTOCOL_DIMENSION");
    expect(((await run({ baseLab: "A", adopt: ["answer_parser", "answer_parser"] })) as { code: string }).code).toBe("DUPLICATE_DIMENSION");
    expect(((await run({ baseLab: "C", adopt: [] })) as { code: string }).code).toBe("INVALID_BASE_LAB");
    expect(((await run({ baseLab: "A", adopt: [], extra: 1 })) as { ok: boolean }).ok).toBe(false);
    const ev = byName("inspect_evidence").execute;
    expect(((await ev({ experimentId: "nope" })) as { code: string }).code).toBe("UNKNOWN_EXPERIMENT");
    const vw = byName("verify_witness").execute;
    expect(((await vw({ baseLab: "A", candidate: ["nope"] })) as { code: string }).code).toBe("UNKNOWN_PROTOCOL_DIMENSION");
    const rd = byName("read_dispute").execute;
    expect(((await rd({ disputeId: "nope" })) as { code: string }).code).toBe("UNKNOWN_DISPUTE");
  });

  it("canonical journey works through tools alone", async () => {
    const rd = (await byName("read_dispute").execute({})) as { ok: boolean; disputeId: string; differences: string[] };
    expect(rd.ok).toBe(true);
    expect(rd.differences.length).toBe(4);
    const run = byName("run_counterfactual").execute;
    const single = (await run({ baseLab: "A", adopt: ["answer_parser"] })) as { ok: boolean; conclusion: string; experimentId: string };
    expect(single.ok).toBe(true);
    expect(single.conclusion).toBe("MODEL_A");
    const ev = byName("inspect_evidence").execute;
    const viewed = (await ev({ experimentId: single.experimentId })) as { ok: boolean; evidenceHash: string; pairedCounts: unknown };
    expect(viewed.ok).toBe(true);
    expect(viewed.evidenceHash.length).toBe(64);
    const vw = byName("verify_witness").execute;
    const v = (await vw({ baseLab: "A", candidate: ["answer_parser"] })) as { ok: boolean; status: string; minimumCardinality: number };
    expect(v.ok).toBe(true);
    expect(v.status).toBe("NOT_SUFFICIENT");
    expect(v.minimumCardinality).toBe(1);
  });

  it("tool outputs measured, no gratuitous JSON", async () => {
    const rd = (await byName("read_dispute").execute({})) as Record<string, unknown>;
    const run = (await byName("run_counterfactual").execute({ baseLab: "A", adopt: [] })) as { experimentId: string } & Record<string, unknown>;
    const ev = (await byName("inspect_evidence").execute({ experimentId: run.experimentId })) as Record<string, unknown>;
    const vw = (await byName("verify_witness").execute({ baseLab: "A", candidate: [] })) as Record<string, unknown>;
    const sizes = {
      read_dispute: JSON.stringify(rd).length,
      run_counterfactual: JSON.stringify(run).length,
      inspect_evidence: JSON.stringify(ev).length,
      verify_witness: JSON.stringify(vw).length,
    };
    expect(sizes.read_dispute).toBeLessThan(8192);
    expect(sizes.run_counterfactual).toBeLessThan(4096);
    expect(sizes.inspect_evidence).toBeLessThan(8192);
    expect(sizes.verify_witness).toBeLessThan(8192);
    expect((ev.sample as unknown[]).length).toBeLessThanOrEqual(5);
  });

  it("registration: once, graceful without modelContext, official shape", async () => {
    expect((await registerWebMcpTools()).reason).toBe("no-webmcp");
    const seen: Array<Record<string, unknown>> = [];
    fakeContext(seen);
    try {
      expect((await registerWebMcpTools()).registered).toEqual([
        "read_dispute",
        "run_counterfactual",
        "inspect_evidence",
        "verify_witness",
      ]);
      expect((await registerWebMcpTools()).reason).toBe("already-registered");
      expect(seen.length).toBe(4);
      for (const t of seen) {
        expect(t["name"] && t["description"] && t["inputSchema"] && typeof t["execute"] === "function").toBe(true);
        expect("registerTool" in (t as object)).toBe(false);
      }
      const src = seen.map((t) => String(t["name"])).join(",");
      expect(src.includes("smoke")).toBe(false);
    } finally {
      clearContext();
    }
  });
});
