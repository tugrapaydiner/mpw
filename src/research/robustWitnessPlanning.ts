import { bonferroniClopperPearsonLowerBound } from "./binomialBounds.js";
import { anytimeHoeffdingBernoulliLowerBound } from "./anytimeRobustWitness.js";
import { hoeffdingBernoulliLowerBound } from "./robustWitness.js";

export type RobustWitnessPlanningMethod =
  | "fixed-hoeffding"
  | "fixed-clopper-pearson"
  | "anytime-hoeffding";

export interface RobustWitnessBestCasePlan {
  kind: "RobustWitnessBestCasePlan";
  version: 1;
  method: RobustWitnessPlanningMethod;
  threshold: number;
  alpha: number;
  familySize: number;
  minimumTrials: number;
  lowerBoundAtMinimum: number;
  lowerBoundBeforeMinimum: number | null;
  interpretation: string;
}

export const MAX_PLANNED_ROBUST_WITNESS_TRIALS = 100_000_000;

function validate({
  threshold,
  alpha,
  familySize,
  maxTrials,
}: {
  threshold: number;
  alpha: number;
  familySize: number;
  maxTrials: number;
}): void {
  if (!Number.isFinite(threshold) || threshold < 0 || threshold >= 1) {
    throw new Error("threshold must be in [0,1)");
  }
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new Error("alpha must be in (0,1)");
  }
  if (!Number.isSafeInteger(familySize) || familySize <= 0) {
    throw new Error("familySize must be a positive safe integer");
  }
  if (
    !Number.isSafeInteger(maxTrials) ||
    maxTrials <= 0 ||
    maxTrials > MAX_PLANNED_ROBUST_WITNESS_TRIALS
  ) {
    throw new Error(
      `maxTrials must be an integer in [1,${MAX_PLANNED_ROBUST_WITNESS_TRIALS}]`
    );
  }
}

function lowerBound(
  method: RobustWitnessPlanningMethod,
  trials: number,
  alpha: number,
  familySize: number
): number {
  if (method === "fixed-hoeffding") {
    return hoeffdingBernoulliLowerBound(
      trials,
      trials,
      alpha / familySize
    );
  }
  if (method === "fixed-clopper-pearson") {
    return bonferroniClopperPearsonLowerBound(
      trials,
      trials,
      alpha,
      familySize
    );
  }
  if (method === "anytime-hoeffding") {
    return anytimeHoeffdingBernoulliLowerBound({
      successes: trials,
      trials,
      alpha,
      familySize,
    }).lowerBound;
  }
  throw new Error(`unknown planning method: ${String(method)}`);
}

function analyticStartingPoint(
  method: RobustWitnessPlanningMethod,
  threshold: number,
  alpha: number,
  familySize: number
): number {
  if (threshold === 0) return 1;
  if (method === "fixed-clopper-pearson") {
    return Math.max(
      1,
      Math.ceil(Math.log(alpha / familySize) / Math.log(threshold))
    );
  }
  if (method === "fixed-hoeffding") {
    return Math.max(
      1,
      Math.ceil(
        Math.log(familySize / alpha) /
          (2 * (1 - threshold) * (1 - threshold))
      )
    );
  }
  return 1;
}

/**
 * Finds the smallest fixed or monitored trial count at which the most
 * favorable possible data sequence (all successes) can certify p>=threshold.
 * This is a feasibility lower bound, not a power calculation.
 */
export function minimumBestCaseRobustWitnessTrials({
  method,
  threshold,
  alpha = 0.05,
  familySize,
  maxTrials = MAX_PLANNED_ROBUST_WITNESS_TRIALS,
}: {
  method: RobustWitnessPlanningMethod;
  threshold: number;
  alpha?: number;
  familySize: number;
  maxTrials?: number;
}): RobustWitnessBestCasePlan {
  if (
    method !== "fixed-hoeffding" &&
    method !== "fixed-clopper-pearson" &&
    method !== "anytime-hoeffding"
  ) {
    throw new Error(`unknown planning method: ${String(method)}`);
  }
  validate({ threshold, alpha, familySize, maxTrials });
  let high = Math.min(
    maxTrials,
    analyticStartingPoint(method, threshold, alpha, familySize)
  );
  while (lowerBound(method, high, alpha, familySize) < threshold) {
    if (high >= maxTrials) {
      throw new Error(
        `best-case certification is impossible within maxTrials=${maxTrials}`
      );
    }
    high = Math.min(maxTrials, high * 2);
  }
  let low = 1;
  while (low < high) {
    const midpoint = Math.floor((low + high) / 2);
    if (lowerBound(method, midpoint, alpha, familySize) >= threshold) {
      high = midpoint;
    } else {
      low = midpoint + 1;
    }
  }
  const minimumTrials = low;
  const lowerBoundAtMinimum = lowerBound(
    method,
    minimumTrials,
    alpha,
    familySize
  );
  const lowerBoundBeforeMinimum =
    minimumTrials === 1
      ? null
      : lowerBound(method, minimumTrials - 1, alpha, familySize);
  return {
    kind: "RobustWitnessBestCasePlan",
    version: 1,
    method,
    threshold,
    alpha,
    familySize,
    minimumTrials,
    lowerBoundAtMinimum,
    lowerBoundBeforeMinimum,
    interpretation:
      "This is the minimum count at which an all-success sequence can clear the registered familywise threshold. Real studies generally need more runs; this is not a power or expected-sample-size calculation.",
  };
}
