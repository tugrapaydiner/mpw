import { describe, it, expect } from "vitest";
import { diffProtocols, constructHybrid, runCounterfactual, experimentId } from "../../src/engine/mpwCounterfactual";
import { LAB_A_PROTOCOL, LAB_B_PROTOCOL, EXPOSED_DIMENSIONS } from "../../src/engine/mpwFixture";
import { evaluateSubset } from "../../src/engine/mpwSimulator";
import type { ProtocolDimension } from "../../src/types/domain";

const REQ = (subset: ProtocolDimension[]) => ({ baseLab: "A" as const, sourceLab: "B" as const, subset });

describe("counterfactual engine", () => {
  it("diff derives the four, nothing hard-coded", () => {
    expect(diffProtocols({ ...LAB_A_PROTOCOL }, { ...LAB_B_PROTOCOL })).toEqual([...EXPOSED_DIMENSIONS].sort());
    expect(diffProtocols({ ...LAB_A_PROTOCOL }, { ...LAB_A_PROTOCOL })).toEqual([]);
  });

  it("empty reproduces base, full reproduces source", () => {
    const empty = runCounterfactual(REQ([]));
    const base = evaluateSubset([]);
    expect(empty.conclusion).toBe(base.conclusion);
    expect(empty.stats.mean).toBe(base.stats.mean);
    const full = runCounterfactual(REQ([...EXPOSED_DIMENSIONS] as ProtocolDimension[]));
    const src = evaluateSubset([...EXPOSED_DIMENSIONS]);
    expect(full.conclusion).toBe(src.conclusion);
    expect(full.stats.mean).toBe(src.stats.mean);
  });

  it("covers all 4 singletons and all 16 subsets", () => {
    const singles = EXPOSED_DIMENSIONS.map((d) => runCounterfactual(REQ([d as ProtocolDimension])).conclusion);
    expect(singles.filter((c) => c === "MODEL_B").length).toBe(1);
    let count = 0;
    for (let mask = 0; mask < 16; mask++) {
      const s = (EXPOSED_DIMENSIONS as ProtocolDimension[]).filter((_, i) => mask & (1 << i));
      expect(runCounterfactual(REQ(s)).coverage).toBe(400);
      count++;
    }
    expect(count).toBe(16);
  });

  it("only selected dimensions change, order irrelevant", () => {
    const r1 = runCounterfactual(REQ(["answer_parser", "retry_policy"]));
    const r2 = runCounterfactual(REQ(["retry_policy", "answer_parser"]));
    expect(r1.experimentId).toBe(r2.experimentId);
    expect(r1.protocol.answer_parser).toBe("strict");
    expect(r1.protocol.retry_policy).toBe("no-retry");
    expect(r1.protocol.reasoning_budget).toBe(8192);
    expect(r1.protocol.tool_access).toBe("standard");
  });

  it("rejects duplicates, unknowns, bad labs", () => {
    expect(() => runCounterfactual(REQ(["retry_policy", "retry_policy"]))).toThrow(/duplicate/);
    expect(() => runCounterfactual(REQ(["telepathy"] as unknown as ProtocolDimension[]))).toThrow();
    expect(() => runCounterfactual({ baseLab: "C", sourceLab: "B", subset: [] } as never)).toThrow();
    expect(() => constructHybrid({ ...LAB_A_PROTOCOL }, { ...LAB_B_PROTOCOL }, ["x"])).toThrow(/unknown/);
  });

  it("identity is content-stable, repeated runs identical", () => {    const a = runCounterfactual(REQ(["reasoning_budget"]));
    const b = runCounterfactual(REQ(["reasoning_budget"]));
    expect(a).toEqual(b);
    expect(a.experimentId).toBe(experimentId("A", "B", ["reasoning_budget"], a.protocol));
    expect(a.experimentId).not.toContain("uuid");
    expect(a.categories.length).toBe(4);
  });

  it("source integrity failure blocks the experiment", () => {
    expect(() =>
      runCounterfactual(REQ([]), [
        { source: "Lab A", subset: [], declared: "MODEL_B" },
        {
          source: "Lab B",
          subset: ["reasoning_budget", "answer_parser", "retry_policy", "tool_access"],
          declared: "MODEL_B",
        },
      ])
    ).toThrow(/SOURCE_INTEGRITY_FAILURE/);
  });
});
