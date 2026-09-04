import { describe, expect, it } from "vitest";
import { simulateRobustWitnessStudy } from "../../src/research/robustWitnessSimulation";

const probabilities = (
  entries: Array<[string[], number]>
) => entries.map(([subset, probability]) => ({ subset, probability }));

describe("robust-witness Monte Carlo validation", () => {
  it("shows conservative false-certification behavior under a complete null family", () => {
    const result = simulateRobustWitnessStudy({
      dimensions: ["a", "b"],
      probabilities: probabilities([
        [[], 0.2],
        [["a"], 0.89],
        [["b"], 0.6],
        [["a", "b"], 0.89],
      ]),
      threshold: 0.9,
      alpha: 0.05,
      trialsPerSubset: 300,
      replications: 500,
      seed: "null-family",
    });
    expect(result.trueMinimumCardinality).toBe(null);
    expect(result.falseCertificationRate).toBeLessThanOrEqual(0.05);
    expect(result.simultaneousCoverageFailureRate).toBeLessThanOrEqual(0.05);
    expect(result.exactMinimumRecoveryRate).toBeGreaterThan(0.95);
  });

  it("recovers a strong unique robust witness with high probability", () => {
    const result = simulateRobustWitnessStudy({
      dimensions: ["a", "b"],
      probabilities: probabilities([
        [[], 0.1],
        [["a"], 0.99],
        [["b"], 0.3],
        [["a", "b"], 0.99],
      ]),
      threshold: 0.9,
      alpha: 0.05,
      trialsPerSubset: 500,
      replications: 300,
      seed: "strong-unique",
    });
    expect(result.trueMinimumCardinality).toBe(1);
    expect(result.trueMinimumWitnesses).toEqual([["a"]]);
    expect(result.falseCertificationRate).toBeLessThanOrEqual(0.05);
    expect(result.simultaneousCoverageFailureRate).toBeLessThanOrEqual(0.05);
    expect(result.exactMinimumRecoveryRate).toBeGreaterThan(0.9);
  });

  it("is byte-for-byte deterministic for a pinned scenario and seed", () => {
    const options = {
      dimensions: ["b", "a"],
      probabilities: probabilities([
        [["a", "b"], 0.95],
        [["b"], 0.5],
        [[], 0.1],
        [["a"], 0.95],
      ]),
      threshold: 0.85,
      alpha: 0.05,
      trialsPerSubset: 100,
      replications: 40,
      seed: "determinism",
    } as const;
    expect(simulateRobustWitnessStudy(options)).toEqual(
      simulateRobustWitnessStudy(options)
    );
  });

  it("rejects incomplete probability grids and unsafe simulation sizes", () => {
    expect(() =>
      simulateRobustWitnessStudy({
        dimensions: ["a"],
        probabilities: probabilities([[[], 0.5]]),
        threshold: 0.5,
        trialsPerSubset: 10,
        replications: 10,
      })
    ).toThrow(/incomplete/);
    expect(() =>
      simulateRobustWitnessStudy({
        dimensions: [],
        probabilities: probabilities([[[], 0.5]]),
        threshold: 0.5,
        trialsPerSubset: 0,
        replications: 10,
      })
    ).toThrow(/trialsPerSubset/);
    expect(() =>
      simulateRobustWitnessStudy({
        dimensions: [],
        probabilities: probabilities([[[], 0.5]]),
        threshold: 0.5,
        trialsPerSubset: 10,
        replications: 100_001,
      })
    ).toThrow(/replications/);
  });
});
