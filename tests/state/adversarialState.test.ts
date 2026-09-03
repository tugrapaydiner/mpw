import { describe, it, expect, beforeEach } from "vitest";
import {
  getInvestigationState,
  runCounterfactualOp,
  inspectEvidenceOp,
  verifyWitnessOp,
  resetInvestigation,
  __resetInvestigationForTests,
} from "../../src/state/investigation";

beforeEach(() => {
  __resetInvestigationForTests();
});

describe("adversarial state", () => {
  it("null, primitive, and extra-prop args all fail coded, never escape", () => {
    const calls = [
      () => runCounterfactualOp("HUMAN", null as never),
      () => runCounterfactualOp("HUMAN", 42 as never),
      () => runCounterfactualOp("HUMAN", { adopt: [], evil: 1 } as never),
      () => runCounterfactualOp("HUMAN", { adopt: "reasoning_budget" } as never),
      () => inspectEvidenceOp("HUMAN", null as never),
      () => inspectEvidenceOp("HUMAN", { experimentId: "x".repeat(5000) }),
      () => inspectEvidenceOp("HUMAN", { experimentId: "0".repeat(64), limit: 99 }),
      () => verifyWitnessOp("HUMAN", null as never),
      () => verifyWitnessOp("HUMAN", { candidate: ["reasoning_budget"], extra: true } as never),
      () => verifyWitnessOp("HUMAN", { candidate: [] , baseLab: "Z"}),
    ];
    for (const fn of calls) {
      const r = fn() as { ok: boolean; code?: string };
      expect(r.ok).toBe(false);
      expect(typeof r.code).toBe("string");
    }
    expect(getInvestigationState().experiments).toEqual([]);
  });

  it("stale ids die with reset, registry never resurrects", () => {
    const run = runCounterfactualOp("HUMAN", { adopt: ["answer_parser"] });
    expect(run.ok).toBe(true);
    if (!run.ok) return;
    const id = run.result.experimentId;
    resetInvestigation("HUMAN");
    const stale = inspectEvidenceOp("HUMAN", { experimentId: id });
    expect(stale.ok).toBe(false);
    if (stale.ok) return;
    expect(stale.code).toBe("UNKNOWN_EXPERIMENT");
    verifyWitnessOp("HUMAN", { candidate: ["answer_parser"] });
    resetInvestigation("HUMAN");
    expect(getInvestigationState().certificate).toBe(null);
    expect(getInvestigationState().seq).toBe(0);
  });

  it("rapid mixed valid/invalid storm stays consistent", () => {
    const ops: Array<() => unknown> = [];
    const subsets = [[], ["answer_parser"], ["telepathy"], ["reasoning_budget"], ["answer_parser", "answer_parser"], []];
    for (const s of subsets) ops.push(() => runCounterfactualOp("HUMAN", { adopt: s }));
    ops.push(() => inspectEvidenceOp("HUMAN", { experimentId: "nope" }));
    ops.push(() => verifyWitnessOp("HUMAN", { candidate: ["answer_parser"] }));
    ops.push(() => verifyWitnessOp("HUMAN", { candidate: ["zzz"] }));
    for (const fn of ops) fn();
    const st = getInvestigationState();
    expect(st.experiments.length).toBe(3);
    expect(st.activity.map((e) => e.seq)).toEqual(st.activity.map((_, i) => i + 1));
    expect(st.verification?.status).toBe("NOT_SUFFICIENT");
  });
});
