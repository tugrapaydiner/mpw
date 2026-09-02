import test from "node:test";
import assert from "node:assert/strict";
import {
  erf,
  normalCdf,
  generateOutcomes,
  expandCounts,
  diffsFromOutcomes,
  summarizeOutcomes,
  pairedStats,
  classifyConclusion,
} from "../src/mpwCore.js";

test("normal helpers behave", () => {
  assert.equal(normalCdf(0), 0.5);
  assert.ok(normalCdf(5) > 0.999999);
  assert.ok(normalCdf(-5) < 0.000001);
  assert.ok(Math.abs(erf(1) - 0.84270079) < 1e-6);
});

test("generateOutcomes is deterministic per seed", () => {
  const probs = { p11: 0.5, p10: 0.2, p01: 0.2, p00: 0.1 };
  const a = generateOutcomes({ n: 200, seed: "lab-a-v1", probs });
  const b = generateOutcomes({ n: 200, seed: "lab-a-v1", probs });
  const c = generateOutcomes({ n: 200, seed: "lab-b-v1", probs });
  assert.deepEqual(a, b);
  assert.ok(JSON.stringify(a) !== JSON.stringify(c));
  assert.equal(a.length, 200);
  for (const o of a) {
    assert.ok(o.a === 0 || o.a === 1);
    assert.ok(o.b === 0 || o.b === 1);
    assert.equal(o.diff, o.b - o.a);
  }
});

test("generateOutcomes validates probs", () => {
  assert.throws(() => generateOutcomes({ n: 10, seed: 1, probs: { p11: 0.5, p10: 0.5, p01: 0.5, p00: 0.5 } }));
  assert.throws(() => generateOutcomes({ n: 0, seed: 1, probs: { p11: 1, p10: 0, p01: 0, p00: 0 } }));
});

test("expandCounts reconstructs in fixed order", () => {
  const out = expandCounts({ n11: 1, n10: 2, n01: 1, n00: 1 });
  assert.equal(out.length, 5);
  assert.deepEqual(
    out.map((o) => [o.a, o.b]),
    [
      [1, 1],
      [1, 0],
      [1, 0],
      [0, 1],
      [0, 0],
    ]
  );
  const s = summarizeOutcomes(out);
  assert.equal(s.accA, 3 / 5);
  assert.equal(s.accB, 2 / 5);
  assert.equal(s.meanDiff, (1 - 2) / 5);
});

test("pairedStats matches a hand-checked case", () => {
  // diffs [1,0,0,0]: mean 0.25, sd 0.5, se 0.25, ci [-0.24, 0.74], z=1, p~0.317
  const s = pairedStats([1, 0, 0, 0]);
  assert.equal(s.n, 4);
  assert.ok(Math.abs(s.mean - 0.25) < 1e-12);
  assert.ok(Math.abs(s.sd - 0.5) < 1e-12);
  assert.ok(Math.abs(s.se - 0.25) < 1e-12);
  assert.ok(Math.abs(s.ciLow - -0.24) < 1e-12);
  assert.ok(Math.abs(s.ciHigh - 0.74) < 1e-12);
  assert.ok(Math.abs(s.z - 1) < 1e-12);
  assert.ok(Math.abs(s.p - 0.3173105) < 1e-4);
  assert.ok(s.ciLow <= s.mean && s.mean <= s.ciHigh);
});

test("pairedStats handles zero-variance edges", () => {
  const allOne = pairedStats([1, 1, 1, 1]);
  assert.equal(allOne.mean, 1);
  assert.equal(allOne.p, 0);
  const allZero = pairedStats([0, 0, 0]);
  assert.equal(allZero.mean, 0);
  assert.equal(allZero.p, 1);
});

test("classifyConclusion separates opposite outcomes", () => {
  const bWins = classifyConclusion(pairedStats(expandCounts({ n11: 10, n10: 2, n01: 30, n00: 10 }).map((o) => o.diff)));
  const aWins = classifyConclusion(pairedStats(expandCounts({ n11: 10, n10: 30, n01: 2, n00: 10 }).map((o) => o.diff)));
  const tied = classifyConclusion(pairedStats([1, 0, 0, 0]));
  assert.equal(bWins.conclusion, "B>B");
  assert.equal(aWins.conclusion, "A>B");
  assert.equal(tied.conclusion, "inconclusive");
});

test("diffsFromOutcomes + summarize stay consistent", () => {
  const out = generateOutcomes({ n: 50, seed: 7, probs: { p11: 0.4, p10: 0.1, p01: 0.3, p00: 0.2 } });
  const diffs = diffsFromOutcomes(out);
  const s = pairedStats(diffs);
  const summary = summarizeOutcomes(out);
  assert.equal(s.n, 50);
  assert.ok(Math.abs(s.mean - summary.meanDiff) < 1e-12);
});

test("core uses no hidden randomness source", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/mpwCore.js", import.meta.url), "utf8");
  assert.ok(!src.includes("Math.random"), "core must not use Math.random");
  assert.ok(!src.includes("Date.now"), "core must not use wall-clock");
});
