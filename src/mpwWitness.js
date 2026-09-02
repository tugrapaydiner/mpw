// mpwWitness.js — deterministic global-minimum witness search.
// I implement docs/MPW_DEFINITION.md exactly: globally minimum-cardinality,
// not inclusion-minimal, returning ALL co-minimum witnesses.
// Pure: no DOM, no WebMCP, no network, no randomness, no clock.
// The sufficiency predicate must be deterministic code (it will call mpwCore),
// never LLM judgment.

const MAX_DIMENSIONS = 20;

export function binomialCoefficient(n, k) {
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

function validateDimensions(exposedDimensions) {
  if (!Array.isArray(exposedDimensions)) throw new Error("exposedDimensions must be an array");
  if (exposedDimensions.length > MAX_DIMENSIONS)
    throw new Error(
      `too many exposed dimensions for exhaustive proof (n=${exposedDimensions.length}, max=${MAX_DIMENSIONS}); group them first`
    );
  const seen = new Set();
  for (const d of exposedDimensions) {
    if (typeof d !== "string" || d.length === 0)
      throw new Error("every exposed dimension must be a non-empty string");
    if (seen.has(d)) throw new Error(`duplicate exposed dimension: ${d}`);
    seen.add(d);
  }
  // I sort so enumeration order is deterministic regardless of input order.
  return [...exposedDimensions].sort();
}

// I yield index-combinations of size k in lexicographic order (deterministic).
function* indexCombinations(n, k) {
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

// isSufficient(subset) must be a pure deterministic (subset: string[]) => boolean.
// I pass a fresh array each call so the predicate can't mutate my enumeration state.
export function findMinimumWitnesses({ exposedDimensions, isSufficient }) {
  const sortedDimensions = validateDimensions(exposedDimensions);
  if (typeof isSufficient !== "function") throw new Error("isSufficient must be a function");
  const n = sortedDimensions.length;
  const totalSubsets = 2 ** n;
  let checkedCount = 0;
  const searchedCardinalities = [];

  for (let k = 0; k <= n; k++) {
    searchedCardinalities.push(k);
    const winnersAtK = [];
    for (const combo of indexCombinations(n, k)) {
      const subset = combo.map((i) => sortedDimensions[i]);
      const verdict = isSufficient([...subset]);
      if (typeof verdict !== "boolean")
        throw new Error("isSufficient must return a boolean");
      checkedCount++;
      if (verdict) winnersAtK.push(subset);
    }
    if (winnersAtK.length > 0) {
      // I finished all of size k and everything smaller failed, so k is the
      // global minimum. Larger sizes can't beat it, so I stop — proof holds
      // without checking them. I return every tie at k.
      const minimumWitnesses = winnersAtK.map((w) => [...w]);
      const coMinimumWitnesses = winnersAtK.map((w) => [...w]);
      return {
        minimumCardinality: k,
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
    minimumCardinality: null,
    minimumWitnesses: [],
    coMinimumWitnesses: [],
    status: "none-sufficient",
    checkedCount,
    totalSubsets,
    searchedCardinalities: [...searchedCardinalities],
    exhaustive: true,
    sortedDimensions: [...sortedDimensions],
  };
}
