// mpwCore.js — deterministic core for Minimal Protocol Witness.
// I keep this pure on purpose: no DOM, no WebMCP, no network, no randomness
// outside the seeded generator, no dates. WebMCP tools will call into here,
// the LLM/agent itself must never calculate or certify the scientific answer.

const Z95 = 1.96;
const ALPHA = 0.05;

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

// I hash string seeds to a uint32 so "lab-a-v1" and 123 both work and stay reproducible.
export function hashSeedString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function toUint32Seed(seed) {
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

// Seeded PRNG (mulberry32). Deterministic per seed, no global state.
export function mulberry32(seedUint32) {
  let a = seedUint32 >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Abramowitz & Stegun erf approximation — good to ~1e-7, no deps, fully deterministic.
export function erf(x) {
  if (!isFiniteNumber(x)) throw new Error("erf input must be finite");
  if (x === 0) return 0;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(x) {
  if (!isFiniteNumber(x)) throw new Error("normalCdf input must be finite");
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function checkProbs({ p11, p10, p01, p00 }) {
  for (const [k, v] of Object.entries({ p11, p10, p01, p00 })) {
    if (!isFiniteNumber(v) || v < 0 || v > 1) throw new Error(`${k} must be in [0,1]`);
  }
  const s = p11 + p10 + p01 + p00;
  if (Math.abs(s - 1) > 1e-12) throw new Error(`probs must sum to 1 (got ${s})`);
}

// I generate n paired binary outcomes. a/b are 0/1 per item, diff = b - a in {-1,0,1}.
// Same seed + same probs + same n always gives the same items.
export function generateOutcomes({ n, seed, probs }) {
  if (!Number.isInteger(n) || n <= 0) throw new Error("n must be a positive integer");
  if (!probs || typeof probs !== "object") throw new Error("probs is required");
  checkProbs(probs);
  const rand = mulberry32(toUint32Seed(seed));
  const { p11, p10, p01 } = probs;
  // I use cumulative cut points so sampling is a pure function of the uniform draws.
  const c1 = p11;
  const c2 = p11 + p10;
  const c3 = p11 + p10 + p01;
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = rand();
    let a;
    let b;
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

// I reconstruct item-level outcomes from exact published counts, in fixed order.
// No RNG here — same counts always give the same list. Useful when I trust
// neither report but need a deterministic starting point from their tables.
export function expandCounts({ n11 = 0, n10 = 0, n01 = 0, n00 = 0 } = {}) {
  for (const [k, v] of Object.entries({ n11, n10, n01, n00 })) {
    if (!Number.isInteger(v) || v < 0) throw new Error(`${k} must be a non-negative integer`);
  }
  const out = [];
  const push = (count, a, b) => {
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

export function diffsFromOutcomes(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0)
    throw new Error("outcomes must be a non-empty array");
  return outcomes.map((o, i) => {
    if (!o || !isFiniteNumber(o.diff)) throw new Error(`outcome ${i} is missing numeric diff`);
    return o.diff;
  });
}

export function summarizeOutcomes(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0)
    throw new Error("outcomes must be a non-empty array");
  let n11 = 0;
  let n10 = 0;
  let n01 = 0;
  let n00 = 0;
  for (const o of outcomes) {
    if (o.a === 1 && o.b === 1) n11++;
    else if (o.a === 1 && o.b === 0) n10++;
    else if (o.a === 0 && o.b === 1) n01++;
    else if (o.a === 0 && o.b === 0) n00++;
    else throw new Error(`bad outcome ${o.id}: a/b must be 0/1`);
  }
  const n = outcomes.length;
  return {
    n,
    n11,
    n10,
    n01,
    n00,
    accA: (n11 + n10) / n,
    accB: (n11 + n01) / n,
    meanDiff: (n01 - n10) / n,
  };
}

// Paired stats on diffs (B - A). Normal approx, two-sided. Deterministic.
export function pairedStats(diffs) {
  if (!Array.isArray(diffs) || diffs.length === 0)
    throw new Error("diffs must be a non-empty array");
  for (const d of diffs) if (!isFiniteNumber(d)) throw new Error("diffs must be finite numbers");
  const n = diffs.length;
  let sum = 0;
  for (const d of diffs) sum += d;
  const mean = sum / n;
  let sd = 0;
  let se = 0;
  let ciLow = mean;
  let ciHigh = mean;
  let z = 0;
  let p = 1;
  if (n === 1) {
    // With one item I can't estimate spread, so I report the point and stay inconclusive.
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
      // All diffs identical: either exactly zero (p=1) or a perfect nonzero shift (p=0).
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

// I classify into opposite-establishable buckets. Threshold lives here so every
// later step (hybrids, witness search, certificate) uses the same rule.
export function classifyConclusion(stats) {
  if (!stats || typeof stats !== "object") throw new Error("stats is required");
  const { mean, ciLow, ciHigh, p, alpha = ALPHA } = stats;
  for (const [k, v] of Object.entries({ mean, ciLow, ciHigh, p }))
    if (!isFiniteNumber(v)) throw new Error(`${k} must be finite`);
  if (ciLow > 0 && p < alpha)
    return { conclusion: "B>B", reason: "CI entirely above 0 and p < alpha (B beats A)" };
  if (ciHigh < 0 && p < alpha)
    return { conclusion: "A>B", reason: "CI entirely below 0 and p < alpha (A beats B)" };
  return { conclusion: "inconclusive", reason: "CI covers 0 or p >= alpha" };
}
