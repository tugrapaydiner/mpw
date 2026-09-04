import {
  normalizeRepeatedSufficiencyCountFamily,
  type RepeatedSufficiencyCountRow,
} from "./countRobustWitness.js";
import {
  exactWitnessSearch,
  type ExactWitnessSearchResult,
} from "./search.js";

export const ANYTIME_ROBUST_WITNESS_METHOD =
  "time-uniform-bonferroni-hoeffding-lower-confidence-sequence" as const;
export const ANYTIME_ROBUST_WITNESS_VERSION = 1 as const;

export interface AnytimeRobustWitnessRow extends RepeatedSufficiencyCountRow {
  empiricalProbability: number | null;
  timeIndex: number;
  allocatedError: number | null;
  anytimeLowerBound: number;
  threshold: number;
  robustlyCertified: boolean;
}

export interface AnytimeRobustWitnessResult {
  kind: "AnytimeRobustProtocolWitnessResult";
  version: typeof ANYTIME_ROBUST_WITNESS_VERSION;
  method: typeof ANYTIME_ROBUST_WITNESS_METHOD;
  estimand: "probability-of-reproducing-predeclared-target-conclusion";
  dimensions: string[];
  familySize: number;
  threshold: number;
  alpha: number;
  confidence: number;
  rows: AnytimeRobustWitnessRow[];
  certificationStatus: "CERTIFIED_WITNESS_FOUND" | "NO_CERTIFIED_WITNESS";
  search: ExactWitnessSearchResult;
  errorAllocation: {
    acrossSubsets: "uniform-bonferroni";
    acrossTime: "1/(t(t+1))";
    totalErrorBudget: number;
  };
  assumptions: string[];
  limitations: string[];
}

export interface AnytimeRobustWitnessOptions {
  dimensions: readonly string[];
  counts: readonly RepeatedSufficiencyCountRow[];
  threshold: number;
  alpha?: number;
  maxDimensions?: number;
}

const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const subsetKey = (subset: readonly string[]): string =>
  JSON.stringify([...subset].sort(compare));

function probability(value: number, name: string, endpoints: boolean): void {
  const valid =
    Number.isFinite(value) &&
    (endpoints ? value >= 0 && value <= 1 : value > 0 && value < 1);
  if (!valid) throw new Error(`${name} must be ${endpoints ? "in [0,1]" : "in (0,1)"}`);
}

/**
 * One-sided time-uniform Hoeffding lower bound obtained by allocating
 * alpha/(m*t*(t+1)) to subset/time pair (S,t). Since sum_t 1/(t(t+1))=1,
 * a union bound gives simultaneous coverage over all declared subsets and
 * all positive sample sizes.
 */
export function anytimeHoeffdingBernoulliLowerBound({
  successes,
  trials,
  alpha,
  familySize,
}: {
  successes: number;
  trials: number;
  alpha: number;
  familySize: number;
}): { lowerBound: number; allocatedError: number | null } {
  probability(alpha, "alpha", false);
  if (!Number.isSafeInteger(familySize) || familySize <= 0) {
    throw new Error("familySize must be a positive safe integer");
  }
  if (!Number.isSafeInteger(trials) || trials < 0) {
    throw new Error("trials must be a non-negative safe integer");
  }
  if (
    !Number.isSafeInteger(successes) ||
    successes < 0 ||
    successes > trials
  ) {
    throw new Error("successes must be an integer in [0,trials]");
  }
  if (trials === 0) {
    return { lowerBound: 0, allocatedError: null };
  }
  const allocatedError = alpha / (familySize * trials * (trials + 1));
  if (!Number.isFinite(allocatedError) || allocatedError <= 0) {
    throw new Error("time-uniform error allocation underflowed or became invalid");
  }
  const empirical = successes / trials;
  const radius = Math.sqrt(Math.log(1 / allocatedError) / (2 * trials));
  return {
    lowerBound: Math.max(0, Math.min(1, empirical - radius)),
    allocatedError,
  };
}

function normalizeAllowingZeroTrials({
  dimensions,
  counts,
  maxDimensions,
}: AnytimeRobustWitnessOptions): ReturnType<
  typeof normalizeRepeatedSufficiencyCountFamily
> {
  // The fixed-trial normalizer requires positive trial counts. For an anytime
  // study, zero observations are a valid initial state and receive bound zero.
  // Temporarily map zero-count rows to one observed failure for structural
  // validation, then restore the original counts after normalization.
  const structural = counts.map((row) => ({
    subset: [...row.subset],
    successes: row.trials === 0 ? 0 : row.successes,
    trials: row.trials === 0 ? 1 : row.trials,
  }));
  for (const [index, row] of counts.entries()) {
    if (!Number.isSafeInteger(row.trials) || row.trials < 0) {
      throw new Error(`counts[${index}].trials must be a non-negative safe integer`);
    }
    if (
      !Number.isSafeInteger(row.successes) ||
      row.successes < 0 ||
      row.successes > row.trials
    ) {
      throw new Error(`counts[${index}].successes must be an integer in [0,trials]`);
    }
  }
  const normalized = normalizeRepeatedSufficiencyCountFamily({
    dimensions,
    counts: structural,
    maxDimensions,
  });
  const originals = new Map(
    counts.map((row) => [subsetKey(row.subset), { ...row, subset: [...row.subset].sort(compare) }])
  );
  return {
    ...normalized,
    rows: normalized.rows.map((row) => {
      const original = originals.get(subsetKey(row.subset));
      if (!original) throw new Error(`missing original anytime count row for ${subsetKey(row.subset)}`);
      return original;
    }),
  };
}

export function findAnytimeValidRobustProtocolWitnesses({
  dimensions,
  counts,
  threshold,
  alpha = 0.05,
  maxDimensions = 20,
}: AnytimeRobustWitnessOptions): AnytimeRobustWitnessResult {
  probability(threshold, "threshold", true);
  probability(alpha, "alpha", false);
  const family = normalizeAllowingZeroTrials({
    dimensions,
    counts,
    threshold,
    alpha,
    maxDimensions,
  });
  const rows = family.rows.map((row): AnytimeRobustWitnessRow => {
    const bound = anytimeHoeffdingBernoulliLowerBound({
      successes: row.successes,
      trials: row.trials,
      alpha,
      familySize: family.familySize,
    });
    return {
      subset: [...row.subset],
      successes: row.successes,
      trials: row.trials,
      empiricalProbability: row.trials === 0 ? null : row.successes / row.trials,
      timeIndex: row.trials,
      allocatedError: bound.allocatedError,
      anytimeLowerBound: bound.lowerBound,
      threshold,
      robustlyCertified: bound.lowerBound >= threshold,
    };
  });
  const rowByKey = new Map(rows.map((row) => [subsetKey(row.subset), row]));
  const search = exactWitnessSearch({
    dimensions: family.dimensions,
    mode: "landscape",
    maxEvaluations: family.familySize,
    isSufficient: (subset) => {
      const row = rowByKey.get(subsetKey(subset));
      if (!row) throw new Error(`missing anytime robust row for ${subsetKey(subset)}`);
      return row.robustlyCertified;
    },
  });
  return {
    kind: "AnytimeRobustProtocolWitnessResult",
    version: ANYTIME_ROBUST_WITNESS_VERSION,
    method: ANYTIME_ROBUST_WITNESS_METHOD,
    estimand: "probability-of-reproducing-predeclared-target-conclusion",
    dimensions: [...family.dimensions],
    familySize: family.familySize,
    threshold,
    alpha,
    confidence: 1 - alpha,
    rows,
    certificationStatus:
      search.status === "FOUND"
        ? "CERTIFIED_WITNESS_FOUND"
        : "NO_CERTIFIED_WITNESS",
    search,
    errorAllocation: {
      acrossSubsets: "uniform-bonferroni",
      acrossTime: "1/(t(t+1))",
      totalErrorBudget: alpha,
    },
    assumptions: [
      "The target conclusion, robustness threshold, and complete finite subset family were fixed before monitoring began.",
      "Within each subset, the observed target-reproduction sequence is i.i.d. Bernoulli under a stable evaluation regime.",
      "Adaptive allocation and stopping use only information available before future outcomes and do not selectively delete attempted runs.",
    ],
    limitations: [
      "The time-uniform union-bound construction is highly conservative, especially with large families or high thresholds.",
      "NO_CERTIFIED_WITNESS means current lower bounds do not certify a subset; it does not prove no truly robust subset exists.",
      "The guarantee does not cover an adaptively changed target, threshold, protocol schema, or failure policy.",
      "The result remains descriptive and conditional, not causal attribution.",
    ],
  };
}
