// canonical domain vocabulary. exact names, no any.
// runtime keeps its pinned wire encodings; maps below bridge without changing them.
import type { Conclusion } from "./index.js";

export type LabId = "A" | "B";
export type ModelId = "MODEL_A" | "MODEL_B";

export type BenchmarkCategory =
  | "MULTI_STEP_REASONING"
  | "QUANTITATIVE_REASONING"
  | "INSTRUCTION_FOLLOWING"
  | "TOOL_REASONING";

export type ProtocolDimension =
  | "reasoning_budget"
  | "answer_parser"
  | "retry_policy"
  | "tool_access";

export type { Conclusion };

export type VerificationStatus = "VERIFIED" | "NOT_SUFFICIENT" | "NON_MINIMUM" | "UNRESOLVED";

export interface Protocol {
  reasoningBudget: number;
  answerParser: "tolerant" | "strict";
  retryPolicy: 0 | 1;
  toolAccess: "standard" | "restricted";
}

export interface RuntimeProtocol {
  reasoning_budget: number;
  answer_parser: string;
  retry_policy: string;
  tool_access: string;
}

export const CATEGORY_STRATUM_KEY: Record<BenchmarkCategory, string> = {
  MULTI_STEP_REASONING: "multi-step-reasoning",
  QUANTITATIVE_REASONING: "quantitative-reasoning",
  INSTRUCTION_FOLLOWING: "instruction-following",
  TOOL_REASONING: "tool-reasoning",
};

export function protocolToRuntime(p: Protocol): RuntimeProtocol {
  return {
    reasoning_budget: p.reasoningBudget,
    answer_parser: p.answerParser,
    retry_policy: p.retryPolicy === 1 ? "one-retry" : "no-retry",
    tool_access: p.toolAccess,
  };
}

export function runtimeToProtocol(p: RuntimeProtocol): Protocol {
  if (p.retry_policy !== "one-retry" && p.retry_policy !== "no-retry")
    throw new Error(`unknown retry policy: ${p.retry_policy}`);
  const answerParser = p.answer_parser;
  if (answerParser !== "tolerant" && answerParser !== "strict")
    throw new Error(`unknown parser: ${answerParser}`);
  if (p.tool_access !== "standard" && p.tool_access !== "restricted")
    throw new Error(`unknown tool access: ${p.tool_access}`);
  return {
    reasoningBudget: p.reasoning_budget,
    answerParser,
    retryPolicy: p.retry_policy === "one-retry" ? 1 : 0,
    toolAccess: p.tool_access,
  };
}

export interface BenchmarkItem {
  id: string;
  category: BenchmarkCategory;
  indexInCategory: number;
  globalIndex: number;
}

export interface SyntheticModelProfile {
  model: ModelId;
  base: number;
  efficiency: number;
  reliability: number;
  retry: number;
  tool: number;
}

export interface PublicationManifestCore {
  kind: "PublicationManifestCore";
  version: 1;
  source: string;
  lab: LabId;
  protocol: Protocol;
  declared: Conclusion;
  seeds: { sim: string; boot: string };
  evidence: null;
}

export interface DeclaredPublicationResult {
  source: string;
  lab: LabId;
  declared: Conclusion;
}

export interface ItemReceipt {
  id: string;
  model: ModelId;
  category: BenchmarkCategory;
  semanticFirstAttempt: boolean;
  retried: boolean;
  retryOutcome: boolean | null;
  selectedSemantic: boolean;
  canonicalState: boolean;
  parserAcceptance: boolean;
  toolNeeded: boolean;
  toolPenalty: number;
  finalCorrect: boolean;
}

export interface ExperimentRequest {
  subset: ProtocolDimension[];
}

export interface ConfidenceInterval {
  low: number;
  high: number;
  level: number;
}

export interface ExperimentResult {
  subset: ProtocolDimension[];
  accuracyA: number;
  accuracyB: number;
  delta: number;
  interval: ConfidenceInterval;
  conclusion: Conclusion;
  reproducesTarget: boolean;
}

export interface EvidenceSummary {
  subset: ProtocolDimension[];
  conclusion: Conclusion;
  strata: Array<{ category: BenchmarkCategory; n: number; accuracyA: number; accuracyB: number }>;
  sample: Array<{ id: string; category: BenchmarkCategory; a: 0 | 1; b: 0 | 1 }>;
}

export type ProtocolSubset = ProtocolDimension[];

export interface WitnessVerification {
  status: VerificationStatus;
  minimumCardinality: number | null;
  minimumWitnesses: ProtocolSubset[];
  coMinimumWitnesses: ProtocolSubset[];
  checkedCount: number;
  totalSubsets: number;
  exhaustive: boolean;
}

export interface SourceIntegrityResult {
  status: "OK";
  checks: Array<{ source: string; declared: Conclusion; recomputed: Conclusion; match: boolean }>;
}

export interface CertificateBody {
  kind: "ReconciliationCertificate";
  version: 1;
  witness: WitnessVerification;
  limits: { uncertainty: string; notClaimed: string[] };
}

export interface CertificateWrapper {
  body: CertificateBody;
  canonical: string;
  certificateHash: string;
  certificateId: string;
}
