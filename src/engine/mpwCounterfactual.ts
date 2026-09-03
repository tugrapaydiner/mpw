// pure controlled counterfactuals. everything computed fresh, no table lookups.
import {
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
} from "./mpwFixture.js";
import { SIM_SEED, SIM_VERSION, simulateForProtocol } from "./mpwSimulator.js";
import { BOOT_SEED, BOOT_REPLICATES, BOOT_ALGO_ID, BOOT_ALGO_VERSION, analyzeEvidence } from "./mpwCore.js";
import { checkSourceIntegrity } from "./mpwVerify.js";
import type { SourcePublication } from "./mpwFixture.js";
import { experimentId } from "./mpwManifest.js";
import type { LabId, ProtocolDimension } from "../types/domain.js";
import type { Protocol } from "../types/index.js";

export { experimentId };

const LABS: Record<LabId, Protocol> = { A: { ...LAB_A_PROTOCOL }, B: { ...LAB_B_PROTOCOL } };

// actual differences derived from the two protocols, never a hard-coded list.
export function diffProtocols(a: Protocol, b: Protocol): ProtocolDimension[] {
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null)
    throw new Error("protocols must be objects");
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: ProtocolDimension[] = [];
  for (const k of keys) {
    if ((a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]) out.push(k as ProtocolDimension);
  }
  return out.sort() as ProtocolDimension[];
}

export function constructHybrid(base: Protocol, source: Protocol, dimensions: unknown): Protocol {
  if (typeof base !== "object" || base === null || typeof source !== "object" || source === null)
    throw new Error("base/source must be objects");
  if (!Array.isArray(dimensions)) throw new Error("dimensions must be an array");
  const seen = new Set<string>();
  for (const d of dimensions) {
    if (typeof d !== "string" || d.length === 0) throw new Error("dimensions must be non-empty strings");
    if (!(d in base) || !(d in source)) throw new Error(`unknown dimension ${d}`);
    if (seen.has(d)) throw new Error(`duplicate dimension ${d}`);
    seen.add(d);
  }
  const hybrid: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const d of seen) hybrid[d] = (source as Record<string, unknown>)[d];
  return hybrid as unknown as Protocol;
}

export interface CounterfactualRequest {
  baseLab: LabId;
  sourceLab: LabId;
  subset: string[];
}

function checkRequest(q: unknown): { baseLab: LabId; sourceLab: LabId; subset: ProtocolDimension[] } {
  if (typeof q !== "object" || q === null) throw new Error("request must be an object");
  const r = q as Record<string, unknown>;
  if (r["baseLab"] !== "A" && r["baseLab"] !== "B") throw new Error("unknown base lab");
  if (r["sourceLab"] !== "A" && r["sourceLab"] !== "B") throw new Error("unknown source lab");
  if (!Array.isArray(r["subset"])) throw new Error("subset must be an array");
  const seen = new Set<string>();
  for (const d of r["subset"] as unknown[]) {
    if (typeof d !== "string") throw new Error("subset entries must be strings");
    if (seen.has(d)) throw new Error(`duplicate dimension ${d}`);
    seen.add(d);
  }
  return { baseLab: r["baseLab"] as LabId, sourceLab: r["sourceLab"] as LabId, subset: [...seen].sort() as ProtocolDimension[] };
}

export function experimentMeta() {
  return { sim: SIM_SEED, simVersion: SIM_VERSION, boot: BOOT_SEED, replicates: BOOT_REPLICATES, algo: BOOT_ALGO_ID, algoVersion: BOOT_ALGO_VERSION };
}

export function runCounterfactual(request: CounterfactualRequest, declarations?: SourcePublication[]) {
  checkSourceIntegrity(declarations);
  const q = checkRequest(request);
  const base = LABS[q.baseLab];
  const source = LABS[q.sourceLab];
  if (!base || !source) throw new Error("missing source evidence/config");
  const known = diffProtocols(LAB_A_PROTOCOL, LAB_B_PROTOCOL);
  for (const d of q.subset) if (!known.includes(d)) throw new Error(`dimension ${d} not exposed`);
  const protocol = constructHybrid(base, source, q.subset);
  const outcomes = simulateForProtocol(protocol);
  const a = analyzeEvidence(outcomes);
  const id = experimentId(q.baseLab, q.sourceLab, q.subset, protocol, experimentMeta());
  return {
    experimentId: id,
    baseLab: q.baseLab,
    sourceLab: q.sourceLab,
    subset: [...q.subset],
    protocol: { ...protocol },
    coverage: a.n,
    stats: { accA: a.scoreA, accB: a.scoreB, mean: a.delta, ciLow: a.ciLow, ciHigh: a.ciHigh },
    conclusion: a.conclusion,
    categories: a.categories.map((c) => ({ stratum: c.stratum, n: c.n, accA: c.scoreA, accB: c.scoreB })),
  };
}
