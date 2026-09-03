// unhashed manifest core + stable canonical form, hashes come later
export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export function canonicalize(value: JsonValue): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string") return JSON.stringify(value);
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite number");
    return JSON.stringify(value);
  }
  if (t === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map((v) => canonicalize(v)).join(",")}]`;
  if (t === "object") {
    const obj = value as Record<string, JsonValue>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
  }
  throw new Error("unserializable value");
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
