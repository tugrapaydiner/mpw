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
import { runCounterfactual as engineRun } from "../../src/engine/mpwCounterfactual";
import { finalizePublication } from "../../src/engine/mpwPublication";

beforeEach(() => {
  __resetInvestigationForTests();
});

describe("application state", () => {
  it("initial state is canonical", () => {
    const s = getInvestigationState();
    expect(s.seq).toBe(0);
    expect(s.activity).toEqual([]);
    expect(s.status).toBe("ready");
    expect(s.error).toBe(null);
    for (const k of ["dispute", "integrity", "differences", "selectedExperiment", "evidenceView", "verification", "certificate"] as const) {
      expect(s[k]).toBe(null);
    }
    expect(s.experiments).toEqual([]);
  });

  it("valid read loads dispute, integrity, differences", () => {
    const r = readDispute("HUMAN");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dispute?.models).toEqual(["MODEL_A", "MODEL_B"]);
    expect(r.integrity?.status).toBe("OK");
    expect(r.differences?.sort()).toEqual(["answer_parser", "reasoning_budget", "retry_policy", "tool_access"]);
    expect(getInvestigationState().status).toBe("dispute loaded");
  });

  it("valid experiment tracks history and selection", () => {
    readDispute("HUMAN");
    const r = runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.conclusion).toBe("MODEL_B");
    expect(r.repeated).toBe(false);
    const s = getInvestigationState();
    expect(s.experiments.length).toBe(1);
    expect(s.selectedSubset).toEqual(["reasoning_budget"]);
  });

  it("repeated experiment reuses, never duplicates", () => {
    readDispute("HUMAN");
    const a = runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    const c = runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    expect(a.ok && c.ok).toBe(true);
    if (!a.ok || !c.ok) return;
    expect((c as { repeated: boolean }).repeated).toBe(true);
    expect(c.result).toEqual(a.result);
    expect(getInvestigationState().experiments.length).toBe(1);
  });

  it("evidence inspection records a view", () => {
    readDispute("HUMAN");
    const r = inspectEvidenceOp("HUMAN", [], { limit: 5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.strata.length).toBe(4);
    expect(r.result.sample.length).toBe(5);
    expect(getInvestigationState().evidenceView?.conclusion).toBe("MODEL_A");
  });

  it("verification builds a live certificate", () => {
    readDispute("HUMAN");
    const r = verifyWitnessOp("HUMAN", ["reasoning_budget"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("VERIFIED");
    const cert = getInvestigationState().certificate;
    expect(cert?.valid).toBe(true);
    expect(cert?.certificateId.startsWith("mpw-")).toBe(true);
  });

  it("stale certificate invalidated only by science change", () => {
    readDispute("HUMAN");
    runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    verifyWitnessOp("HUMAN", ["reasoning_budget"]);
    expect(getInvestigationState().certificate?.valid).toBe(true);
    runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    expect(getInvestigationState().certificate?.valid).toBe(true);
    runCounterfactualOp("HUMAN", ["answer_parser"]);
    expect(getInvestigationState().certificate?.valid).toBe(false);
  });

  it("reset restores pristine state, science identical across it", () => {
    readDispute("HUMAN");
    const before = runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    const idBefore = engineRun({ baseLab: "A", sourceLab: "B", subset: ["reasoning_budget"] }).experimentId;
    const hashBefore = finalizePublication("Lab A").manifestHash;
    expect(before.ok).toBe(true);
    resetInvestigation("HUMAN");
    const fresh = getInvestigationState();
    __resetInvestigationForTests();
    expect(fresh).toEqual(getInvestigationState());
    readDispute("HUMAN");
    const after = runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    expect(after.ok).toBe(true);
    if (!before.ok || !after.ok) return;
    expect(after.result).toEqual(before.result);
    expect(engineRun({ baseLab: "A", sourceLab: "B", subset: ["reasoning_budget"] }).experimentId).toBe(idBefore);
    expect(finalizePublication("Lab A").manifestHash).toBe(hashBefore);
  });

  it("HUMAN and AGENT get identical science", () => {
    readDispute("HUMAN");
    const h = runCounterfactualOp("HUMAN", ["tool_access"]);
    resetInvestigation("HUMAN");
    readDispute("AGENT");
    const g = runCounterfactualOp("AGENT", ["tool_access"]);
    expect(h.ok && g.ok).toBe(true);
    if (!h.ok || !g.ok) return;
    expect(h.result).toEqual(g.result);
    const hv = verifyWitnessOp("HUMAN", ["answer_parser"]);
    resetInvestigation("HUMAN");
    const gv = verifyWitnessOp("AGENT", ["answer_parser"]);
    expect(hv.ok && gv.ok).toBe(true);
    if (!hv.ok || !gv.ok) return;
    expect(hv.result).toEqual(gv.result);
  });

  it("event order deterministic with monotonic seq", () => {
    readDispute("HUMAN");
    runCounterfactualOp("HUMAN", ["reasoning_budget"]);
    inspectEvidenceOp("HUMAN", [], { limit: 3 });
    verifyWitnessOp("HUMAN", ["answer_parser"]);
    const activity = getInvestigationState().activity;
    expect(activity.map((e) => e.seq)).toEqual([1, 2, 3, 4]);
    expect(activity.map((e) => e.op)).toEqual(["READ_DISPUTE", "RUN_COUNTERFACTUAL", "INSPECT_EVIDENCE", "VERIFY_WITNESS"]);
    expect(activity.every((e) => e.source === "HUMAN")).toBe(true);
  });

  it("invalid input fails cleanly into error state", () => {
    readDispute("HUMAN");
    const r = runCounterfactualOp("HUMAN", ["telepathy"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(typeof r.error).toBe("string");
    expect(getInvestigationState().error).toBe(r.error);
    expect(getInvestigationState().experiments).toEqual([]);
  });
});
