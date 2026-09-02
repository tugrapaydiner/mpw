// mpwFixture.js — fixed synthetic fixture for the Lab A vs Lab B dispute.
// All settings here are synthetic protocol settings, not claims about real
// commercial models. Pure data + deterministic builders: no DOM, no WebMCP,
// no network, no randomness, no clock.

// Two synthetic models tested on one synthetic benchmark. Trust neither report;
// my deterministic code below reconstructs everything from this fixture.
export const MODELS = ["MODEL_A", "MODEL_B"];

// 400 paired benchmark items, 100 per stratum, fixed order.
export const STRATA = [
  { name: "multi-step-reasoning", count: 100 },
  { name: "quantitative-reasoning", count: 100 },
  { name: "instruction-following", count: 100 },
  { name: "tool-reasoning", count: 100 },
];

export const NUM_ITEMS = 400;
export const NUM_COMBINATIONS = 16;

// Four binary exposed protocol dimensions. A subset S means "adopt Lab B's
// value for exactly these dimensions on top of Lab A".
export const EXPOSED_DIMENSIONS = [
  "reasoning_budget",
  "answer_parser",
  "retry_policy",
  "tool_access",
];

// Canonical Lab A protocol (synthetic).
export const LAB_A_PROTOCOL = {
  reasoning_budget: 8192, // high
  answer_parser: "tolerant",
  retry_policy: "one-retry",
  tool_access: "standard",
};

// Canonical Lab B protocol (synthetic).
export const LAB_B_PROTOCOL = {
  reasoning_budget: 2048, // low
  answer_parser: "strict",
  retry_policy: "no-retry",
  tool_access: "restricted",
};

export const REASONING_BUDGET_LABELS = {
  8192: "high",
  2048: "low",
};

export function buildBenchmarkItems() {
  const items = [];
  let globalIndex = 0;
  for (const stratum of STRATA) {
    for (let i = 0; i < stratum.count; i++) {
      items.push({
        id: `item-${String(globalIndex).padStart(3, "0")}`,
        stratum: stratum.name,
        indexInStratum: i,
        globalIndex,
      });
      globalIndex++;
    }
  }
  return items;
}

function checkSubset(subset) {
  if (!Array.isArray(subset)) throw new Error("subset must be an array");
  const seen = new Set();
  for (const d of subset) {
    if (!EXPOSED_DIMENSIONS.includes(d)) throw new Error(`unknown protocol dimension: ${d}`);
    if (seen.has(d)) throw new Error(`duplicate protocol dimension: ${d}`);
    seen.add(d);
  }
}

// I start from Lab A and adopt Lab B's value for exactly the dims in subset.
// [] gives Lab A, all four gives Lab B, anything else gives a hybrid.
export function protocolForSubset(subset) {
  checkSubset(subset);
  const protocol = { ...LAB_A_PROTOCOL };
  for (const d of subset) protocol[d] = LAB_B_PROTOCOL[d];
  return protocol;
}

// All 2^4 = 16 exposed protocol combinations, ordered by cardinality then
// lexicographic (deterministic). Each entry: { subset, protocol }.
export function listAllProtocolCombinations() {
  const sorted = [...EXPOSED_DIMENSIONS].sort();
  const out = [];
  const n = sorted.length;
  const rec = (start, chosen) => {
    out.push({
      subset: [...chosen],
      protocol: protocolForSubset(chosen),
    });
    for (let i = start; i < n; i++) {
      chosen.push(sorted[i]);
      rec(i + 1, chosen);
      chosen.pop();
    }
  };
  rec(0, []);
  out.sort((a, b) => a.subset.length - b.subset.length || a.subset.join(",").localeCompare(b.subset.join(",")));
  return out;
}
