// deterministic global-minimum witness search. all co-minimums, never one pick.
import type { Subset } from "./types.js";

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
  if (exposedDimensions.length > MAX_DIMENSIONS)
    throw new Error(
      `too many exposed dimensions for exhaustive proof (n=${exposedDimensions.length}, max=${MAX_DIMENSIONS}); group them first`
    );
  const seen = new Set<string>();
  for (const d of exposedDimensions) {
    if (typeof d !== "string" || d.length === 0)
      throw new Error("every exposed dimension must be a non-empty string");
    if (seen.has(d)) throw new Error(`duplicate exposed dimension: ${d}`);
    seen.add(d);
  }
  return [...exposedDimensions].sort();
}

function* indexCombinations(n: number, k: number): Generator<number[]> {
  if (k === 0) {
    yield [];
    return;
  }
  const idx = Array.from({ length: k }, (_, i) => i);
  for (;;) {
    yield [...idx];
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
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
  const n = sortedDimensions.length;
  const totalSubsets = 2 ** n;
  let checkedCount = 0;
  const searchedCardinalities: number[] = [];

  for (let k = 0; k <= n; k++) {
    searchedCardinalities.push(k);
    const winnersAtK: Subset[] = [];
    for (const combo of indexCombinations(n, k)) {
      const subset = combo.map((i) => sortedDimensions[i]);
      const verdict = isSufficient([...subset]);
      if (typeof verdict !== "boolean") throw new Error("isSufficient must return a boolean");
      checkedCount++;
      if (verdict) winnersAtK.push(subset);
    }
    if (winnersAtK.length > 0) {
      const minimumWitnesses = winnersAtK.map((w) => [...w]);
      const coMinimumWitnesses = winnersAtK.map((w) => [...w]);
      return {
        minimumCardinality: k as number | null,
        minimumWitnesses,
        coMinimumWitnesses,
        status: "found",
        checkedCount,
        totalSubsets,
        searchedCardinalities: [...searchedCardinalities],
        exhaustive: true,
        sortedDimensions: [...sortedDimensions],
      };
    }
  }

  return {
    minimumCardinality: null as number | null,
    minimumWitnesses: [] as Subset[],
    coMinimumWitnesses: [] as Subset[],
    status: "none-sufficient",
    checkedCount,
    totalSubsets,
    searchedCardinalities: [...searchedCardinalities],
    exhaustive: true,
    sortedDimensions: [...sortedDimensions],
  };
}
