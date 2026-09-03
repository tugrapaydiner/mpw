// mechanistic item simulator, hashed draws, no order dependence
import { buildBenchmarkItems, protocolForSubset } from "./mpwFixture.js";
import { hashSeedString, stratifiedPairedBootstrap, classifyBootstrap, BOOT_SEED } from "./mpwCore.js";
import type { BenchmarkItem, Conclusion, Outcome, Protocol, Subset } from "../types";

export const SIM_SEED = "mpw-canonical-v1";
export const SIM_VERSION = "mpw-sim/1";

type ModelName = "MODEL_A" | "MODEL_B";

interface ModelProfile {
  base: number;
  efficiency: number;
  reliability: number;
  retry: number;
  tool: number;
}

export const MODEL_PROFILE: Record<ModelName, ModelProfile> = {
  MODEL_A: { base: 0.92, efficiency: 0.35, reliability: 0.92, retry: 0.55, tool: 0.55 },
  MODEL_B: { base: 0.79, efficiency: 0.88, reliability: 0.94, retry: 0.5, tool: 0.62 },
};

interface StratumTemplate {
  diff: number;
  demand: number;
  frag: number;
  need: number;
  rec: number;
}

export const STRATUM_TEMPLATE: Record<string, StratumTemplate> = {
  "multi-step-reasoning": { diff: 0.35, demand: 0.9, frag: 0.3, need: 0.1, rec: 0.6 },
  "quantitative-reasoning": { diff: 0.35, demand: 0.85, frag: 0.35, need: 0.15, rec: 0.6 },
  "instruction-following": { diff: 0.25, demand: 0.3, frag: 0.8, need: 0.05, rec: 0.4 },
  "tool-reasoning": { diff: 0.3, demand: 0.5, frag: 0.4, need: 0.9, rec: 0.5 },
};

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const u01 = (...parts: Array<string | number>): number => hashSeedString(parts.join("|")) / 4294967296;

export interface ItemAttrs {
  difficulty: number;
  demand: number;
  fragility: number;
  recoverability: number;
  toolNeeded: boolean;
}

export function itemAttrs(item: BenchmarkItem, seed: string = SIM_SEED): ItemAttrs {
  const t = STRATUM_TEMPLATE[item.stratum];
  const j = (k: string, w: number): number => (u01(seed, "attr", item.id, k) - 0.5) * w;
  return {
    difficulty: clamp01(t.diff + j("diff", 0.2)),
    demand: clamp01(t.demand + j("demand", 0.2)),
    fragility: clamp01(t.frag + j("frag", 0.2)),
    recoverability: clamp01(t.rec + j("rec", 0.2)),
    toolNeeded: u01(seed, "attr", item.id, "need") < t.need,
  };
}

export interface ItemReceipt {
  id: string;
  model: string;
  stratum: string;
  pSem: number;
  pCan: number;
  semanticCorrect: boolean;
  canonical: boolean;
  parserAccepts: boolean;
  firstCorrect: boolean;
  retried: boolean;
  recovered: boolean;
  finalCorrect: boolean;
}

export function simulateItem(model: ModelName, item: BenchmarkItem, protocol: Protocol, seed: string = SIM_SEED): ItemReceipt {
  const p = MODEL_PROFILE[model];
  const at = itemAttrs(item, seed);
  const budgetFactor = clamp01(protocol.reasoning_budget / 8192);
  const reasonPenalty = at.demand * (1 - budgetFactor) * (1 - p.efficiency);
  const toolPenalty =
    at.toolNeeded && protocol.tool_access === "restricted" ? (1 - p.tool) * 0.4 : 0;
  const pSem = clamp01(p.base - at.difficulty * 0.45 - reasonPenalty - toolPenalty);
  const pCan = clamp01(p.reliability - at.fragility * 0.1);

  const sem = u01(seed, item.id, model, "sem") < pSem;
  const canonical = u01(seed, item.id, model, "fmt") < pCan;
  const accepts = canonical || protocol.answer_parser === "tolerant";
  const first = sem && accepts;

  let retried = false;
  let recovered = false;
  let final = first;
  if (!first && protocol.retry_policy === "one-retry") {
    retried = true;
    if (u01(seed, item.id, model, "retry") < p.retry * at.recoverability) {
      const canonical2 = u01(seed, item.id, model, "fmt2") < pCan;
      const accepts2 = canonical2 || protocol.answer_parser === "tolerant";
      recovered = accepts2;
      final = accepts2;
    }
  }
  return {
    id: item.id,
    model,
    stratum: item.stratum,
    pSem,
    pCan,
    semanticCorrect: sem,
    canonical,
    parserAccepts: accepts,
    firstCorrect: first,
    retried,
    recovered,
    finalCorrect: final,
  };
}

export function simulateForSubset(subset: Subset, { seed = SIM_SEED }: { seed?: string } = {}): Outcome[] {
  const protocol = protocolForSubset(subset);
  return buildBenchmarkItems().map((it) => {
    const rA = simulateItem("MODEL_A", it, protocol, seed);
    const rB = simulateItem("MODEL_B", it, protocol, seed);
    const a = (rA.finalCorrect ? 1 : 0) as 0 | 1;
    const b = (rB.finalCorrect ? 1 : 0) as 0 | 1;
    return { id: it.id, stratum: it.stratum, a, b, diff: a - b };
  });
}

export function evaluateSubset(subset: Subset, opts?: { seed?: string }) {
  const outcomes = simulateForSubset(subset, opts);
  const n = outcomes.length;
  let sA = 0;
  let sB = 0;
  for (const o of outcomes) {
    sA += o.a;
    sB += o.b;
  }
  const boot = stratifiedPairedBootstrap(outcomes, { seed: BOOT_SEED });
  const { conclusion } = classifyBootstrap(boot);
  const stats = {
    n,
    accA: sA / n,
    accB: sB / n,
    mean: boot.mean,
    ciLow: boot.ciLow,
    ciHigh: boot.ciHigh,
    replicates: boot.replicates,
    seed: boot.seed,
    method: boot.method,
  };
  return { subset: [...subset], protocol: protocolForSubset(subset), outcomes, stats, conclusion: conclusion as Conclusion };
}

export function conclusionForSubset(subset: Subset, opts?: { seed?: string }): Conclusion {
  return evaluateSubset(subset, opts).conclusion;
}
