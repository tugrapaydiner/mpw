import { exactWitnessSearch } from "./search.js";

export type StudyConclusion = "BASE" | "TARGET" | "OTHER";

export interface LandscapeObservation {
  conclusion: StudyConclusion;
  effect: number;
}

export interface SearchStudyCase {
  id: string;
  tags: string[];
  dimensions: string[];
  observation: (subset: readonly string[]) => LandscapeObservation;
}

export type StrategyStatus = "FOUND" | "NO_WITNESS" | "UNRESOLVED";

export interface StrategyResult {
  strategy: string;
  status: StrategyStatus;
  candidates: string[][];
  evaluatedSubsets: number;
  claimsGlobalMinimum: boolean;
  claimsAllCoMinimum: boolean;
}

export interface CaseStrategyEvaluation {
  caseId: string;
  tags: string[];
  strategy: string;
  result: StrategyResult;
  reference: {
    status: "FOUND" | "NO_WITNESS";
    minimumCardinality: number | null;
    minimumWitnesses: string[][];
  };
  sufficientCandidatesOnly: boolean;
  minimumCardinalityCorrect: boolean;
  witnessSetExact: boolean;
  coMinimumComplete: boolean;
  safeNoWitnessClaim: boolean;
  pass: boolean;
}

export interface BaselineStudySummary {
  kind: "ProtocolSearchBaselineStudy";
  version: 1;
  cases: number;
  strategies: string[];
  evaluations: CaseStrategyEvaluation[];
  aggregate: Array<{
    strategy: string;
    cases: number;
    passes: number;
    exactWitnessRecovery: number;
    minimumCardinalityRecovery: number;
    coMinimumComplete: number;
    unsafeNoWitnessClaims: number;
    meanEvaluatedSubsets: number;
  }>;
  interpretation: string[];
}

const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const subsetKey = (subset: readonly string[]): string => [...subset].sort(compare).join("+");

function normalizedDimensions(dimensions: readonly string[]): string[] {
  if (!Array.isArray(dimensions) || dimensions.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new Error("dimensions must be non-empty strings");
  }
  const sorted = [...dimensions].sort(compare);
  if (new Set(sorted).size !== sorted.length) throw new Error("dimensions must be unique");
  if (sorted.length > 20) throw new Error("baseline study limits exact landscapes to 20 dimensions");
  return sorted;
}

function allSubsets(dimensions: readonly string[]): string[][] {
  const sorted = normalizedDimensions(dimensions);
  return Array.from({ length: 2 ** sorted.length }, (_, mask) =>
    sorted.filter((_, index) => (mask & (1 << index)) !== 0)
  );
}

function cardinalityOrder(subsets: readonly string[][]): string[][] {
  return [...subsets].sort((left, right) =>
    left.length - right.length || compare(subsetKey(left), subsetKey(right))
  );
}

function targetObservation(testCase: SearchStudyCase): LandscapeObservation {
  return testCase.observation(normalizedDimensions(testCase.dimensions));
}

function sufficient(testCase: SearchStudyCase, subset: readonly string[]): boolean {
  return testCase.observation(subset).conclusion === targetObservation(testCase).conclusion;
}

function independentReference(testCase: SearchStudyCase) {
  const subsets = cardinalityOrder(allSubsets(testCase.dimensions));
  const sufficientSubsets = subsets.filter((subset) => sufficient(testCase, subset));
  if (sufficientSubsets.length === 0) {
    return { status: "NO_WITNESS" as const, minimumCardinality: null, minimumWitnesses: [] as string[][] };
  }
  const minimumCardinality = sufficientSubsets[0].length;
  return {
    status: "FOUND" as const,
    minimumCardinality,
    minimumWitnesses: sufficientSubsets.filter((subset) => subset.length === minimumCardinality),
  };
}

function exactStrategy(testCase: SearchStudyCase): StrategyResult {
  const result = exactWitnessSearch({
    dimensions: testCase.dimensions,
    mode: "landscape",
    maxEvaluations: 2 ** testCase.dimensions.length,
    isSufficient: (subset) => sufficient(testCase, subset),
  });
  return {
    strategy: "exact-cardinality-landscape",
    status: result.status === "FOUND" ? "FOUND" : "NO_WITNESS",
    candidates: result.minimumWitnesses,
    evaluatedSubsets: result.evaluatedSubsets,
    claimsGlobalMinimum: result.proof.minimumProven,
    claimsAllCoMinimum: result.proof.coMinimumComplete,
  };
}

function oneAtATime(testCase: SearchStudyCase): StrategyResult {
  const dimensions = normalizedDimensions(testCase.dimensions);
  const candidates: string[][] = [];
  let evaluatedSubsets = 1;
  if (sufficient(testCase, [])) candidates.push([]);
  if (candidates.length === 0) {
    for (const dimension of dimensions) {
      evaluatedSubsets++;
      if (sufficient(testCase, [dimension])) candidates.push([dimension]);
    }
  }
  return {
    strategy: "one-at-a-time",
    status: candidates.length > 0 ? "FOUND" : "UNRESOLVED",
    candidates,
    evaluatedSubsets,
    claimsGlobalMinimum: candidates.length > 0,
    claimsAllCoMinimum: candidates.length > 0,
  };
}

function firstSufficientBitmask(testCase: SearchStudyCase): StrategyResult {
  const dimensions = normalizedDimensions(testCase.dimensions);
  const subsets = allSubsets(dimensions);
  for (let index = 0; index < subsets.length; index++) {
    if (sufficient(testCase, subsets[index])) {
      return {
        strategy: "first-sufficient-bitmask",
        status: "FOUND",
        candidates: [subsets[index]],
        evaluatedSubsets: index + 1,
        claimsGlobalMinimum: true,
        claimsAllCoMinimum: false,
      };
    }
  }
  return {
    strategy: "first-sufficient-bitmask",
    status: "NO_WITNESS",
    candidates: [],
    evaluatedSubsets: subsets.length,
    claimsGlobalMinimum: true,
    claimsAllCoMinimum: true,
  };
}

function greedyEffectMatching(testCase: SearchStudyCase): StrategyResult {
  const dimensions = normalizedDimensions(testCase.dimensions);
  const targetEffect = targetObservation(testCase).effect;
  let chosen: string[] = [];
  let evaluatedSubsets = 1;
  if (sufficient(testCase, chosen)) {
    return {
      strategy: "greedy-effect-matching",
      status: "FOUND",
      candidates: [[]],
      evaluatedSubsets,
      claimsGlobalMinimum: true,
      claimsAllCoMinimum: false,
    };
  }
  while (chosen.length < dimensions.length) {
    const candidates = dimensions
      .filter((dimension) => !chosen.includes(dimension))
      .map((dimension) => [...chosen, dimension].sort(compare));
    evaluatedSubsets += candidates.length;
    candidates.sort((left, right) => {
      const leftDistance = Math.abs(testCase.observation(left).effect - targetEffect);
      const rightDistance = Math.abs(testCase.observation(right).effect - targetEffect);
      return leftDistance - rightDistance || compare(subsetKey(left), subsetKey(right));
    });
    chosen = candidates[0];
    if (sufficient(testCase, chosen)) {
      return {
        strategy: "greedy-effect-matching",
        status: "FOUND",
        candidates: [chosen],
        evaluatedSubsets,
        claimsGlobalMinimum: true,
        claimsAllCoMinimum: false,
      };
    }
  }
  return {
    strategy: "greedy-effect-matching",
    status: "NO_WITNESS",
    candidates: [],
    evaluatedSubsets,
    claimsGlobalMinimum: true,
    claimsAllCoMinimum: false,
  };
}

function hash(value: string): number {
  let output = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index++) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function budgetedRandom(testCase: SearchStudyCase): StrategyResult {
  const subsets = allSubsets(testCase.dimensions);
  const budget = Math.min(8, subsets.length);
  const order = subsets
    .map((subset) => ({ subset, rank: hash(`${testCase.id}|${subsetKey(subset)}`) }))
    .sort((left, right) => left.rank - right.rank || compare(subsetKey(left.subset), subsetKey(right.subset)))
    .slice(0, budget);
  const sufficientSample = order.filter(({ subset }) => sufficient(testCase, subset));
  if (sufficientSample.length === 0) {
    return {
      strategy: "budgeted-random-8",
      status: budget === subsets.length ? "NO_WITNESS" : "UNRESOLVED",
      candidates: [],
      evaluatedSubsets: budget,
      claimsGlobalMinimum: false,
      claimsAllCoMinimum: false,
    };
  }
  sufficientSample.sort((left, right) =>
    left.subset.length - right.subset.length || compare(subsetKey(left.subset), subsetKey(right.subset))
  );
  return {
    strategy: "budgeted-random-8",
    status: "FOUND",
    candidates: [sufficientSample[0].subset],
    evaluatedSubsets: budget,
    claimsGlobalMinimum: false,
    claimsAllCoMinimum: false,
  };
}

function has(subset: readonly string[], dimension: string): boolean {
  return subset.includes(dimension);
}

export const PROTOCOL_SEARCH_STUDY_CASES: SearchStudyCase[] = [
  {
    id: "unique-singleton",
    tags: ["singleton", "monotone"],
    dimensions: ["budget", "parser", "retry"],
    observation: (subset) => ({ conclusion: has(subset, "budget") ? "TARGET" : "BASE", effect: has(subset, "budget") ? -0.2 : 0.15 }),
  },
  {
    id: "pair-interaction",
    tags: ["interaction", "minimum-2"],
    dimensions: ["x", "y", "nuisance"],
    observation: (subset) => ({
      conclusion: has(subset, "x") && has(subset, "y") ? "TARGET" : "BASE",
      effect: (has(subset, "x") ? -0.04 : 0.11) + (has(subset, "y") ? -0.08 : 0) + (has(subset, "nuisance") ? 0.03 : 0),
    }),
  },
  {
    id: "triple-interaction",
    tags: ["interaction", "minimum-3"],
    dimensions: ["a", "b", "c", "irrelevant"],
    observation: (subset) => ({
      conclusion: ["a", "b", "c"].every((dimension) => has(subset, dimension)) ? "TARGET" : "BASE",
      effect: 0.18 - ["a", "b", "c"].filter((dimension) => has(subset, dimension)).length * 0.11,
    }),
  },
  {
    id: "co-minimum-singletons",
    tags: ["co-minimum", "singleton"],
    dimensions: ["x", "y", "z"],
    observation: (subset) => ({ conclusion: has(subset, "x") || has(subset, "y") ? "TARGET" : "BASE", effect: has(subset, "x") || has(subset, "y") ? -0.1 : 0.1 }),
  },
  {
    id: "co-minimum-pairs",
    tags: ["co-minimum", "minimum-2"],
    dimensions: ["a", "b", "c", "d"],
    observation: (subset) => ({
      conclusion: has(subset, "a") && (has(subset, "b") || has(subset, "c")) ? "TARGET" : "BASE",
      effect: has(subset, "a") ? -0.02 - (has(subset, "b") || has(subset, "c") ? 0.1 : 0) : 0.13,
    }),
  },
  {
    id: "non-monotone",
    tags: ["non-monotone", "interaction"],
    dimensions: ["x", "y", "z"],
    observation: (subset) => {
      const isTarget = (has(subset, "x") && !has(subset, "y")) || ["x", "y", "z"].every((dimension) => has(subset, dimension));
      return { conclusion: isTarget ? "TARGET" : "BASE", effect: isTarget ? -0.08 : 0.06 };
    },
  },
  {
    id: "bitmask-order-trap",
    tags: ["non-minimum-first", "coexisting-explanations"],
    dimensions: ["a", "b", "c"],
    observation: (subset) => ({
      conclusion: (has(subset, "a") && has(subset, "b")) || has(subset, "c") ? "TARGET" : "BASE",
      effect: has(subset, "c") ? -0.12 : has(subset, "a") && has(subset, "b") ? -0.04 : 0.1,
    }),
  },
  {
    id: "greedy-effect-trap",
    tags: ["greedy-trap", "minimum-2"],
    dimensions: ["a", "b", "c"],
    observation: (subset) => {
      const target = (has(subset, "a") && has(subset, "c")) || ["a", "b", "c"].every((dimension) => has(subset, dimension));
      const effect = subsetKey(subset) === "b" ? -0.18 : target ? -0.2 : 0.12 - subset.length * 0.03;
      return { conclusion: target ? "TARGET" : "BASE", effect };
    },
  },
  {
    id: "empty-witness",
    tags: ["empty", "no-categorical-dispute"],
    dimensions: ["x", "y"],
    observation: (subset) => ({ conclusion: "TARGET", effect: 0.02 + subset.length * 0.01 }),
  },
  {
    id: "no-exposed-witness",
    tags: ["unresolved", "omitted-coordinate"],
    dimensions: ["x", "y", "z"],
    observation: (subset) => ({ conclusion: subset.length % 2 === 0 ? "BASE" : "OTHER", effect: subset.length * 0.01 }),
  },
  {
    id: "nuisance-effect",
    tags: ["nuisance", "effect-vs-conclusion"],
    dimensions: ["winner", "nuisance"],
    observation: (subset) => ({
      conclusion: has(subset, "winner") ? "TARGET" : "BASE",
      effect: has(subset, "winner") ? -0.05 : has(subset, "nuisance") ? -0.2 : 0.15,
    }),
  },
];

const STRATEGIES = [exactStrategy, oneAtATime, firstSufficientBitmask, greedyEffectMatching, budgetedRandom];

function evaluateStrategy(testCase: SearchStudyCase, strategy: (testCase: SearchStudyCase) => StrategyResult): CaseStrategyEvaluation {
  const reference = independentReference(testCase);
  const result = strategy(testCase);
  const candidateKeys = new Set(result.candidates.map(subsetKey));
  const referenceKeys = new Set(reference.minimumWitnesses.map(subsetKey));
  const sufficientCandidatesOnly = result.candidates.every((candidate) => sufficient(testCase, candidate));
  const minimumCardinalityCorrect = reference.status === "NO_WITNESS"
    ? result.status !== "FOUND"
    : result.status === "FOUND" && result.candidates.every((candidate) => candidate.length === reference.minimumCardinality);
  const witnessSetExact =
    result.status === reference.status &&
    candidateKeys.size === referenceKeys.size &&
    [...candidateKeys].every((candidate) => referenceKeys.has(candidate));
  const coMinimumComplete = reference.minimumWitnesses.every((candidate) => candidateKeys.has(subsetKey(candidate)));
  const safeNoWitnessClaim = result.status !== "NO_WITNESS" || reference.status === "NO_WITNESS";
  const pass = sufficientCandidatesOnly && minimumCardinalityCorrect && witnessSetExact && coMinimumComplete && safeNoWitnessClaim;
  return {
    caseId: testCase.id,
    tags: [...testCase.tags],
    strategy: result.strategy,
    result,
    reference,
    sufficientCandidatesOnly,
    minimumCardinalityCorrect,
    witnessSetExact,
    coMinimumComplete,
    safeNoWitnessClaim,
    pass,
  };
}

export function runProtocolSearchBaselineStudy(): BaselineStudySummary {
  const evaluations = PROTOCOL_SEARCH_STUDY_CASES.flatMap((testCase) =>
    STRATEGIES.map((strategy) => evaluateStrategy(testCase, strategy))
  );
  const strategies = [...new Set(evaluations.map((evaluation) => evaluation.strategy))];
  const aggregate = strategies.map((strategy) => {
    const rows = evaluations.filter((evaluation) => evaluation.strategy === strategy);
    return {
      strategy,
      cases: rows.length,
      passes: rows.filter((row) => row.pass).length,
      exactWitnessRecovery: rows.filter((row) => row.witnessSetExact).length,
      minimumCardinalityRecovery: rows.filter((row) => row.minimumCardinalityCorrect).length,
      coMinimumComplete: rows.filter((row) => row.coMinimumComplete).length,
      unsafeNoWitnessClaims: rows.filter((row) => !row.safeNoWitnessClaim).length,
      meanEvaluatedSubsets: rows.reduce((sum, row) => sum + row.result.evaluatedSubsets, 0) / rows.length,
    };
  });
  return {
    kind: "ProtocolSearchBaselineStudy",
    version: 1,
    cases: PROTOCOL_SEARCH_STUDY_CASES.length,
    strategies,
    evaluations,
    aggregate,
    interpretation: [
      "This is a deterministic stress study over authored landscapes, not an estimate of performance on real evaluation disputes.",
      "One-at-a-time attribution cannot recover pure interactions; first-sufficient order can return non-minimum witnesses; greedy effect matching can follow a nuisance dimension; budgeted random search cannot prove absence or global minimality.",
      "Exact cardinality search is combinatorial but is the only evaluated strategy that carries a complete global-minimum and co-minimum proof under arbitrary non-monotone sufficiency.",
    ],
  };
}
