import {
  bonferroniClopperPearsonLowerBound,
  clopperPearsonLowerBound,
} from "./binomialBounds.js";
import { hoeffdingBernoulliLowerBound } from "./robustWitness.js";
import {
  exactWitnessSearch,
  type ExactWitnessSearchResult,
} from "./search.js";

export type CountRobustBoundMethod = "hoeffding" | "clopper-pearson";

export interface RepeatedSufficiencyCountRow {
  subset: string[];
  successes: number;
  trials: number;
}

export interface NormalizedCountFamily {
  dimensions: string[];
  subsets: string[][];
  rows: RepeatedSufficiencyCountRow[];
  familySize: number;
}

export interface CountRobustWitnessRow extends RepeatedSufficiencyCountRow {
  empiricalProbability: number;
  pointwiseLowerBound: number;
  simultaneousLowerBound: number;
  threshold: number;
  robustlySufficient: boolean;
}

export interface CountRobustWitnessResult {
  kind: "CountRobustProtocolWitnessResult";
  version: 1;
  method:
    | "bonferroni-hoeffding-lower-confidence-bound"
    | "bonferroni-clopper-pearson-lower-confidence-bound";
  boundMethod: CountRobustBoundMethod;
  estimand: "probability-of-reproducing-predeclared-target-conclusion";
  dimensions: string[];
  familySize: number;
  threshold: number;
  alpha: number;
  confidence: number;
  perConfigurationAlpha: number;
  rows: CountRobustWitnessRow[];
  certificationStatus: "CERTIFIED_WITNESS_FOUND" | "NO_CERTIFIED_WITNESS";
  search: ExactWitnessSearchResult;
  assumptions: string[];
  limitations: string[];
}

export interface CountRobustWitnessOptions {
  dimensions: readonly string[];
  counts: readonly RepeatedSufficiencyCountRow[];
  threshold: number;
  alpha?: number;
  method?: CountRobustBoundMethod;
  maxDimensions?: number;
}

const DEFAULT_MAX_DIMENSIONS = 20;
const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const subsetKey = (subset: readonly string[]): string =>
  JSON.stringify([...subset].sort(compare));

function normalizeDimensions(
  dimensions: readonly string[],
  maxDimensions: number
): string[] {
  if (!Array.isArray(dimensions)) throw new Error("dimensions must be an array");
  if (!Number.isSafeInteger(maxDimensions) || maxDimensions < 0) {
    throw new Error("maxDimensions must be a non-negative safe integer");
  }
  if (dimensions.length > maxDimensions) {
    throw new Error(
      `count-based robust witness supports at most ${maxDimensions} dimensions; got ${dimensions.length}`
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

function normalizeSubset(
  subset: readonly string[],
  dimensions: readonly string[],
  where: string
): string[] {
  if (!Array.isArray(subset)) throw new Error(`${where} must be an array`);
  const allowed = new Set(dimensions);
  const seen = new Set<string>();
  for (const dimension of subset) {
    if (typeof dimension !== "string" || !allowed.has(dimension)) {
      throw new Error(`${where} contains unknown dimension ${String(dimension)}`);
    }
    if (seen.has(dimension)) throw new Error(`${where} contains duplicate ${dimension}`);
    seen.add(dimension);
  }
  return [...seen].sort(compare);
}

function validateCount(successes: number, trials: number, where: string): void {
  if (!Number.isSafeInteger(trials) || trials <= 0) {
    throw new Error(`${where}.trials must be a positive safe integer`);
  }
  if (
    !Number.isSafeInteger(successes) ||
    successes < 0 ||
    successes > trials
  ) {
    throw new Error(`${where}.successes must be an integer in [0,trials]`);
  }
}

function validateProbability(
  value: number,
  name: string,
  allowEndpoints: boolean
): void {
  const valid =
    Number.isFinite(value) &&
    (allowEndpoints ? value >= 0 && value <= 1 : value > 0 && value < 1);
  if (!valid) {
    throw new Error(`${name} must be ${allowEndpoints ? "in [0,1]" : "in (0,1)"}`);
  }
}

export function normalizeRepeatedSufficiencyCountFamily({
  dimensions: rawDimensions,
  counts,
  maxDimensions = DEFAULT_MAX_DIMENSIONS,
}: {
  dimensions: readonly string[];
  counts: readonly RepeatedSufficiencyCountRow[];
  maxDimensions?: number;
}): NormalizedCountFamily {
  const dimensions = normalizeDimensions(rawDimensions, maxDimensions);
  const subsets = allSubsets(dimensions);
  if (!Array.isArray(counts)) throw new Error("counts must be an array");
  const expected = new Set(subsets.map(subsetKey));
  const byKey = new Map<string, RepeatedSufficiencyCountRow>();
  for (const [index, row] of counts.entries()) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new Error(`counts[${index}] must be an object`);
    }
    const keys = Object.keys(row).sort(compare);
    if (
      JSON.stringify(keys) !==
      JSON.stringify(["subset", "successes", "trials"].sort(compare))
    ) {
      throw new Error(
        `counts[${index}] must contain exactly subset, successes, and trials`
      );
    }
    const subset = normalizeSubset(row.subset, dimensions, `counts[${index}].subset`);
    const key = subsetKey(subset);
    if (!expected.has(key)) throw new Error(`counts[${index}] is outside the family`);
    if (byKey.has(key)) throw new Error(`duplicate count row for ${key}`);
    validateCount(row.successes, row.trials, `counts[${index}]`);
    byKey.set(key, {
      subset,
      successes: row.successes,
      trials: row.trials,
    });
  }
  const missing = subsets.filter((subset) => !byKey.has(subsetKey(subset)));
  if (missing.length > 0 || byKey.size !== subsets.length) {
    throw new Error(`count family is incomplete: ${missing.length} subset(s) missing`);
  }
  return {
    dimensions,
    subsets,
    rows: subsets.map((subset) => {
      const row = byKey.get(subsetKey(subset));
      if (!row) throw new Error(`missing normalized count row for ${subsetKey(subset)}`);
      return { ...row, subset: [...row.subset] };
    }),
    familySize: subsets.length,
  };
}

export function findCountBasedRobustProtocolWitnesses({
  dimensions,
  counts,
  threshold,
  alpha = 0.05,
  method = "clopper-pearson",
  maxDimensions = DEFAULT_MAX_DIMENSIONS,
}: CountRobustWitnessOptions): CountRobustWitnessResult {
  validateProbability(threshold, "threshold", true);
  validateProbability(alpha, "alpha", false);
  if (method !== "hoeffding" && method !== "clopper-pearson") {
    throw new Error(`unknown count robust bound method: ${String(method)}`);
  }
  const family = normalizeRepeatedSufficiencyCountFamily({
    dimensions,
    counts,
    maxDimensions,
  });
  const perConfigurationAlpha = alpha / family.familySize;
  if (perConfigurationAlpha === 0) {
    throw new Error("alpha/familySize underflowed to zero");
  }
  const rows = family.rows.map((row): CountRobustWitnessRow => {
    const pointwiseLowerBound =
      method === "hoeffding"
        ? hoeffdingBernoulliLowerBound(row.successes, row.trials, alpha)
        : clopperPearsonLowerBound(row.successes, row.trials, alpha);
    const simultaneousLowerBound =
      method === "hoeffding"
        ? hoeffdingBernoulliLowerBound(
            row.successes,
            row.trials,
            perConfigurationAlpha
          )
        : bonferroniClopperPearsonLowerBound(
            row.successes,
            row.trials,
            alpha,
            family.familySize
          );
    return {
      ...row,
      subset: [...row.subset],
      empiricalProbability: row.successes / row.trials,
      pointwiseLowerBound,
      simultaneousLowerBound,
      threshold,
      robustlySufficient: simultaneousLowerBound >= threshold,
    };
  });
  const rowByKey = new Map(rows.map((row) => [subsetKey(row.subset), row]));
  const search = exactWitnessSearch({
    dimensions: family.dimensions,
    mode: "landscape",
    maxEvaluations: family.familySize,
    isSufficient: (subset) => {
      const row = rowByKey.get(subsetKey(subset));
      if (!row) throw new Error(`missing robust count row for ${subsetKey(subset)}`);
      return row.robustlySufficient;
    },
  });
  return {
    kind: "CountRobustProtocolWitnessResult",
    version: 1,
    method:
      method === "hoeffding"
        ? "bonferroni-hoeffding-lower-confidence-bound"
        : "bonferroni-clopper-pearson-lower-confidence-bound",
    boundMethod: method,
    estimand: "probability-of-reproducing-predeclared-target-conclusion",
    dimensions: [...family.dimensions],
    familySize: family.familySize,
    threshold,
    alpha,
    confidence: 1 - alpha,
    perConfigurationAlpha,
    rows,
    certificationStatus:
      search.status === "FOUND"
        ? "CERTIFIED_WITNESS_FOUND"
        : "NO_CERTIFIED_WITNESS",
    search,
    assumptions: [
      "The target conclusion, threshold, complete subset family, and fixed trial counts were specified before inspecting outcomes.",
      "Within each subset, target-reproduction indicators are independent and identically distributed Bernoulli trials.",
      "Evaluation conditions and failure handling remain stable across the declared trials.",
    ],
    limitations: [
      "NO_CERTIFIED_WITNESS means no subset's simultaneous lower bound clears the threshold; it does not prove every true reproduction probability is below the threshold.",
      "Bonferroni controls the declared finite family without requiring cross-subset independence but can be conservative.",
      "The result is descriptive and conditional, not causal, and does not include uncertainty in target or schema selection.",
    ],
  };
}
