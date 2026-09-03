import { describe, expect, it } from "vitest";
import {
  RECONCILIATION_BENCHMARK_CASES,
  runReconciliationBenchmark,
} from "../../src/research/benchmark";

describe("reconciliation benchmark", () => {
  it("recovers every declared ground-truth landscape", () => {
    const summary = runReconciliationBenchmark();
    expect(summary.cases).toBeGreaterThanOrEqual(12);
    expect(summary.failed).toBe(0);
    expect(summary.allPassed).toBe(true);
  });

  it("contains the failure modes required for a non-trivial suite", () => {
    const tags = new Set(RECONCILIATION_BENCHMARK_CASES.flatMap((testCase) => testCase.tags));
    for (const required of [
      "co-minimum",
      "interaction",
      "non-monotone",
      "unresolved",
      "inconclusive-target",
      "inconclusive-base",
      "nuisance",
      "irrelevant",
    ]) {
      expect(tags.has(required)).toBe(true);
    }
  });
});
