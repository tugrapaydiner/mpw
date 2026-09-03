// single service for ui + tools, same engine underneath. concise payloads;
// every scientific value delegated to the engine, never computed here.
import {
  MODELS,
  STRATA,
  NUM_ITEMS,
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  SOURCE_PUBLICATIONS,
  BENCHMARK_ID,
  BENCHMARK_VERSION,
} from "./mpwFixture.js";
import { SIM_SEED, simulateForProtocol } from "./mpwSimulator.js";
import { protocolForSubset } from "./mpwFixture.js";
import { itemAttrs } from "./mpwSimulator.js";
import { BOOT_SEED, BOOT_REPLICATES, analyzeEvidence } from "./mpwCore.js";
import { verifyCandidateWitness, verifyWitness } from "./mpwVerify.js";
import { conclusionForSubset } from "./mpwSimulator.js";
import { buildBenchmarkItems } from "./mpwFixture.js";
import { validateDimensions } from "./mpwValidate.js";
import { runCounterfactual as runExperiment, constructHybrid, diffProtocols } from "./mpwCounterfactual.js";
import { finalizePublication } from "./mpwPublication.js";
import { disputeIdFor } from "./mpwCertificate.js";
import { evidenceForProtocol } from "./mpwPublication.js";
import type { Subset } from "../types";

const DIMS = [...EXPOSED_DIMENSIONS];
const LABS = ["A", "B"] as const;
export type BaseLab = (typeof LABS)[number];

const otherLab = (base: BaseLab): BaseLab => (base === "A" ? "B" : "A");

function checkBaseLab(v: unknown): BaseLab {
  if (v !== "A" && v !== "B") throw new Error(`INVALID_BASE_LAB: baseLab must be A or B, got ${String(v)}`);
  return v;
}

function checkSubset(subset: unknown): Subset {
  const dims = validateDimensions(subset, "subset");
  if (dims.length > DIMS.length) throw new Error("too many dims");
  return [...dims].sort() as Subset;
}

const bundleCache = new Map<string, ReturnType<typeof finalizePublication>>();

function bundleFor(source: "Lab A" | "Lab B") {
  let b = bundleCache.get(source);
  if (!b) {
    b = finalizePublication(source);
    bundleCache.set(source, b);
  }
  return b;
}

export function canonicalDisputeId(): string {
  return disputeIdFor(bundleFor("Lab A").manifestHash, bundleFor("Lab B").manifestHash);
}

export function dispute() {
  const bundleA = bundleFor("Lab A");
  const bundleB = bundleFor("Lab B");
  const sources = (["Lab A", "Lab B"] as const).map((source) => {
    const bundle = source === "Lab A" ? bundleA : bundleB;
    const d = bundle.core.declared;
    return {
      lab: source === "Lab A" ? "A" : "B",
      publicationId: bundle.core.publicationId,
      conclusion: d.conclusion,
      scoreA: d.scoreA,
      scoreB: d.scoreB,
      delta: d.delta,
      ciLow: d.ciLow,
      ciHigh: d.ciHigh,
      coverage: d.coverage,
    };
  });
  return {
    disputeId: canonicalDisputeId(),
    labs: [...LABS],
    models: [...MODELS],
    benchmark: { id: BENCHMARK_ID, version: BENCHMARK_VERSION },
    strata: STRATA.map((s) => s.name),
    numItems: NUM_ITEMS,
    exposedDimensions: [...DIMS].sort(),
    differences: diffProtocols(LAB_A_PROTOCOL, LAB_B_PROTOCOL) as string[],
    labA: { ...LAB_A_PROTOCOL },
    labB: { ...LAB_B_PROTOCOL },
    sources,
    coverage: { expectedItems: NUM_ITEMS, accountedItems: NUM_ITEMS, percent: 100 },
    declarations: SOURCE_PUBLICATIONS.map((d) => ({ source: d.source, declared: d.declared })),
    seeds: { sim: SIM_SEED, boot: BOOT_SEED, replicates: BOOT_REPLICATES },
  };
}

export function runCounterfactual(subset: unknown, baseLab: unknown = "A") {
  const base = checkBaseLab(baseLab);
  const s = checkSubset(subset);
  const source = otherLab(base);
  const ev = runExperiment({ baseLab: base, sourceLab: source, subset: s });
  const target = runExperiment({ baseLab: base, sourceLab: source, subset: [...DIMS] as Subset }).conclusion;
  return {
    experimentId: ev.experimentId,
    disputeId: canonicalDisputeId(),
    baseLab: base,
    subset: s,
    changedDimensions: [...ev.subset],
    accA: ev.stats.accA,
    accB: ev.stats.accB,
    mean: ev.stats.mean,
    ciLow: ev.stats.ciLow,
    ciHigh: ev.stats.ciHigh,
    conclusion: ev.conclusion,
    reproducesTarget: ev.conclusion === target,
    coverage: ev.coverage,
  };
}

export function inspectEvidence(
  subset: unknown,
  baseLab: unknown = "A",
  { stratum = null, limit = 5 }: { stratum?: string | null; limit?: number } = {}
) {
  const base = checkBaseLab(baseLab);
  const s = checkSubset(subset);
  if (stratum !== null && !STRATA.some((x) => x.name === stratum)) throw new Error(`INVALID_CANDIDATE: unknown category: ${stratum}`);
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 20) throw new Error("INVALID_CANDIDATE: limit 1..20");
  const protocol =
    base === "A" ? protocolForSubset(s) : constructHybrid({ ...LAB_B_PROTOCOL }, { ...LAB_A_PROTOCOL }, [...s]);
  const ev = evidenceForProtocol(protocol, [...s]);
  const outcomes = simulateForProtocol(protocol);
  const a = analyzeEvidence(outcomes);
  let bothCorrect = 0;
  let bothWrong = 0;
  let aOnly = 0;
  let bOnly = 0;
  for (const o of outcomes) {
    if (o.a === 1 && o.b === 1) bothCorrect++;
    else if (o.a === 0 && o.b === 0) bothWrong++;
    else if (o.a === 1) aOnly++;
    else bOnly++;
  }
  let parserFailures = 0;
  let retried = 0;
  let recovered = 0;
  for (const r of ev.receipts) {
    if (!r.parserAccepts) parserFailures++;
    if (r.retried) retried++;
    if (r.recovered) recovered++;
  }
  let toolNeeded = 0;
  for (const it of buildBenchmarkItems()) {
    if (itemAttrs(it).toolNeeded) toolNeeded++;
  }
  const toolPenalized = protocol.tool_access === "restricted" ? toolNeeded : 0;
  const byStratum = new Map<string, { stratum: string; n: number; accA: number; accB: number }>();
  for (const o of outcomes) {
    const key = o.stratum ?? "";
    if (!byStratum.has(key)) byStratum.set(key, { stratum: key, n: 0, accA: 0, accB: 0 });
    const g = byStratum.get(key)!;
    g.n++;
    g.accA += o.a;
    g.accB += o.b;
  }
  const categorySummary = [...byStratum.values()].map((g) => ({ stratum: g.stratum, n: g.n, accA: g.accA / g.n, accB: g.accB / g.n }));
  const items = buildBenchmarkItems().filter((it) => !stratum || it.stratum === stratum).slice(0, limit);
  const sample = items.map((it) => {
    const o = outcomes.find((x) => x.id === it.id)!;
    return { id: it.id, stratum: it.stratum, a: o.a, b: o.b };
  });
  return {
    subset: s,
    baseLab: base,
    conclusion: a.conclusion,
    strata: categorySummary,
    categorySummary,
    sample,
    coverage: a.n,
    pairedCounts: { bothCorrect, bothWrong, aOnly, bOnly },
    parserFailures,
    retry: { retried, recovered },
    tool: { needed: toolNeeded, penalized: toolPenalized },
    evidenceHash: ev.evidenceHash,
  };
}

export function targetFor(base: BaseLab): string {
  return base === "A" ? conclusionForSubset([...EXPOSED_DIMENSIONS]) : conclusionForSubset([]);
}

export function witness(candidateSubset: unknown, baseLab: unknown = "A") {
  const base = checkBaseLab(baseLab);
  if (!Array.isArray(candidateSubset)) throw new Error("INVALID_CANDIDATE: candidateSubset must be an array");
  if (base === "A") return { ...verifyCandidateWitness([...candidateSubset] as Subset), target: targetFor(base) };
  const full = [...EXPOSED_DIMENSIONS];
  const target = targetFor(base);
  const r = verifyWitness({
    candidateSubset: [...candidateSubset] as Subset,
    exposedDimensions: full,
    isSufficient: (s) => {
      const protocol = constructHybrid({ ...LAB_B_PROTOCOL }, { ...LAB_A_PROTOCOL }, [...s]);
      return analyzeEvidence(simulateForProtocol(protocol)).conclusion === target;
    },
  });
  return { ...r, target };
}
