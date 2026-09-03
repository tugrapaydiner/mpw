import { describe, it, expect } from "vitest";
import {
  analyzeEvidence,
  analyzeCanonical,
  pairModelReceipts,
  percentile,
  stratifiedResample,
  classifyBootstrap,
  mulberry32,
  hashSeedString,
  BOOT_SEED,
  type ModelReceipt,
} from "../../src/engine/mpwCore";
import { simulateForSubset } from "../../src/engine/mpwSimulator";
import type { Outcome } from "../../src/types";

const mk = (rows: Array<[string, 0 | 1, 0 | 1]>): Outcome[] =>
  rows.map((r, i) => ({ id: `item-${i}`, stratum: r[0], a: r[1], b: r[2], diff: r[1] - r[2] }));

const fourByHundred = (fn: (s: number, i: number) => [0 | 1, 0 | 1]): Outcome[] => {
  const out: Outcome[] = [];
  ["s1", "s2", "s3", "s4"].forEach((s, si) => {
    for (let i = 0; i < 100; i++) {
      const [a, b] = fn(si, i);
      out.push({ id: `${s}-${i}`, stratum: s, a, b, diff: a - b });
    }
  });
  return out;
};

describe("statistics", () => {
  it("repeatability + order invariance", () => {
    const out = simulateForSubset(["reasoning_budget"]);
    const r1 = analyzeEvidence(out, { replicates: 1000 });
    const r2 = analyzeEvidence([...out].reverse(), { replicates: 1000 });
    expect(r1).toEqual(r2);
  });

  it("identical outcomes give delta 0, INCONCLUSIVE", () => {
    const r = analyzeEvidence(fourByHundred(() => [1, 1]), { replicates: 1000 });
    expect(r.delta).toBe(0);
    expect(r.conclusion).toBe("INCONCLUSIVE");
    expect(r.bothCorrect).toBe(400);
  });

  it("A dominance and B dominance", () => {
    expect(analyzeEvidence(fourByHundred(() => [1, 0]), { replicates: 1000 }).conclusion).toBe("MODEL_A");
    expect(analyzeEvidence(fourByHundred(() => [0, 1]), { replicates: 1000 }).conclusion).toBe("MODEL_B");
  });

  it("slight positive point delta with crossing CI stays INCONCLUSIVE", () => {
    const out = fourByHundred((_, i) => (i < 6 ? [1, 0] : i < 10 ? [0, 1] : [0, 0]));
    const r = analyzeEvidence(out, { replicates: 2000 });
    expect(r.delta).toBeGreaterThan(0);
    expect(r.conclusion).toBe("INCONCLUSIVE");
  });

  it("pairing rejects mismatches", () => {
    const a: ModelReceipt[] = [{ id: "x", stratum: "s", correct: 1 }];
    const b: ModelReceipt[] = [{ id: "y", stratum: "s", correct: 0 }];
    expect(() => pairModelReceipts(a, b)).toThrow(/unmatched/);
    expect(() => pairModelReceipts([...a, ...a], [...b, { id: "x", stratum: "s", correct: 0 }])).toThrow(/duplicate/);
    expect(() => pairModelReceipts([{ id: "x", stratum: "s", correct: 2 } as unknown as ModelReceipt], b)).toThrow();
    const paired = pairModelReceipts(a, [{ id: "x", stratum: "s", correct: 0 }]);
    expect(paired).toEqual([{ id: "x", stratum: "s", a: 1, b: 0, diff: 1 }]);
  });

  it("canonical gate rejects bad shapes", () => {
    expect(() => analyzeEvidence([])).toThrow(/zero items/);
    expect(() => analyzeCanonical(mk([["s1", 1, 0]]))).toThrow();
    const three = fourByHundred(() => [1, 0]).filter((o) => o.stratum !== "s4");
    expect(() => analyzeCanonical(three)).toThrow(/4 categories/);
  });

  it("percentile routine is pinned", () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(percentile(sorted, 0.025)).toBe(1);
    expect(percentile(sorted, 0.975)).toBe(8);
    expect(() => percentile([], 0.025)).toThrow();
    expect(() => percentile([1], 0.5)).toThrow();
  });

  it("resample preserves sizes and pairing", () => {
    const groups = [[1, 2], [3, 4, 5]].map((g) => g.map((v) => ({ v })));
    const rand = mulberry32(hashSeedString("t"));
    const s = stratifiedResample(groups, rand);
    expect(s.map((g) => g.length)).toEqual([2, 3]);
    expect(() => stratifiedResample([[]], rand)).toThrow(/empty stratum/);
  });

  it("seed change can move CI but never the point estimate", () => {
    const out = simulateForSubset([]);
    const r1 = analyzeEvidence(out, { seed: "seed-one", replicates: 1000 });
    const r2 = analyzeEvidence(out, { seed: "seed-two", replicates: 1000 });
    expect(r1.delta).toBe(r2.delta);
    expect(r1.scoreA).toBe(r2.scoreA);
  });

  it("conclusion uses full precision, not display rounding", () => {
    const r = analyzeEvidence(fourByHundred((_, i) => (i < 5 ? [1, 0] : i < 7 ? [0, 1] : [0, 0])), {
      replicates: 2000,
    });
    expect(r.ciLow).toBeGreaterThan(0);
    expect(r.ciLow).toBeLessThan(0.01);
    expect(r.conclusion).toBe("MODEL_A");
    expect(classifyBootstrap({ ciLow: 0.0004, ciHigh: 0.5 }).conclusion).toBe("MODEL_A");
  });

  it("returns the full contracted struct", () => {
    const r = analyzeEvidence(mk([["s1", 1, 1], ["s1", 1, 0], ["s2", 0, 1], ["s2", 0, 0]]), { replicates: 1000 });
    expect(r.bothCorrect).toBe(1);
    expect(r.bothWrong).toBe(1);
    expect(r.aOnly).toBe(1);
    expect(r.bOnly).toBe(1);
    expect(r.categories.length).toBe(2);
    expect(r.algorithm).toBe("mpw-stratified-paired-bootstrap");
    expect(r.replicates).toBe(1000);
    expect(r.seed).toBe(BOOT_SEED);
    expect(r.confidence).toBe(0.95);
    expect(r.scoreA).toBe(0.5);
    expect(r.scoreB).toBe(0.5);
  });
});
