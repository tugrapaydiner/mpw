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
const RUN = (adopt: string[]) => ({ baseLab: "A", adopt });
const VERIFY = (candidate: string[]) => ({ baseLab: "A", candidate });

beforeEach(() => {
  __resetInvestigationForTests();
});

describe("state audit", () => {
  it("human and agent run_counterfactual produce identical science", async () => {
    const human = runCounterfactualOp("HUMAN", RUN(["reasoning_budget", "answer_parser"]));
    const agent = await byName("run_counterfactual").execute({ baseLab: "A", adopt: ["answer_parser", "reasoning_budget"] });
    expect(human.ok && agent.ok).toBe(true);
    if (!human.ok || !agent.ok) return;
    const { ...agentRest } = agent as unknown as Record<string, unknown>;
    delete (agentRest as { ok?: boolean }).ok;
    expect(agentRest).toEqual((human as { result: unknown }).result);
  });

  it("human and agent verify_witness produce identical science", async () => {
    const human = verifyWitnessOp("HUMAN", VERIFY(["reasoning_budget"]));
    __resetInvestigationForTests();
    const agent = await byName("verify_witness").execute({ baseLab: "A", candidate: ["reasoning_budget"] });
    expect(human.ok && agent.ok).toBe(true);
    if (!human.ok || !agent.ok) return;
    const h = (human as { result: Record<string, unknown> }).result;
    const a = agent as unknown as Record<string, unknown>;
    delete a.ok;
    expect(a.status).toBe(h.status);
    expect(a.target).toBe(h.target);
    expect(a.minimumCardinality).toBe(h.minimumCardinality);
    expect(a.coMinimumWitnesses).toEqual(h.coMinimumWitnesses);
    expect(a.subsetsEvaluated).toBe((h as { checkedCount: number }).checkedCount);
    expect(a.subsetsTotal).toBe((h as { totalSubsets: number }).totalSubsets);
    expect(a.certificate).toEqual(h.certificate);
    expect(a.limitation).toBe(h.limitation);
  });

  it("mutated returns never corrupt stored state", () => {
    readDispute("HUMAN");
    const a = runCounterfactualOp("HUMAN", RUN(["reasoning_budget"]));
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    (a.result as { conclusion: string }).conclusion = "FORGED";
    (a.result as { subset: string[] }).subset.push("telepathy");
    const b = runCounterfactualOp("HUMAN", RUN(["reasoning_budget"]));
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
    const run = runCounterfactualOp("HUMAN", RUN([]));
    expect(run.ok).toBe(true);
    if (!run.ok) return;
    inspectEvidenceOp("HUMAN", { experimentId: run.result.experimentId, limit: 3 });
    verifyWitnessOp("HUMAN", VERIFY(["answer_parser"]));
    resetInvestigation("HUMAN");
    expect(JSON.stringify(LAB_A_PROTOCOL)).toBe(snapA);
    expect(JSON.stringify(LAB_B_PROTOCOL)).toBe(snapB);
    expect(JSON.stringify(SOURCE_PUBLICATIONS)).toBe(snapP);
  });

  it("rapid sequential operations stay ordered and deduped", () => {
    readDispute("HUMAN");
    const subsets = [[], ["answer_parser"], [], ["answer_parser"], ["reasoning_budget"], []];
    for (const s of subsets) runCounterfactualOp("HUMAN", RUN(s));
    const st = getInvestigationState();
    expect(st.experiments.length).toBe(3);
    expect(st.activity.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(st.activity.filter((e) => e.detail.startsWith("repeat")).length).toBe(3);
  });

  it("unknown experiment inspection fails without state damage", () => {
    readDispute("HUMAN");
    const r = inspectEvidenceOp("HUMAN", { experimentId: "f".repeat(64) });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("UNKNOWN_EXPERIMENT");
    expect(getInvestigationState().evidenceView).toBe(null);
    expect(getInvestigationState().error).not.toBe(null);
  });

  it("verify before read still enforces engine integrity", () => {
    const r = verifyWitnessOp("AGENT", VERIFY(["reasoning_budget"]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.status).toBe("VERIFIED");
    expect(getInvestigationState().dispute).toBe(null);
    expect(getInvestigationState().certificate?.valid).toBe(true);
  });

  it("no stale ids survive reset", () => {
    readDispute("HUMAN");
    runCounterfactualOp("HUMAN", RUN(["reasoning_budget"]));
    verifyWitnessOp("HUMAN", VERIFY(["reasoning_budget"]));
    const certId = getInvestigationState().certificate?.certificateId;
    expect(certId?.startsWith("mpw-")).toBe(true);
    resetInvestigation("AGENT");
    const s = getInvestigationState();
    expect(s.certificate).toBe(null);
    expect(s.verification).toBe(null);
    expect(s.seq).toBe(0);
    const again = verifyWitnessOp("AGENT", VERIFY(["reasoning_budget"]));
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(getInvestigationState().certificate?.certificateId).toBe(certId);
  });
});
