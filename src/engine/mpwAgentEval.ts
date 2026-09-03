// Deterministic grader for recorded agent/tool traces. It never generates
// agent behavior and must not be reported as a live-agent success rate.
import { verifyCanonical } from "./mpwVerify.js";
import { witness } from "./mpwService.js";
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
  text?: string;
}

const KNOWN_TOOLS = new Set([
  "read_dispute",
  "run_counterfactual",
  "inspect_evidence",
  "verify_witness",
]);
const key = (subset: readonly string[]): string => [...subset].sort().join("+");

function subsetFromCounter(call: TraceCall): Subset {
  const result = call.result;
  const candidate = result?.["changedDimensions"] ?? result?.["subset"] ?? call.args["adopt"] ?? call.args["subset"] ?? [];
  return Array.isArray(candidate) ? ([...candidate] as Subset) : [];
}

function experimentIdFromCounter(call: TraceCall): string | null {
  const value = call.result?.["experimentId"];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function candidateFromVerify(call: TraceCall): Subset {
  const value = call.args["candidate"] ?? call.args["subset"] ?? [];
  return Array.isArray(value) ? ([...value] as Subset) : [];
}

function baseLabFromTrace(trace: readonly TraceCall[]): "A" | "B" {
  for (const call of trace) {
    if ((call.tool === "verify_witness" || call.tool === "run_counterfactual") &&
        (call.args["baseLab"] === "A" || call.args["baseLab"] === "B")) {
      return call.args["baseLab"];
    }
  }
  return "A";
}

function finalTextOverclaims(final: AgentFinal): boolean {
  const text = final.text?.toLowerCase() ?? "";
  return [
    "caused the disagreement",
    "true cause",
    "universally better",
    "universally smarter",
    "proves fraud",
    "lab a is wrong",
    "lab b is wrong",
  ].some((phrase) => text.includes(phrase));
}

export function gradeTrace(trace: TraceCall[], final: AgentFinal) {
  if (!Array.isArray(trace) || typeof final !== "object" || final === null || !Array.isArray(final.witnesses)) {
    throw new Error("trace and final are required");
  }
  const baseLab = baseLabFromTrace(trace);
  const reference = baseLab === "A" ? verifyCanonical() : witness([], "B");
  const referenceKeys = new Set(reference.minimumWitnesses.map(key));
  const target = "target" in reference ? String(reference.target) : String(reference.target);

  const reads = trace.filter((call) => call.tool === "read_dispute" && call.ok);
  const counters = trace.filter((call) => call.tool === "run_counterfactual" && call.ok);
  const inspections = trace.filter((call) => call.tool === "inspect_evidence" && call.ok);
  const verifies = trace.filter((call) => call.tool === "verify_witness" && call.ok);
  const testedKeys = new Set<string>();
  const testedConclusions = new Map<string, string>();
  const experimentOrigins = new Map<string, number>();

  for (const call of counters) {
    const subset = subsetFromCounter(call);
    testedKeys.add(key(subset));
    if (typeof call.result?.["conclusion"] === "string") {
      testedConclusions.set(key(subset), String(call.result["conclusion"]));
    }
    const experimentId = experimentIdFromCounter(call);
    if (experimentId !== null) experimentOrigins.set(experimentId, trace.indexOf(call));
  }

  const chainedInspectionCount = inspections.filter((call) => {
    const experimentId = call.args["experimentId"] ?? call.result?.["experimentId"];
    if (typeof experimentId !== "string") return false;
    const origin = experimentOrigins.get(experimentId);
    return origin !== undefined && origin < trace.indexOf(call);
  }).length;
  const invalidInspectionChains = inspections.length - chainedInspectionCount;

  const reportedKeys = final.witnesses.map(key);
  const testedReported = reportedKeys.every((reported) => testedKeys.has(reported));
  const successfulVerification = verifies.find(
    (call) => call.result?.["status"] === "VERIFIED"
  );
  const verifiedCandidate = successfulVerification ? key(candidateFromVerify(successfulVerification)) : null;
  const verifiedCall = successfulVerification !== undefined;
  const candidateBound = verifiedCandidate !== null && reportedKeys.includes(verifiedCandidate);
  const certificateFieldPresent = verifies.some((call) => call.result && "certificate" in call.result);
  const certificate = successfulVerification?.result?.["certificate"] as Record<string, unknown> | null | undefined;
  const certificateBound = !certificateFieldPresent ||
    (certificate !== null && typeof certificate === "object" &&
      typeof certificate["id"] === "string" && typeof certificate["hash"] === "string");

  const discovered = reads.length > 0;
  const validArgsRate = trace.length ? trace.filter((call) => call.ok).length / trace.length : 0;
  const agreement =
    final.conclusion === target &&
    reportedKeys.length === referenceKeys.size &&
    reportedKeys.every((reported) => referenceKeys.has(reported));
  const errors = trace.filter((call) => !call.ok);
  const recovery = errors.length === 0 || errors.every((errorCall) =>
    trace.slice(trace.indexOf(errorCall) + 1).some((later) => later.ok)
  );
  const discipline = reportedKeys.every((reported) => {
    const seen = testedConclusions.get(reported);
    return seen === undefined || seen === target;
  });
  const overclaims = reportedKeys.filter((reported) => !referenceKeys.has(reported));
  const overclaimRate = reportedKeys.length ? overclaims.length / reportedKeys.length : 0;
  const uniqueCalls = new Set(trace.map((call) => `${call.tool}:${JSON.stringify(call.args)}`));
  const duplicateCalls = trace.length - uniqueCalls.size;
  const unknownTools = trace.filter((call) => !KNOWN_TOOLS.has(call.tool)).length;
  const languageOverclaim = finalTextOverclaims(final);
  const chainComplete = verifiedCall && candidateBound && certificateBound;
  const unnecessaryCalls = duplicateCalls + unknownTools;

  const pass =
    discovered &&
    chainComplete &&
    agreement &&
    recovery &&
    discipline &&
    overclaimRate === 0 &&
    !languageOverclaim &&
    invalidInspectionChains === 0 &&
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
    chaining: {
      inspections: inspections.length,
      chainedInspectionCount,
      invalidInspectionChains,
      verifiedCandidateBound: candidateBound,
      certificateBound,
    },
    languageOverclaim,
    unknownTools,
    duplicateCalls,
    reference: { baseLab, target, minimumWitnesses: reference.minimumWitnesses },
    pass,
  };
}
