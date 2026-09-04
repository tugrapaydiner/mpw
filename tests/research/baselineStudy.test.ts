import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  PROTOCOL_SEARCH_STUDY_CASES,
  completeThreeDimensionCases,
  runProtocolSearchBaselineStudy,
} from "../../src/research/baselineStudy";

const aggregate = (
  report: ReturnType<typeof runProtocolSearchBaselineStudy>,
  section: "authoredAdversarialCases" | "completeThreeDimensionCensus",
  strategy: string
) => {
  const row = report[section].aggregate.find((candidate) => candidate.strategy === strategy);
  if (!row) throw new Error(`missing aggregate for ${strategy}`);
  return row;
};

describe("protocol-search baseline study", () => {
  it("contains a genuine unreachable target rather than deriving every target from the full subset", () => {
    const testCase = PROTOCOL_SEARCH_STUDY_CASES.find((candidate) => candidate.id === "no-exposed-witness");
    expect(testCase).toBeDefined();
    const report = runProtocolSearchBaselineStudy();
    const exact = report.authoredAdversarialCases.evaluations.find(
      (row) => row.caseId === "no-exposed-witness" && row.strategy === "exact-cardinality-landscape"
    );
    expect(exact?.reference.status).toBe("NO_WITNESS");
    expect(exact?.result.status).toBe("NO_WITNESS");
    expect(exact?.certifiableExactRecovery).toBe(true);
  });

  it("enumerates every Boolean sufficiency landscape over three dimensions", () => {
    const cases = completeThreeDimensionCases();
    expect(cases).toHaveLength(256);
    expect(new Set(cases.map((testCase) => testCase.id)).size).toBe(256);
  });

  it("requires the exact method to recover and certify the complete census", () => {
    const report = runProtocolSearchBaselineStudy();
    const exact = aggregate(report, "completeThreeDimensionCensus", "exact-cardinality-landscape");
    expect(exact.cases).toBe(256);
    expect(exact.exactWitnessRecovery).toBe(256);
    expect(exact.certifiableExactRecovery).toBe(256);
    expect(exact.unsafeClaims).toBe(0);
  });

  it("pins the complete-census recovery counts so strategy drift is visible", () => {
    const report = runProtocolSearchBaselineStudy();
    expect(aggregate(report, "completeThreeDimensionCensus", "one-at-a-time").exactWitnessRecovery).toBe(240);
    expect(aggregate(report, "completeThreeDimensionCensus", "first-sufficient-bitmask").exactWitnessRecovery).toBe(176);
    expect(aggregate(report, "completeThreeDimensionCensus", "greedy-effect-matching").exactWitnessRecovery).toBe(146);
    expect(aggregate(report, "completeThreeDimensionCensus", "budgeted-random-8").exactWitnessRecovery).toBe(184);
  });

  it("exposes interaction, ordering, greedy, and incomplete-search failures without making heuristics look exact", () => {
    const report = runProtocolSearchBaselineStudy();
    const oneAtATime = aggregate(report, "authoredAdversarialCases", "one-at-a-time");
    const first = aggregate(report, "authoredAdversarialCases", "first-sufficient-bitmask");
    const greedy = aggregate(report, "authoredAdversarialCases", "greedy-effect-matching");
    const random = aggregate(report, "authoredAdversarialCases", "budgeted-random-8");
    expect(oneAtATime.exactWitnessRecovery).toBeLessThan(oneAtATime.cases);
    expect(first.certifiableExactRecovery).toBeLessThan(first.cases);
    expect(greedy.certifiableExactRecovery).toBeLessThan(greedy.cases);
    expect(random.certifiableExactRecovery).toBeLessThan(random.cases);
  });

  it("keeps the compact durable summary synchronized with the executable report", async () => {
    const report = runProtocolSearchBaselineStudy();
    const summaryBytes = await readFile(
      new URL("../../data/benchmarks/protocol-search-baselines-summary.json", import.meta.url),
      "utf8"
    );
    const summary = JSON.parse(summaryBytes) as {
      sourceArtifactSha256: string;
      authoredCases: number;
      completeThreeDimensionCensus: { landscapes: number; effectSeed: string };
      authoredAggregate: unknown;
      censusAggregate: unknown;
    };
    const fullBytes = `${JSON.stringify(report, null, 2)}\n`;
    expect(summary.sourceArtifactSha256).toBe(
      createHash("sha256").update(fullBytes, "utf8").digest("hex")
    );
    expect(summary.authoredCases).toBe(report.authoredAdversarialCases.cases);
    expect(summary.completeThreeDimensionCensus).toMatchObject({
      landscapes: report.completeThreeDimensionCensus.landscapes,
      effectSeed: report.completeThreeDimensionCensus.effectSeed,
    });
    expect(summary.authoredAggregate).toEqual(report.authoredAdversarialCases.aggregate);
    expect(summary.censusAggregate).toEqual(report.completeThreeDimensionCensus.aggregate);
  });

  it("is byte-for-byte deterministic as a JSON value", () => {
    expect(runProtocolSearchBaselineStudy()).toEqual(runProtocolSearchBaselineStudy());
  });
});
