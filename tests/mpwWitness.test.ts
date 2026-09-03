import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { findMinimumWitnesses, binomialCoefficient } from "../src/engine/mpwWitness";

const has = (list: string[][], want: string[]) =>
  list.some((w) => w.length === want.length && want.every((d) => w.includes(d)));

describe("witness", () => {
  it("global minimum beats an inclusion-minimal distractor", () => {
    const res = findMinimumWitnesses({
      exposedDimensions: ["a", "b", "c"],
      isSufficient: (s) => s.includes("c") || (s.includes("a") && s.includes("b")),
    });
    expect(res.minimumCardinality).toBe(1);
    expect(res.minimumWitnesses).toEqual([["c"]]);
    expect(res.coMinimumWitnesses).toEqual(res.minimumWitnesses);
  });

  it("returns every co-minimum witness", () => {
    const res = findMinimumWitnesses({
      exposedDimensions: ["a", "b", "c"],
      isSufficient: (s) => (s.includes("a") && s.includes("b")) || (s.includes("a") && s.includes("c")),
    });
    expect(res.minimumCardinality).toBe(2);
    expect(res.minimumWitnesses.length).toBe(2);
    expect(has(res.minimumWitnesses, ["a", "b"])).toBe(true);
    expect(has(res.minimumWitnesses, ["a", "c"])).toBe(true);
  });

  it("empty subset wins when base already reproduces the target", () => {
    const res = findMinimumWitnesses({ exposedDimensions: ["x", "y"], isSufficient: () => true });
    expect(res.minimumCardinality).toBe(0);
    expect(res.minimumWitnesses).toEqual([[]]);
    expect(res.checkedCount).toBe(1);
  });

  it("reports none-sufficient after checking everything", () => {
    const res = findMinimumWitnesses({ exposedDimensions: ["x", "y"], isSufficient: () => false });
    expect(res.minimumCardinality).toBe(null);
    expect(res.minimumWitnesses).toEqual([]);
    expect(res.checkedCount).toBe(4);
  });

  it("proof counts match exhaustive sums", () => {
    const res = findMinimumWitnesses({
      exposedDimensions: ["a", "b", "c", "d"],
      isSufficient: (s) => s.includes("a") && s.includes("b"),
    });
    expect(res.minimumCardinality).toBe(2);
    expect(res.checkedCount).toBe(1 + 4 + 6);
    expect(res.totalSubsets).toBe(16);
    expect(binomialCoefficient(4, 2)).toBe(6);
  });

  it("input order does not change the result", () => {
    const mk = (dims: string[]) => findMinimumWitnesses({ exposedDimensions: dims, isSufficient: (s) => s.includes("b") });
    expect(mk(["b", "a", "c"]).minimumWitnesses).toEqual(mk(["c", "a", "b"]).minimumWitnesses);
  });

  it("rejects bad inputs instead of guessing", () => {
    expect(() => findMinimumWitnesses({ exposedDimensions: ["a", "a"], isSufficient: () => false })).toThrow();
    expect(() => findMinimumWitnesses({ exposedDimensions: [""], isSufficient: () => false })).toThrow();
    expect(() => findMinimumWitnesses({ exposedDimensions: ["a"], isSufficient: () => 1 as unknown as boolean })).toThrow();
    expect(() =>
      findMinimumWitnesses({ exposedDimensions: Array.from({ length: 21 }, (_, i) => `d${i}`), isSufficient: () => false })
    ).toThrow();
  });

  it("uses no hidden randomness source", async () => {
    const src = await readFile(new URL("../src/engine/mpwWitness.ts", import.meta.url), "utf8");
    expect(src.includes("Math.random")).toBe(false);
    expect(src.includes("Date.now")).toBe(false);
  });
});
