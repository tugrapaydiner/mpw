import { describe, expect, it } from "vitest";
import {
  binomialUpperTail,
  bonferroniClopperPearsonLowerBound,
  clopperPearsonLowerBound,
  logGamma,
  regularizedIncompleteBeta,
} from "../../src/research/binomialBounds";

describe("exact binomial lower bounds", () => {
  it("matches analytic edge cases", () => {
    expect(clopperPearsonLowerBound(0, 10, 0.05)).toBe(0);
    expect(clopperPearsonLowerBound(1, 1, 0.05)).toBeCloseTo(0.05, 14);
    expect(clopperPearsonLowerBound(10, 10, 0.05)).toBeCloseTo(
      Math.pow(0.05, 0.1),
      14
    );
    expect(binomialUpperTail(10, 10, 0.5)).toBeCloseTo(1 / 1024, 14);
  });

  it("inverts the exact binomial upper tail", () => {
    for (const [successes, trials, alpha] of [
      [1, 10, 0.05],
      [5, 10, 0.05],
      [90, 100, 0.01],
      [999, 1000, 0.025],
    ] as const) {
      const lower = clopperPearsonLowerBound(successes, trials, alpha);
      expect(binomialUpperTail(successes, trials, lower)).toBeCloseTo(alpha, 9);
      expect(lower).toBeLessThanOrEqual(successes / trials);
      expect(lower).toBeGreaterThanOrEqual(0);
    }
  });

  it("is monotone in the observed success count", () => {
    const bounds = Array.from({ length: 101 }, (_, successes) =>
      clopperPearsonLowerBound(successes, 100, 0.05)
    );
    for (let index = 1; index < bounds.length; index++) {
      expect(bounds[index]).toBeGreaterThanOrEqual(bounds[index - 1]);
    }
  });

  it("uses the Bonferroni per-configuration level", () => {
    const pointwise = clopperPearsonLowerBound(100, 100, 0.05);
    const simultaneous = bonferroniClopperPearsonLowerBound(
      100,
      100,
      0.05,
      4
    );
    expect(simultaneous).toBeLessThan(pointwise);
    expect(simultaneous).toBeCloseTo(Math.pow(0.0125, 0.01), 14);
  });

  it("checks the beta implementation on identities", () => {
    expect(logGamma(1)).toBeCloseTo(0, 13);
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 12);
    expect(regularizedIncompleteBeta(0, 2, 3)).toBe(0);
    expect(regularizedIncompleteBeta(1, 2, 3)).toBe(1);
    // I_x(1,1) = x.
    expect(regularizedIncompleteBeta(0.37, 1, 1)).toBeCloseTo(0.37, 13);
  });

  it("rejects invalid count and probability inputs", () => {
    expect(() => clopperPearsonLowerBound(-1, 10, 0.05)).toThrow();
    expect(() => clopperPearsonLowerBound(11, 10, 0.05)).toThrow();
    expect(() => clopperPearsonLowerBound(1, 0, 0.05)).toThrow();
    expect(() => clopperPearsonLowerBound(1, 10, 0)).toThrow();
    expect(() => clopperPearsonLowerBound(1, 10, 1)).toThrow();
    expect(() => bonferroniClopperPearsonLowerBound(1, 10, 0.05, 0)).toThrow();
  });
});
