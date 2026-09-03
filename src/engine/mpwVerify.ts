// full-16 canonical verifier, no answer literals
import type { SourcePublication } from "./mpwFixture.js";
import {
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  SOURCE_PUBLICATIONS,
  listAllProtocolCombinations,
  BENCHMARK_ID,
  BENCHMARK_VERSION,
  MODELS,
  benchmarkUniverseHash,
} from "./mpwFixture.js";
import { SIM_SEED, SIM_VERSION, simulateForProtocol } from "./mpwSimulator.js";
import { BOOT_SEED, BOOT_REPLICATES, BOOT_ALGO_ID, BOOT_ALGO_VERSION, analyzeEvidence } from "./mpwCore.js";
import { evaluateSubset, conclusionForSubset } from "./mpwSimulator.js";
import type { Protocol, Subset, WitnessStatus } from "../types";

export interface IntegrityError extends Error {
  code: string;
  checks: IntegrityCheck[];
}

export interface IntegrityCheck {
  source: string;
  declared: string;
  recomputed: string;
  match: boolean;
}

// each source must reproduce its own headline first, else integrity failure
export function checkSourceIntegrity(declarations: SourcePublication[] = SOURCE_PUBLICATIONS) {
  const checks: IntegrityCheck[] = declarations.map((d) => {
    const recomputed = conclusionForSubset([...d.subset]);
    return { source: d.source, declared: d.declared, recomputed, match: recomputed === d.declared };
  });
  const bad = checks.filter((c) => !c.match);
  if (bad.length) {
    const err = new Error(`SOURCE_INTEGRITY_FAILURE: ${bad.map((b) => b.source).join(", ")}`) as IntegrityError;
    err.code = "SOURCE_INTEGRITY_FAILURE";
    err.checks = checks;
    throw err;
  }
  return { status: "OK", checks };
}

export interface SourcePublicationDoc {
  kind: string;
  version: number;
  source: string;
  benchmark: { id: string; version: number; universe: string };
  models: string[];
  simulator: { seed: string; version: string };
  evaluator: { seed: string; replicates: number; algorithm: string; version: number };
  protocol: { reasoning_budget: number; answer_parser: string; retry_policy: string; tool_access: string };
  stats: {
    scoreA: number;
    scoreB: number;
    delta: number;
    ciLow: number;
    ciHigh: number;
    conclusion: string;
    coverage: number;
  };
}

function integrityFail(source: string, detail: string): never {
  const err = new Error(`SOURCE_INTEGRITY_FAILURE: ${source}: ${detail}`) as IntegrityError;
  err.code = "SOURCE_INTEGRITY_FAILURE";
  err.checks = [];
  throw err;
}

// full-precision self-consistency of one publication. compares exact values,
// never rounded display. throws SOURCE_INTEGRITY_FAILURE on any mismatch.
export function checkPublicationIntegrity(pub: unknown) {
  if (typeof pub !== "object" || pub === null || Array.isArray(pub)) integrityFail("?", "not an object");
  const p = pub as Record<string, unknown>;
  const need = ["kind", "version", "source", "benchmark", "models", "simulator", "evaluator", "protocol", "stats"];
  for (const k of Object.keys(p)) if (!need.includes(k)) integrityFail(String(p["source"] ?? "?"), `unexpected property ${k}`);
  for (const k of need) if (!(k in p)) integrityFail(String(p["source"] ?? "?"), `missing property ${k}`);
  const source = p["source"];
  if (typeof source !== "string" || !source) integrityFail("?", "missing source id");
  if (p["kind"] !== "SourcePublication" || p["version"] !== 1) integrityFail(source as string, "unknown kind/version");
  const benchRaw = p["benchmark"];
  if (typeof benchRaw !== "object" || benchRaw === null || Array.isArray(benchRaw))
    integrityFail(source as string, "missing benchmark");
  const bench = benchRaw as Record<string, unknown>;
  if (bench.id !== BENCHMARK_ID || bench.version !== BENCHMARK_VERSION)
    integrityFail(source as string, "wrong benchmark id/version");
  if (bench.universe !== benchmarkUniverseHash()) integrityFail(source as string, "item universe mismatch");
  const models = p["models"] as unknown;
  if (!Array.isArray(models) || JSON.stringify([...models].sort()) !== JSON.stringify([...MODELS].sort()))
    integrityFail(source as string, "model identities mismatch");
  const simRaw = p["simulator"];
  if (typeof simRaw !== "object" || simRaw === null) integrityFail(source as string, "missing simulator");
  const sim = simRaw as Record<string, unknown>;
  if (sim.seed !== SIM_SEED || sim.version !== SIM_VERSION)
    integrityFail(source as string, "simulator version mismatch");
  const evRaw = p["evaluator"];
  if (typeof evRaw !== "object" || evRaw === null) integrityFail(source as string, "missing evaluator");
  const ev = evRaw as Record<string, unknown>;
  if (ev.seed !== BOOT_SEED || ev.replicates !== BOOT_REPLICATES || ev.algorithm !== BOOT_ALGO_ID || ev.version !== BOOT_ALGO_VERSION)
    integrityFail(source as string, "evaluator version mismatch");
  const protoRaw = p["protocol"];
  if (typeof protoRaw !== "object" || protoRaw === null) integrityFail(source as string, "missing protocol");
  const proto = protoRaw as Record<string, unknown>;
  const keys = Object.keys(proto ?? {}).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["answer_parser", "reasoning_budget", "retry_policy", "tool_access"]))
    integrityFail(source as string, "protocol shape mismatch");
  if (
    typeof proto["reasoning_budget"] !== "number" ||
    !Number.isFinite(proto["reasoning_budget"]) ||
    !["tolerant", "strict"].includes(proto["answer_parser"] as string) ||
    !["one-retry", "no-retry"].includes(proto["retry_policy"] as string) ||
    !["standard", "restricted"].includes(proto["tool_access"] as string)
  )
    integrityFail(source as string, "invalid protocol values");
  const outcomes = simulateForProtocol({
    reasoning_budget: proto["reasoning_budget"] as number,
    answer_parser: proto["answer_parser"] as string,
    retry_policy: proto["retry_policy"] as string,
    tool_access: proto["tool_access"] as string,
  });
  const a = analyzeEvidence(outcomes);
  const stRaw = p["stats"];
  if (typeof stRaw !== "object" || stRaw === null) integrityFail(source as string, "missing stats");
  const st = stRaw as Record<string, unknown>;
  const want: Array<[string, number | string]> = [
    ["scoreA", a.scoreA],
    ["scoreB", a.scoreB],
    ["delta", a.delta],
    ["ciLow", a.ciLow],
    ["ciHigh", a.ciHigh],
    ["conclusion", a.conclusion],
    ["coverage", a.n],
  ];
  for (const [k, v] of want) {
    if (st[k] !== v) integrityFail(source as string, `${k} declared ${String(st[k])} != recomputed ${String(v)}`);
  }
  return { status: "OK", source, recomputed: { scoreA: a.scoreA, scoreB: a.scoreB, delta: a.delta, ciLow: a.ciLow, ciHigh: a.ciHigh, conclusion: a.conclusion, coverage: a.n } };
}

// cross-source scope: same world, differences exactly the four exposed dims.
export function checkCrossSourceScope(aPub: unknown, bPub: unknown) {
  const a = aPub as SourcePublicationDoc;
  const b = bPub as unknown as SourcePublicationDoc;
  for (const [name, x, y] of [["benchmark", a.benchmark, b.benchmark], ["simulator", a.simulator, b.simulator], ["evaluator", a.evaluator, b.evaluator]] as const) {
    if (JSON.stringify(x) !== JSON.stringify(y)) integrityFail("cross-source", `${name} differs between sources`);
  }
  if (JSON.stringify([...a.models].sort()) !== JSON.stringify([...b.models].sort()))
    integrityFail("cross-source", "model sets differ");
  const ka = Object.keys(a.protocol).sort();
  const kb = Object.keys(b.protocol).sort();
  if (JSON.stringify(ka) !== JSON.stringify(kb)) integrityFail("cross-source", "protocol keys differ (hidden dimension?)");
  const differing = ka.filter((k) => (a.protocol as Record<string, unknown>)[k] !== (b.protocol as Record<string, unknown>)[k]);
  if (JSON.stringify([...differing].sort()) !== JSON.stringify([...EXPOSED_DIMENSIONS].sort()))
    integrityFail("cross-source", `differences [${differing}] are not exactly the four exposed dims`);
  return { status: "OK", differing };
}

function checkHybrid(subset: Subset, protocol: Protocol): void {
  for (const d of EXPOSED_DIMENSIONS) {
    const want = subset.includes(d) ? LAB_B_PROTOCOL[d as keyof Protocol] : LAB_A_PROTOCOL[d as keyof Protocol];
    if (protocol[d as keyof Protocol] !== want) throw new Error(`hybrid mismatch on ${d}`);
  }
}

export function verifyCanonical(declarations: SourcePublication[] = SOURCE_PUBLICATIONS) {
  checkSourceIntegrity(declarations);
  const full = [...EXPOSED_DIMENSIONS];
  const target = conclusionForSubset(full);
  const base = conclusionForSubset([]);
  const table = listAllProtocolCombinations().map(({ subset, protocol }) => {
    checkHybrid(subset, protocol);
    const ev = evaluateSubset(subset);
    return {
      subset: [...subset],
      accA: ev.stats.accA,
      accB: ev.stats.accB,
      mean: ev.stats.mean,
      ciLow: ev.stats.ciLow,
      ciHigh: ev.stats.ciHigh,
      conclusion: ev.conclusion,
      sufficient: ev.conclusion === target,
    };
  });
  const sufficient = table.filter((r) => r.sufficient).map((r) => [...r.subset]);
  const minimumCardinality = sufficient.length ? Math.min(...sufficient.map((s) => s.length)) : null;
  const minimumWitnesses =
    minimumCardinality === null ? [] : sufficient.filter((s) => s.length === minimumCardinality).map((s) => [...s]);
  return {
    base,
    target,
    table,
    sufficient,
    minimumCardinality,
    minimumWitnesses,
    coMinimumWitnesses: minimumWitnesses.map((s) => [...s]),
    checkedCount: table.length,
    totalSubsets: 2 ** full.length,
    exhaustive: table.length === 2 ** full.length,
  };
}

// generic candidate check over any exposed set, never forces an answer
export function verifyWitness({
  candidateSubset,
  exposedDimensions,
  isSufficient,
}: {
  candidateSubset: Subset;
  exposedDimensions: Subset;
  isSufficient: (subset: Subset) => boolean;
}): {
  status: WitnessStatus;
  minimumCardinality: number | null;
  minimumWitnesses: Subset[];
  coMinimumWitnesses: Subset[];
  checkedCount: number;
  totalSubsets: number;
  exhaustive: boolean;
} {
  if (!Array.isArray(candidateSubset) || !Array.isArray(exposedDimensions))
    throw new Error("candidateSubset and exposedDimensions must be arrays");
  if (typeof isSufficient !== "function") throw new Error("isSufficient must be a function");
  const n = exposedDimensions.length;
  if (n > 20) throw new Error("too many dims for exhaustive check");
  const totalSubsets = 2 ** n;
  const sufficient: Subset[] = [];
  for (let mask = 0; mask < totalSubsets; mask++) {
    const s: Subset = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) s.push(exposedDimensions[i]);
    const v = isSufficient([...s]);
    if (typeof v !== "boolean") throw new Error("isSufficient must return a boolean");
    if (v) sufficient.push(s);
  }
  if (!sufficient.length)
    return {
      status: "UNRESOLVED",
      minimumCardinality: null,
      minimumWitnesses: [],
      coMinimumWitnesses: [],
      checkedCount: totalSubsets,
      totalSubsets,
      exhaustive: true,
    };
  const minimumCardinality: number = Math.min(...sufficient.map((s) => s.length));
  const minimumWitnesses = sufficient.filter((s) => s.length === minimumCardinality).map((s) => [...s]);
  const cand = [...candidateSubset].sort();
  if (!cand.every((d) => exposedDimensions.includes(d))) throw new Error("unknown candidate dim");
  const candSufficient = isSufficient([...cand]);
  if (!candSufficient)
    return {
      status: "NOT_SUFFICIENT",
      minimumCardinality,
      minimumWitnesses: minimumWitnesses.map((s) => [...s]),
      coMinimumWitnesses: minimumWitnesses.map((s) => [...s]),
      checkedCount: totalSubsets + 1,
      totalSubsets,
      exhaustive: true,
    };
  if (cand.length > minimumCardinality)
    return {
      status: "NON_MINIMUM",
      minimumCardinality,
      minimumWitnesses: minimumWitnesses.map((s) => [...s]),
      coMinimumWitnesses: minimumWitnesses.map((s) => [...s]),
      checkedCount: totalSubsets + 1,
      totalSubsets,
      exhaustive: true,
    };
  return {
    status: "VERIFIED",
    minimumCardinality,
    minimumWitnesses: minimumWitnesses.map((s) => [...s]),
    coMinimumWitnesses: minimumWitnesses.map((s) => [...s]),
    checkedCount: totalSubsets + 1,
    totalSubsets,
    exhaustive: true,
  };
}

export function verifyCandidateWitness(candidateSubset: Subset, declarations: SourcePublication[] = SOURCE_PUBLICATIONS) {  checkSourceIntegrity(declarations);
  const full = [...EXPOSED_DIMENSIONS];
  const target = conclusionForSubset(full);
  return verifyWitness({
    candidateSubset: [...candidateSubset],
    exposedDimensions: full,
    isSufficient: (s) => conclusionForSubset(s) === target,
  });
}

// headlines derived from statistics, never authored. integrity compares
// publication files against these, not against another constant.
export function deriveCanonicalDeclarations(): Array<{ source: string; subset: Subset; declared: string }> {
  return [
    { source: "Lab A", subset: [], declared: conclusionForSubset([]) },
    { source: "Lab B", subset: [...EXPOSED_DIMENSIONS], declared: conclusionForSubset([...EXPOSED_DIMENSIONS]) },
  ];
}
