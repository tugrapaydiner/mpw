// single service for ui + tools, same engine underneath
import { MODELS, STRATA, NUM_ITEMS, EXPOSED_DIMENSIONS, LAB_A_PROTOCOL, LAB_B_PROTOCOL, SOURCE_PUBLICATIONS } from "./mpwFixture.js";
import { SIM_SEED, evaluateSubset, simulateItem } from "./mpwSimulator.js";
import { BOOT_SEED, BOOT_REPLICATES } from "./mpwCore.js";
import { verifyCandidateWitness } from "./mpwVerify.js";
import { buildBenchmarkItems } from "./mpwFixture.js";
import type { Subset } from "./types.js";

const DIMS = [...EXPOSED_DIMENSIONS];

function checkSubset(subset: unknown): Subset {
  if (!Array.isArray(subset)) throw new Error("subset must be an array");
  if (subset.length > DIMS.length) throw new Error("too many dims");
  const seen = new Set<string>();
  for (const d of subset) {
    if (typeof d !== "string" || !DIMS.includes(d)) throw new Error(`unknown dim: ${d}`);
    if (seen.has(d)) throw new Error(`dup dim: ${d}`);
    seen.add(d);
  }
  return [...subset].sort() as Subset;
}

export function dispute() {
  return {
    models: [...MODELS],
    strata: STRATA.map((s) => ({ ...s })),
    numItems: NUM_ITEMS,
    exposedDimensions: [...DIMS].sort(),
    labA: { ...LAB_A_PROTOCOL },
    labB: { ...LAB_B_PROTOCOL },
    declarations: SOURCE_PUBLICATIONS.map((d) => ({ source: d.source, declared: d.declared })),
    seeds: { sim: SIM_SEED, boot: BOOT_SEED, replicates: BOOT_REPLICATES },
  };
}

export function runCounterfactual(subset: unknown) {
  const s = checkSubset(subset);
  const ev = evaluateSubset(s);
  const target = evaluateSubset([...DIMS]).conclusion;
  return {
    subset: s,
    accA: ev.stats.accA,
    accB: ev.stats.accB,
    mean: ev.stats.mean,
    ciLow: ev.stats.ciLow,
    ciHigh: ev.stats.ciHigh,
    conclusion: ev.conclusion,
    reproducesTarget: ev.conclusion === target,
  };
}

export function inspectEvidence(subset: unknown, { stratum = null, limit = 5 }: { stratum?: string | null; limit?: number } = {}) {
  const s = checkSubset(subset);
  if (stratum !== null && !STRATA.some((x) => x.name === stratum)) throw new Error(`unknown stratum: ${stratum}`);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("limit 1..20");
  const ev = evaluateSubset(s);
  const byStratum = new Map<string, { stratum: string; n: number; accA: number; accB: number }>();
  for (const o of ev.outcomes) {
    const key = o.stratum ?? "";
    if (!byStratum.has(key)) byStratum.set(key, { stratum: key, n: 0, accA: 0, accB: 0 });
    const g = byStratum.get(key)!;
    g.n++;
    g.accA += o.a;
    g.accB += o.b;
  }
  const strata = [...byStratum.values()].map((g) => ({ stratum: g.stratum, n: g.n, accA: g.accA / g.n, accB: g.accB / g.n }));
  const items = buildBenchmarkItems().filter((it) => !stratum || it.stratum === stratum).slice(0, limit);
  const sample = items.map((it) => ({
    id: it.id,
    stratum: it.stratum,
    a: simulateItem("MODEL_A", it, ev.protocol).finalCorrect ? 1 : 0,
    b: simulateItem("MODEL_B", it, ev.protocol).finalCorrect ? 1 : 0,
  }));
  return { subset: s, conclusion: ev.conclusion, strata, sample };
}

export function witness(candidateSubset: unknown) {
  if (!Array.isArray(candidateSubset)) throw new Error("candidateSubset must be an array");
  return verifyCandidateWitness([...candidateSubset] as Subset);
}
