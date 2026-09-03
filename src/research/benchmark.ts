import type { FiniteProtocol, ProtocolSchema } from "./protocol.js";
import { reconcileDirection, type ReconciliationObservation } from "./reconciliation.js";

export interface ReconciliationBenchmarkExpected {
  status: "FOUND" | "NO_WITNESS";
  minimumCardinality: number | null;
  minimumWitnesses: string[][];
  targetConclusion: string;
}

export interface ReconciliationBenchmarkCase {
  id: string;
  description: string;
  schema: ProtocolSchema;
  baseProtocol: FiniteProtocol;
  sourceProtocol: FiniteProtocol;
  exposedDimensions?: string[];
  evaluate: (protocol: FiniteProtocol) => ReconciliationObservation;
  expected: ReconciliationBenchmarkExpected;
  tags: string[];
}

const binaryCase = ({
  id,
  description,
  dimensions,
  classify,
  effect,
  expected,
  exposedDimensions,
  tags,
}: {
  id: string;
  description: string;
  dimensions: string[];
  classify: (adopted: ReadonlySet<string>) => string;
  effect?: (adopted: ReadonlySet<string>) => number;
  expected: ReconciliationBenchmarkExpected;
  exposedDimensions?: string[];
  tags: string[];
}): ReconciliationBenchmarkCase => {
  const schema: ProtocolSchema = {
    kind: "FiniteProtocolSchema",
    version: 1,
    coordinates: dimensions.map((name) => ({ name, values: [0, 1] })),
  };
  const baseProtocol = Object.fromEntries(dimensions.map((name) => [name, 0])) as FiniteProtocol;
  const sourceProtocol = Object.fromEntries(dimensions.map((name) => [name, 1])) as FiniteProtocol;
  return {
    id,
    description,
    schema,
    baseProtocol,
    sourceProtocol,
    exposedDimensions,
    tags,
    expected,
    evaluate: (protocol) => {
      const adopted = new Set(dimensions.filter((name) => protocol[name] === 1));
      return {
        conclusion: classify(adopted),
        effect: effect?.(adopted),
        evidenceId: `${id}:${[...adopted].sort().join("+") || "base"}`,
      };
    },
  };
};

const includesAll = (set: ReadonlySet<string>, values: readonly string[]): boolean =>
  values.every((value) => set.has(value));

export const RECONCILIATION_BENCHMARK_CASES: ReconciliationBenchmarkCase[] = [
  binaryCase({
    id: "unique-singleton",
    description: "One coordinate is sufficient; two nuisance coordinates alter effect size only.",
    dimensions: ["budget", "parser", "retry"],
    classify: (s) => (s.has("budget") ? "MODEL_B" : "MODEL_A"),
    effect: (s) => 0.12 - (s.has("budget") ? 0.22 : 0) - (s.has("parser") ? 0.035 : 0) + (s.has("retry") ? 0.01 : 0),
    expected: { status: "FOUND", minimumCardinality: 1, minimumWitnesses: [["budget"]], targetConclusion: "MODEL_B" },
    tags: ["singleton", "nuisance"],
  }),
  binaryCase({
    id: "co-minimum-singletons",
    description: "Two independent coordinates each reproduce the target.",
    dimensions: ["x", "y", "z"],
    classify: (s) => (s.has("x") || s.has("y") ? "TARGET" : "BASE"),
    effect: (s) => (s.has("x") || s.has("y") ? -0.08 : 0.08) + (s.has("z") ? 0.01 : 0),
    expected: { status: "FOUND", minimumCardinality: 1, minimumWitnesses: [["x"], ["y"]], targetConclusion: "TARGET" },
    tags: ["co-minimum", "redundant"],
  }),
  binaryCase({
    id: "pair-interaction",
    description: "Neither singleton suffices; the pair is the unique minimum.",
    dimensions: ["x", "y", "nuisance"],
    classify: (s) => (includesAll(s, ["x", "y"]) ? "TARGET" : "BASE"),
    effect: (s) => 0.1 - (s.has("x") ? 0.04 : 0) - (s.has("y") ? 0.04 : 0) - (includesAll(s, ["x", "y"]) ? 0.12 : 0),
    expected: { status: "FOUND", minimumCardinality: 2, minimumWitnesses: [["x", "y"]], targetConclusion: "TARGET" },
    tags: ["interaction", "size-2"],
  }),
  binaryCase({
    id: "triple-interaction",
    description: "A genuine third-order minimum with an irrelevant coordinate.",
    dimensions: ["a", "b", "c", "irrelevant"],
    classify: (s) => (includesAll(s, ["a", "b", "c"]) ? "TARGET" : "BASE"),
    effect: (s) => (includesAll(s, ["a", "b", "c"]) ? -0.06 : 0.06),
    expected: { status: "FOUND", minimumCardinality: 3, minimumWitnesses: [["a", "b", "c"]], targetConclusion: "TARGET" },
    tags: ["interaction", "size-3", "irrelevant"],
  }),
  binaryCase({
    id: "no-exposed-witness",
    description: "The target depends on an intentionally unexposed source difference.",
    dimensions: ["visible", "hidden"],
    exposedDimensions: ["visible"],
    classify: (s) => (s.has("hidden") ? "TARGET" : "BASE"),
    effect: (s) => (s.has("hidden") ? -0.1 : 0.1),
    expected: { status: "NO_WITNESS", minimumCardinality: null, minimumWitnesses: [], targetConclusion: "TARGET" },
    tags: ["unresolved", "omitted-coordinate"],
  }),
  binaryCase({
    id: "target-inconclusive",
    description: "The source target is INCONCLUSIVE and remains a first-class conclusion.",
    dimensions: ["threshold", "nuisance"],
    classify: (s) => (s.has("threshold") ? "INCONCLUSIVE" : "MODEL_A"),
    effect: (s) => (s.has("threshold") ? 0.005 : 0.09),
    expected: { status: "FOUND", minimumCardinality: 1, minimumWitnesses: [["threshold"]], targetConclusion: "INCONCLUSIVE" },
    tags: ["inconclusive-target", "singleton"],
  }),
  binaryCase({
    id: "base-inconclusive",
    description: "The base is INCONCLUSIVE and a singleton reaches the source winner.",
    dimensions: ["scoring", "irrelevant"],
    classify: (s) => (s.has("scoring") ? "MODEL_B" : "INCONCLUSIVE"),
    effect: (s) => (s.has("scoring") ? -0.07 : 0),
    expected: { status: "FOUND", minimumCardinality: 1, minimumWitnesses: [["scoring"]], targetConclusion: "MODEL_B" },
    tags: ["inconclusive-base", "singleton"],
  }),
  binaryCase({
    id: "non-monotone-landscape",
    description: "A sufficient singleton becomes insufficient after one addition, while the full source still matches the target.",
    dimensions: ["x", "y", "z"],
    classify: (s) => ((s.has("x") && !s.has("y")) || includesAll(s, ["x", "y", "z"]) ? "TARGET" : "BASE"),
    effect: (s) => ((s.has("x") && !s.has("y")) || includesAll(s, ["x", "y", "z"]) ? -0.05 : 0.05),
    expected: { status: "FOUND", minimumCardinality: 1, minimumWitnesses: [["x"]], targetConclusion: "TARGET" },
    tags: ["non-monotone", "singleton"],
  }),
  binaryCase({
    id: "multiple-size-two",
    description: "Two distinct pairs tie at the global minimum.",
    dimensions: ["a", "b", "c", "d"],
    classify: (s) => (s.has("a") && (s.has("b") || s.has("c")) ? "TARGET" : "BASE"),
    effect: (s) => (s.has("a") && (s.has("b") || s.has("c")) ? -0.09 : 0.09),
    expected: { status: "FOUND", minimumCardinality: 2, minimumWitnesses: [["a", "b"], ["a", "c"]], targetConclusion: "TARGET" },
    tags: ["co-minimum", "size-2"],
  }),
  binaryCase({
    id: "nuisance-large-effect",
    description: "A nuisance coordinate moves the effect substantially but does not reproduce the target category.",
    dimensions: ["winner", "nuisance"],
    classify: (s) => (s.has("winner") ? "TARGET" : "BASE"),
    effect: (s) => 0.18 - (s.has("winner") ? 0.22 : 0) - (s.has("nuisance") ? 0.15 : 0),
    expected: { status: "FOUND", minimumCardinality: 1, minimumWitnesses: [["winner"]], targetConclusion: "TARGET" },
    tags: ["nuisance", "effect-vs-category"],
  }),
  binaryCase({
    id: "empty-witness",
    description: "The declared endpoints differ in protocol but not in categorical conclusion.",
    dimensions: ["x", "y"],
    classify: () => "SAME",
    effect: (s) => (s.size === 0 ? 0.03 : 0.01),
    expected: { status: "FOUND", minimumCardinality: 0, minimumWitnesses: [[]], targetConclusion: "SAME" },
    tags: ["empty", "not-a-categorical-dispute"],
  }),
  binaryCase({
    id: "categorical-coordinate",
    description: "The protocol schema is finite and categorical, not restricted to Boolean runtime values.",
    dimensions: ["mode"],
    classify: (s) => (s.has("mode") ? "TARGET" : "BASE"),
    effect: (s) => (s.has("mode") ? -0.03 : 0.03),
    expected: { status: "FOUND", minimumCardinality: 1, minimumWitnesses: [["mode"]], targetConclusion: "TARGET" },
    tags: ["categorical-schema"],
  }),
];

function witnessKey(witnesses: readonly string[][]): string {
  return JSON.stringify(
    witnesses
      .map((witness) => [...witness].sort())
      .sort((a, b) => (a.join("\u0000") < b.join("\u0000") ? -1 : a.join("\u0000") > b.join("\u0000") ? 1 : 0))
  );
}

export interface ReconciliationBenchmarkCaseResult {
  id: string;
  pass: boolean;
  tags: string[];
  expected: ReconciliationBenchmarkExpected;
  actual: {
    status: string;
    minimumCardinality: number | null;
    minimumWitnesses: string[][];
    targetConclusion: string;
    evaluatedSubsets: number;
    totalSubsetsExact: string;
    proof: {
      minimumProven: boolean;
      coMinimumComplete: boolean;
      landscapeExhaustive: boolean;
    };
    omittedDifferences: string[];
  };
}

export interface ReconciliationBenchmarkSummary {
  kind: "ReconciliationBenchmarkSummary";
  version: 1;
  cases: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  results: ReconciliationBenchmarkCaseResult[];
}

export function runReconciliationBenchmark(
  cases: readonly ReconciliationBenchmarkCase[] = RECONCILIATION_BENCHMARK_CASES
): ReconciliationBenchmarkSummary {
  const results = cases.map((benchmarkCase): ReconciliationBenchmarkCaseResult => {
    const result = reconcileDirection({
      schema: benchmarkCase.schema,
      baseProtocol: benchmarkCase.baseProtocol,
      sourceProtocol: benchmarkCase.sourceProtocol,
      evaluator: benchmarkCase.evaluate,
      exposedDimensions: benchmarkCase.exposedDimensions,
      searchMode: "landscape",
    });
    const actual = {
      status: result.search.status,
      minimumCardinality: result.search.minimumCardinality,
      minimumWitnesses: result.search.minimumWitnesses,
      targetConclusion: result.target.conclusion,
      evaluatedSubsets: result.search.evaluatedSubsets,
      totalSubsetsExact: result.search.totalSubsetsExact,
      proof: result.search.proof,
      omittedDifferences: result.omittedDifferences,
    };
    const pass =
      actual.status === benchmarkCase.expected.status &&
      actual.minimumCardinality === benchmarkCase.expected.minimumCardinality &&
      witnessKey(actual.minimumWitnesses) === witnessKey(benchmarkCase.expected.minimumWitnesses) &&
      actual.targetConclusion === benchmarkCase.expected.targetConclusion &&
      actual.proof.minimumProven &&
      actual.proof.coMinimumComplete &&
      actual.proof.landscapeExhaustive;
    return {
      id: benchmarkCase.id,
      pass,
      tags: [...benchmarkCase.tags],
      expected: {
        ...benchmarkCase.expected,
        minimumWitnesses: benchmarkCase.expected.minimumWitnesses.map((witness) => [...witness]),
      },
      actual,
    };
  });
  const passed = results.filter((result) => result.pass).length;
  return {
    kind: "ReconciliationBenchmarkSummary",
    version: 1,
    cases: results.length,
    passed,
    failed: results.length - passed,
    allPassed: passed === results.length,
    results,
  };
}
