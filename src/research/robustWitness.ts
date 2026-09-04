import {
  exactWitnessSearch,
  type ExactWitnessSearchResult,
} from "./search.js";

export const ROBUST_WITNESS_METHOD =
  "bonferroni-hoeffding-lower-confidence-bound" as const;
export const ROBUST_WITNESS_VERSION = 1 as const;
export const MAX_ROBUST_WITNESS_DIMENSIONS = 20;

export interface RepeatedSufficiencyRow {
  subset: string[];
  trials: boolean[];
}

export interface RobustWitnessRow {
  subset: string[];
  trials: number;
  successes: number;
  empiricalProbability: number;
  pointwiseLowerBound: number;
  simultaneousLowerBound: number;
  threshold: number;
  robustlySufficient: boolean;
}

export interface RobustWitnessResult {
  kind: "RobustProtocolWitnessResult";
  version: typeof ROBUST_WITNESS_VERSION;
  method: typeof ROBUST_WITNESS_METHOD;
  estimand: "probability-of-reproducing-predeclared-target-conclusion";
  dimensions: string[];
  familySize: number;
  alpha: number;
  confidence: number;
  perConfigurationAlpha: number;
  threshold: number;
  rows: RobustWitnessRow[];
  search: ExactWitnessSearchResult;
  assumptions: string[];
  limitations: string[];
}

export interface RobustWitnessOptions {
  dimensions: readonly string[];
  repeatedOutcomes: readonly RepeatedSufficiencyRow[];
  threshold: number;
  alpha?: number;
  maxEvaluations?: number;
}

const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function normalizeDimensions(dimensions: readonly string[]): string[] {
  if (!Array.isArray(dimensions)) throw new Error("dimensions must be an array");
  if (dimensions.length > MAX_ROBUST_WITNESS_DIMENSIONS) {
    throw new Error(
      `too many dimensions for a complete robust-witness family: ${dimensions.length}`
    );
  }
  const seen = new Set<string>();
  for (const dimension of dimensions) {
    if (typeof dimension !== "string" || dimension.length === 0) {
      throw new Error("every dimension must be a non-empty string");
    }
    if (seen.has(dimension)) throw new Error(`duplicate dimension: ${dimension}`);
    seen.add(dimension);
  }
  return [...seen].sort(compare);
}

function normalizeSubset(subset: readonly string[], dimensions: readonly string[]): string[] {
  if (!Array.isArray(subset)) throw new Error("subset must be an array");
  const allowed = new Set(dimensions);
  const seen = new Set<string>();
  for (const dimension of subset) {
    if (typeof dimension !== "string" || !allowed.has(dimension)) {
      throw new Error(`unknown subset dimension: ${String(dimension)}`);
    }
    if (seen.has(dimension)) throw new Error(`duplicate subset dimension: ${dimension}`);
    seen.add(dimension);
  }
  return [...seen].sort(compare);
}

const subsetKey = (subset: readonly string[]): string => JSON.stringify([...subset].sort(compare));

function allSubsets(dimensions: readonly string[]): string[][] {
  const count = 2 ** dimensions.length;
  const subsets: string[][] = [];
  for (let mask = 0; mask < count; mask++) {
    subsets.push(dimensions.filter((_, index) => (mask & (1 << index)) !== 0));
  }
  return subsets.sort(
    (left, right) =>
      left.length - right.length || compare(subsetKey(left), subsetKey(right))
  );
}

function validateProbability(value: number, name: string, inclusiveZero: boolean): void {
  const lower = inclusiveZero ? value >= 0 : value > 0;
  if (!Number.isFinite(value) || !lower || value >= 1) {
    throw new Error(`${name} must be ${inclusiveZero ? "in [0,1)" : "in (0,1)"}`);
  }
}

/**
 * One-sided Hoeffding lower confidence bound for an i.i.d. Bernoulli mean.
 * For alpha in (0,1), P(p < pHat - epsilon) <= alpha, where
 * epsilon = sqrt(log(1/alpha)/(2n)). The result is clipped to [0,1].
 */
export function hoeffdingBernoulliLowerBound(
  successes: number,
  trials: number,
  alpha: number
): number {
  if (!Number.isSafeInteger(trials) || trials <= 0) {
    throw new Error("trials must be a positive safe integer");
  }
  if (!Number.isSafeInteger(successes) || successes < 0 || successes > trials) {
    throw new Error("successes must be an integer in [0,trials]");
  }
  validateProbability(alpha, "alpha", false);
  const empirical = successes / trials;
  const radius = Math.sqrt(Math.log(1 / alpha) / (2 * trials));
  return Math.max(0, Math.min(1, empirical - radius));
}

export function findRobustProtocolWitnesses({
  dimensions: rawDimensions,
  repeatedOutcomes,
  threshold,
  alpha = 0.05,
  maxEvaluations,
}: RobustWitnessOptions): RobustWitnessResult {
  const dimensions = normalizeDimensions(rawDimensions);
  validateProbability(alpha, "alpha", false);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error("threshold must be in [0,1]");
  }
  if (!Array.isArray(repeatedOutcomes)) {
    throw new Error("repeatedOutcomes must be an array");
  }
  const expectedSubsets = allSubsets(dimensions);
  const familySize = expectedSubsets.length;
  const expectedKeys = new Set(expectedSubsets.map(subsetKey));
  const inputByKey = new Map<string, RepeatedSufficiencyRow>();
  for (const [index, row] of repeatedOutcomes.entries()) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new Error(`repeatedOutcomes[${index}] must be an object`);
    }
    const keys = Object.keys(row).sort(compare);
    if (JSON.stringify(keys) !== JSON.stringify(["subset", "trials"])) {
      throw new Error(`repeatedOutcomes[${index}] must contain exactly subset and trials`);
    }
    const subset = normalizeSubset(row.subset, dimensions);
    const key = subsetKey(subset);
    if (!expectedKeys.has(key)) throw new Error(`row ${index} is outside the declared family`);
    if (inputByKey.has(key)) throw new Error(`duplicate repeated-outcome row for ${key}`);
    if (!Array.isArray(row.trials) || row.trials.length === 0) {
      throw new Error(`row ${index} must contain at least one repeated trial`);
    }
    if (row.trials.some((value) => typeof value !== "boolean")) {
      throw new Error(`row ${index} trials must be booleans`);
    }
    inputByKey.set(key, { subset, trials: [...row.trials] });
  }
  const missing = expectedSubsets.filter((subset) => !inputByKey.has(subsetKey(subset)));
  if (missing.length > 0) {
    throw new Error(`repeated-outcome family is incomplete: ${missing.length} subset(s) missing`);
  }
  if (inputByKey.size !== familySize) {
    throw new Error(`family size ${inputByKey.size} differs from expected ${familySize}`);
  }

  const perConfigurationAlpha = alpha / familySize;
  const rows = expectedSubsets.map((subset): RobustWitnessRow => {
    const input = inputByKey.get(subsetKey(subset));
    if (!input) throw new Error(`missing repeated outcomes for ${subsetKey(subset)}`);
    const trials = input.trials.length;
    const successes = input.trials.filter(Boolean).length;
    const empiricalProbability = successes / trials;
    const pointwiseLowerBound = hoeffdingBernoulliLowerBound(successes, trials, alpha);
    const simultaneousLowerBound = hoeffdingBernoulliLowerBound(
      successes,
      trials,
      perConfigurationAlpha
    );
    return {
      subset: [...subset],
      trials,
      successes,
      empiricalProbability,
      pointwiseLowerBound,
      simultaneousLowerBound,
      threshold,
      robustlySufficient: simultaneousLowerBound >= threshold,
    };
  });
  const rowByKey = new Map(rows.map((row) => [subsetKey(row.subset), row]));
  const search = exactWitnessSearch({
    dimensions,
    mode: "landscape",
    maxEvaluations: maxEvaluations ?? familySize,
    isSufficient: (subset) => {
      const row = rowByKey.get(subsetKey(subset));
      if (!row) throw new Error(`missing robust-witness row for ${subsetKey(subset)}`);
      return row.robustlySufficient;
    },
  });

  return {
    kind: "RobustProtocolWitnessResult",
    version: ROBUST_WITNESS_VERSION,
    method: ROBUST_WITNESS_METHOD,
    estimand: "probability-of-reproducing-predeclared-target-conclusion",
    dimensions,
    familySize,
    alpha,
    confidence: 1 - alpha,
    perConfigurationAlpha,
    threshold,
    rows,
    search,
    assumptions: [
      "The target conclusion and finite subset family were fixed before inspecting these repeated outcomes.",
      "Within each protocol subset, repeated target-reproduction indicators are independent and identically distributed Bernoulli trials.",
      "The evaluation implementation and data-generating regime remain stable across repeated trials.",
    ],
    limitations: [
      "Bonferroni-Hoeffding bounds are conservative and can require many repeated runs.",
      "The guarantee is familywise only for the complete declared subset family in this result.",
      "Robust target reproduction remains descriptive and conditional; it is not a causal attribution claim.",
      "This method does not account for an uncertain or adaptively chosen target conclusion.",
    ],
  };
}
