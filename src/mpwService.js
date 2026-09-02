// single service for ui + tools, same engine underneath
import { MODELS, STRATA, NUM_ITEMS, EXPOSED_DIMENSIONS, LAB_A_PROTOCOL, LAB_B_PROTOCOL, SOURCE_PUBLICATIONS } from "./mpwFixture.js";
import { SIM_SEED, evaluateSubset, simulateItem } from "./mpwSimulator.js";
import { BOOT_SEED, BOOT_REPLICATES } from "./mpwCore.js";
import { verifyCandidateWitness } from "./mpwVerify.js";
import { buildBenchmarkItems } from "./mpwFixture.js";

const DIMS = [...EXPOSED_DIMENSIONS];

function checkSubset(subset) {
  if (!Array.isArray(subset)) throw new Error("subset must be an array");
  if (subset.length > DIMS.length) throw new Error("too many dims");
  const seen = new Set();
  for (const d of subset) {
    if (typeof d !== "string" || !DIMS.includes(d)) throw new Error(`unknown dim: ${d}`);
    if (seen.has(d)) throw new Error(`dup dim: ${d}`);
    seen.add(d);
  }
  return [...subset].sort();
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

export function runCounterfactual(subset) {
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

export function inspectEvidence(subset, { stratum = null, limit = 5 } = {}) {
  const s = checkSubset(subset);
  if (stratum !== null && !STRATA.some((x) => x.name === stratum)) throw new Error(`unknown stratum: ${stratum}`);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("limit 1..20");
  const ev = evaluateSubset(s);
  const byStratum = new Map();
  for (const o of ev.outcomes) {
    if (!byStratum.has(o.stratum)) byStratum.set(o.stratum, { stratum: o.stratum, n: 0, accA: 0, accB: 0 });
    const g = byStratum.get(o.stratum);
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

export function witness(candidateSubset) {
  if (!Array.isArray(candidateSubset)) throw new Error("candidateSubset must be an array");
  return verifyCandidateWitness([...candidateSubset]);
}
