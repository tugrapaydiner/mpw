import { describe, it, expect } from "vitest";
import { diffProtocols, constructHybrid, runCounterfactual, experimentId, experimentMeta } from "../../src/engine/mpwCounterfactual";
import { LAB_A_PROTOCOL, LAB_B_PROTOCOL, EXPOSED_DIMENSIONS } from "../../src/engine/mpwFixture";
import type { ProtocolDimension } from "../../src/types/domain";

const REQ = (subset: ProtocolDimension[]) => ({ baseLab: "A" as const, sourceLab: "B" as const, subset });
const DIMS = [...EXPOSED_DIMENSIONS] as ProtocolDimension[];
const subsets: ProtocolDimension[][] = [];
for (let mask = 0; mask < 16; mask++) subsets.push(DIMS.filter((_, i) => mask & (1 << i)));

const P12_MEANS: Array<[string, number]> = [
  ["", 0.1075],
  ["answer_parser", 0.065],
  ["reasoning_budget", -0.1225],
  ["retry_policy", 0.1325],
  ["tool_access", 0.1025],
  ["answer_parser+reasoning_budget", -0.135],
  ["answer_parser+retry_policy", 0.065],
  ["answer_parser+tool_access", 0.07],
  ["reasoning_budget+retry_policy", -0.1825],
  ["reasoning_budget+tool_access", -0.1275],
  ["retry_policy+tool_access", 0.13],
  ["answer_parser+reasoning_budget+retry_policy", -0.2125],
  ["answer_parser+reasoning_budget+tool_access", -0.1375],
  ["answer_parser+retry_policy+tool_access", 0.0675],
  ["reasoning_budget+retry_policy+tool_access", -0.19],
  ["answer_parser+reasoning_budget+retry_policy+tool_access", -0.21],
];

describe("counterfactual audit", () => {
  it("only selected dims change, all 16 subsets", () => {
    for (const s of subsets) {
      const h = constructHybrid({ ...LAB_A_PROTOCOL }, { ...LAB_B_PROTOCOL }, s);
      for (const d of DIMS) {
        const want = s.includes(d)
          ? LAB_B_PROTOCOL[d as keyof typeof LAB_B_PROTOCOL]
          : LAB_A_PROTOCOL[d as keyof typeof LAB_A_PROTOCOL];
        expect(h[d as keyof typeof h]).toBe(want);
      }
    }
  });

  it("all 16 engine results equal the independent P12 diagnostics", () => {
    for (const [key, mean] of P12_MEANS) {
      const subset = (key === "" ? [] : key.split("+")) as ProtocolDimension[];
      const r = runCounterfactual(REQ(subset));
      expect(r.stats.mean).toBe(mean);
    }
  });

  it("identity tracks science, ignores presentation", () => {
    const a = runCounterfactual(REQ(["reasoning_budget"]));
    const b = runCounterfactual(REQ(["retry_policy"]));
    expect(a.experimentId === b.experimentId).toBe(false);
    const c = runCounterfactual({ baseLab: "B", sourceLab: "A", subset: ["reasoning_budget"] });
    expect(c.experimentId === a.experimentId).toBe(false);
    expect(a.experimentId).toBe(experimentId("A", "B", ["reasoning_budget"], a.protocol, experimentMeta()));
  });

  it("no stale cache: interleaved repeats identical", () => {
    const first = runCounterfactual(REQ(["tool_access"]));
    runCounterfactual(REQ([]));
    runCounterfactual(REQ(DIMS));
    const again = runCounterfactual(REQ(["tool_access"]));
    expect(again).toEqual(first);
  });

  it("hidden fifth dimension gets surfaced, not absorbed", () => {
    const doctored = { ...LAB_B_PROTOCOL, temperature: 0.7 };
    expect(diffProtocols({ ...LAB_A_PROTOCOL }, doctored as never)).toContain("temperature");
  });

  it("reverse B to A direction works", () => {
    expect(runCounterfactual({ baseLab: "B", sourceLab: "A", subset: [] }).conclusion).toBe("MODEL_B");
    expect(runCounterfactual({ baseLab: "B", sourceLab: "A", subset: DIMS }).conclusion).toBe("MODEL_A");
  });
});
