import { describe, expect, it } from "vitest";
import { bonferroniClopperPearsonLowerBound } from "../../src/research/binomialBounds";
import { anytimeHoeffdingBernoulliLowerBound } from "../../src/research/anytimeRobustWitness";
import { hoeffdingBernoulliLowerBound } from "../../src/research/robustWitness";
import { minimumBestCaseRobustWitnessTrials } from "../../src/research/robustWitnessPlanning";

function checkMinimal(plan: ReturnType<typeof minimumBestCaseRobustWitnessTrials>) {
  expect(plan.lowerBoundAtMinimum).toBeGreaterThanOrEqual(plan.threshold);
  if (plan.lowerBoundBeforeMinimum !== null) {
    expect(plan.lowerBoundBeforeMinimum).toBeLessThan(plan.threshold);
  }
}

describe("robust witness best-case feasibility planning", () => {
  it("matches the analytic all-success Clopper-Pearson threshold", () => {
    const plan = minimumBestCaseRobustWitnessTrials({
      method: "fixed-clopper-pearson",
      threshold: 0.9,
      alpha: 0.05,
      familySize: 16,
    });
    const expected = Math.ceil(Math.log(0.05 / 16) / Math.log(0.9));
    expect(plan.minimumTrials).toBe(expected);
    expect(plan.lowerBoundAtMinimum).toBeCloseTo(
      bonferroniClopperPearsonLowerBound(
        expected,
        expected,
        0.05,
        16
      ),
      14
    );
    checkMinimal(plan);
  });

  it("matches the analytic all-success fixed-time Hoeffding threshold", () => {
    const plan = minimumBestCaseRobustWitnessTrials({
      method: "fixed-hoeffding",
      threshold: 0.9,
      alpha: 0.05,
      familySize: 16,
    });
    const expected = Math.ceil(
      Math.log(16 / 0.05) / (2 * (1 - 0.9) ** 2)
    );
    expect(plan.minimumTrials).toBe(expected);
    expect(plan.lowerBoundAtMinimum).toBeCloseTo(
      hoeffdingBernoulliLowerBound(
        expected,
        expected,
        0.05 / 16
      ),
      14
    );
    checkMinimal(plan);
  });

  it("finds the minimal anytime-valid monitoring count by bounded search", () => {
    const plan = minimumBestCaseRobustWitnessTrials({
      method: "anytime-hoeffding",
      threshold: 0.8,
      alpha: 0.05,
      familySize: 4,
    });
    expect(plan.lowerBoundAtMinimum).toBeCloseTo(
      anytimeHoeffdingBernoulliLowerBound({
        successes: plan.minimumTrials,
        trials: plan.minimumTrials,
        alpha: 0.05,
        familySize: 4,
      }).lowerBound,
      14
    );
    checkMinimal(plan);
  });

  it("shows stricter thresholds and larger families cannot need fewer best-case runs", () => {
    const base = minimumBestCaseRobustWitnessTrials({
      method: "fixed-clopper-pearson",
      threshold: 0.8,
      familySize: 4,
    });
    const stricter = minimumBestCaseRobustWitnessTrials({
      method: "fixed-clopper-pearson",
      threshold: 0.95,
      familySize: 4,
    });
    const largerFamily = minimumBestCaseRobustWitnessTrials({
      method: "fixed-clopper-pearson",
      threshold: 0.8,
      familySize: 64,
    });
    expect(stricter.minimumTrials).toBeGreaterThan(base.minimumTrials);
    expect(largerFamily.minimumTrials).toBeGreaterThan(base.minimumTrials);
  });

  it("handles a zero threshold without claiming power", () => {
    for (const method of [
      "fixed-hoeffding",
      "fixed-clopper-pearson",
      "anytime-hoeffding",
    ] as const) {
      const plan = minimumBestCaseRobustWitnessTrials({
        method,
        threshold: 0,
        familySize: 1,
      });
      expect(plan.minimumTrials).toBe(1);
      expect(plan.interpretation).toMatch(/not a power/);
    }
  });

  it("fails when the best-case bound cannot clear the threshold within the cap", () => {
    expect(() =>
      minimumBestCaseRobustWitnessTrials({
        method: "anytime-hoeffding",
        threshold: 0.999,
        familySize: 1_000,
        maxTrials: 10,
      })
    ).toThrow(/impossible within maxTrials/);
  });

  it("rejects invalid methods and study parameters", () => {
    expect(() =>
      minimumBestCaseRobustWitnessTrials({
        method: "other" as never,
        threshold: 0.9,
        familySize: 1,
      })
    ).toThrow(/unknown planning method/);
    expect(() =>
      minimumBestCaseRobustWitnessTrials({
        method: "fixed-hoeffding",
        threshold: 1,
        familySize: 1,
      })
    ).toThrow(/threshold/);
    expect(() =>
      minimumBestCaseRobustWitnessTrials({
        method: "fixed-hoeffding",
        threshold: 0.9,
        alpha: 0,
        familySize: 1,
      })
    ).toThrow(/alpha/);
    expect(() =>
      minimumBestCaseRobustWitnessTrials({
        method: "fixed-hoeffding",
        threshold: 0.9,
        familySize: 0,
      })
    ).toThrow(/familySize/);
  });
});
