import { describe, expect, it } from "vitest";
import { clopperPearsonLowerBound } from "../../src/research/binomialBounds";

function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const reduced = Math.min(k, n - k);
  let result = 1;
  for (let index = 1; index <= reduced; index++) {
    result = (result * (n - reduced + index)) / index;
  }
  return result;
}

function binomialProbability(
  successes: number,
  trials: number,
  probability: number
): number {
  if (probability === 0) return successes === 0 ? 1 : 0;
  if (probability === 1) return successes === trials ? 1 : 0;
  return (
    binomialCoefficient(trials, successes) *
    probability ** successes *
    (1 - probability) ** (trials - successes)
  );
}

describe("Clopper-Pearson finite-sample coverage", () => {
  it("controls the one-sided noncoverage probability by exact enumeration", () => {
    const alpha = 0.05;
    const probabilities = [
      0,
      0.0001,
      0.001,
      0.01,
      0.05,
      0.1,
      0.25,
      0.5,
      0.75,
      0.9,
      0.95,
      0.99,
      0.999,
      0.9999,
      1,
    ];
    for (let trials = 1; trials <= 30; trials++) {
      for (const probability of probabilities) {
        let noncoverage = 0;
        let total = 0;
        for (let successes = 0; successes <= trials; successes++) {
          const mass = binomialProbability(successes, trials, probability);
          total += mass;
          const lower = clopperPearsonLowerBound(successes, trials, alpha);
          if (lower > probability + 2e-12) noncoverage += mass;
        }
        expect(total, `probability mass n=${trials} p=${probability}`).toBeCloseTo(1, 12);
        expect(
          noncoverage,
          `noncoverage n=${trials} p=${probability}`
        ).toBeLessThanOrEqual(alpha + 2e-11);
      }
    }
  });
});
