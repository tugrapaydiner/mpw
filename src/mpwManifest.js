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
