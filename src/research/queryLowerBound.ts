import { exactWitnessSearch } from "./search.js";

export const MAX_ENUMERATED_CERTIFICATE_DIMENSIONS = 20;
export const MAX_FORMULA_DIMENSIONS = 4096;

function validateN(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_FORMULA_DIMENSIONS) {
    throw new Error(`n must be a safe integer in [0,${MAX_FORMULA_DIMENSIONS}]`);
  }
}

export function binomialCoefficientBigInt(n: number, k: number): bigint {
  validateN(n);
  if (!Number.isSafeInteger(k) || k < 0 || k > n) return 0n;
  const reduced = Math.min(k, n - k);
  let result = 1n;
  for (let index = 1; index <= reduced; index++) {
    result = (result * BigInt(n - reduced + index)) / BigInt(index);
  }
  return result;
}

/**
 * Worst-case black-box query lower bound for proving that the global minimum
 * cardinality is k and returning every co-minimum witness. Every subset of
 * size less than k and every subset of size k must be resolved.
 */
export function minimumWitnessCertificateQueryLowerBound(n: number, k: number): bigint {
  validateN(n);
  if (!Number.isSafeInteger(k) || k < 0 || k > n) {
    throw new Error("k must be an integer in [0,n]");
  }
  let total = 0n;
  for (let cardinality = 0; cardinality <= k; cardinality++) {
    total += binomialCoefficientBigInt(n, cardinality);
  }
  return total;
}

/**
 * Worst-case black-box lower bound for proving that no sufficient subset
 * exists when the sufficiency map is arbitrary and non-monotone.
 */
export function noWitnessCertificateQueryLowerBound(n: number): bigint {
  validateN(n);
  return 1n << BigInt(n);
}

const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function normalizeDimensions(dimensions: readonly string[]): string[] {
  if (!Array.isArray(dimensions)) throw new Error("dimensions must be an array");
  if (dimensions.length > MAX_ENUMERATED_CERTIFICATE_DIMENSIONS) {
    throw new Error(
      `coverage enumeration supports at most ${MAX_ENUMERATED_CERTIFICATE_DIMENSIONS} dimensions`
    );
  }
  const seen = new Set<string>();
  for (const dimension of dimensions) {
    if (typeof dimension !== "string" || dimension.length === 0) {
      throw new Error("dimensions must be non-empty strings");
    }
    if (seen.has(dimension)) throw new Error(`duplicate dimension: ${dimension}`);
    seen.add(dimension);
  }
  return [...seen].sort(compare);
}

function normalizeSubset(subset: readonly string[], dimensions: readonly string[]): string[] {
  if (!Array.isArray(subset)) throw new Error("queried subsets must be arrays");
  const allowed = new Set(dimensions);
  const seen = new Set<string>();
  for (const dimension of subset) {
    if (typeof dimension !== "string" || !allowed.has(dimension)) {
      throw new Error(`unknown queried dimension: ${String(dimension)}`);
    }
    if (seen.has(dimension)) throw new Error(`duplicate queried dimension: ${dimension}`);
    seen.add(dimension);
  }
  return [...seen].sort(compare);
}

const subsetKey = (subset: readonly string[]): string => JSON.stringify([...subset].sort(compare));

function subsetsThroughCardinality(dimensions: readonly string[], maximum: number): string[][] {
  const count = 2 ** dimensions.length;
  const subsets: string[][] = [];
  for (let mask = 0; mask < count; mask++) {
    const subset = dimensions.filter((_, index) => (mask & (1 << index)) !== 0);
    if (subset.length <= maximum) subsets.push(subset);
  }
  return subsets.sort(
    (left, right) =>
      left.length - right.length || compare(subsetKey(left), subsetKey(right))
  );
}

export interface MinimumCertificateCoverage {
  kind: "MinimumWitnessCertificateCoverage";
  version: 1;
  dimensions: string[];
  claimedMinimumCardinality: number | null;
  queriedSubsets: number;
  requiredSubsets: number;
  requiredQueryCountExact: string;
  complete: boolean;
  missingSubsets: string[][];
  theoremScope: "arbitrary-black-box-non-monotone-sufficiency";
}

/**
 * Checks only query coverage. It does not inspect the returned Boolean values;
 * a scientific verifier must separately check sufficiency labels and winners.
 */
export function assessMinimumCertificateCoverage({
  dimensions: rawDimensions,
  queriedSubsets,
  claimedMinimumCardinality,
}: {
  dimensions: readonly string[];
  queriedSubsets: readonly (readonly string[])[];
  claimedMinimumCardinality: number | null;
}): MinimumCertificateCoverage {
  const dimensions = normalizeDimensions(rawDimensions);
  if (!Array.isArray(queriedSubsets)) throw new Error("queriedSubsets must be an array");
  if (
    claimedMinimumCardinality !== null &&
    (!Number.isSafeInteger(claimedMinimumCardinality) ||
      claimedMinimumCardinality < 0 ||
      claimedMinimumCardinality > dimensions.length)
  ) {
    throw new Error("claimedMinimumCardinality must be null or an integer in [0,n]");
  }
  const normalizedQueries = queriedSubsets.map((subset) => normalizeSubset(subset, dimensions));
  const queryKeys = new Set<string>();
  for (const subset of normalizedQueries) {
    const key = subsetKey(subset);
    if (queryKeys.has(key)) throw new Error(`duplicate queried subset: ${key}`);
    queryKeys.add(key);
  }
  const maximum = claimedMinimumCardinality ?? dimensions.length;
  const required = subsetsThroughCardinality(dimensions, maximum);
  const missingSubsets = required.filter((subset) => !queryKeys.has(subsetKey(subset)));
  const lowerBound =
    claimedMinimumCardinality === null
      ? noWitnessCertificateQueryLowerBound(dimensions.length)
      : minimumWitnessCertificateQueryLowerBound(
          dimensions.length,
          claimedMinimumCardinality
        );
  return {
    kind: "MinimumWitnessCertificateCoverage",
    version: 1,
    dimensions,
    claimedMinimumCardinality,
    queriedSubsets: queryKeys.size,
    requiredSubsets: required.length,
    requiredQueryCountExact: lowerBound.toString(),
    complete: missingSubsets.length === 0,
    missingSubsets,
    theoremScope: "arbitrary-black-box-non-monotone-sufficiency",
  };
}

/**
 * Executable sanity check that the repository's cardinality-ordered minimum
 * search meets the black-box certificate lower bound on a landscape whose
 * first sufficient level is exactly k.
 */
export function demonstrateTightCardinalityBound(n: number, k: number): {
  evaluatedSubsets: number;
  lowerBoundExact: string;
  tight: boolean;
} {
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_ENUMERATED_CERTIFICATE_DIMENSIONS) {
    throw new Error(`n must be in [0,${MAX_ENUMERATED_CERTIFICATE_DIMENSIONS}]`);
  }
  if (!Number.isSafeInteger(k) || k < 0 || k > n) {
    throw new Error("k must be an integer in [0,n]");
  }
  const dimensions = Array.from({ length: n }, (_, index) => `d${index}`);
  const result = exactWitnessSearch({
    dimensions,
    mode: "minimum",
    maxEvaluations: Number(minimumWitnessCertificateQueryLowerBound(n, k)),
    isSufficient: (subset) => subset.length === k,
  });
  const lowerBound = minimumWitnessCertificateQueryLowerBound(n, k);
  return {
    evaluatedSubsets: result.evaluatedSubsets,
    lowerBoundExact: lowerBound.toString(),
    tight: BigInt(result.evaluatedSubsets) === lowerBound,
  };
}
