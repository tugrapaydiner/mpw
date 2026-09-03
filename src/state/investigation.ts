// application state around the proven science. wraps the engine, never
// duplicates it. both HUMAN (ui) and AGENT (webmcp) callers go through here.
// identity is monotonic local sequence numbers only. no wall clock anywhere.
import { dispute, runCounterfactual, inspectEvidence, witness, canonicalDisputeId } from "../engine/mpwService.js";
import { checkSourceIntegrity } from "../engine/mpwVerify.js";
import { diffProtocols } from "../engine/mpwCounterfactual.js";
import { LAB_A_PROTOCOL, LAB_B_PROTOCOL, NUM_ITEMS } from "../engine/mpwFixture.js";
import { buildCertificate, LIMITATIONS } from "../engine/mpwCertificate.js";

export type Caller = "HUMAN" | "AGENT";
export type EventSource = "HUMAN" | "AGENT" | "SYSTEM";
export type Op = "READ_DISPUTE" | "RUN_COUNTERFACTUAL" | "INSPECT_EVIDENCE" | "VERIFY_WITNESS" | "RESET";

export type ErrorCode =
  | "UNKNOWN_DISPUTE"
  | "SOURCE_INTEGRITY_FAILURE"
  | "UNKNOWN_EXPERIMENT"
  | "UNKNOWN_PROTOCOL_DIMENSION"
  | "DUPLICATE_DIMENSION"
  | "INVALID_BASE_LAB"
  | "EVIDENCE_INCOMPLETE"
  | "INVALID_CANDIDATE";

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
// session registry: experimentId -> the request that produced it.
const registry = new Map<string, { subset: string[]; baseLab: string }>();
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

export function toCode(message: string): ErrorCode {
  if (message.includes("UNKNOWN_DISPUTE")) return "UNKNOWN_DISPUTE";
  if (message.includes("SOURCE_INTEGRITY_FAILURE")) return "SOURCE_INTEGRITY_FAILURE";
  if (message.includes("UNKNOWN_EXPERIMENT")) return "UNKNOWN_EXPERIMENT";
  if (/unknown dimension|not exposed|unknown candidate/.test(message)) return "UNKNOWN_PROTOCOL_DIMENSION";
  if (/DUPLICATE_DIMENSION|duplicate/.test(message)) return "DUPLICATE_DIMENSION";
  if (message.includes("INVALID_BASE_LAB")) return "INVALID_BASE_LAB";
  if (message.includes("EVIDENCE_INCOMPLETE")) return "EVIDENCE_INCOMPLETE";
  return "INVALID_CANDIDATE";
}

function fail(s: InvestigationState, source: EventSource, op: Op, message: string): { ok: false; code: ErrorCode; error: string } {
  const code = toCode(message);
  const tagged = message.includes(code) ? message : `${code}: ${message}`;
  emit({ ...log(s, source, op, `failed: ${tagged}`), error: tagged });
  return { ok: false as const, code, error: tagged };
}

function checkArgs(args: unknown, allowed: string[], op: string): Record<string, unknown> {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error(`INVALID_CANDIDATE: ${op} args must be an object`);
  }
  for (const k of Object.keys(args)) {
    if (!allowed.includes(k)) throw new Error(`INVALID_CANDIDATE: unexpected prop ${k} for ${op}`);
  }
  return args as Record<string, unknown>;
}

function checkDisputeId(disputeId: unknown): void {
  if (disputeId === undefined) return;
  if (disputeId !== canonicalDisputeId()) {
    throw new Error(`UNKNOWN_DISPUTE: unknown dispute ${String(disputeId)}. valid id: ${canonicalDisputeId()}`);
  }
}

export function readDispute(caller: Caller, disputeId?: unknown): { ok: true; dispute: InvestigationState["dispute"]; integrity: InvestigationState["integrity"]; differences: string[] } | { ok: false; code: ErrorCode; error: string } {
  try {
    checkDisputeId(disputeId);
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

export function runCounterfactualOp(
  caller: Caller,
  args: { disputeId?: unknown; baseLab?: unknown; adopt?: unknown }
): { ok: true; result: ReturnType<typeof runCounterfactual>; repeated: boolean } | { ok: false; code: ErrorCode; error: string } {
  try {
    const a = checkArgs(args, ["disputeId", "baseLab", "adopt"], "RUN_COUNTERFACTUAL");
    checkDisputeId(a.disputeId);
    const base = a.baseLab ?? "A";
    const adopt = a.adopt ?? [];
    const key = `${String(base)}:${JSON.stringify([...(adopt as string[])].sort())}`;
    const prior = state.experiments.find((x) => `${x.baseLab}:${JSON.stringify([...x.subset].sort())}` === key);
    if (prior) {
      const next = log(state, caller, "RUN_COUNTERFACTUAL", `repeat ${key} -> ${prior.conclusion}`);
      emit({ ...next, selectedSubset: [...prior.subset], selectedExperiment: snap(prior), status: "experiment complete", error: null });
      return { ok: true as const, result: snap(prior), repeated: true };
    }
    const result = runCounterfactual(adopt, base);
    registry.set(result.experimentId, { subset: [...result.subset], baseLab: result.baseLab });
    let next = log(state, caller, "RUN_COUNTERFACTUAL", `${key} -> ${result.conclusion} (${result.experimentId.slice(0, 12)})`);
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
  args: { experimentId?: unknown; category?: unknown; limit?: unknown }
): { ok: true; result: ReturnType<typeof inspectEvidence> } | { ok: false; code: ErrorCode; error: string } {
  try {
    const a = checkArgs(args, ["experimentId", "category", "limit"], "INSPECT_EVIDENCE");
    const id = a.experimentId;
    if (typeof id !== "string" || !registry.has(id)) {
      throw new Error(`UNKNOWN_EXPERIMENT: no such experiment ${String(id)}. run it first with run_counterfactual.`);
    }
    const req = registry.get(id)!;
    const category = (a.category as string | undefined) ?? null;
    const limit = (a.limit as number | undefined) ?? 5;
    const result = inspectEvidence(req.subset, req.baseLab, { stratum: category, limit });
    if (result.coverage < NUM_ITEMS) throw new Error("EVIDENCE_INCOMPLETE: coverage below expected items");
    const next = log(state, caller, "INSPECT_EVIDENCE", `${id.slice(0, 12)} -> ${result.conclusion}`);
    emit({ ...next, evidenceView: snap(result), status: "evidence inspected", error: null });
    return { ok: true as const, result: snap(result) };
  } catch (e) {
    return fail(state, caller, "INSPECT_EVIDENCE", String((e as Error).message || e));
  }
}

export function verifyWitnessOp(
  caller: Caller,
  args: { disputeId?: unknown; baseLab?: unknown; candidate?: unknown }
): { ok: true; result: ReturnType<typeof witness> & { certificate: { id: string; hash: string } | null; limitation: string } } | { ok: false; code: ErrorCode; error: string } {
  try {
    const a = checkArgs(args, ["disputeId", "baseLab", "candidate"], "VERIFY_WITNESS");
    checkDisputeId(a.disputeId);
    const base = a.baseLab ?? "A";
    const candidate = a.candidate;
    if (!Array.isArray(candidate)) throw new Error("INVALID_CANDIDATE: candidate must be an array");
    const sorted = [...candidate].sort();
    const raw = witness(candidate, base);
    let next = log(state, caller, "VERIFY_WITNESS", `${JSON.stringify(sorted)} -> ${raw.status}`);
    let cert: InvestigationState["certificate"] = next.certificate;
    let certificate: { id: string; hash: string } | null = null;
    if (raw.status === "VERIFIED") {
      const built = buildCertificate();
      certificate = { id: built.certificateId, hash: built.certificateHash };
      cert = {
        certificateId: built.certificateId,
        certificateHash: built.certificateHash,
        status: raw.status,
        minimumCardinality: raw.minimumCardinality,
        valid: true,
      };
      next = log(next, "SYSTEM", "VERIFY_WITNESS", `certificate ${built.certificateId} issued`);
    } else if (cert && cert.valid) {
      cert = { ...cert, valid: false };
      next = log(next, "SYSTEM", "VERIFY_WITNESS", "certificate marked stale: investigation changed");
    }
    const result = { ...raw, certificate, limitation: LIMITATIONS[0] };
    emit({
      ...next,
      candidate: sorted,
      verification: snap(raw),
      certificate: cert,
      status: raw.status === "VERIFIED" ? "witness verified" : "verification complete",
      error: null,
    });
    return { ok: true as const, result: snap(result) };
  } catch (e) {
    return fail(state, caller, "VERIFY_WITNESS", String((e as Error).message || e));
  }
}

export function resetInvestigation(caller: Caller): { ok: true } {
  state = initialState();
  registry.clear();
  listeners.forEach((l) => l());
  void caller;
  return { ok: true as const };
}

export function __resetInvestigationForTests(): void {
  state = initialState();
  registry.clear();
  listeners.clear();
}
