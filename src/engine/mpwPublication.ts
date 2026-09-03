// finalized publication bundles. the core carries metadata only, never any
// hash of itself. the envelope carries the hashes; manifestHash covers the
// whole envelope EXCEPT itself (nonrecursive boundary, see PROVENANCE_SPEC).
import {
  BENCHMARK_ID,
  BENCHMARK_VERSION,
  MODELS,
  STRATA,
  NUM_ITEMS,
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  buildBenchmarkItems,
} from "./mpwFixture.js";
import { SIM_SEED, SIM_VERSION, simulateItem } from "./mpwSimulator.js";
import type { ItemReceipt } from "./mpwSimulator.js";
import {
  BOOT_SEED,
  BOOT_REPLICATES,
  BOOT_ALGO_ID,
  BOOT_ALGO_VERSION,
  analyzeEvidence,
} from "./mpwCore.js";
import {
  contentHash,
  hashProtocol,
  hashBenchmark,
  hashEvidenceBundle,
  hashManifestBody,
} from "./mpwProvenance.js";
import type { JsonValue } from "./mpwManifest.js";
import type { Protocol } from "../types/index.js";

export const BUNDLE_KIND = "FinalizedPublicationBundle";
export const BUNDLE_SCHEMA_VERSION = 1;

export interface PublicationManifestCore {
  kind: "PublicationManifestCore";
  schemaVersion: 1;
  publicationId: string;
  publisher: string;
  benchmark: { id: string; version: number };
  models: string[];
  protocol: Record<string, JsonValue>;
  simulator: { seed: string; version: string };
  evaluator: { seed: string; replicates: number; algorithm: string; version: number };
  declared: {
    scoreA: number;
    scoreB: number;
    delta: number;
    ciLow: number;
    ciHigh: number;
    conclusion: string;
    coverage: number;
  };
  sourceIntegrity: "OK";
}

export interface FinalizedPublicationBundle {
  kind: "FinalizedPublicationBundle";
  core: PublicationManifestCore;
  evidence: { receiptCount: number; itemCoverage: number; evidenceHash: string };
  hashes: { protocolHash: string; benchmarkHash: string; evidenceHash: string; manifestBodyHash: string };
  manifestHash: string;
}

export interface BundleCheck {
  check: string;
  pass: boolean;
  detail: string;
}

export interface BundleError extends Error {
  code: "BUNDLE_INVALID";
  checks: BundleCheck[];
}

function bundleFail(checks: BundleCheck[], detail: string): never {
  const err = new Error(`BUNDLE_INVALID: ${detail}`) as BundleError;
  err.code = "BUNDLE_INVALID";
  err.checks = checks;
  throw err;
}

export type LabSource = "Lab A" | "Lab B";

const subsetFor = (source: LabSource): string[] =>
  source === "Lab A" ? [] : [...EXPOSED_DIMENSIONS];
const protocolFor = (source: LabSource): Protocol =>
  (source === "Lab A" ? { ...LAB_A_PROTOCOL } : { ...LAB_B_PROTOCOL }) as Protocol;
const publicationIdFor = (source: LabSource): string =>
  source === "Lab A" ? "mpw-pub-lab-a/1" : "mpw-pub-lab-b/1";

interface BuildInputs {
  source: LabSource;
  items?: ReturnType<typeof buildBenchmarkItems>;
  flipReceipt?: (receipt: ItemReceipt) => ItemReceipt;
}

export interface EvidenceSet {
  receipts: ItemReceipt[];
  outcomes: Array<{ id: string; stratum: string; a: 0 | 1; b: 0 | 1; diff: number }>;
  summary: {
    scoreA: number;
    scoreB: number;
    delta: number;
    ciLow: number;
    ciHigh: number;
    conclusion: "MODEL_A" | "MODEL_B" | "INCONCLUSIVE";
    coverage: number;
  };
  evidenceHash: string;
}

// full receipt set + stats + identity hash for one protocol world.
// shared by publication finalizing and certificate witness experiments.
export function evidenceForProtocol(
  protocol: Protocol,
  subset: string[],
  opts: { items?: ReturnType<typeof buildBenchmarkItems>; flipReceipt?: (receipt: ItemReceipt) => ItemReceipt } = {}
): EvidenceSet {
  const benchItems = opts.items ?? buildBenchmarkItems();
  const receipts: ItemReceipt[] = [];
  const outcomes: EvidenceSet["outcomes"] = [];
  for (const it of benchItems) {
    let rA = simulateItem("MODEL_A", it, protocol, SIM_SEED);
    let rB = simulateItem("MODEL_B", it, protocol, SIM_SEED);
    if (opts.flipReceipt) {
      rA = opts.flipReceipt(rA);
      rB = opts.flipReceipt(rB);
    }
    receipts.push(rA, rB);
    const a = (rA.finalCorrect ? 1 : 0) as 0 | 1;
    const b = (rB.finalCorrect ? 1 : 0) as 0 | 1;
    outcomes.push({ id: it.id, stratum: it.stratum, a, b, diff: a - b });
  }
  const protoJson = { ...protocol } as unknown as Record<string, JsonValue>;
  const a = analyzeEvidence(outcomes);
  const summary: EvidenceSet["summary"] = {
    scoreA: a.scoreA,
    scoreB: a.scoreB,
    delta: a.delta,
    ciLow: a.ciLow,
    ciHigh: a.ciHigh,
    conclusion: a.conclusion,
    coverage: a.n,
  };
  const evidenceHash = hashEvidenceBundle({
    protocol: protoJson,
    subset,
    receipts: receipts as unknown as Array<Record<string, JsonValue>>,
    summary: summary as unknown as Record<string, JsonValue>,
  });
  return { receipts, outcomes, summary, evidenceHash };
}

// canonical build path: finalizePublication(source). overrides exist so tamper
// tests can mint bundles whose hashes are authentic for tampered inputs;
// the loader always regenerates honestly, so those bundles fail there.
export function buildFinalizedBundle({ source, items, flipReceipt }: BuildInputs): FinalizedPublicationBundle {
  const subset = subsetFor(source);
  const protocol = protocolFor(source);
  const benchItems = items ?? buildBenchmarkItems();
  const { receipts, summary, evidenceHash } = evidenceForProtocol(protocol, subset, { items: benchItems, flipReceipt });
  const protoJson = { ...protocol } as unknown as Record<string, JsonValue>;
  const benchmarkHash = hashBenchmark({
    id: BENCHMARK_ID,
    version: BENCHMARK_VERSION,
    models: [...MODELS],
    strata: STRATA.map((s) => ({ ...s })),
    items: benchItems.map((i) => ({ ...i })) as unknown as Array<Record<string, JsonValue>>,
  });
  const core: PublicationManifestCore = {
    kind: "PublicationManifestCore",
    schemaVersion: 1,
    publicationId: publicationIdFor(source),
    publisher: source,
    benchmark: { id: BENCHMARK_ID, version: BENCHMARK_VERSION },
    models: [...MODELS],
    protocol: protoJson,
    simulator: { seed: SIM_SEED, version: SIM_VERSION },
    evaluator: { seed: BOOT_SEED, replicates: BOOT_REPLICATES, algorithm: BOOT_ALGO_ID, version: BOOT_ALGO_VERSION },
    declared: { ...summary, conclusion: String(summary.conclusion) },
    sourceIntegrity: "OK",
  };
  const hashes = {
    protocolHash: hashProtocol(protoJson),
    benchmarkHash,
    evidenceHash,
    manifestBodyHash: hashManifestBody(core as unknown as Record<string, JsonValue>),
  };
  const manifestHash = contentHash({
    core: core as unknown as JsonValue,
    evidence: {
      receiptCount: receipts.length,
      itemCoverage: new Set(receipts.map((r) => String(r.id))).size,
      evidenceHash,
    } as unknown as JsonValue,
    hashes: hashes as unknown as JsonValue,
  });
  return {
    kind: BUNDLE_KIND,
    core,
    evidence: {
      receiptCount: receipts.length,
      itemCoverage: new Set(receipts.map((r) => String(r.id))).size,
      evidenceHash,
    },
    hashes,
    manifestHash,
  };
}

export function finalizePublication(source: LabSource): FinalizedPublicationBundle {
  return buildFinalizedBundle({ source });
}

const exactKeys = (obj: unknown, want: string[], where: string, checks: BundleCheck[]): Record<string, unknown> => {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    checks.push({ check: `${where}.shape`, pass: false, detail: "not an object" });
    bundleFail(checks, `${where} not an object`);
  }
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...want].sort())) {
    checks.push({ check: `${where}.keys`, pass: false, detail: `got [${keys}]` });
    bundleFail(checks, `${where} keys mismatch`);
  }
  checks.push({ check: `${where}.keys`, pass: true, detail: "exact" });
  return rec;
};

// load path: validate, recompute every hash from live engine inputs,
// regenerate all receipts, recompute the science, compare exactly.
// valid only if everything passes.
export function verifyFinalizedBundle(bundle: unknown): { status: "VALID"; publicationId: string; checks: BundleCheck[] } {
  const checks: BundleCheck[] = [];
  const top = exactKeys(bundle, ["kind", "core", "evidence", "hashes", "manifestHash"], "bundle", checks);
  if (top.kind !== BUNDLE_KIND) {
    checks.push({ check: "bundle.kind", pass: false, detail: String(top.kind) });
    bundleFail(checks, "unknown bundle kind");
  }
  const core = exactKeys(
    top.core,
    ["kind", "schemaVersion", "publicationId", "publisher", "benchmark", "models", "protocol", "simulator", "evaluator", "declared", "sourceIntegrity"],
    "core",
    checks
  );
  if (core.kind !== "PublicationManifestCore" || core.schemaVersion !== BUNDLE_SCHEMA_VERSION) {
    checks.push({ check: "core.version", pass: false, detail: `${String(core.kind)}/${String(core.schemaVersion)}` });
    bundleFail(checks, "unknown core kind/version");
  }
  if (core.sourceIntegrity !== "OK") {
    checks.push({ check: "core.integrity", pass: false, detail: String(core.sourceIntegrity) });
    bundleFail(checks, "source did not declare integrity OK");
  }
  const bench = exactKeys(core.benchmark, ["id", "version"], "core.benchmark", checks);
  if (bench.id !== BENCHMARK_ID || bench.version !== BENCHMARK_VERSION) {
    checks.push({ check: "core.benchmark.id", pass: false, detail: `${String(bench.id)}/${String(bench.version)}` });
    bundleFail(checks, "wrong benchmark id/version");
  }
  if (JSON.stringify([...(core.models as string[])].sort()) !== JSON.stringify([...MODELS].sort())) {
    checks.push({ check: "core.models", pass: false, detail: "model set mismatch" });
    bundleFail(checks, "model identities mismatch");
  }
  const sim = exactKeys(core.simulator, ["seed", "version"], "core.simulator", checks);
  if (sim.seed !== SIM_SEED || sim.version !== SIM_VERSION) {
    checks.push({ check: "core.simulator", pass: false, detail: "simulator version mismatch" });
    bundleFail(checks, "simulator version mismatch");
  }
  const ev = exactKeys(core.evaluator, ["seed", "replicates", "algorithm", "version"], "core.evaluator", checks);
  if (ev.seed !== BOOT_SEED || ev.replicates !== BOOT_REPLICATES || ev.algorithm !== BOOT_ALGO_ID || ev.version !== BOOT_ALGO_VERSION) {
    checks.push({ check: "core.evaluator", pass: false, detail: "evaluator version mismatch" });
    bundleFail(checks, "evaluator version mismatch");
  }
  const protocol = core.protocol as Record<string, JsonValue>;
  const hashes = exactKeys(top.hashes, ["protocolHash", "benchmarkHash", "evidenceHash", "manifestBodyHash"], "hashes", checks);
  const evidence = exactKeys(top.evidence, ["receiptCount", "itemCoverage", "evidenceHash"], "evidence", checks);

  const expectHash = (name: string, want: unknown, got: string): void => {
    if (want !== got) {
      checks.push({ check: `hash.${name}`, pass: false, detail: `declared ${String(got).slice(0, 12)} != recomputed ${String(want).slice(0, 12)}` });
      bundleFail(checks, `${name} mismatch`);
    }
    checks.push({ check: `hash.${name}`, pass: true, detail: String(want).slice(0, 12) });
  };

  // hash boundary: protocol/benchmark/manifest-body recomputed from live
  // inputs; manifestHash covers {core, evidence, hashes}, never itself.
  expectHash("protocolHash", hashProtocol(protocol), hashes.protocolHash as string);
  const liveItems = buildBenchmarkItems();
  expectHash(
    "benchmarkHash",
    hashBenchmark({
      id: BENCHMARK_ID,
      version: BENCHMARK_VERSION,
      models: [...MODELS],
      strata: STRATA.map((s) => ({ ...s })),
      items: liveItems.map((i) => ({ ...i })) as unknown as Array<Record<string, JsonValue>>,
    }),
    hashes.benchmarkHash as string
  );
  expectHash("manifestBodyHash", hashManifestBody(core as unknown as Record<string, JsonValue>), hashes.manifestBodyHash as string);
  expectHash(
    "manifestHash",
    contentHash({
      core: core as unknown as JsonValue,
      evidence: evidence as unknown as JsonValue,
      hashes: hashes as unknown as JsonValue,
    }),
    top.manifestHash as string
  );

  // evidence: regenerate every receipt, require 100% item x model coverage.
  const liveReceipts: ItemReceipt[] = [];
  const liveOutcomes: Array<{ id: string; stratum: string; a: 0 | 1; b: 0 | 1; diff: number }> = [];
  for (const it of liveItems) {
    const rA = simulateItem("MODEL_A", it, protocol as never, SIM_SEED);
    const rB = simulateItem("MODEL_B", it, protocol as never, SIM_SEED);
    liveReceipts.push(rA, rB);
    const a = (rA.finalCorrect ? 1 : 0) as 0 | 1;
    const b = (rB.finalCorrect ? 1 : 0) as 0 | 1;
    liveOutcomes.push({ id: it.id, stratum: it.stratum, a, b, diff: a - b });
  }
  const liveIds = new Set(liveReceipts.map((r) => r.id));
  const universeIds = new Set(liveItems.map((i) => i.id));
  if (
    liveReceipts.length !== NUM_ITEMS * 2 ||
    liveIds.size !== NUM_ITEMS ||
    [...universeIds].some((id) => !liveIds.has(id))
  ) {
    checks.push({ check: "evidence.coverage", pass: false, detail: "regenerated coverage incomplete" });
    bundleFail(checks, "evidence coverage incomplete");
  }
  if (evidence.receiptCount !== liveReceipts.length || evidence.itemCoverage !== liveIds.size) {
    checks.push({
      check: "evidence.coverage",
      pass: false,
      detail: `declared ${String(evidence.receiptCount)}/${String(evidence.itemCoverage)} != live ${liveReceipts.length}/${liveIds.size}`,
    });
    bundleFail(checks, "evidence coverage mismatch");
  }
  checks.push({ check: "evidence.coverage", pass: true, detail: `${liveReceipts.length} receipts, ${liveIds.size} items x 2 models` });

  const live = analyzeEvidence(liveOutcomes);
  const liveSummary = {
    scoreA: live.scoreA,
    scoreB: live.scoreB,
    delta: live.delta,
    ciLow: live.ciLow,
    ciHigh: live.ciHigh,
    conclusion: live.conclusion,
    coverage: live.n,
  };
  // the subset is determined by the protocol itself: only the two lab
  // protocols are publishable worlds. anything else is unpublishable.
  const labAJson = { ...LAB_A_PROTOCOL } as unknown as Record<string, JsonValue>;
  const labBJson = { ...LAB_B_PROTOCOL } as unknown as Record<string, JsonValue>;
  const subset = contentHash(protocol) === contentHash(labAJson) ? [] : contentHash(protocol) === contentHash(labBJson) ? [...EXPOSED_DIMENSIONS] : null;
  if (subset === null) {
    checks.push({ check: "core.protocol.world", pass: false, detail: "protocol matches neither lab world" });
    bundleFail(checks, "protocol matches neither lab world");
  }
  expectHash(
    "evidenceHash",
    hashEvidenceBundle({
      protocol,
      subset,
      receipts: liveReceipts as unknown as Array<Record<string, JsonValue>>,
      summary: liveSummary as unknown as Record<string, JsonValue>,
    }),
    (evidence.evidenceHash as string)
  );
  if (hashes.evidenceHash !== evidence.evidenceHash) {
    checks.push({ check: "evidence.hashlink", pass: false, detail: "envelope/evidence section disagree" });
    bundleFail(checks, "evidence hash link broken");
  }

  // declared science, exact values, never rounded.
  const declared = exactKeys(core.declared as unknown, ["scoreA", "scoreB", "delta", "ciLow", "ciHigh", "conclusion", "coverage"], "core.declared", checks);
  for (const [k, v] of Object.entries(liveSummary)) {
    if ((declared as Record<string, unknown>)[k] !== v) {
      checks.push({ check: `declared.${k}`, pass: false, detail: `declared ${String((declared as Record<string, unknown>)[k])} != recomputed ${String(v)}` });
      bundleFail(checks, `declared ${k} mismatch`);
    }
  }
  checks.push({ check: "declared.science", pass: true, detail: `conclusion ${live.conclusion}, coverage ${live.n}` });

  return { status: "VALID", publicationId: String(core.publicationId), checks };
}
