import {
  BOOT_REPLICATES,
  BOOT_SEED,
  analyzeEvidence,
} from "./mpwCore.js";
import {
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
} from "./mpwFixture.js";
import { constructHybrid } from "./mpwCounterfactual.js";
import { simulateForProtocol } from "./mpwSimulator.js";
import {
  exactWitnessSearch,
  type ExactWitnessSearchResult,
} from "../research/search.js";
import {
  simultaneousStratifiedPairedBootstrap,
  type FamilyConfigurationAnalysis,
  type IntervalConclusion,
  type SimultaneousPairedBootstrapResult,
} from "../research/statistics.js";
import type { Protocol } from "../types/index.js";

export const CANONICAL_FAMILY_ANALYSIS_VERSION = 1 as const;
export const CANONICAL_FAMILY_INFERENCE_MODE =
  "predeclared-16-world-synchronized-stratified-bootstrap" as const;

type Direction = "A_TO_B" | "B_TO_A";
type IntervalMode = "pointwise" | "simultaneous";

export interface CanonicalFamilyWorld {
  id: string;
  subsetFromA: string[];
  protocol: Protocol;
  analysis: FamilyConfigurationAnalysis;
}

export interface CanonicalWitnessDiagnostic {
  subset: string[];
  effect: number;
  targetEffect: number;
  effectDistanceToTarget: number;
  restorationFraction: number | null;
}

export interface CanonicalReconciliationInference {
  direction: Direction;
  intervalMode: IntervalMode;
  baseConclusion: IntervalConclusion;
  targetConclusion: IntervalConclusion;
  baseEffect: number;
  targetEffect: number;
  search: ExactWitnessSearchResult;
  witnessDiagnostics: CanonicalWitnessDiagnostic[];
}

export interface CanonicalFamilyAnalysisReport {
  kind: "CanonicalProtocolFamilyAnalysis";
  version: typeof CANONICAL_FAMILY_ANALYSIS_VERSION;
  inferenceMode: typeof CANONICAL_FAMILY_INFERENCE_MODE;
  exposedDimensions: string[];
  family: SimultaneousPairedBootstrapResult;
  worlds: CanonicalFamilyWorld[];
  pointwiseCompatibility: {
    checked: number;
    exactMatches: number;
    allMatched: boolean;
  };
  reconciliations: {
    pointwise: { A_TO_B: CanonicalReconciliationInference; B_TO_A: CanonicalReconciliationInference };
    simultaneous: { A_TO_B: CanonicalReconciliationInference; B_TO_A: CanonicalReconciliationInference };
  };
  interpretation: string[];
}

function normalizedDimensions(): string[] {
  return [...EXPOSED_DIMENSIONS].sort();
}

function subsetKey(subset: readonly string[]): string {
  return JSON.stringify([...subset].sort());
}

function allSubsets(dimensions: readonly string[]): string[][] {
  const sorted = [...dimensions].sort();
  const out: string[][] = [];
  const count = 2 ** sorted.length;
  for (let mask = 0; mask < count; mask++) {
    const subset = sorted.filter((_, index) => (mask & (1 << index)) !== 0);
    out.push(subset);
  }
  return out.sort((left, right) =>
    left.length - right.length ||
    (subsetKey(left) < subsetKey(right) ? -1 : subsetKey(left) > subsetKey(right) ? 1 : 0)
  );
}

function worldSubsetForDirection(
  direction: Direction,
  candidate: readonly string[],
  dimensions: readonly string[]
): string[] {
  const selected = new Set(candidate);
  return direction === "A_TO_B"
    ? [...candidate].sort()
    : dimensions.filter((dimension) => !selected.has(dimension)).sort();
}

function conclusionOf(world: CanonicalFamilyWorld, mode: IntervalMode): IntervalConclusion {
  return world.analysis[mode].conclusion;
}

function reconciliationFor(
  worlds: readonly CanonicalFamilyWorld[],
  direction: Direction,
  mode: IntervalMode,
  dimensions: readonly string[]
): CanonicalReconciliationInference {
  const bySubset = new Map(worlds.map((world) => [subsetKey(world.subsetFromA), world]));
  const baseSubset = worldSubsetForDirection(direction, [], dimensions);
  const targetSubset = worldSubsetForDirection(direction, dimensions, dimensions);
  const base = bySubset.get(subsetKey(baseSubset));
  const target = bySubset.get(subsetKey(targetSubset));
  if (!base || !target) throw new Error(`missing canonical endpoint for ${direction}`);
  const targetConclusion = conclusionOf(target, mode);
  const search = exactWitnessSearch({
    dimensions,
    mode: "landscape",
    maxEvaluations: 2 ** dimensions.length,
    isSufficient: (candidate) => {
      const worldSubset = worldSubsetForDirection(direction, candidate, dimensions);
      const world = bySubset.get(subsetKey(worldSubset));
      if (!world) throw new Error(`missing canonical world ${subsetKey(worldSubset)}`);
      return conclusionOf(world, mode) === targetConclusion;
    },
  });
  const baseEffect = base.analysis.pointEstimate;
  const targetEffect = target.analysis.pointEstimate;
  const sourceGap = Math.abs(baseEffect - targetEffect);
  const witnessDiagnostics = search.minimumWitnesses.map((candidate) => {
    const worldSubset = worldSubsetForDirection(direction, candidate, dimensions);
    const world = bySubset.get(subsetKey(worldSubset));
    if (!world) throw new Error(`missing witness world ${subsetKey(worldSubset)}`);
    const effectDistanceToTarget = Math.abs(world.analysis.pointEstimate - targetEffect);
    return {
      subset: [...candidate],
      effect: world.analysis.pointEstimate,
      targetEffect,
      effectDistanceToTarget,
      restorationFraction: sourceGap === 0 ? null : 1 - effectDistanceToTarget / sourceGap,
    };
  });
  return {
    direction,
    intervalMode: mode,
    baseConclusion: conclusionOf(base, mode),
    targetConclusion,
    baseEffect,
    targetEffect,
    search,
    witnessDiagnostics,
  };
}

function exactlyEqualNumber(left: number, right: number): boolean {
  return Object.is(left, right) || left === right;
}

export function analyzeCanonicalProtocolFamily({
  seed = BOOT_SEED,
  replicates = BOOT_REPLICATES,
}: {
  seed?: string;
  replicates?: number;
} = {}): CanonicalFamilyAnalysisReport {
  const dimensions = normalizedDimensions();
  const subsets = allSubsets(dimensions);
  const rawWorlds = subsets.map((subset) => {
    const protocol = constructHybrid(LAB_A_PROTOCOL, LAB_B_PROTOCOL, subset);
    const outcomes = simulateForProtocol(protocol);
    return {
      id: subsetKey(subset),
      subsetFromA: [...subset],
      protocol,
      outcomes,
    };
  });
  const family = simultaneousStratifiedPairedBootstrap(
    rawWorlds.map((world) => ({ id: world.id, outcomes: world.outcomes })),
    { seed, replicates, confidence: 0.95 }
  );
  const analysisById = new Map(family.configurations.map((analysis) => [analysis.id, analysis]));
  let exactMatches = 0;
  const worlds = rawWorlds.map((world): CanonicalFamilyWorld => {
    const analysis = analysisById.get(world.id);
    if (!analysis) throw new Error(`missing family analysis for ${world.id}`);
    const legacy = analyzeEvidence(world.outcomes, { seed, replicates });
    const exact =
      exactlyEqualNumber(analysis.pointEstimate, legacy.delta) &&
      exactlyEqualNumber(analysis.pointwise.ciLow, legacy.ciLow) &&
      exactlyEqualNumber(analysis.pointwise.ciHigh, legacy.ciHigh) &&
      analysis.pointwise.conclusion === legacy.conclusion;
    if (!exact) {
      throw new Error(
        `pointwise compatibility failure for ${world.id}: ` +
        `${analysis.pointEstimate}/${analysis.pointwise.ciLow}/${analysis.pointwise.ciHigh}/${analysis.pointwise.conclusion} ` +
        `!= ${legacy.delta}/${legacy.ciLow}/${legacy.ciHigh}/${legacy.conclusion}`
      );
    }
    exactMatches++;
    return {
      id: world.id,
      subsetFromA: [...world.subsetFromA],
      protocol: { ...world.protocol },
      analysis,
    };
  });

  return {
    kind: "CanonicalProtocolFamilyAnalysis",
    version: CANONICAL_FAMILY_ANALYSIS_VERSION,
    inferenceMode: CANONICAL_FAMILY_INFERENCE_MODE,
    exposedDimensions: dimensions,
    family,
    worlds,
    pointwiseCompatibility: {
      checked: worlds.length,
      exactMatches,
      allMatched: exactMatches === worlds.length,
    },
    reconciliations: {
      pointwise: {
        A_TO_B: reconciliationFor(worlds, "A_TO_B", "pointwise", dimensions),
        B_TO_A: reconciliationFor(worlds, "B_TO_A", "pointwise", dimensions),
      },
      simultaneous: {
        A_TO_B: reconciliationFor(worlds, "A_TO_B", "simultaneous", dimensions),
        B_TO_A: reconciliationFor(worlds, "B_TO_A", "simultaneous", dimensions),
      },
    },
    interpretation: [
      "Pointwise intervals reproduce the legacy fixed-configuration analysis exactly under the same seed and percentile rule.",
      "Simultaneous intervals use one synchronized stratified resample plan across all 16 configurations and a maximum absolute deviation critical value.",
      "The simultaneous result addresses familywise item-resampling uncertainty for the predeclared 16-world family; it does not include repeated model-run or training variance.",
      "The deterministic certificate and the simultaneous bootstrap answer different questions and are reported separately.",
    ],
  };
}
