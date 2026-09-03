import { describe, it, expect, beforeEach } from "vitest";
import {
  getInvestigationState,
  readDispute,
  runCounterfactualOp,
  inspectEvidenceOp,
  verifyWitnessOp,
  resetInvestigation,
  __resetInvestigationForTests,
} from "../../src/state/investigation";
import { TOOLS } from "../../src/webmcp/tools";
import { LAB_A_PROTOCOL, LAB_B_PROTOCOL, SOURCE_PUBLICATIONS } from "../../src/engine/mpwFixture";

const byName = (n: string) => TOOLS.find((t) => t.name === n)!;

beforeEach(() => {
  __resetInvestigationForTests();
});

describe("state audit", () => {
  it("human and agent run_counterfactual produce identical science", async () => {
    const human = runCounterfactualOp("HUMAN", ["reasoning_budget", "answer_parser"]);
    const agent = await byName("run_counterfactual").execute({ subset: ["answer_parser", "reasoning_budget"] });
    expect(human.ok && agent.ok).toBe(true);
    if (!human.ok || !agent.ok) return;
    expect((agent as { result: unknown }).result).toEqual((human as { result: unknown }).result);
  });

  it("human and agent verify_witness produce identical science", async () => {
    const human = verifyWitnessOp("HUMAN", ["reasoning_budget"]);
    __resetInvestigationForTests();
    const agent = await byName("verify_witness").execute({ candidateSubset: ["reasoning_budget"] });
    expect(human.ok && agent.ok).toBe(true);
    if (!human.ok || !agent.ok) return;
    expect((agent as { result: unknown }).result).toEqual((human as { result: unknown }).result);
    expect(((human as { result: { status: string } }).result).status).toBe("VERIFIED");
  });

  it("mutated returns never corrupt stored state", () => {
    readDispute("HUMAN");
    const a = runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    (a.result as { conclusion: string }).conclusion = "FORGED";
    (a.result as { subset: string[] }).subset.push("telepathy");
    const b = runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect((b.result as { conclusion: string }).conclusion).toBe("MODEL_B");
    expect((b.result as { subset: string[] }).subset).toEqual(["reasoning_budget"]);
    expect(getInvestigationState().experiments.length).toBe(1);
  });

  it("fixtures and publications immutable under operations", () => {
    const snapA = JSON.stringify(LAB_A_PROTOCOL);
    const snapB = JSON.stringify(LAB_B_PROTOCOL);
    const snapP = JSON.stringify(SOURCE_PUBLICATIONS);
    readDispute("HUMAN");
    runCounterfactualOp("HUMAN", []);
    inspectEvidenceOp("HUMAN", [], { limit: 3 });
    verifyWitnessOp("HUMAN", ["answer_parser"]);
    resetInvestigation("HUMAN");
    expect(JSON.stringify(LAB_A_PROTOCOL)).toBe(snapA);
    expect(JSON.stringify(LAB_B_PROTOCOL)).toBe(snapB);
    expect(JSON.stringify(SOURCE_PUBLICATIONS)).toBe(snapP);
  });

  it("rapid sequential operations stay ordered and deduped", () => {
    readDispute("HUMAN");
    const subsets = [[], ["answer_parser"], [], ["answer_parser"], ["reasoning_budget"], []];
    for (const s of subsets) runCounterfactualOp("HUMAN", s);
    const st = getInvestigationState();
    expect(st.experiments.length).toBe(3);
    expect(st.activity.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(st.activity.filter((e) => e.detail.startsWith("repeat")).length).toBe(3);
  });

  it("unknown experiment inspection fails without state damage", () => {
    readDispute("HUMAN");
    const r = inspectEvidenceOp("HUMAN", ["telepathy"]);
    expect(r.ok).toBe(false);
    expect(getInvestigationState().evidenceView).toBe(null);
    expect(getInvestigationState().error).not.toBe(null);
  });

  it("verify before read still enforces engine integrity", () => {
    const r = verifyWitnessOp("AGENT", ["reasoning_budget"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("VERIFIED");
    expect(getInvestigationState().dispute).toBe(null);
    expect(getInvestigationState().certificate?.valid).toBe(true);
  });

  it("no stale ids survive reset", () => {
    readDispute("HUMAN");
    runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    verifyWitnessOp("HUMAN", ["reasoning_budget"]);
    const certId = getInvestigationState().certificate?.certificateId;
    expect(certId?.startsWith("mpw-")).toBe(true);
    resetInvestigation("AGENT");
    const s = getInvestigationState();
    expect(s.certificate).toBe(null);
    expect(s.verification).toBe(null);
    expect(s.seq).toBe(0);
    const again = verifyWitnessOp("AGENT", ["reasoning_budget"]);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(getInvestigationState().certificate?.certificateId).toBe(certId);
  });
});
