// deterministic core. pure: no dom, no network, no clock. llm never calculates.
import type { LegacyConclusion, Outcome } from "./types.js";

const Z95 = 1.96;
const ALPHA = 0.05;

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export function hashSeedString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Seed = number | string;

function toUint32Seed(seed: Seed): number {
  if (typeof seed === "number") {
    if (!Number.isInteger(seed)) throw new Error("seed number must be an integer");
    return seed >>> 0;
  }
  if (typeof seed === "string") {
    if (seed.length === 0) throw new Error("seed string must not be empty");
    return hashSeedString(seed);
  }
  throw new Error("seed must be an integer or a non-empty string");
}

export function mulberry32(seedUint32: number): () => number {
  let a = seedUint32 >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function erf(x: number): number {
  if (!isFiniteNumber(x)) throw new Error("erf input must be finite");
  if (x === 0) return 0;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(x: number): number {
  if (!isFiniteNumber(x)) throw new Error("normalCdf input must be finite");
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

export interface Probs {
  p11: number;
  p10: number;
  p01: number;
  p00: number;
}

function checkProbs({ p11, p10, p01, p00 }: Probs): void {
  for (const [k, v] of Object.entries({ p11, p10, p01, p00 })) {
    if (!isFiniteNumber(v) || v < 0 || v > 1) throw new Error(`${k} must be in [0,1]`);
  }
  const s = p11 + p10 + p01 + p00;
  if (Math.abs(s - 1) > 1e-12) throw new Error(`probs must sum to 1 (got ${s})`);
}

export function generateOutcomes({ n, seed, probs }: { n: number; seed: Seed; probs: Probs }): Outcome[] {
  if (!Number.isInteger(n) || n <= 0) throw new Error("n must be a positive integer");
  if (!probs || typeof probs !== "object") throw new Error("probs is required");
  checkProbs(probs);
  const rand = mulberry32(toUint32Seed(seed));
  const { p11, p10, p01 } = probs;
  const c1 = p11;
  const c2 = p11 + p10;
  const c3 = p11 + p10 + p01;
  const out: Outcome[] = [];
  for (let i = 0; i < n; i++) {
    const r = rand();
    let a: 0 | 1;
    let b: 0 | 1;
    if (r < c1) {
      a = 1;
      b = 1;
    } else if (r < c2) {
      a = 1;
      b = 0;
    } else if (r < c3) {
      a = 0;
      b = 1;
    } else {
      a = 0;
      b = 0;
    }
    out.push({ id: `item-${i}`, a, b, diff: b - a });
  }
  return out;
}

export function expandCounts({ n11 = 0, n10 = 0, n01 = 0, n00 = 0 }: Partial<Record<"n11" | "n10" | "n01" | "n00", number>> = {}): Outcome[] {
  for (const [k, v] of Object.entries({ n11, n10, n01, n00 })) {
    if (!Number.isInteger(v) || (v as number) < 0) throw new Error(`${k} must be a non-negative integer`);
  }
  const out: Outcome[] = [];
  const push = (count: number, a: 0 | 1, b: 0 | 1) => {
    for (let k = 0; k < count; k++) {
      const i = out.length;
      out.push({ id: `item-${i}`, a, b, diff: b - a });
    }
  };
  push(n11, 1, 1);
  push(n10, 1, 0);
  push(n01, 0, 1);
  push(n00, 0, 0);
  return out;
}

export function diffsFromOutcomes(outcomes: Outcome[]): number[] {
  if (!Array.isArray(outcomes) || outcomes.length === 0)
    throw new Error("outcomes must be a non-empty array");
  return outcomes.map((o, i) => {
    if (!o || !isFiniteNumber(o.diff)) throw new Error(`outcome ${i} is missing numeric diff`);
    return o.diff;
  });
}

export function summarizeOutcomes(outcomes: Outcome[]) {
  if (!Array.isArray(outcomes) || outcomes.length === 0)
    throw new Error("outcomes must be a non-empty array");
  let n11 = 0, n10 = 0, n01 = 0, n00 = 0;
  for (const o of outcomes) {
    if (o.a === 1 && o.b === 1) n11++;
    else if (o.a === 1 && o.b === 0) n10++;
    else if (o.a === 0 && o.b === 1) n01++;
    else if (o.a === 0 && o.b === 0) n00++;
    else throw new Error(`bad outcome ${o.id}: a/b must be 0/1`);
  }
  const n = outcomes.length;
  return { n, n11, n10, n01, n00, accA: (n11 + n10) / n, accB: (n11 + n01) / n, meanDiff: (n01 - n10) / n };
}

export function pairedStats(diffs: number[]) {
  if (!Array.isArray(diffs) || diffs.length === 0) throw new Error("diffs must be a non-empty array");
  for (const d of diffs) if (!isFiniteNumber(d)) throw new Error("diffs must be finite numbers");
  const n = diffs.length;
  let sum = 0;
  for (const d of diffs) sum += d;
  const mean = sum / n;
  let sd = 0, se = 0, ciLow = mean, ciHigh = mean, z = 0, p = 1;
  if (n === 1) {
    ciLow = mean;
    ciHigh = mean;
    z = 0;
    p = 1;
  } else {
    let ss = 0;
    for (const d of diffs) ss += (d - mean) * (d - mean);
    sd = Math.sqrt(ss / (n - 1));
    if (sd === 0) {
      se = 0;
      ciLow = mean;
      ciHigh = mean;
      z = mean === 0 ? 0 : Number.POSITIVE_INFINITY;
      p = mean === 0 ? 1 : 0;
    } else {
      se = sd / Math.sqrt(n);
      ciLow = mean - Z95 * se;
      ciHigh = mean + Z95 * se;
      z = mean / se;
      p = 2 * (1 - normalCdf(Math.abs(z)));
      if (p < 0) p = 0;
      if (p > 1) p = 1;
    }
  }
  return { n, mean, sd, se, ciLow, ciHigh, z, p, alpha: ALPHA, method: "paired-normal-approx" };
}

// stratified paired bootstrap on Delta = A - B. mulberry32 PRNG, seed BOOT_SEED.
export const BOOT_REPLICATES = 10000;
export const BOOT_SEED = "mpw-boot-v1";

export function stratifiedPairedBootstrap(
  outcomes: Outcome[],
  { seed = BOOT_SEED, replicates = BOOT_REPLICATES }: { seed?: string; replicates?: number } = {}
) {
  if (!Array.isArray(outcomes) || outcomes.length === 0)
    throw new Error("outcomes must be a non-empty array");
  if (typeof seed !== "string" || seed.length === 0) throw new Error("seed must be set");
  if (!Number.isInteger(replicates) || replicates < 1000)
    throw new Error("replicates must be an integer >= 1000");
  const groups = new Map<string, Outcome[]>();
  for (const o of outcomes) {
    if (!o || (o.a !== 0 && o.a !== 1) || (o.b !== 0 && o.b !== 1))
      throw new Error("each outcome needs binary a/b");
    if (typeof o.stratum !== "string" || !o.stratum) throw new Error("each outcome needs a stratum");
    if (!groups.has(o.stratum)) groups.set(o.stratum, []);
    groups.get(o.stratum)!.push(o);
  }
  const keys = [...groups.keys()].sort();
  const lists = keys.map((k) => [...groups.get(k)!].sort((x, y) => x.id.localeCompare(y.id)));
  const n = outcomes.length;
  let sum = 0;
  for (const o of outcomes) sum += o.a - o.b;
  const mean = sum / n;
  const means = new Array<number>(replicates);
  for (let r = 0; r < replicates; r++) {
    const rand = mulberry32(hashSeedString(`${seed}|${r}`));
    let s = 0;
    for (const g of lists) {
      const m = g.length;
      for (let k = 0; k < m; k++) {
        const o = g[Math.floor(rand() * m)];
        s += o.a - o.b;
      }
    }
    means[r] = s / n;
  }
  means.sort((x, y) => x - y);
  const ciLow = means[Math.floor(0.025 * replicates)];
  const ciHigh = means[Math.ceil(0.975 * replicates) - 1];
  return { n, mean, ciLow, ciHigh, replicates, seed, method: "stratified-paired-bootstrap" };
}

// CI-only rule on Delta = A - B. never uses the point estimate.
export function classifyBootstrap({ ciLow, ciHigh }: { ciLow: number; ciHigh: number }) {
  if (!isFiniteNumber(ciLow) || !isFiniteNumber(ciHigh)) throw new Error("CI bounds must be finite");
  if (ciLow > 0) return { conclusion: "MODEL_A", reason: "CI above 0" };
  if (ciHigh < 0) return { conclusion: "MODEL_B", reason: "CI below 0" };
  return { conclusion: "INCONCLUSIVE", reason: "CI covers 0" };
}

// legacy normal-approx buckets, kept for unit checks only.
export function classifyConclusion(stats: { mean: number; ciLow: number; ciHigh: number; p: number; alpha?: number }) {
  if (!stats || typeof stats !== "object") throw new Error("stats is required");
  const { mean, ciLow, ciHigh, p, alpha = ALPHA } = stats;
  for (const [k, v] of Object.entries({ mean, ciLow, ciHigh, p }))
    if (!isFiniteNumber(v)) throw new Error(`${k} must be finite`);
  if (ciLow > 0 && p < alpha)
    return { conclusion: "B>B" as LegacyConclusion, reason: "CI entirely above 0 and p < alpha (B beats A)" };
  if (ciHigh < 0 && p < alpha)
    return { conclusion: "A>B" as LegacyConclusion, reason: "CI entirely below 0 and p < alpha (A beats B)" };
  return { conclusion: "inconclusive" as LegacyConclusion, reason: "CI covers 0 or p >= alpha" };
}
