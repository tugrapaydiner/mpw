// application state around the proven science. wraps the engine, never
// duplicates it. both HUMAN (ui) and AGENT (webmcp) callers go through here.
// identity is monotonic local sequence numbers only. no wall clock anywhere.
import { dispute, runCounterfactual, inspectEvidence, witness } from "../engine/mpwService.js";
import { checkSourceIntegrity } from "../engine/mpwVerify.js";
import { diffProtocols } from "../engine/mpwCounterfactual.js";
import { LAB_A_PROTOCOL, LAB_B_PROTOCOL } from "../engine/mpwFixture.js";
import { buildCertificate } from "../engine/mpwCertificate.js";

export type Caller = "HUMAN" | "AGENT";
export type EventSource = "HUMAN" | "AGENT" | "SYSTEM";
export type Op = "READ_DISPUTE" | "RUN_COUNTERFACTUAL" | "INSPECT_EVIDENCE" | "VERIFY_WITNESS" | "RESET";

export interface ActivityEvent {
  seq: number;
  source: EventSource;
  op: Op;
  detail: string;
}

export interface InvestigationState {
  seq: number;
  dispute: ReturnType<typeof dispute> | null;
  integrity: { status: string; checks: Array<{ source: string; declared: string; recomputed: string; match: boolean }> } | null;
  differences: string[] | null;
  experiments: Array<ReturnType<typeof runCounterfactual>>;
  selectedSubset: string[] | null;
  selectedExperiment: ReturnType<typeof runCounterfactual> | null;
  evidenceView: ReturnType<typeof inspectEvidence> | null;
  candidate: string[] | null;
  verification: ReturnType<typeof witness> | null;
  certificate: {
    certificateId: string;
    certificateHash: string;
    status: string;
    minimumCardinality: number | null;
    valid: boolean;
  } | null;
  activity: ActivityEvent[];
  status: string;
  error: string | null;
}

const initialState = (): InvestigationState => ({
  seq: 0,
  dispute: null,
  integrity: null,
  differences: null,
  experiments: [],
  selectedSubset: null,
  selectedExperiment: null,
  evidenceView: null,
  candidate: null,
  verification: null,
  certificate: null,
  activity: [],
  status: "ready",
  error: null,
});

let state: InvestigationState = initialState();
const listeners = new Set<() => void>();

// callers receive and store separate copies. a mutated return value can never
// corrupt history, and history can never leak a mutable handle outward.
const snap = <T>(v: T): T => structuredClone(v);

export function getInvestigationState(): InvestigationState {
  return state;
}

export function subscribeInvestigation(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(next: InvestigationState): void {
  state = next;
  listeners.forEach((l) => l());
}

function log(s: InvestigationState, source: EventSource, op: Op, detail: string): InvestigationState {
  const seq = s.seq + 1;
  return { ...s, seq, activity: [...s.activity, { seq, source, op, detail }] };
}

function fail(s: InvestigationState, source: EventSource, op: Op, error: string): { ok: false; error: string } {
  emit({ ...log(s, source, op, `failed: ${error}`), error });
  return { ok: false as const, error };
}

export function readDispute(caller: Caller): { ok: true; dispute: InvestigationState["dispute"]; integrity: InvestigationState["integrity"]; differences: string[] } | { ok: false; error: string } {
  try {
    const d = dispute();
    const integrity = checkSourceIntegrity();
    const differences = diffProtocols(LAB_A_PROTOCOL, LAB_B_PROTOCOL) as string[];
    const next = log(state, caller, "READ_DISPUTE", `dispute loaded (${d.models.join(",")})`);
    emit({ ...next, dispute: snap(d), integrity: snap(integrity), differences: [...differences], status: "dispute loaded", error: null });
    return { ok: true as const, dispute: snap(d), integrity: snap(integrity), differences: [...differences] };
  } catch (e) {
    return fail(state, caller, "READ_DISPUTE", String((e as Error).message || e));
  }
}

export function runCounterfactualOp(caller: Caller, subset: unknown): { ok: true; result: ReturnType<typeof runCounterfactual>; repeated: boolean } | { ok: false; error: string } {
  try {
    const key = JSON.stringify([...(subset as string[])].sort());
    const prior = state.experiments.find((x) => JSON.stringify([...x.subset].sort()) === key);
    if (prior) {
      const next = log(state, caller, "RUN_COUNTERFACTUAL", `repeat ${key} -> ${prior.conclusion}`);
      emit({ ...next, selectedSubset: [...prior.subset], selectedExperiment: snap(prior), status: "experiment complete", error: null });
      return { ok: true as const, result: snap(prior), repeated: true };
    }
    const result = runCounterfactual(subset);
    let next = log(state, caller, "RUN_COUNTERFACTUAL", `${key} -> ${result.conclusion}`);
    const cert = next.certificate && next.certificate.valid ? { ...next.certificate, valid: false } : next.certificate;
    if (next.certificate && next.certificate.valid) {
      next = log(next, "SYSTEM", "RUN_COUNTERFACTUAL", "certificate marked stale: investigation changed");
    }
    emit({
      ...next,
      experiments: [...next.experiments, snap(result)],
      selectedSubset: [...result.subset],
      selectedExperiment: snap(result),
      certificate: cert,
      status: "experiment complete",
      error: null,
    });
    return { ok: true as const, result: snap(result), repeated: false };
  } catch (e) {
    return fail(state, caller, "RUN_COUNTERFACTUAL", String((e as Error).message || e));
  }
}

export function inspectEvidenceOp(
  caller: Caller,
  subset: unknown,
  opts?: { stratum?: string | null; limit?: number }
): { ok: true; result: ReturnType<typeof inspectEvidence> } | { ok: false; error: string } {
  try {
    const result = inspectEvidence(subset, opts);
    const next = log(state, caller, "INSPECT_EVIDENCE", `${JSON.stringify(result.subset)} -> ${result.conclusion}`);
    emit({ ...next, evidenceView: snap(result), status: "evidence inspected", error: null });
    return { ok: true as const, result: snap(result) };
  } catch (e) {
    return fail(state, caller, "INSPECT_EVIDENCE", String((e as Error).message || e));
  }
}

export function verifyWitnessOp(caller: Caller, candidate: unknown): { ok: true; result: ReturnType<typeof witness> } | { ok: false; error: string } {
  try {
    if (!Array.isArray(candidate)) throw new Error("candidateSubset must be an array");
    const sorted = [...candidate].sort();
    const result = witness(candidate);
    let next = log(state, caller, "VERIFY_WITNESS", `${JSON.stringify(sorted)} -> ${result.status}`);
    let cert: InvestigationState["certificate"] = next.certificate;
    if (result.status === "VERIFIED") {
      const built = buildCertificate();
      cert = {
        certificateId: built.certificateId,
        certificateHash: built.certificateHash,
        status: result.status,
        minimumCardinality: result.minimumCardinality,
        valid: true,
      };
      next = log(next, "SYSTEM", "VERIFY_WITNESS", `certificate ${built.certificateId} issued`);
    } else if (cert && cert.valid) {
      cert = { ...cert, valid: false };
      next = log(next, "SYSTEM", "VERIFY_WITNESS", "certificate marked stale: investigation changed");
    }
    emit({
      ...next,
      candidate: sorted,
      verification: snap(result),
      certificate: cert,
      status: result.status === "VERIFIED" ? "witness verified" : "verification complete",
      error: null,
    });
    return { ok: true as const, result: snap(result) };
  } catch (e) {
    return fail(state, caller, "VERIFY_WITNESS", String((e as Error).message || e));
  }
}

export function resetInvestigation(caller: Caller): { ok: true } {
  const fresh = initialState();
  state = fresh;
  listeners.forEach((l) => l());
  void caller;
  return { ok: true as const };
}

export function __resetInvestigationForTests(): void {
  state = initialState();
  listeners.clear();
}
