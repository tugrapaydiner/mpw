import { describe, it, expect } from "vitest";
import { stratifiedPairedBootstrap, classifyBootstrap, BOOT_SEED } from "../../src/engine/mpwCore";
import type { Outcome } from "../../src/types";

const mk = (rows: Array<[string, 0 | 1, 0 | 1]>): Outcome[] =>
  rows.map((r, i) => ({ id: `item-${i}`, stratum: r[0], a: r[1], b: r[2], diff: r[1] - r[2] }));

describe("bootstrap", () => {
  it("deterministic for same input", () => {
    const out = mk([["s1", 1, 0], ["s1", 0, 0], ["s2", 1, 1], ["s2", 0, 1]]);
    const r1 = stratifiedPairedBootstrap(out, { seed: BOOT_SEED, replicates: 1000 });
    const r2 = stratifiedPairedBootstrap(out, { seed: BOOT_SEED, replicates: 1000 });
    expect(r1).toEqual(r2);
    expect(r1.method).toBe("stratified-paired-bootstrap");
  });

  it("CI-only rule never uses the point estimate", () => {
    expect(classifyBootstrap({ ciLow: -0.1, ciHigh: 0.1 }).conclusion).toBe("INCONCLUSIVE");
    expect(classifyBootstrap({ ciLow: 0.01, ciHigh: 0.2 }).conclusion).toBe("MODEL_A");
    expect(classifyBootstrap({ ciLow: -0.2, ciHigh: -0.01 }).conclusion).toBe("MODEL_B");
  });

  it("stratified resampling stays within stratum sizes", () => {
    const out: Outcome[] = [];
    for (let i = 0; i < 100; i++) out.push({ id: `a-${i}`, stratum: "s1", a: 1, b: 0, diff: 1 });
    for (let i = 0; i < 100; i++) out.push({ id: `b-${i}`, stratum: "s2", a: 0, b: 1, diff: -1 });
    const r = stratifiedPairedBootstrap(out, { seed: BOOT_SEED, replicates: 1000 });
    expect(r.n).toBe(200);
    expect(r.ciLow <= r.mean && r.mean <= r.ciHigh).toBe(true);
  });
});
