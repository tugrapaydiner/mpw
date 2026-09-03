import { canonicalBytes, contentHash } from "../engine/mpwProvenance.js";
import {
  normalizeSubset,
  protocolDifferences,
  protocolKey,
  protocolValueEquals,
  validateProtocol,
  validateProtocolSchema,
  type FiniteProtocol,
  type ProtocolSchema,
} from "./protocol.js";
import { exactWitnessSearch, type ExactWitnessSearchResult } from "./search.js";
import {
  simultaneousStratifiedPairedBootstrap,
  type FamilyConfigurationAnalysis,
  type IntervalConclusion,
  type PairedBinaryObservation,
  type SimultaneousPairedBootstrapResult,
} from "./statistics.js";

export const STATIC_FAMILY_KIND = "StaticEvaluationFamilyPackage" as const;
export const STATIC_FAMILY_SCHEMA_VERSION = 1 as const;
export type StaticInferenceMode = "pointwise" | "simultaneous";

export interface StaticBenchmarkItem {
  id: string;
  stratum: string;
}

export interface StaticEvaluationWorld {
  worldId: string;
  protocol: FiniteProtocol;
  outcomes: Array<{ itemId: string; a: 0 | 1; b: 0 | 1 }>;
  declaredConclusion?: IntervalConclusion;
}

export interface StaticEvaluationFamilyPackage {
  kind: typeof STATIC_FAMILY_KIND;
  schemaVersion: typeof STATIC_FAMILY_SCHEMA_VERSION;
  familyId: string;
  title: string;
  benchmark: {
    id: string;
    version: string;
    items: StaticBenchmarkItem[];
  };
  systems: {
    A: { id: string; label: string };
    B: { id: string; label: string };
  };
  protocolSchema: ProtocolSchema;
  worlds: StaticEvaluationWorld[];
  sources: {
    A: string;
    B: string;
  };
  analysis: {
    seed: string;
    replicates: number;
    confidence: number;
  };
  provenance: {
    sourceUrl?: string;
    sourceCommit?: string;
    license?: string;
    notes?: string;
    authenticity: "UNVERIFIED" | "LOCALLY_ATTESTED";
  };
}

export interface StaticLandscapeCoverage {
  differingDimensions: string[];
  expectedHybridWorlds: number;
  observedHybridWorlds: number;
  complete: boolean;
  missing: Array<{ direction: "A_TO_B" | "B_TO_A"; subset: string[]; protocol: FiniteProtocol }>;
}

export interface StaticDirectionResult {
  direction: "A_TO_B" | "B_TO_A";
  status: "RECONCILED" | "NO_CATEGORICAL_DISPUTE" | "INCOMPLETE_PROTOCOL_LANDSCAPE";
  baseConclusion: IntervalConclusion;
  targetConclusion: IntervalConclusion;
  search: ExactWitnessSearchResult | null;
}

export interface StaticFamilyAnalysis {
  kind: "StaticEvaluationFamilyAnalysis";
  version: 1;
  packageHash: string;
  inferenceMode: StaticInferenceMode;
  family: SimultaneousPairedBootstrapResult;
  sourceAnalyses: {
    A: FamilyConfigurationAnalysis;
    B: FamilyConfigurationAnalysis;
  };
  landscapeCoverage: StaticLandscapeCoverage;
  directions: {
    A_TO_B: StaticDirectionResult;
    B_TO_A: StaticDirectionResult;
  };
  trust: {
    contentIdentityVerified: true;
    publisherAuthenticity: "UNVERIFIED" | "LOCALLY_ATTESTED";
    note: string;
  };
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${path} has unexpected property ${key}`);
  }
  for (const key of allowed) {
    if (!(key in value) && !["sourceUrl", "sourceCommit", "license", "notes", "declaredConclusion"].includes(key)) {
      throw new Error(`${path} is missing property ${key}`);
    }
  }
}

function boundedString(value: unknown, path: string, maximum = 500): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum) {
    throw new Error(`${path} must be a non-empty string of at most ${maximum} characters`);
  }
  return value;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function validatePackage(input: unknown): StaticEvaluationFamilyPackage {
  const top = requireRecord(input, "package");
  exactKeys(top, [
    "kind", "schemaVersion", "familyId", "title", "benchmark", "systems",
    "protocolSchema", "worlds", "sources", "analysis", "provenance",
  ], "package");
  if (top.kind !== STATIC_FAMILY_KIND || top.schemaVersion !== STATIC_FAMILY_SCHEMA_VERSION) {
    throw new Error("package kind/schemaVersion is unsupported");
  }
  boundedString(top.familyId, "package.familyId", 200);
  boundedString(top.title, "package.title", 500);
  validateProtocolSchema(top.protocolSchema as ProtocolSchema);

  const benchmark = requireRecord(top.benchmark, "package.benchmark");
  exactKeys(benchmark, ["id", "version", "items"], "package.benchmark");
  boundedString(benchmark.id, "package.benchmark.id", 200);
  boundedString(benchmark.version, "package.benchmark.version", 100);
  if (!Array.isArray(benchmark.items) || benchmark.items.length === 0 || benchmark.items.length > 10_000) {
    throw new Error("package.benchmark.items must contain 1..10000 items");
  }
  const itemIds = new Set<string>();
  for (const [index, raw] of benchmark.items.entries()) {
    const item = requireRecord(raw, `package.benchmark.items[${index}]`);
    exactKeys(item, ["id", "stratum"], `package.benchmark.items[${index}]`);
    const id = boundedString(item.id, `package.benchmark.items[${index}].id`, 300);
    boundedString(item.stratum, `package.benchmark.items[${index}].stratum`, 200);
    if (itemIds.has(id)) throw new Error(`duplicate benchmark item id ${id}`);
    itemIds.add(id);
  }

  const systems = requireRecord(top.systems, "package.systems");
  exactKeys(systems, ["A", "B"], "package.systems");
  for (const side of ["A", "B"] as const) {
    const system = requireRecord(systems[side], `package.systems.${side}`);
    exactKeys(system, ["id", "label"], `package.systems.${side}`);
    boundedString(system.id, `package.systems.${side}.id`, 300);
    boundedString(system.label, `package.systems.${side}.label`, 500);
  }
  if ((systems.A as Record<string, unknown>).id === (systems.B as Record<string, unknown>).id) {
    throw new Error("systems A and B must be distinct");
  }

  if (!Array.isArray(top.worlds) || top.worlds.length < 2 || top.worlds.length > 1024) {
    throw new Error("package.worlds must contain 2..1024 worlds");
  }
  const worldIds = new Set<string>();
  const protocolKeys = new Set<string>();
  for (const [worldIndex, raw] of top.worlds.entries()) {
    const world = requireRecord(raw, `package.worlds[${worldIndex}]`);
    exactKeys(world, ["worldId", "protocol", "outcomes", "declaredConclusion"], `package.worlds[${worldIndex}]`);
    const worldId = boundedString(world.worldId, `package.worlds[${worldIndex}].worldId`, 300);
    if (worldIds.has(worldId)) throw new Error(`duplicate world id ${worldId}`);
    worldIds.add(worldId);
    validateProtocol(world.protocol as FiniteProtocol, top.protocolSchema as ProtocolSchema);
    const key = protocolKey(world.protocol as FiniteProtocol, top.protocolSchema as ProtocolSchema);
    if (protocolKeys.has(key)) throw new Error(`duplicate protocol world ${worldId}`);
    protocolKeys.add(key);
    if (!Array.isArray(world.outcomes) || world.outcomes.length !== itemIds.size) {
      throw new Error(`world ${worldId} must contain exactly ${itemIds.size} outcomes`);
    }
    const seen = new Set<string>();
    for (const [outcomeIndex, rawOutcome] of world.outcomes.entries()) {
      const outcome = requireRecord(rawOutcome, `world ${worldId} outcome ${outcomeIndex}`);
      exactKeys(outcome, ["itemId", "a", "b"], `world ${worldId} outcome ${outcomeIndex}`);
      const itemId = boundedString(outcome.itemId, `world ${worldId} outcome ${outcomeIndex}.itemId`, 300);
      if (!itemIds.has(itemId)) throw new Error(`world ${worldId} has unknown item ${itemId}`);
      if (seen.has(itemId)) throw new Error(`world ${worldId} duplicates item ${itemId}`);
      seen.add(itemId);
      if ((outcome.a !== 0 && outcome.a !== 1) || (outcome.b !== 0 && outcome.b !== 1)) {
        throw new Error(`world ${worldId} outcome ${itemId} must have binary a/b`);
      }
    }
    if (world.declaredConclusion !== undefined &&
        !["MODEL_A", "MODEL_B", "INCONCLUSIVE"].includes(String(world.declaredConclusion))) {
      throw new Error(`world ${worldId} has invalid declaredConclusion`);
    }
  }

  const sources = requireRecord(top.sources, "package.sources");
  exactKeys(sources, ["A", "B"], "package.sources");
  const sourceA = boundedString(sources.A, "package.sources.A", 300);
  const sourceB = boundedString(sources.B, "package.sources.B", 300);
  if (!worldIds.has(sourceA) || !worldIds.has(sourceB) || sourceA === sourceB) {
    throw new Error("package.sources must name two distinct existing worlds");
  }

  const analysis = requireRecord(top.analysis, "package.analysis");
  exactKeys(analysis, ["seed", "replicates", "confidence"], "package.analysis");
  boundedString(analysis.seed, "package.analysis.seed", 300);
  if (!Number.isSafeInteger(analysis.replicates) || Number(analysis.replicates) < 100 || Number(analysis.replicates) > 1_000_000) {
    throw new Error("package.analysis.replicates must be an integer in [100,1000000]");
  }
  if (!(typeof analysis.confidence === "number" && analysis.confidence > 0 && analysis.confidence < 1)) {
    throw new Error("package.analysis.confidence must be in (0,1)");
  }

  const provenance = requireRecord(top.provenance, "package.provenance");
  exactKeys(provenance, ["sourceUrl", "sourceCommit", "license", "notes", "authenticity"], "package.provenance");
  for (const key of ["sourceUrl", "sourceCommit", "license", "notes"] as const) {
    if (provenance[key] !== undefined) boundedString(provenance[key], `package.provenance.${key}`, 2_000);
  }
  if (provenance.authenticity !== "UNVERIFIED" && provenance.authenticity !== "LOCALLY_ATTESTED") {
    throw new Error("package.provenance.authenticity is invalid");
  }
  canonicalBytes(top);
  return clone(top) as unknown as StaticEvaluationFamilyPackage;
}

function hybrid(base: FiniteProtocol, source: FiniteProtocol, subset: readonly string[]): FiniteProtocol {
  const chosen = new Set(subset);
  return Object.fromEntries(
    Object.keys(base).sort(compare).map((key) => [key, chosen.has(key) ? source[key] : base[key]])
  );
}

function observationFor(
  world: StaticEvaluationWorld,
  benchmark: StaticBenchmarkItem[]
): PairedBinaryObservation[] {
  const stratumById = new Map(benchmark.map((item) => [item.id, item.stratum]));
  return world.outcomes
    .map((outcome) => ({
      id: outcome.itemId,
      stratum: stratumById.get(outcome.itemId)!,
      a: outcome.a,
      b: outcome.b,
    }))
    .sort((left, right) => compare(left.id, right.id));
}

export function analyzeStaticEvaluationFamily(
  input: unknown,
  inferenceMode: StaticInferenceMode = "simultaneous"
): StaticFamilyAnalysis {
  if (inferenceMode !== "pointwise" && inferenceMode !== "simultaneous") {
    throw new Error("inferenceMode must be pointwise or simultaneous");
  }
  const pkg = validatePackage(input);
  const family = simultaneousStratifiedPairedBootstrap(
    pkg.worlds.map((world) => ({
      id: world.worldId,
      outcomes: observationFor(world, pkg.benchmark.items),
    })),
    pkg.analysis
  );
  const analysisByWorld = new Map(family.configurations.map((analysis) => [analysis.id, analysis]));
  for (const world of pkg.worlds) {
    const analysis = analysisByWorld.get(world.worldId);
    if (!analysis) throw new Error(`analysis omitted world ${world.worldId}`);
    if (world.declaredConclusion !== undefined && world.declaredConclusion !== analysis[inferenceMode].conclusion) {
      throw new Error(
        `SOURCE_REPLAY_MISMATCH: ${world.worldId} declared ${world.declaredConclusion} but recomputed ${analysis[inferenceMode].conclusion}`
      );
    }
  }
  const sourceWorldA = pkg.worlds.find((world) => world.worldId === pkg.sources.A)!;
  const sourceWorldB = pkg.worlds.find((world) => world.worldId === pkg.sources.B)!;
  const sourceAnalysisA = analysisByWorld.get(sourceWorldA.worldId)!;
  const sourceAnalysisB = analysisByWorld.get(sourceWorldB.worldId)!;
  const differences = protocolDifferences(sourceWorldA.protocol, sourceWorldB.protocol, pkg.protocolSchema);
  const worldByProtocol = new Map(
    pkg.worlds.map((world) => [protocolKey(world.protocol, pkg.protocolSchema), world])
  );
  const missing: StaticLandscapeCoverage["missing"] = [];
  const seenMissing = new Set<string>();
  const subsets: string[][] = [];
  for (let mask = 0; mask < 2 ** differences.length; mask++) {
    subsets.push(differences.filter((_, index) => (mask & (1 << index)) !== 0));
  }
  for (const direction of ["A_TO_B", "B_TO_A"] as const) {
    const base = direction === "A_TO_B" ? sourceWorldA.protocol : sourceWorldB.protocol;
    const source = direction === "A_TO_B" ? sourceWorldB.protocol : sourceWorldA.protocol;
    for (const subset of subsets) {
      const protocol = hybrid(base, source, subset);
      const key = protocolKey(protocol, pkg.protocolSchema);
      if (!worldByProtocol.has(key) && !seenMissing.has(key)) {
        seenMissing.add(key);
        missing.push({ direction, subset: [...subset].sort(compare), protocol });
      }
    }
  }
  const complete = missing.length === 0;

  const directionResult = (direction: "A_TO_B" | "B_TO_A"): StaticDirectionResult => {
    const baseWorld = direction === "A_TO_B" ? sourceWorldA : sourceWorldB;
    const targetWorld = direction === "A_TO_B" ? sourceWorldB : sourceWorldA;
    const baseConclusion = analysisByWorld.get(baseWorld.worldId)![inferenceMode].conclusion;
    const targetConclusion = analysisByWorld.get(targetWorld.worldId)![inferenceMode].conclusion;
    if (baseConclusion === targetConclusion) {
      return { direction, status: "NO_CATEGORICAL_DISPUTE", baseConclusion, targetConclusion, search: null };
    }
    if (!complete) {
      return { direction, status: "INCOMPLETE_PROTOCOL_LANDSCAPE", baseConclusion, targetConclusion, search: null };
    }
    const search = exactWitnessSearch({
      dimensions: differences,
      mode: "landscape",
      maxEvaluations: 2 ** differences.length,
      isSufficient: (candidate) => {
        const protocol = hybrid(baseWorld.protocol, targetWorld.protocol, normalizeSubset(candidate, differences));
        const world = worldByProtocol.get(protocolKey(protocol, pkg.protocolSchema));
        if (!world) throw new Error("complete landscape invariant violated");
        return analysisByWorld.get(world.worldId)![inferenceMode].conclusion === targetConclusion;
      },
    });
    return { direction, status: "RECONCILED", baseConclusion, targetConclusion, search };
  };

  return {
    kind: "StaticEvaluationFamilyAnalysis",
    version: 1,
    packageHash: contentHash(pkg),
    inferenceMode,
    family,
    sourceAnalyses: { A: sourceAnalysisA, B: sourceAnalysisB },
    landscapeCoverage: {
      differingDimensions: differences,
      expectedHybridWorlds: 2 ** differences.length,
      observedHybridWorlds: 2 ** differences.length - missing.length,
      complete,
      missing,
    },
    directions: {
      A_TO_B: directionResult("A_TO_B"),
      B_TO_A: directionResult("B_TO_A"),
    },
    trust: {
      contentIdentityVerified: true,
      publisherAuthenticity: pkg.provenance.authenticity,
      note: "Content identity and scientific replay do not authenticate the publisher or prove that upstream measurements are truthful.",
    },
  };
}

export function staticPackageHash(input: unknown): string {
  return contentHash(validatePackage(input));
}

export function staticProtocolsDiffer(input: unknown): string[] {
  const pkg = validatePackage(input);
  const a = pkg.worlds.find((world) => world.worldId === pkg.sources.A)!;
  const b = pkg.worlds.find((world) => world.worldId === pkg.sources.B)!;
  return pkg.protocolSchema.coordinates
    .map((coordinate) => coordinate.name)
    .filter((name) => !protocolValueEquals(a.protocol[name], b.protocol[name]));
}
