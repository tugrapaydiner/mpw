import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  exactTwoSidedMcNemarP,
  simultaneousStratifiedPairedBootstrap,
  type FamilyConfigurationAnalysis,
  type PairedBinaryObservation,
} from "../src/research/statistics.js";
import { exactWitnessSearch } from "../src/research/search.js";
import { canonicalBytes, contentHash } from "../src/engine/mpwProvenance.js";

const UPSTREAM_REPOSITORY = "NikolaTesla-007/fragility-grid";
const UPSTREAM_COMMIT = "3f51444ead009d8351de1b6b19bf901c4da3d420";
const ANALYSIS_PLAN_COMMIT = "73c2ea48c66a6db386641ac510fcad1d26202c80";
const RAW_ROOT = `https://raw.githubusercontent.com/${UPSTREAM_REPOSITORY}/${UPSTREAM_COMMIT}`;
const SPLIT_SALT = "mpw-fragility-grid-split-v1";
const VALIDATION_SEED = "mpw-fragility-grid-validation-v1";
const VALIDATION_REPLICATES = 10_000;
const TOP_K = 5;
const MIN_DISCOVERY_ENDPOINT_EFFECT = 0.005;
const MAX_DISCOVERY_ENDPOINT_P = 0.05;

const MODELS = [
  "gemma4-12b",
  "gemma4-26b-a4b",
  "gemma4-31b",
  "gemma4-e4b",
  "llama3.1-8b",
  "llama3.2-3b",
  "llama3.3-70b",
  "mixtral-8x7b",
  "qwen3-14b",
  "qwen3-30b-a3b",
  "qwen3-32b",
  "qwen3-4b",
] as const;
const BENCHMARKS = ["arc", "hellaswag", "mmlu", "truthfulqa"] as const;
const EXPECTED_COUNTS: Record<(typeof BENCHMARKS)[number], number> = {
  arc: 1000,
  hellaswag: 1000,
  mmlu: 1000,
  truthfulqa: 679,
};

const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

type Binary = 0 | 1;
type ModelId = (typeof MODELS)[number];
type BenchmarkId = (typeof BENCHMARKS)[number];
type Split = "discovery" | "validation";

interface ConfigLegendEntry {
  key: string;
  scoring: "generation" | "loglikelihood";
  fmt: string;
  perm_index: number | null;
  perm: number[] | null;
}

interface SourceFileDigest {
  path: string;
  sha256: string;
  bytes: number;
  records: number | null;
}

interface UpstreamRow {
  benchmark: unknown;
  item_id: unknown;
  model: unknown;
  bits: unknown;
}

interface RetainedItem {
  id: string;
  sourceItemId: string;
  benchmark: BenchmarkId;
  split: Split;
}

interface DiscoveryCell {
  config: string;
  delta: number;
  scoreA: number;
  scoreB: number;
  aOnly: number;
  bOnly: number;
  exactTwoSidedP: number;
  n: number;
}

interface DiscoveryCandidate {
  id: string;
  modelA: ModelId;
  modelB: ModelId;
  base: ConfigLegendEntry;
  target: ConfigLegendEntry;
  worlds: {
    base: DiscoveryCell;
    formatOnly: DiscoveryCell;
    permutationOnly: DiscoveryCell;
    target: DiscoveryCell;
  };
  rankMetrics: {
    minimumEndpointEffect: number;
    minimumSingletonBuffer: number;
    targetAbsoluteEffect: number;
  };
}

interface ValidationWorld {
  role: "base" | "formatOnly" | "permutationOnly" | "target";
  config: string;
  analysis: FamilyConfigurationAnalysis;
}

interface ValidationCandidate {
  discoveryRank: number;
  discovery: DiscoveryCandidate;
  validation: {
    worlds: ValidationWorld[];
    targetConclusion: string;
    search: ReturnType<typeof exactWitnessSearch>;
    validatesUniqueSizeTwoWitness: boolean;
    failureReasons: string[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asBinary(value: unknown, where: string): Binary {
  if (value !== 0 && value !== 1) throw new Error(`${where} must be 0 or 1`);
  return value;
}

function parseModel(value: unknown, where: string): ModelId {
  if (typeof value !== "string" || !MODELS.includes(value as ModelId)) {
    throw new Error(`${where} has unknown model ${String(value)}`);
  }
  return value as ModelId;
}

function parseBenchmark(value: unknown, where: string): BenchmarkId {
  if (typeof value !== "string" || !BENCHMARKS.includes(value as BenchmarkId)) {
    throw new Error(`${where} has unknown benchmark ${String(value)}`);
  }
  return value as BenchmarkId;
}

async function fetchText(path: string): Promise<{ text: string; digest: SourceFileDigest }> {
  const response = await fetch(`${RAW_ROOT}/${path}`, {
    headers: { "user-agent": "mpw-external-case-study/1" },
  });
  if (!response.ok) throw new Error(`upstream download failed ${response.status}: ${path}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    text: new TextDecoder().decode(bytes),
    digest: { path, sha256: sha256(bytes), bytes: bytes.length, records: null },
  };
}

function parseLegend(raw: string): ConfigLegendEntry[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) throw new Error("configuration legend must be an object");
  const entries: ConfigLegendEntry[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "_meta") continue;
    if (!isRecord(value)) throw new Error(`configuration ${key} must be an object`);
    const scoring = value.scoring;
    const fmt = value.fmt;
    const permIndex = value.perm_index;
    const perm = value.perm;
    if (scoring !== "generation" && scoring !== "loglikelihood") {
      throw new Error(`configuration ${key} has unknown scoring ${String(scoring)}`);
    }
    if (typeof fmt !== "string" || fmt.length === 0) throw new Error(`configuration ${key} lacks format`);
    if (permIndex !== null && (!Number.isInteger(permIndex) || (permIndex as number) < 0)) {
      throw new Error(`configuration ${key} has invalid permutation index`);
    }
    if (perm !== null && (!Array.isArray(perm) || perm.some((entry) => !Number.isInteger(entry)))) {
      throw new Error(`configuration ${key} has invalid permutation`);
    }
    if (value.key !== key) throw new Error(`configuration ${key} does not self-identify`);
    entries.push({
      key,
      scoring,
      fmt,
      perm_index: permIndex as number | null,
      perm: perm as number[] | null,
    });
  }
  entries.sort((left, right) => compare(left.key, right.key));
  const generation = entries.filter((entry) => entry.scoring === "generation");
  const likelihood = entries.filter((entry) => entry.scoring === "loglikelihood");
  const formats = [...new Set(generation.map((entry) => entry.fmt))].sort(compare);
  const permutations = [...new Set(generation.map((entry) => entry.perm_index))].sort(
    (left, right) => Number(left) - Number(right)
  );
  if (entries.length !== 26 || generation.length !== 24 || likelihood.length !== 2) {
    throw new Error(`unexpected configuration counts ${entries.length}/${generation.length}/${likelihood.length}`);
  }
  if (formats.length !== 4 || permutations.length !== 6 || permutations.some((value) => value === null)) {
    throw new Error("generation configurations are not the declared 4x6 grid");
  }
  for (const format of formats) {
    for (const permutation of permutations) {
      const count = generation.filter(
        (entry) => entry.fmt === format && entry.perm_index === permutation
      ).length;
      if (count !== 1) throw new Error(`missing or duplicate generation cell ${format}/${String(permutation)}`);
    }
  }
  return entries;
}

function parseRecords({
  text,
  model,
  benchmark,
  generationConfigs,
  allConfigs,
}: {
  text: string;
  model: ModelId;
  benchmark: BenchmarkId;
  generationConfigs: readonly string[];
  allConfigs: readonly string[];
}): Map<string, Record<string, Binary>> {
  const out = new Map<string, Record<string, Binary>>();
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length !== EXPECTED_COUNTS[benchmark]) {
    throw new Error(`${benchmark}/${model} has ${lines.length} rows; expected ${EXPECTED_COUNTS[benchmark]}`);
  }
  for (const [index, line] of lines.entries()) {
    const parsed = JSON.parse(line) as UpstreamRow;
    const where = `${benchmark}/${model} line ${index + 1}`;
    if (parseBenchmark(parsed.benchmark, where) !== benchmark) throw new Error(`${where} benchmark mismatch`);
    if (parseModel(parsed.model, where) !== model) throw new Error(`${where} model mismatch`);
    if (typeof parsed.item_id !== "string" || parsed.item_id.length === 0) throw new Error(`${where} missing item_id`);
    if (!isRecord(parsed.bits)) throw new Error(`${where} bits must be an object`);
    const bitKeys = Object.keys(parsed.bits).sort(compare);
    if (canonicalBytes(bitKeys) !== canonicalBytes([...allConfigs].sort(compare))) {
      throw new Error(`${where} configuration-bit keys differ from the pinned legend`);
    }
    const bits: Record<string, Binary> = {};
    for (const config of generationConfigs) bits[config] = asBinary(parsed.bits[config], `${where} bits.${config}`);
    const id = parsed.item_id;
    if (out.has(id)) throw new Error(`duplicate item ${benchmark}:${id} in ${benchmark}/${model}`);
    out.set(id, bits);
  }
  return out;
}

function splitItems(idsByBenchmark: ReadonlyMap<BenchmarkId, string[]>): RetainedItem[] {
  const items: RetainedItem[] = [];
  for (const benchmark of BENCHMARKS) {
    const ids = idsByBenchmark.get(benchmark);
    if (!ids || ids.length !== EXPECTED_COUNTS[benchmark]) {
      throw new Error(`split input for ${benchmark} is incomplete`);
    }
    const ordered = [...ids].sort((left, right) => {
      const leftHash = sha256(`${SPLIT_SALT}|${benchmark}|${left}`);
      const rightHash = sha256(`${SPLIT_SALT}|${benchmark}|${right}`);
      return compare(leftHash, rightHash) || compare(left, right);
    });
    const discoveryCount = Math.floor(ordered.length / 2);
    ordered.forEach((sourceItemId, index) => {
      items.push({
        id: `${benchmark}:${sourceItemId}`,
        sourceItemId,
        benchmark,
        split: index < discoveryCount ? "discovery" : "validation",
      });
    });
  }
  return items.sort((left, right) => compare(left.id, right.id));
}

function summarizeComparison({
  items,
  modelA,
  modelB,
  config,
  data,
}: {
  items: readonly RetainedItem[];
  modelA: ModelId;
  modelB: ModelId;
  config: string;
  data: ReadonlyMap<ModelId, ReadonlyMap<string, Record<string, Binary>>>;
}): DiscoveryCell {
  const aData = data.get(modelA);
  const bData = data.get(modelB);
  if (!aData || !bData) throw new Error(`missing model data for ${modelA}/${modelB}`);
  let scoreA = 0;
  let scoreB = 0;
  let aOnly = 0;
  let bOnly = 0;
  for (const item of items) {
    const a = aData.get(item.id)?.[config];
    const b = bData.get(item.id)?.[config];
    if (a === undefined || b === undefined) throw new Error(`missing ${config} outcome for ${item.id}`);
    scoreA += a;
    scoreB += b;
    if (a === 1 && b === 0) aOnly++;
    if (a === 0 && b === 1) bOnly++;
  }
  return {
    config,
    delta: (scoreA - scoreB) / items.length,
    scoreA: scoreA / items.length,
    scoreB: scoreB / items.length,
    aOnly,
    bOnly,
    exactTwoSidedP: exactTwoSidedMcNemarP(aOnly, bOnly),
    n: items.length,
  };
}

function sign(value: number): -1 | 0 | 1 {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

function candidateId(
  modelA: ModelId,
  modelB: ModelId,
  base: ConfigLegendEntry,
  target: ConfigLegendEntry
): string {
  return `${modelA}__${modelB}__${base.key}__to__${target.key}`;
}

function findDiscoveryCandidates({
  discoveryItems,
  generation,
  data,
}: {
  discoveryItems: readonly RetainedItem[];
  generation: readonly ConfigLegendEntry[];
  data: ReadonlyMap<ModelId, ReadonlyMap<string, Record<string, Binary>>>;
}): DiscoveryCandidate[] {
  const byCoordinate = new Map(
    generation.map((entry) => [`${entry.fmt}|${String(entry.perm_index)}`, entry])
  );
  const cache = new Map<string, DiscoveryCell>();
  const cell = (modelA: ModelId, modelB: ModelId, config: string): DiscoveryCell => {
    const key = `${modelA}|${modelB}|${config}`;
    const prior = cache.get(key);
    if (prior) return prior;
    const value = summarizeComparison({ items: discoveryItems, modelA, modelB, config, data });
    cache.set(key, value);
    return value;
  };
  const candidates: DiscoveryCandidate[] = [];
  for (let leftModel = 0; leftModel < MODELS.length; leftModel++) {
    for (let rightModel = leftModel + 1; rightModel < MODELS.length; rightModel++) {
      const modelA = MODELS[leftModel];
      const modelB = MODELS[rightModel];
      for (let leftConfig = 0; leftConfig < generation.length; leftConfig++) {
        for (let rightConfig = 0; rightConfig < generation.length; rightConfig++) {
          if (leftConfig === rightConfig) continue;
          const base = generation[leftConfig];
          const target = generation[rightConfig];
          if (base.fmt === target.fmt || base.perm_index === target.perm_index) continue;
          const formatOnly = byCoordinate.get(`${target.fmt}|${String(base.perm_index)}`);
          const permutationOnly = byCoordinate.get(`${base.fmt}|${String(target.perm_index)}`);
          if (!formatOnly || !permutationOnly) throw new Error("eligible grid is not closed under substitution");
          const worlds = {
            base: cell(modelA, modelB, base.key),
            formatOnly: cell(modelA, modelB, formatOnly.key),
            permutationOnly: cell(modelA, modelB, permutationOnly.key),
            target: cell(modelA, modelB, target.key),
          };
          const baseSign = sign(worlds.base.delta);
          const targetSign = sign(worlds.target.delta);
          if (baseSign === 0 || targetSign === 0 || baseSign === targetSign) continue;
          if (sign(worlds.formatOnly.delta) !== baseSign) continue;
          if (sign(worlds.permutationOnly.delta) !== baseSign) continue;
          const minimumEndpointEffect = Math.min(
            Math.abs(worlds.base.delta),
            Math.abs(worlds.target.delta)
          );
          if (minimumEndpointEffect < MIN_DISCOVERY_ENDPOINT_EFFECT) continue;
          if (
            worlds.base.exactTwoSidedP > MAX_DISCOVERY_ENDPOINT_P ||
            worlds.target.exactTwoSidedP > MAX_DISCOVERY_ENDPOINT_P
          ) continue;
          candidates.push({
            id: candidateId(modelA, modelB, base, target),
            modelA,
            modelB,
            base,
            target,
            worlds,
            rankMetrics: {
              minimumEndpointEffect,
              minimumSingletonBuffer: Math.min(
                Math.abs(worlds.formatOnly.delta),
                Math.abs(worlds.permutationOnly.delta)
              ),
              targetAbsoluteEffect: Math.abs(worlds.target.delta),
            },
          });
        }
      }
    }
  }
  return candidates.sort((left, right) =>
    right.rankMetrics.minimumEndpointEffect - left.rankMetrics.minimumEndpointEffect ||
    right.rankMetrics.minimumSingletonBuffer - left.rankMetrics.minimumSingletonBuffer ||
    right.rankMetrics.targetAbsoluteEffect - left.rankMetrics.targetAbsoluteEffect ||
    compare(left.id, right.id)
  );
}

function observationsFor({
  items,
  modelA,
  modelB,
  config,
  data,
}: {
  items: readonly RetainedItem[];
  modelA: ModelId;
  modelB: ModelId;
  config: string;
  data: ReadonlyMap<ModelId, ReadonlyMap<string, Record<string, Binary>>>;
}): PairedBinaryObservation[] {
  const aData = data.get(modelA);
  const bData = data.get(modelB);
  if (!aData || !bData) throw new Error(`missing model data for ${modelA}/${modelB}`);
  return items.map((item) => {
    const a = aData.get(item.id)?.[config];
    const b = bData.get(item.id)?.[config];
    if (a === undefined || b === undefined) throw new Error(`missing validation outcome ${item.id}/${config}`);
    return { id: item.id, stratum: item.benchmark, a, b };
  });
}

function worldConfig(candidate: DiscoveryCandidate, role: ValidationWorld["role"]): string {
  if (role === "base") return candidate.worlds.base.config;
  if (role === "formatOnly") return candidate.worlds.formatOnly.config;
  if (role === "permutationOnly") return candidate.worlds.permutationOnly.config;
  return candidate.worlds.target.config;
}

function evaluateValidation({
  candidates,
  validationItems,
  data,
}: {
  candidates: readonly DiscoveryCandidate[];
  validationItems: readonly RetainedItem[];
  data: ReadonlyMap<ModelId, ReadonlyMap<string, Record<string, Binary>>>;
}): {
  family: ReturnType<typeof simultaneousStratifiedPairedBootstrap>;
  candidates: ValidationCandidate[];
} {
  const familyInputs = new Map<string, PairedBinaryObservation[]>();
  const familyId = (candidate: DiscoveryCandidate, config: string): string =>
    `${candidate.modelA}|${candidate.modelB}|${config}`;
  for (const candidate of candidates) {
    for (const role of ["base", "formatOnly", "permutationOnly", "target"] as const) {
      const config = worldConfig(candidate, role);
      const id = familyId(candidate, config);
      if (!familyInputs.has(id)) {
        familyInputs.set(
          id,
          observationsFor({
            items: validationItems,
            modelA: candidate.modelA,
            modelB: candidate.modelB,
            config,
            data,
          })
        );
      }
    }
  }
  const family = simultaneousStratifiedPairedBootstrap(
    [...familyInputs.entries()].map(([id, outcomes]) => ({ id, outcomes })),
    { seed: VALIDATION_SEED, replicates: VALIDATION_REPLICATES, confidence: 0.95 }
  );
  const analyses = new Map(family.configurations.map((entry) => [entry.id, entry]));
  const results = candidates.map((candidate, index): ValidationCandidate => {
    const worlds = (["base", "formatOnly", "permutationOnly", "target"] as const).map(
      (role): ValidationWorld => {
        const config = worldConfig(candidate, role);
        const analysis = analyses.get(familyId(candidate, config));
        if (!analysis) throw new Error(`missing validation analysis ${candidate.id}/${role}`);
        return { role, config, analysis };
      }
    );
    const byRole = new Map(worlds.map((world) => [world.role, world]));
    const baseConclusion = byRole.get("base")!.analysis.simultaneous.conclusion;
    const targetConclusion = byRole.get("target")!.analysis.simultaneous.conclusion;
    const conclusionForSubset = (subset: readonly string[]): string => {
      const selected = new Set(subset);
      const role = selected.has("format")
        ? selected.has("permutation")
          ? "target"
          : "formatOnly"
        : selected.has("permutation")
          ? "permutationOnly"
          : "base";
      return byRole.get(role)!.analysis.simultaneous.conclusion;
    };
    const search = exactWitnessSearch({
      dimensions: ["format", "permutation"],
      mode: "landscape",
      maxEvaluations: 4,
      isSufficient: (subset) => conclusionForSubset(subset) === targetConclusion,
    });
    const failureReasons: string[] = [];
    if (baseConclusion === "INCONCLUSIVE") failureReasons.push("base-inconclusive");
    if (targetConclusion === "INCONCLUSIVE") failureReasons.push("target-inconclusive");
    if (baseConclusion === targetConclusion) failureReasons.push("endpoints-not-opposite");
    if (byRole.get("formatOnly")!.analysis.simultaneous.conclusion !== baseConclusion) {
      failureReasons.push("format-singleton-changed-conclusion");
    }
    if (byRole.get("permutationOnly")!.analysis.simultaneous.conclusion !== baseConclusion) {
      failureReasons.push("permutation-singleton-changed-conclusion");
    }
    const uniqueSizeTwo =
      search.status === "FOUND" &&
      search.minimumCardinality === 2 &&
      search.minimumWitnesses.length === 1 &&
      search.minimumWitnesses[0].join("|") === "format|permutation";
    if (!uniqueSizeTwo) failureReasons.push("not-unique-size-two-witness");
    return {
      discoveryRank: index + 1,
      discovery: candidate,
      validation: {
        worlds,
        targetConclusion,
        search,
        validatesUniqueSizeTwoWitness: failureReasons.length === 0,
        failureReasons,
      },
    };
  });
  return { family, candidates: results };
}

async function main(): Promise<void> {
  const sourceFiles: SourceFileDigest[] = [];
  const licenseDownload = await fetchText("LICENSE");
  if (!licenseDownload.text.startsWith("MIT License\n")) {
    throw new Error("upstream LICENSE is not the pinned MIT notice");
  }
  sourceFiles.push(licenseDownload.digest);

  const legendDownload = await fetchText("results/fragility/config_legend.json");
  sourceFiles.push(legendDownload.digest);
  const legend = parseLegend(legendDownload.text);
  const generation = legend.filter((entry) => entry.scoring === "generation");
  const generationConfigs = generation.map((entry) => entry.key);
  const allConfigs = legend.map((entry) => entry.key);

  const requests = MODELS.flatMap((model) =>
    BENCHMARKS.map((benchmark) => ({
      model,
      benchmark,
      path: `results/fragility/records/${benchmark}__${model}.jsonl`,
    }))
  );
  const downloaded = new Map<string, Awaited<ReturnType<typeof fetchText>>>();
  const concurrency = 8;
  for (let offset = 0; offset < requests.length; offset += concurrency) {
    const batch = requests.slice(offset, offset + concurrency);
    const results = await Promise.all(
      batch.map(async (request) => ({ request, download: await fetchText(request.path) }))
    );
    for (const { request, download } of results) downloaded.set(request.path, download);
  }

  const data = new Map<ModelId, Map<string, Record<string, Binary>>>();
  const idsByBenchmark = new Map<BenchmarkId, string[]>();
  for (const model of MODELS) {
    const modelRecords = new Map<string, Record<string, Binary>>();
    for (const benchmark of BENCHMARKS) {
      const path = `results/fragility/records/${benchmark}__${model}.jsonl`;
      const download = downloaded.get(path);
      if (!download) throw new Error(`missing downloaded source ${path}`);
      const records = parseRecords({
        text: download.text,
        model,
        benchmark,
        generationConfigs,
        allConfigs,
      });
      download.digest.records = records.size;
      sourceFiles.push(download.digest);
      const sourceIds = [...records.keys()].sort(compare);
      const priorIds = idsByBenchmark.get(benchmark);
      if (!priorIds) idsByBenchmark.set(benchmark, sourceIds);
      else if (canonicalBytes(priorIds) !== canonicalBytes(sourceIds)) {
        throw new Error(`item-set disagreement for ${benchmark}/${model}`);
      }
      for (const [sourceItemId, bits] of records) {
        const id = `${benchmark}:${sourceItemId}`;
        if (modelRecords.has(id)) throw new Error(`duplicate pooled item ${model}/${id}`);
        modelRecords.set(id, bits);
      }
    }
    if (modelRecords.size !== 3679) {
      throw new Error(`${model} has ${modelRecords.size} pooled items; expected 3679`);
    }
    data.set(model, modelRecords);
  }
  sourceFiles.sort((left, right) => compare(left.path, right.path));

  const allItems = splitItems(idsByBenchmark);
  const discoveryItems = allItems.filter((item) => item.split === "discovery");
  const validationItems = allItems.filter((item) => item.split === "validation");
  const discoveryCandidates = findDiscoveryCandidates({ discoveryItems, generation, data });
  const retained = discoveryCandidates.slice(0, TOP_K);
  const validation =
    retained.length > 0
      ? evaluateValidation({ candidates: retained, validationItems, data })
      : null;
  const primary = validation?.candidates[0] ?? null;

  const evidence = {
    models: [...MODELS],
    benchmarks: BENCHMARKS.map((benchmark) => ({
      id: benchmark,
      count: EXPECTED_COUNTS[benchmark],
    })),
    configurations: generation.map((entry) => ({
      key: entry.key,
      format: entry.fmt,
      permutation: `p${String(entry.perm_index)}`,
      permutationVector: entry.perm,
    })),
    items: allItems.map((item) => ({
      id: item.id,
      sourceItemId: item.sourceItemId,
      stratum: item.benchmark,
      split: item.split,
    })),
    modelOutcomes: MODELS.map((model) => {
      const records = data.get(model);
      if (!records) throw new Error(`missing normalized outcomes for ${model}`);
      return {
        model,
        byConfiguration: Object.fromEntries(
          generationConfigs.map((config) => [
            config,
            allItems
              .map((item) => {
                const bit = records.get(item.id)?.[config];
                if (bit === undefined) throw new Error(`missing normalized bit ${model}/${item.id}/${config}`);
                return String(bit);
              })
              .join(""),
          ])
        ),
      };
    }),
  };
  const evidenceHash = contentHash(evidence);

  const splitCounts = {
    total: allItems.length,
    discovery: discoveryItems.length,
    validation: validationItems.length,
    byBenchmark: Object.fromEntries(
      BENCHMARKS.map((benchmark) => [
        benchmark,
        {
          total: allItems.filter((item) => item.benchmark === benchmark).length,
          discovery: discoveryItems.filter((item) => item.benchmark === benchmark).length,
          validation: validationItems.filter((item) => item.benchmark === benchmark).length,
        },
      ])
    ),
  };

  const analysis =
    validation === null
      ? {
          status: "NO_DISCOVERY_CANDIDATE" as const,
          discoveryCandidateCount: discoveryCandidates.length,
          retainedCandidates: [] as ValidationCandidate[],
          primaryResult: null,
          secondaryResult: { retained: 0, validated: 0 },
          validationFamily: null,
        }
      : {
          status: "VALIDATION_COMPLETED" as const,
          discoveryCandidateCount: discoveryCandidates.length,
          retainedCandidates: validation.candidates,
          primaryResult: primary === null
            ? null
            : {
                candidateId: primary.discovery.id,
                validatesUniqueSizeTwoWitness:
                  primary.validation.validatesUniqueSizeTwoWitness,
                failureReasons: primary.validation.failureReasons,
              },
          secondaryResult: {
            retained: validation.candidates.length,
            validated: validation.candidates.filter(
              (candidate) => candidate.validation.validatesUniqueSizeTwoWitness
            ).length,
          },
          validationFamily: validation.family,
        };

  const sourceManifestHash = contentHash(sourceFiles);
  const packageBody = {
    kind: "FragilityGridReconciliationStudyPackage",
    schemaVersion: 1,
    analysisPlan: {
      document: "docs/EXTERNAL_CASE_ANALYSIS_PLAN.md",
      documentVersion: "1.1",
      frozenCommit: ANALYSIS_PLAN_COMMIT,
      splitSalt: SPLIT_SALT,
      directionalEndpointPairs: true,
      topK: TOP_K,
      minimumDiscoveryEndpointEffect: MIN_DISCOVERY_ENDPOINT_EFFECT,
      maximumDiscoveryEndpointP: MAX_DISCOVERY_ENDPOINT_P,
      validationSeed: VALIDATION_SEED,
      validationReplicates: VALIDATION_REPLICATES,
      validationConfidence: 0.95,
    },
    source: {
      repository: UPSTREAM_REPOSITORY,
      commit: UPSTREAM_COMMIT,
      licenseNotice:
        "MIT for released code/data except embedded benchmark question text under source-benchmark licenses; no such text is retained here",
      files: sourceFiles,
      sourceManifestHash,
    },
    evidence,
    evidenceHash,
    splitCounts,
    analysis,
    exclusions: {
      questionTextRetained: false,
      answerTextRetained: false,
      goldLabelsRetained: false,
      logLikelihoodConfigurationsExcluded: true,
    },
    limitations: [
      "This is a secondary analysis of released correctness records, not a rerun of the models.",
      "Discovery selects candidates on one deterministic item split; only the frozen validation split is used for held-out conclusions.",
      "The simultaneous bootstrap covers the frozen validation comparison family under benchmark-stratified item resampling; it does not include model-run or training variance.",
      "The witness is descriptive within the released format-by-permutation grid and is not a causal attribution.",
      "Offline replay establishes internal consistency with the retained correctness matrix; re-fetching pinned upstream bytes is required to audit extraction from the original files.",
    ],
  };
  const packageCanonical = canonicalBytes(packageBody);
  if (/"(?:question|gold|answer|choices|prompt)"\s*:/i.test(packageCanonical)) {
    throw new Error("derived package contains a forbidden source-content field");
  }
  const studyPackage = {
    body: packageBody,
    canonical: packageCanonical,
    packageHash: contentHash(packageBody),
  };

  const reportBody = {
    kind: "ExternalReconciliationStudy",
    schemaVersion: 1,
    upstream: {
      repository: UPSTREAM_REPOSITORY,
      commit: UPSTREAM_COMMIT,
      sourceFiles: sourceFiles.length,
      sourceBytes: sourceFiles.reduce((sum, file) => sum + file.bytes, 0),
      sourceManifestHash,
      evidenceHash,
    },
    analysisPlan: packageBody.analysisPlan,
    eligibleUniverse: {
      models: MODELS.length,
      modelPairs: (MODELS.length * (MODELS.length - 1)) / 2,
      benchmarks: BENCHMARKS.length,
      items: allItems.length,
      generationConfigurations: generation.length,
      orderedEndpointPairsPerModelPair: generation.length * 15,
      discoveryCandidates: discoveryCandidates.length,
    },
    splitCounts,
    analysis,
    packageHash: studyPackage.packageHash,
  };
  const report = {
    body: reportBody,
    canonical: canonicalBytes(reportBody),
    reportHash: contentHash(reportBody),
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "..");
  const reportPath = resolve(root, "data/external/fragility-grid-study.json");
  const packagePath = resolve(root, "data/external/fragility-grid-study-package.json");
  if (process.argv.includes("--write")) {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(packagePath, `${JSON.stringify(studyPackage, null, 2)}\n`, "utf8");
  }
  console.log(
    JSON.stringify(
      {
        reportHash: report.reportHash,
        packageHash: studyPackage.packageHash,
        evidenceHash,
        discoveryCandidates: discoveryCandidates.length,
        retainedCandidates: retained.length,
        primaryCandidate: primary?.discovery.id ?? null,
        primaryValidated:
          primary?.validation.validatesUniqueSizeTwoWitness ?? null,
        primaryFailureReasons: primary?.validation.failureReasons ?? [],
        validatedCandidates: analysis.secondaryResult.validated,
        reportPath: process.argv.includes("--write") ? reportPath : null,
        packagePath: process.argv.includes("--write") ? packagePath : null,
      },
      null,
      2
    )
  );
}

await main();
