// strict runtime validation for domain JSON. throws deterministic errors, never coerces.
import { EXPOSED_DIMENSIONS } from "./mpwFixture.js";
import type {
  BenchmarkCategory,
  Conclusion,
  ItemReceipt,
  LabId,
  ModelId,
  Protocol,
  ProtocolDimension,
  PublicationManifestCore,
  VerificationStatus,
} from "../types/domain.js";

const CATEGORIES: BenchmarkCategory[] = [
  "MULTI_STEP_REASONING",
  "QUANTITATIVE_REASONING",
  "INSTRUCTION_FOLLOWING",
  "TOOL_REASONING",
];
const MODELS: ModelId[] = ["MODEL_A", "MODEL_B"];
const CONCLUSIONS: Conclusion[] = ["MODEL_A", "MODEL_B", "INCONCLUSIVE"];
const STATUSES: VerificationStatus[] = ["VERIFIED", "NOT_SUFFICIENT", "NON_MINIMUM", "UNRESOLVED"];

function fail(path: string, reason: string): never {
  throw new Error(`invalid ${path}: ${reason}`);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function noExtra(o: Record<string, unknown>, allowed: string[], path: string): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(path, `unexpected property ${k}`);
}

function nonEmptyString(v: unknown, path: string): string {
  if (typeof v !== "string" || v.length === 0) fail(path, "must be a non-empty string");
  return v as string;
}

function finiteNumber(v: unknown, path: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) fail(path, "must be a finite number");
  return v as number;
}

function strictBoolean(v: unknown, path: string): boolean {
  if (typeof v !== "boolean") fail(path, "must be a boolean");
  return v as boolean;
}

function countInt(v: unknown, path: string): number {
  if (!Number.isInteger(v) || (v as number) < 0) fail(path, "must be a non-negative integer");
  return v as number;
}

function uniqueStrings(list: unknown[], path: string): string[] {
  const seen = new Set<string>();
  for (const d of list) {
    if (typeof d !== "string" || d.length === 0) fail(path, "entries must be non-empty strings");
    if (seen.has(d)) fail(path, `duplicate entry ${d}`);
    seen.add(d);
  }
  return list as string[];
}

export function validateDimensions(subset: unknown, path = "subset"): ProtocolDimension[] {
  if (!Array.isArray(subset)) fail(path, "must be an array");
  const dims = uniqueStrings(subset as unknown[], path);
  for (const d of dims) if (!(EXPOSED_DIMENSIONS as string[]).includes(d)) fail(path, `unknown dimension ${d}`);
  return dims as ProtocolDimension[];
}

export function validateBenchmarkMetadata(m: unknown): void {
  if (!isRecord(m)) fail("metadata", "must be an object");
  noExtra(m as Record<string, unknown>, ["version", "models", "strata", "numItems", "exposedDimensions", "seeds"], "metadata");
  const r = m as Record<string, unknown>;
  if (r["version"] !== 1) fail("metadata.version", "unknown schema version, want 1");
  if (!Array.isArray(r["models"])) fail("metadata.models", "must be an array");
  const models = uniqueStrings(r["models"] as unknown[], "metadata.models");
  if (models.length !== 2 || !models.every((x) => (MODELS as string[]).includes(x)))
    fail("metadata.models", "want exactly MODEL_A + MODEL_B");
  if (!Array.isArray(r["strata"])) fail("metadata.strata", "must be an array");
  const strata = r["strata"] as unknown[];
  if (strata.length !== 4) fail("metadata.strata", "want exactly 4 strata");
  const names = new Set<string>();
  let total = 0;
  for (const s of strata) {
    if (!isRecord(s)) fail("metadata.strata[]", "must be objects");
    noExtra(s, ["name", "count"], "metadata.strata[]");
    const name = nonEmptyString(s["name"], "metadata.strata[].name");
    if (names.has(name)) fail("metadata.strata[].name", `duplicate ${name}`);
    names.add(name);
    total += countInt(s["count"], "metadata.strata[].count");
  }
  const n = countInt(r["numItems"], "metadata.numItems");
  if (total !== n) fail("metadata.numItems", `strata sum ${total} != numItems ${n}`);
  if (!Array.isArray(r["exposedDimensions"])) fail("metadata.exposedDimensions", "must be an array");
  const dims = uniqueStrings(r["exposedDimensions"] as unknown[], "metadata.exposedDimensions");
  if (dims.length !== 4 || !dims.every((d) => (EXPOSED_DIMENSIONS as string[]).includes(d)))
    fail("metadata.exposedDimensions", "want exactly the 4 known dimensions");
}

export function validateBenchmarkItems(items: unknown, perCategory: number, categories: string[]): void {
  if (!Array.isArray(items)) fail("items", "must be an array");
  const ids = new Set<string>();
  const counts = new Map<string, number>();
  for (const it of items as unknown[]) {
    if (!isRecord(it)) fail("items[]", "must be objects");
    noExtra(it, ["id", "stratum", "indexInStratum", "globalIndex"], "items[]");
    const id = nonEmptyString(it["id"], "items[].id");
    if (ids.has(id)) fail("items[].id", `duplicate ${id}`);
    ids.add(id);
    const stratum = nonEmptyString(it["stratum"], "items[].stratum");
    if (!categories.includes(stratum)) fail("items[].stratum", `unknown category ${stratum}`);
    counts.set(stratum, (counts.get(stratum) ?? 0) + 1);
    if (!Number.isInteger(it["indexInStratum"]) || (it["indexInStratum"] as number) < 0)
      fail("items[].indexInStratum", "must be a non-negative integer");
    if (!Number.isInteger(it["globalIndex"]) || (it["globalIndex"] as number) < 0)
      fail("items[].globalIndex", "must be a non-negative integer");
  }
  for (const c of categories) {
    if ((counts.get(c) ?? 0) !== perCategory)
      fail("items", `wrong count for ${c}: want ${perCategory}, got ${counts.get(c) ?? 0}`);
  }
}

export function validateModelProfiles(profiles: unknown): void {
  if (!Array.isArray(profiles)) fail("profiles", "must be an array");
  const ids = new Set<string>();
  for (const p of profiles as unknown[]) {
    if (!isRecord(p)) fail("profiles[]", "must be objects");
    noExtra(p, ["model", "base", "efficiency", "reliability", "retry", "tool"], "profiles[]");
    const model = nonEmptyString(p["model"], "profiles[].model");
    if (!(MODELS as string[]).includes(model)) fail("profiles[].model", `unknown model ${model}`);
    if (ids.has(model)) fail("profiles[].model", `duplicate model ${model}`);
    ids.add(model);
    for (const k of ["base", "efficiency", "reliability", "retry", "tool"]) {
      const v = finiteNumber(p[k], `profiles[].${k}`);
      if (v < 0 || v > 1) fail(`profiles[].${k}`, "must be in [0,1]");
    }
  }
  if (ids.size !== 2) fail("profiles", "want exactly 2 distinct models");
}

export function validateProtocol(p: unknown): Protocol {
  if (!isRecord(p)) fail("protocol", "must be an object");
  noExtra(p, ["reasoningBudget", "answerParser", "retryPolicy", "toolAccess"], "protocol");
  const reasoningBudget = finiteNumber(p["reasoningBudget"], "protocol.reasoningBudget");
  if (reasoningBudget <= 0) fail("protocol.reasoningBudget", "must be positive");
  if (p["answerParser"] !== "tolerant" && p["answerParser"] !== "strict")
    fail("protocol.answerParser", "want tolerant|strict");
  if (p["retryPolicy"] !== 0 && p["retryPolicy"] !== 1) fail("protocol.retryPolicy", "want 0|1");
  if (p["toolAccess"] !== "standard" && p["toolAccess"] !== "restricted")
    fail("protocol.toolAccess", "want standard|restricted");
  return p as unknown as Protocol;
}

export function validatePublicationManifestCore(m: unknown): PublicationManifestCore {
  if (!isRecord(m)) fail("manifest", "must be an object");
  noExtra(m, ["kind", "version", "source", "lab", "protocol", "declared", "seeds", "evidence"], "manifest");
  if (m["kind"] !== "PublicationManifestCore") fail("manifest.kind", "unknown manifest kind");
  if (m["version"] !== 1) fail("manifest.version", "unknown schema version, want 1");
  nonEmptyString(m["source"], "manifest.source");
  if (m["lab"] !== "A" && m["lab"] !== "B") fail("manifest.lab", "want A|B");
  validateProtocol(m["protocol"]);
  if (!(CONCLUSIONS as string[]).includes(m["declared"] as string))
    fail("manifest.declared", `unknown conclusion ${String(m["declared"])}`);
  if (!isRecord(m["seeds"])) fail("manifest.seeds", "must be an object");
  noExtra(m["seeds"] as Record<string, unknown>, ["sim", "boot"], "manifest.seeds");
  nonEmptyString((m["seeds"] as Record<string, unknown>)["sim"], "manifest.seeds.sim");
  nonEmptyString((m["seeds"] as Record<string, unknown>)["boot"], "manifest.seeds.boot");
  if (m["evidence"] !== null) fail("manifest.evidence", "core must be unhashed (null)");
  return m as unknown as PublicationManifestCore;
}

export function validateDeclaredResult(d: unknown): { source: string; lab: LabId; declared: Conclusion } {
  if (!isRecord(d)) fail("declared", "must be an object");
  noExtra(d, ["source", "lab", "declared"], "declared");
  const source = nonEmptyString(d["source"], "declared.source");
  if (d["lab"] !== "A" && d["lab"] !== "B") fail("declared.lab", "want A|B");
  if (!(CONCLUSIONS as string[]).includes(d["declared"] as string))
    fail("declared.declared", `unknown conclusion ${String(d["declared"])}`);
  return { source, lab: d["lab"] as LabId, declared: d["declared"] as Conclusion };
}

export function validateReceipt(r: unknown): ItemReceipt {
  if (!isRecord(r)) fail("receipt", "must be an object");
  noExtra(
    r,
    ["id", "model", "category", "semanticFirstAttempt", "retried", "retryOutcome", "selectedSemantic", "canonicalState", "parserAcceptance", "toolNeeded", "toolPenalty", "finalCorrect"],
    "receipt"
  );
  nonEmptyString(r["id"], "receipt.id");
  if (!(MODELS as string[]).includes(r["model"] as string)) fail("receipt.model", `unknown model ${String(r["model"])}`);
  if (!(CATEGORIES as string[]).includes(r["category"] as string))
    fail("receipt.category", `unknown category ${String(r["category"])}`);
  strictBoolean(r["semanticFirstAttempt"], "receipt.semanticFirstAttempt");
  const retried = strictBoolean(r["retried"], "receipt.retried");
  if (r["retryOutcome"] !== null && typeof r["retryOutcome"] !== "boolean")
    fail("receipt.retryOutcome", "must be a boolean or null");
  if (!retried && r["retryOutcome"] !== null) fail("receipt.retryOutcome", "must be null when not retried");
  strictBoolean(r["selectedSemantic"], "receipt.selectedSemantic");
  strictBoolean(r["canonicalState"], "receipt.canonicalState");
  strictBoolean(r["parserAcceptance"], "receipt.parserAcceptance");
  strictBoolean(r["toolNeeded"], "receipt.toolNeeded");
  const penalty = finiteNumber(r["toolPenalty"], "receipt.toolPenalty");
  if (penalty < 0) fail("receipt.toolPenalty", "must be >= 0");
  strictBoolean(r["finalCorrect"], "receipt.finalCorrect");
  return r as unknown as ItemReceipt;
}

export function validateExperimentRequest(q: unknown): { subset: ProtocolDimension[] } {
  if (!isRecord(q)) fail("request", "must be an object");
  noExtra(q, ["subset"], "request");
  return { subset: validateDimensions(q["subset"], "request.subset") };
}

export function validateWitnessCandidate(c: unknown, exposed: string[]): ProtocolDimension[] {
  const dims = validateDimensions(c, "candidate");
  for (const d of dims) if (!exposed.includes(d)) fail("candidate", `dimension ${d} not exposed`);
  return dims;
}

export { STATUSES };
