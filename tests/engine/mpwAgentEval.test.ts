import { describe, it, expect } from "vitest";
import { gradeTrace, type TraceCall } from "../../src/engine/mpwAgentEval";

const okCounter = (subset: string[], conclusion: string): TraceCall => ({
  tool: "run_counterfactual",
  args: { subset },
  ok: true,
  result: { subset, conclusion },
});

describe("agent eval", () => {
  it("passes a good trace in a non-demo order", () => {
    const trace: TraceCall[] = [
      { tool: "read_dispute", args: {}, ok: true },
      okCounter(["tool_access"], "MODEL_A"),
      okCounter(["reasoning_budget"], "MODEL_B"),
      okCounter(["answer_parser"], "MODEL_A"),
      { tool: "verify_witness", args: { candidateSubset: ["reasoning_budget"] }, ok: true, result: { status: "VERIFIED" } },
    ];
    const g = gradeTrace(trace, { witnesses: [["reasoning_budget"]], conclusion: "MODEL_B" });
    expect(g.pass).toBe(true);
    expect(g.discovered).toBe(true);
    expect(g.agreement).toBe(true);
  });

  it("fails a missing chain + wrong answer", () => {
    const trace: TraceCall[] = [
      { tool: "read_dispute", args: {}, ok: true },
      okCounter(["answer_parser"], "MODEL_A"),
    ];
    const g = gradeTrace(trace, { witnesses: [["answer_parser"]], conclusion: "MODEL_A" });
    expect(g.pass).toBe(false);
    expect(g.chainComplete).toBe(false);
    expect(g.agreement).toBe(false);
    expect(g.overclaimRate).toBe(1);
  });

  it("fails unrecovered errors, passes recovered ones", () => {
    const bad: TraceCall[] = [
      { tool: "read_dispute", args: {}, ok: true },
      { tool: "run_counterfactual", args: { subset: ["nope"] }, ok: false },
    ];
    expect(gradeTrace(bad, { witnesses: [["reasoning_budget"]], conclusion: "MODEL_B" }).recovery).toBe(false);
    const fixed: TraceCall[] = [
      ...bad,
      okCounter(["reasoning_budget"], "MODEL_B"),
      { tool: "verify_witness", args: { candidateSubset: ["reasoning_budget"] }, ok: true, result: { status: "VERIFIED" } },
    ];
    expect(gradeTrace(fixed, { witnesses: [["reasoning_budget"]], conclusion: "MODEL_B" }).recovery).toBe(true);
  });

  it("fails INCONCLUSIVE overclaims", () => {
    const trace: TraceCall[] = [
      { tool: "read_dispute", args: {}, ok: true },
      okCounter(["answer_parser"], "INCONCLUSIVE"),
      { tool: "verify_witness", args: { candidateSubset: ["answer_parser"] }, ok: true, result: { status: "NOT_SUFFICIENT" } },
    ];
    const g = gradeTrace(trace, { witnesses: [["answer_parser"]], conclusion: "MODEL_B" });
    expect(g.discipline).toBe(false);
    expect(g.pass).toBe(false);
  });
});
