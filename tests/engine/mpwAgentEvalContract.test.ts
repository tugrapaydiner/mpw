import { beforeEach, describe, expect, it } from "vitest";
import { gradeTrace, type TraceCall } from "../../src/engine/mpwAgentEval";
import { __resetInvestigationForTests } from "../../src/state/investigation";
import { TOOLS } from "../../src/webmcp/tools";

const tool = (name: string) => {
  const found = TOOLS.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`missing tool ${name}`);
  return found;
};

async function call(name: string, args: Record<string, unknown>): Promise<TraceCall> {
  const result = await tool(name).execute(args);
  return { tool: name, args, ok: result.ok === true, result };
}

beforeEach(() => __resetInvestigationForTests());

describe("agent trace grading against current tool outputs", () => {
  it("passes a real contract trace with experiment-id chaining and certificate binding", async () => {
    const trace: TraceCall[] = [];
    trace.push(await call("read_dispute", {}));
    const experiment = await call("run_counterfactual", {
      baseLab: "A",
      adopt: ["reasoning_budget"],
    });
    trace.push(experiment);
    trace.push(await call("inspect_evidence", {
      experimentId: experiment.result?.experimentId,
      limit: 2,
    }));
    trace.push(await call("verify_witness", {
      baseLab: "A",
      candidate: ["reasoning_budget"],
    }));

    const grade = gradeTrace(trace, {
      witnesses: [["reasoning_budget"]],
      conclusion: "MODEL_B",
      text: "Within the exposed synthetic protocol space, reasoning_budget is the unique minimum-cardinality sufficient witness.",
    });
    expect(grade.pass).toBe(true);
    expect(grade.chaining).toMatchObject({
      inspections: 1,
      chainedInspectionCount: 1,
      invalidInspectionChains: 0,
      verifiedCandidateBound: true,
      certificateBound: true,
    });
  });

  it("rejects an unchained evidence lookup even when the final witness is correct", async () => {
    const trace: TraceCall[] = [
      await call("read_dispute", {}),
      {
        tool: "inspect_evidence",
        args: { experimentId: "invented" },
        ok: true,
        result: { ok: true, experimentId: "invented" },
      },
      await call("verify_witness", {
        baseLab: "A",
        candidate: ["reasoning_budget"],
      }),
    ];
    const grade = gradeTrace(trace, {
      witnesses: [["reasoning_budget"]],
      conclusion: "MODEL_B",
    });
    expect(grade.pass).toBe(false);
    expect(grade.chaining.invalidInspectionChains).toBe(1);
  });

  it("rejects causal or universal language independently of numerical agreement", async () => {
    const trace: TraceCall[] = [
      await call("read_dispute", {}),
      await call("verify_witness", {
        baseLab: "A",
        candidate: ["reasoning_budget"],
      }),
    ];
    const grade = gradeTrace(trace, {
      witnesses: [["reasoning_budget"]],
      conclusion: "MODEL_B",
      text: "Reasoning budget caused the disagreement and MODEL_B is universally better.",
    });
    expect(grade.agreement).toBe(true);
    expect(grade.languageOverclaim).toBe(true);
    expect(grade.pass).toBe(false);
  });
});
