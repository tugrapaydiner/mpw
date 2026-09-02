// unhashed manifest core + stable canonical form, hashes come later
export function canonicalize(value) {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string") return JSON.stringify(value);
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite number");
    return JSON.stringify(value);
  }
  if (t === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (t === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(",")}}`;
  }
  throw new Error("unserializable value");
}

export function buildPublicationManifestCore({ source, protocol, declared, seeds, evidence = null }) {
  if (!source || !protocol || !declared || !seeds) throw new Error("source/protocol/declared/seeds required");
  return { kind: "PublicationManifestCore", version: 1, source, protocol, declared, seeds, evidence };
}

export function canonicalManifest(core) {
  return canonicalize(core);
}

// ordering: items by id, receipts by protocol/item/model, dims sorted,
// table by cardinality then lexicographic. arrays otherwise keep order.
export const canonicalDims = (dims) => [...dims].sort();
export const protocolIdForSubset = (subset) => [...subset].sort().join("+");

export function sortItems(items) {
  return [...items].sort((a, b) => String(a.id ?? a.itemId).localeCompare(String(b.id ?? b.itemId)));
}

export function sortReceipts(receipts) {
  const pid = (r) =>
    r.protocolId ?? (Array.isArray(r.subset) ? protocolIdForSubset(r.subset) : String(r.protocol ?? ""));
  const iid = (r) => String(r.itemId ?? r.id ?? "");
  const mid = (r) => String(r.modelId ?? r.model ?? "");
  return [...receipts].sort(
    (a, b) => pid(a).localeCompare(pid(b)) || iid(a).localeCompare(iid(b)) || mid(a).localeCompare(mid(b))
  );
}

export function sortWitnessSubsets(subsets) {
  return subsets
    .map((s) => [...s].sort())
    .sort((a, b) => a.length - b.length || a.join(",").localeCompare(b.join(",")));
}

export function sortVerificationTable(rows) {
  return rows
    .map((r) => ({ ...r, subset: [...r.subset].sort() }))
    .sort(
      (a, b) => a.subset.length - b.subset.length || a.subset.join(",").localeCompare(b.subset.join(","))
    );
}
