// I simulate 400 paired items from per-item thresholds. Nothing here names a winner.
import { buildBenchmarkItems, protocolForSubset, LAB_A_PROTOCOL } from "./mpwFixture.js";
import { mulberry32, hashSeedString, pairedStats, classifyConclusion } from "./mpwCore.js";

export const SIM_SEED = "mpw-canonical-v1";

// I keep base rates per stratum under Lab A.
const BASE_ACC = {
  "multi-step-reasoning": { a: 0.82, b: 0.68 },
  "quantitative-reasoning": { a: 0.8, b: 0.67 },
  "instruction-following": { a: 0.84, b: 0.72 },
  "tool-reasoning": { a: 0.74, b: 0.61 },
};

// I model each Lab B setting as a small per-item hit to success chance.
const DIM_EFFECT = {
  reasoning_budget: { a: -0.26, b: -0.03 },
  answer_parser: { a: -0.06, b: -0.01 },
  retry_policy: { a: -0.02, b: -0.005 },
  tool_access: { a: -0.025, b: -0.01 },
};

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// I use one fixed uniform per model per item so protocols share the same draw.
export function simulateForSubset(subset, { seed = SIM_SEED } = {}) {
  const protocol = protocolForSubset(subset);
  const items = buildBenchmarkItems();
  const rand = mulberry32(hashSeedString(String(seed)));
  const draws = items.map(() => ({ uA: rand(), uB: rand() }));
  return items.map((it, i) => {
    let pA = BASE_ACC[it.stratum].a;
    let pB = BASE_ACC[it.stratum].b;
    for (const d of subset) {
      pA += DIM_EFFECT[d].a;
      pB += DIM_EFFECT[d].b;
    }
    pA = clamp01(pA);
    pB = clamp01(pB);
    const a = draws[i].uA < pA ? 1 : 0;
    const b = draws[i].uB < pB ? 1 : 0;
    return { id: it.id, stratum: it.stratum, a, b, diff: b - a, pA, pB };
  });
}

// I score a subset with my shared stats + conclusion rule.
export function evaluateSubset(subset, opts) {
  const outcomes = simulateForSubset(subset, opts);
  const diffs = outcomes.map((o) => o.diff);
  const stats = pairedStats(diffs);
  const { conclusion } = classifyConclusion(stats);
  return { subset: [...subset], protocol: protocolForSubset(subset), outcomes, stats, conclusion };
}

export function conclusionForSubset(subset, opts) {
  return evaluateSubset(subset, opts).conclusion;
}
