// Compatibility wrapper for the original engine API. The generic research
// search owns the proof semantics; this module preserves the canonical caller
// shape while exposing whether only the minimum layer or the full landscape
// was actually evaluated.
import type { Subset } from "../types";
import { exactWitnessSearch } from "../research/search.js";

const MAX_DIMENSIONS = 20;

export function binomialCoefficient(n: number, k: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error("n must be a non-negative integer");
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  let kk = k;
  if (kk > n - kk) kk = n - kk;
  let out = 1;
  for (let i = 0; i < kk; i++) {
    out = (out * (n - i)) / (i + 1);
  }
  return Math.round(out);
}

function validateDimensions(exposedDimensions: Subset): Subset {
  if (!Array.isArray(exposedDimensions)) throw new Error("exposedDimensions must be an array");
  if (exposedDimensions.length > MAX_DIMENSIONS) {
    throw new Error(
      `too many exposed dimensions for this compatibility API (n=${exposedDimensions.length}, max=${MAX_DIMENSIONS}); use exactWitnessSearch with an explicit evaluation budget`
    );
  }
  const seen = new Set<string>();
  for (const dimension of exposedDimensions) {
    if (typeof dimension !== "string" || dimension.length === 0) {
      throw new Error("every exposed dimension must be a non-empty string");
    }
    if (seen.has(dimension)) throw new Error(`duplicate exposed dimension: ${dimension}`);
    seen.add(dimension);
  }
  return [...exposedDimensions].sort();
}

export function findMinimumWitnesses({
  exposedDimensions,
  isSufficient,
}: {
  exposedDimensions: Subset;
  isSufficient: (subset: Subset) => boolean;
}) {
  const sortedDimensions = validateDimensions(exposedDimensions);
  if (typeof isSufficient !== "function") throw new Error("isSufficient must be a function");
  const totalSubsets = 2 ** sortedDimensions.length;
  const result = exactWitnessSearch({
    dimensions: sortedDimensions,
    isSufficient: (subset) => isSufficient([...subset] as Subset),
    mode: "minimum",
    maxEvaluations: totalSubsets,
    captureAudit: false,
  });
  const minimumWitnesses = result.minimumWitnesses.map((witness) => [...witness] as Subset);
  return {
    minimumCardinality: result.minimumCardinality,
    minimumWitnesses,
    coMinimumWitnesses: minimumWitnesses.map((witness) => [...witness] as Subset),
    status: result.status === "FOUND" ? "found" : "none-sufficient",
    checkedCount: result.evaluatedSubsets,
    totalSubsets,
    searchedCardinalities: [...result.completedCardinalities],
    // Deprecated compatibility field: true now means every subset was checked.
    exhaustive: result.proof.landscapeExhaustive,
    minimumProven: result.proof.minimumProven,
    coMinimumComplete: result.proof.coMinimumComplete,
    landscapeExhaustive: result.proof.landscapeExhaustive,
    sortedDimensions: [...sortedDimensions],
  };
}
