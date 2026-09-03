// fixed synthetic fixture. all synthetic, not claims about real models.
import type { BenchmarkItem, Conclusion, Protocol, Subset } from "./types.js";

export const MODELS = ["MODEL_A", "MODEL_B"];

export interface Stratum {
  name: string;
  count: number;
}

export const STRATA: Stratum[] = [
  { name: "multi-step-reasoning", count: 100 },
  { name: "quantitative-reasoning", count: 100 },
  { name: "instruction-following", count: 100 },
  { name: "tool-reasoning", count: 100 },
];

export const NUM_ITEMS = 400;
export const NUM_COMBINATIONS = 16;

export const EXPOSED_DIMENSIONS = [
  "reasoning_budget",
  "answer_parser",
  "retry_policy",
  "tool_access",
];

export const LAB_A_PROTOCOL: Protocol = {
  reasoning_budget: 8192,
  answer_parser: "tolerant",
  retry_policy: "one-retry",
  tool_access: "standard",
};

export const LAB_B_PROTOCOL: Protocol = {
  reasoning_budget: 2048,
  answer_parser: "strict",
  retry_policy: "no-retry",
  tool_access: "restricted",
};

export const REASONING_BUDGET_LABELS: Record<number, string> = {
  8192: "high",
  2048: "low",
};

export interface SourcePublication {
  source: string;
  subset: Subset;
  declared: Conclusion;
}

// declared headlines per source pub, checked before any reconciliation
export const SOURCE_PUBLICATIONS: SourcePublication[] = [
  { source: "Lab A", subset: [], declared: "MODEL_A" },
  {
    source: "Lab B",
    subset: ["reasoning_budget", "answer_parser", "retry_policy", "tool_access"],
    declared: "MODEL_B",
  },
];

export function buildBenchmarkItems(): BenchmarkItem[] {
  const items: BenchmarkItem[] = [];
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

function checkSubset(subset: Subset): void {
  if (!Array.isArray(subset)) throw new Error("subset must be an array");
  const seen = new Set<string>();
  for (const d of subset) {
    if (!EXPOSED_DIMENSIONS.includes(d)) throw new Error(`unknown protocol dimension: ${d}`);
    if (seen.has(d)) throw new Error(`duplicate protocol dimension: ${d}`);
    seen.add(d);
  }
}

export function protocolForSubset(subset: Subset): Protocol {
  checkSubset(subset);
  const protocol = { ...LAB_A_PROTOCOL };
  for (const d of subset) protocol[d as keyof Protocol] = LAB_B_PROTOCOL[d as keyof Protocol];
  return protocol;
}

export function listAllProtocolCombinations(): Array<{ subset: Subset; protocol: Protocol }> {
  const sorted = [...EXPOSED_DIMENSIONS].sort();
  const out: Array<{ subset: Subset; protocol: Protocol }> = [];
  const n = sorted.length;
  const rec = (start: number, chosen: Subset): void => {
    out.push({ subset: [...chosen], protocol: protocolForSubset(chosen) });
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
