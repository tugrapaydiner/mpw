// provenance: canonical content bytes + identity hashes.
//
// serializer: JCS (RFC 8785) via `canonicalize@4.0.0` (Apache-2.0, zero
// dependencies, ships its own types). recursive key sort, stable primitives,
// arrays keep order. the library silently drops `undefined` (JSON.stringify
// semantics) so every input passes `assertCanonicalizable` first, which
// rejects undefined/function/symbol/bigint/class instances/NaN/Infinity.
// digest: SHA-256 over UTF-8 bytes (TextEncoder, identical in browser/Node).
// a hash proves canonical content identity/integrity ONLY. never truth,
// quality, or causality.
import canonicalizeJson from "canonicalize";
import { sha256Hex } from "./sha256.js";
import { EXPOSED_DIMENSIONS } from "./mpwFixture.js";
import type { JsonValue } from "./mpwManifest.js";

export function assertCanonicalizable(value: unknown, path = "$"): asserts value is JsonValue {
  if (value === null) return;
  const t = typeof value;
  if (t === "string" || t === "boolean") return;
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error(`non-finite number at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertCanonicalizable(v, `${path}[${i}]`));
    return;
  }
  if (t === "object") {
    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new Error(`non-plain object at ${path}`);
    for (const k of Object.keys(value as Record<string, unknown>)) {
      assertCanonicalizable((value as Record<string, unknown>)[k], `${path}.${k}`);
    }
    return;
  }
  throw new Error(`unserializable value at ${path}: ${t}`);
}

// JCS canonical bytes. deterministic across browser/Node: key sort is UTF-16
// code-unit order, numbers are shortest-round-trip forms, output is ASCII
// except escaped/UTF-8 string content.
export function canonicalBytes(value: unknown): string {
  assertCanonicalizable(value);
  const out: string | undefined = canonicalizeJson(value as JsonValue);
  if (typeof out !== "string") throw new Error("canonicalization produced no bytes");
  return out;
}

export function contentHash(value: unknown): string {
  return sha256Hex(canonicalBytes(value));
}

// code-unit comparison. localeCompare is ICU-dependent, never used here.
const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// canonical dimension order = EXPOSED_DIMENSIONS declaration order.
const DIM_RANK = new Map<string, number>(EXPOSED_DIMENSIONS.map((d, i) => [d, i]));

export function orderDims(dims: string[]): string[] {
  return [...dims].sort((a, b) => (DIM_RANK.get(a) ?? 1000000) - (DIM_RANK.get(b) ?? 1000000) || cmpStr(a, b));
}

export function normalizeItems<T extends { id?: unknown; itemId?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => cmpStr(String(a.id ?? a.itemId ?? ""), String(b.id ?? b.itemId ?? "")));
}

interface ReceiptLike {
  protocolId?: unknown;
  subset?: unknown;
  protocol?: unknown;
  itemId?: unknown;
  id?: unknown;
  modelId?: unknown;
  model?: unknown;
}

export function normalizeReceipts<T extends ReceiptLike>(receipts: T[]): T[] {
  const pid = (r: ReceiptLike): string =>
    String(
      r.protocolId ??
        (Array.isArray(r.subset) ? orderDims(r.subset as string[]).join("+") : String(r.protocol ?? ""))
    );
  const iid = (r: ReceiptLike): string => String(r.itemId ?? r.id ?? "");
  const mid = (r: ReceiptLike): string => String(r.modelId ?? r.model ?? "");
  return [...receipts].sort((a, b) => cmpStr(pid(a), pid(b)) || cmpStr(iid(a), iid(b)) || cmpStr(mid(a), mid(b)));
}

export function normalizeTable<T extends { subset: string[] }>(rows: T[]): T[] {
  return rows
    .map((r) => ({ ...r, subset: orderDims(r.subset) }))
    .sort((a, b) => a.subset.length - b.subset.length || cmpStr(a.subset.join(","), b.subset.join(",")));
}

export interface BenchmarkDoc {
  id: string;
  version: number;
  models: string[];
  strata: Array<{ name: string; count: number }>;
  items: Array<Record<string, JsonValue>>;
}

export interface EvidenceBundle {
  protocol: Record<string, JsonValue>;
  subset: string[];
  receipts: Array<Record<string, JsonValue>>;
  summary: Record<string, JsonValue>;
}

export interface ExperimentDoc {
  baseLab: string;
  sourceLab: string;
  subset: string[];
  protocol: Record<string, JsonValue>;
  engine: Record<string, JsonValue>;
}

// key order anywhere is irrelevant (JCS sorts). unordered collections are
// normalized first: items by id, receipts by protocol/item/model, subsets by
// canonical dimension order, tables by cardinality then subset. strata/models
// order is meaningful declaration order and is preserved.
export function hashProtocol(protocol: Record<string, JsonValue>): string {
  return contentHash(protocol);
}

export function hashBenchmark(bench: BenchmarkDoc): string {
  assertCanonicalizable(bench);
  const b = bench as unknown as Record<string, JsonValue>;
  return contentHash({ ...b, items: normalizeItems(b.items as Array<Record<string, JsonValue>>) });
}

export function hashEvidenceBundle(bundle: EvidenceBundle): string {
  assertCanonicalizable(bundle);
  const b = bundle as unknown as Record<string, JsonValue>;
  return contentHash({
    ...b,
    subset: orderDims(bundle.subset),
    receipts: normalizeReceipts(bundle.receipts),
  });
}

export function hashExperiment(doc: ExperimentDoc): string {
  const d: ExperimentDoc = doc;
  assertCanonicalizable(doc);
  return contentHash({
    baseLab: d.baseLab,
    sourceLab: d.sourceLab,
    subset: orderDims(d.subset),
    protocol: d.protocol,
    engine: d.engine,
  });
}

export function hashManifestBody(core: Record<string, JsonValue>): string {
  return contentHash(core);
}

export function hashCertificateBody(body: Record<string, JsonValue>): string {
  return contentHash(body);
}
