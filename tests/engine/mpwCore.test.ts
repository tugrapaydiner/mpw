import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import {
  erf,
  normalCdf,
  generateOutcomes,
  expandCounts,
  diffsFromOutcomes,
  summarizeOutcomes,
  pairedStats,
  classifyConclusion,
} from "../../src/engine/mpwCore";
import { sha256Hex } from "../../src/engine/sha256";

describe("core", () => {
  it("normal helpers behave", () => {
    expect(normalCdf(0)).toBe(0.5);
    expect(normalCdf(5)).toBeGreaterThan(0.999999);
    expect(normalCdf(-5)).toBeLessThan(0.000001);
    expect(Math.abs(erf(1) - 0.84270079)).toBeLessThan(1e-6);
  });

  it("sha256 matches known vectors", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("generateOutcomes is deterministic per seed", () => {
    const probs = { p11: 0.5, p10: 0.2, p01: 0.2, p00: 0.1 };
    const a = generateOutcomes({ n: 200, seed: "lab-a-v1", probs });
    const b = generateOutcomes({ n: 200, seed: "lab-a-v1", probs });
    const c = generateOutcomes({ n: 200, seed: "lab-b-v1", probs });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
    expect(a.length).toBe(200);
  });

  it("generateOutcomes validates probs", () => {
    expect(() => generateOutcomes({ n: 10, seed: 1, probs: { p11: 0.5, p10: 0.5, p01: 0.5, p00: 0.5 } })).toThrow();
    expect(() => generateOutcomes({ n: 0, seed: 1, probs: { p11: 1, p10: 0, p01: 0, p00: 0 } })).toThrow();
  });

  it("expandCounts reconstructs in fixed order", () => {
    const out = expandCounts({ n11: 1, n10: 2, n01: 1, n00: 1 });
    expect(out.length).toBe(5);
    expect(out.map((o) => [o.a, o.b])).toEqual([[1, 1], [1, 0], [1, 0], [0, 1], [0, 0]]);
    const s = summarizeOutcomes(out);
    expect(s.accA).toBe(3 / 5);
    expect(s.accB).toBe(2 / 5);
  });

  it("pairedStats matches a hand-checked case", () => {
    const s = pairedStats([1, 0, 0, 0]);
    expect(s.n).toBe(4);
    expect(Math.abs(s.mean - 0.25)).toBeLessThan(1e-12);
    expect(Math.abs(s.sd - 0.5)).toBeLessThan(1e-12);
    expect(Math.abs(s.p - 0.3173105)).toBeLessThan(1e-4);
  });

  it("pairedStats handles zero-variance edges", () => {
    expect(pairedStats([1, 1, 1, 1]).p).toBe(0);
    expect(pairedStats([0, 0, 0]).p).toBe(1);
  });

  it("classifyConclusion separates opposite outcomes", () => {
    const bWins = classifyConclusion(pairedStats(expandCounts({ n11: 10, n10: 2, n01: 30, n00: 10 }).map((o) => o.diff)));
    const aWins = classifyConclusion(pairedStats(expandCounts({ n11: 10, n10: 30, n01: 2, n00: 10 }).map((o) => o.diff)));
    expect(bWins.conclusion).toBe("B>B");
    expect(aWins.conclusion).toBe("A>B");
    expect(classifyConclusion(pairedStats([1, 0, 0, 0])).conclusion).toBe("inconclusive");
  });

  it("diffs + summarize stay consistent", () => {
    const out = generateOutcomes({ n: 50, seed: 7, probs: { p11: 0.4, p10: 0.1, p01: 0.3, p00: 0.2 } });
    const s = pairedStats(diffsFromOutcomes(out));
    expect(s.n).toBe(50);
    expect(Math.abs(s.mean - summarizeOutcomes(out).meanDiff)).toBeLessThan(1e-12);
  });

  it("core uses no hidden randomness source", async () => {
    const src = await readFile(new URL("../../src/engine/mpwCore.ts", import.meta.url), "utf8");
    expect(src.includes("Math.random")).toBe(false);
    expect(src.includes("Date.now")).toBe(false);
  });
});
