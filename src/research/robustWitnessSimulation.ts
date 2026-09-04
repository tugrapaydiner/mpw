import {
  findRobustProtocolWitnesses,
  type RepeatedSufficiencyRow,
} from "./robustWitness.js";

export const ROBUST_WITNESS_SIMULATION_VERSION = 1 as const;
export const MAX_SIMULATION_REPLICATIONS = 100_000;
export const MAX_SIMULATION_TRIALS_PER_SUBSET = 1_000_000;

export interface TrueSufficiencyProbability {
  subset: string[];
  probability: number;
}

export interface RobustWitnessSimulationOptions {
  dimensions: readonly string[];
  probabilities: readonly TrueSufficiencyProbability[];
  threshold: number;
  alpha?: number;
  trialsPerSubset: number;
  replications: number;
  seed?: string;
}

export interface RobustWitnessSimulationResult {
  kind: "RobustWitnessSimulationResult";
  version: typeof ROBUST_WITNESS_SIMULATION_VERSION;
  seed: string;
  dimensions: string[];
  familySize: number;
  threshold: number;
  alpha: number;
  trialsPerSubset: number;
  replications: number;
  trueMinimumCardinality: number | null;
  trueMinimumWitnesses: string[][];
  simultaneousCoverageFailures: number;
  simultaneousCoverageFailureRate: number;
  falseCertificationReplications: number;
  falseCertificationRate: number;
  exactMinimumRecoveryReplications: number;
  exactMinimumRecoveryRate: number;
  noWitnessReplications: number;
  noWitnessRate: number;
  interpretation: string[];
}

const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const key = (subset: readonly string[]): string => [...subset].sort(compare).join("+");

function hashSeedString(value: string): number {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeDimensions(dimensions: readonly string[]): string[] {
  if (!Array.isArray(dimensions)) throw new Error("dimensions must be an array");
  const seen = new Set<string>();
  for (const dimension of dimensions) {
    if (typeof dimension !== "string" || dimension.length === 0) {
      throw new Error("dimensions must be non-empty strings");
    }
    if (seen.has(dimension)) throw new Error(`duplicate dimension: ${dimension}`);
    seen.add(dimension);
  }
  if (seen.size > 20) throw new Error("simulation supports at most 20 dimensions");
  return [...seen].sort(compare);
}

function allSubsets(dimensions: readonly string[]): string[][] {
  const subsets: string[][] = [];
  for (let mask = 0; mask < 2 ** dimensions.length; mask++) {
    subsets.push(dimensions.filter((_, index) => (mask & (1 << index)) !== 0));
  }
  return subsets.sort(
    (left, right) => left.length - right.length || compare(key(left), key(right))
  );
}

function sameWitnesses(left: readonly string[][], right: readonly string[][]): boolean {
  const normalize = (witnesses: readonly string[][]): string[] => witnesses.map(key).sort(compare);
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function validateProbability(value: number, name: string, closed: boolean): void {
  const valid = closed
    ? Number.isFinite(value) && value >= 0 && value <= 1
    : Number.isFinite(value) && value > 0 && value < 1;
  if (!valid) throw new Error(`${name} must be ${closed ? "in [0,1]" : "in (0,1)"}`);
}

export function simulateRobustWitnessStudy({
  dimensions: rawDimensions,
  probabilities,
  threshold,
  alpha = 0.05,
  trialsPerSubset,
  replications,
  seed = "mpw-robust-witness-simulation-v1",
}: RobustWitnessSimulationOptions): RobustWitnessSimulationResult {
  const dimensions = normalizeDimensions(rawDimensions);
  const subsets = allSubsets(dimensions);
  validateProbability(threshold, "threshold", true);
  validateProbability(alpha, "alpha", false);
  if (
    !Number.isSafeInteger(trialsPerSubset) ||
    trialsPerSubset <= 0 ||
    trialsPerSubset > MAX_SIMULATION_TRIALS_PER_SUBSET
  ) {
    throw new Error(
      `trialsPerSubset must be an integer in [1,${MAX_SIMULATION_TRIALS_PER_SUBSET}]`
    );
  }
  if (
    !Number.isSafeInteger(replications) ||
    replications <= 0 ||
    replications > MAX_SIMULATION_REPLICATIONS
  ) {
    throw new Error(`replications must be an integer in [1,${MAX_SIMULATION_REPLICATIONS}]`);
  }
  if (typeof seed !== "string" || seed.length === 0) throw new Error("seed must be non-empty");
  if (!Array.isArray(probabilities)) throw new Error("probabilities must be an array");

  const allowed = new Set(dimensions);
  const probabilityByKey = new Map<string, number>();
  for (const [index, row] of probabilities.entries()) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new Error(`probabilities[${index}] must be an object`);
    }
    if (!Array.isArray(row.subset)) throw new Error(`probabilities[${index}].subset must be an array`);
    const seen = new Set<string>();
    for (const dimension of row.subset) {
      if (typeof dimension !== "string" || !allowed.has(dimension)) {
        throw new Error(`probabilities[${index}] contains unknown dimension ${String(dimension)}`);
      }
      if (seen.has(dimension)) throw new Error(`probabilities[${index}] contains duplicate ${dimension}`);
      seen.add(dimension);
    }
    validateProbability(row.probability, `probabilities[${index}].probability`, true);
    const subset = [...seen].sort(compare);
    const subsetKey = key(subset);
    if (probabilityByKey.has(subsetKey)) throw new Error(`duplicate probability row for ${subsetKey}`);
    probabilityByKey.set(subsetKey, row.probability);
  }
  const missing = subsets.filter((subset) => !probabilityByKey.has(key(subset)));
  if (missing.length > 0 || probabilityByKey.size !== subsets.length) {
    throw new Error(`probability family is incomplete: ${missing.length} subset(s) missing`);
  }

  const trulySufficient = subsets.filter(
    (subset) => (probabilityByKey.get(key(subset)) ?? Number.NEGATIVE_INFINITY) >= threshold
  );
  const trueMinimumCardinality =
    trulySufficient.length === 0
      ? null
      : Math.min(...trulySufficient.map((subset) => subset.length));
  const trueMinimumWitnesses =
    trueMinimumCardinality === null
      ? []
      : trulySufficient
          .filter((subset) => subset.length === trueMinimumCardinality)
          .map((subset) => [...subset]);

  let simultaneousCoverageFailures = 0;
  let falseCertificationReplications = 0;
  let exactMinimumRecoveryReplications = 0;
  let noWitnessReplications = 0;

  for (let replication = 0; replication < replications; replication++) {
    const repeatedOutcomes: RepeatedSufficiencyRow[] = subsets.map((subset) => {
      const probability = probabilityByKey.get(key(subset));
      if (probability === undefined) throw new Error(`missing probability for ${key(subset)}`);
      const random = mulberry32(hashSeedString(`${seed}|${replication}|${key(subset)}`));
      const trials = Array.from(
        { length: trialsPerSubset },
        () => random() < probability
      );
      return { subset: [...subset], trials };
    });
    const result = findRobustProtocolWitnesses({
      dimensions,
      repeatedOutcomes,
      threshold,
      alpha,
      maxEvaluations: subsets.length,
    });
    const coverageFailure = result.rows.some((row) => {
      const trueProbability = probabilityByKey.get(key(row.subset));
      if (trueProbability === undefined) throw new Error(`missing probability for ${key(row.subset)}`);
      return row.simultaneousLowerBound > trueProbability;
    });
    if (coverageFailure) simultaneousCoverageFailures++;

    const falseCertification = result.rows.some((row) => {
      const trueProbability = probabilityByKey.get(key(row.subset));
      if (trueProbability === undefined) throw new Error(`missing probability for ${key(row.subset)}`);
      return row.robustlySufficient && trueProbability < threshold;
    });
    if (falseCertification) falseCertificationReplications++;

    if (
      result.search.minimumCardinality === trueMinimumCardinality &&
      sameWitnesses(result.search.minimumWitnesses, trueMinimumWitnesses)
    ) {
      exactMinimumRecoveryReplications++;
    }
    if (result.search.status === "NO_WITNESS") noWitnessReplications++;
  }

  return {
    kind: "RobustWitnessSimulationResult",
    version: ROBUST_WITNESS_SIMULATION_VERSION,
    seed,
    dimensions,
    familySize: subsets.length,
    threshold,
    alpha,
    trialsPerSubset,
    replications,
    trueMinimumCardinality,
    trueMinimumWitnesses,
    simultaneousCoverageFailures,
    simultaneousCoverageFailureRate: simultaneousCoverageFailures / replications,
    falseCertificationReplications,
    falseCertificationRate: falseCertificationReplications / replications,
    exactMinimumRecoveryReplications,
    exactMinimumRecoveryRate: exactMinimumRecoveryReplications / replications,
    noWitnessReplications,
    noWitnessRate: noWitnessReplications / replications,
    interpretation: [
      "Coverage failure means at least one simultaneous lower bound exceeded its declared true Bernoulli probability in that Monte Carlo replication.",
      "False certification means at least one subset with true reproduction probability below the threshold was labeled robustly sufficient.",
      "Exact recovery requires both the true minimum cardinality and the complete set of true co-minimum witnesses.",
      "Monte Carlo frequencies are implementation diagnostics, not substitutes for the analytic Hoeffding-union-bound guarantee.",
    ],
  };
}
