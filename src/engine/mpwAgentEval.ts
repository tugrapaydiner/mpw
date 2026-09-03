// grades a recorded tool-call trace. order-agnostic: any valid experiment
// order passes. deterministic, no llm.
import { verifyCanonical } from "./mpwVerify.js";
import type { Subset } from "../types";

export interface TraceCall {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  result?: Record<string, unknown>;
}

export interface AgentFinal {
  witnesses: Subset[];
  conclusion: string;
}

const key = (s: Subset): string => [...s].sort().join("+");

export function gradeTrace(trace: TraceCall[], final: AgentFinal) {
  const ref = verifyCanonical();
  const refKeys = new Set(ref.minimumWitnesses.map(key));
  const sufficientKeys = new Set(ref.sufficient.map(key));

  const reads = trace.filter((c) => c.tool === "read_dispute" && c.ok);
  const counters = trace.filter((c) => c.tool === "run_counterfactual" && c.ok);
  const verifies = trace.filter((c) => c.tool === "verify_witness" && c.ok);
  const testedKeys = new Set(
    counters.map((c) => key(((c.args["subset"] as string[]) ?? []) as Subset))
  );
  const testedConclusions = new Map<string, string>();
  for (const c of counters) {
    const r = c.result as { subset?: string[]; conclusion?: string } | undefined;
    if (r && Array.isArray(r.subset)) testedKeys.add(key(r.subset));
    if (r && Array.isArray(r.subset) && typeof r.conclusion === "string")
      testedConclusions.set(key(r.subset), r.conclusion);
  }

  const discovered = reads.length > 0;
  const validArgsRate = trace.length ? trace.filter((c) => c.ok).length / trace.length : 0;
  const reportedKeys = final.witnesses.map(key);
  const testedReported = reportedKeys.every((k) => testedKeys.has(k));
  const verifiedCall = verifies.some(
    (c) => (c.result as { status?: string } | undefined)?.status === "VERIFIED"
  );
  const chainComplete = verifiedCall;
  const agreement =
    final.conclusion === ref.target &&
    reportedKeys.length === refKeys.size &&
    reportedKeys.every((k) => refKeys.has(k));
  const errors = trace.filter((c) => !c.ok);
  const recovery =
    errors.length === 0 ||
    errors.every((e) => trace.indexOf(e) < trace.lastIndexOf(trace.filter((c) => c.ok).pop()!));
  const discipline = reportedKeys.every((k) => {
    const seen = testedConclusions.get(k);
    return seen === undefined || seen === ref.target;
  });
  const overclaims = reportedKeys.filter((k) => !sufficientKeys.has(k));
  const overclaimRate = reportedKeys.length ? overclaims.length / reportedKeys.length : 0;
  const dups = trace.length - new Set(trace.map((c) => c.tool + ":" + JSON.stringify(c.args))).size;
  const unnecessaryCalls = dups;

  const pass =
    discovered &&
    chainComplete &&
    agreement &&
    recovery &&
    discipline &&
    overclaimRate === 0 &&
    trace.length <= 24;
  return {
    discovered,
    validArgsRate,
    testedReported,
    chainComplete,
    agreement,
    recovery,
    discipline,
    overclaimRate,
    unnecessaryCalls,
    totalCalls: trace.length,
    reference: { target: ref.target, minimumWitnesses: ref.minimumWitnesses },
    pass,
  };
}
