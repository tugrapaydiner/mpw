// unhashed manifest core. canonical bytes + hashes live in mpwProvenance (JCS).
import { canonicalBytes, hashExperiment } from "./mpwProvenance.js";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export function canonicalize(value: JsonValue): string {
  return canonicalBytes(value);
}

export interface ManifestCore {
  kind: string;
  version: number;
  source: string;
  protocol: Record<string, JsonValue>;
  declared: string;
  seeds: Record<string, JsonValue>;
  evidence: JsonValue;
  [k: string]: JsonValue;
}

export function buildPublicationManifestCore({
  source,
  protocol,
  declared,
  seeds,
  evidence = null,
}: {
  source: string;
  protocol: Record<string, JsonValue>;
  declared: string;
  seeds: Record<string, JsonValue>;
  evidence?: JsonValue;
}): ManifestCore {
  if (!source || !protocol || !declared || !seeds) throw new Error("source/protocol/declared/seeds required");
  return { kind: "PublicationManifestCore", version: 1, source, protocol, declared, seeds, evidence };
}

export function canonicalManifest(core: ManifestCore): string {
  return canonicalize(core as unknown as JsonValue);
}

// ordering: items by id, receipts by protocol/item/model, dims sorted,
// table by cardinality then lexicographic. arrays otherwise keep order.

export interface EngineMeta {
  sim: string;
  simVersion: string;
  boot: string;
  replicates: number;
  algo: string;
  algoVersion: number;
  [k: string]: JsonValue;
}

// content-stable experiment identity. ui metadata never enters.
export function experimentId(
  baseLab: string,
  sourceLab: string,
  subset: string[],
  protocol: Record<string, JsonValue>,
  meta: EngineMeta
): string {
  return hashExperiment({ baseLab, sourceLab, subset, protocol, engine: meta });
}
export const canonicalDims = (dims: string[]): string[] => [...dims].sort();
export const protocolIdForSubset = (subset: string[]): string => [...subset].sort().join("+");
export const protocolKey = (protocol: Record<string, JsonValue>): string => canonicalize(protocol);

interface HasId {
  id?: unknown;
  itemId?: unknown;
}

export function sortItems<T extends HasId>(items: T[]): T[] {
  return [...items].sort((a, b) => String(a.id ?? a.itemId).localeCompare(String(b.id ?? b.itemId)));
}

interface ReceiptLike extends HasId {
  protocolId?: unknown;
  subset?: string[];
  protocol?: unknown;
  modelId?: unknown;
  model?: unknown;
}

export function sortReceipts<T extends ReceiptLike>(receipts: T[]): T[] {
  const pid = (r: ReceiptLike): string =>
    String(r.protocolId ?? (Array.isArray(r.subset) ? protocolIdForSubset(r.subset) : String(r.protocol ?? "")));
  const iid = (r: ReceiptLike): string => String(r.itemId ?? r.id ?? "");
  const mid = (r: ReceiptLike): string => String(r.modelId ?? r.model ?? "");
  return [...receipts].sort(
    (a, b) => pid(a).localeCompare(pid(b)) || iid(a).localeCompare(iid(b)) || mid(a).localeCompare(mid(b))
  );
}

export function sortWitnessSubsets(subsets: string[][]): string[][] {
  return subsets
    .map((s) => [...s].sort())
    .sort((a, b) => a.length - b.length || a.join(",").localeCompare(b.join(",")));
}

export function sortVerificationTable<T extends { subset: string[] }>(rows: T[]): T[] {
  return rows
    .map((r) => ({ ...r, subset: [...r.subset].sort() }))
    .sort(
      (a, b) => a.subset.length - b.subset.length || a.subset.join(",").localeCompare(b.subset.join(","))
    );
}
