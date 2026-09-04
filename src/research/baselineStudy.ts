import { exactWitnessSearch, type SearchProof } from "./search.js";

export type StudyConclusion = "BASE" | "TARGET" | "OTHER";

export interface LandscapeObservation {
  conclusion: StudyConclusion;
  effect: number;
}

export interface SearchStudyCase {
  id: string;
  tags: string[];
  dimensions: string[];
  target: LandscapeObservation;
  observation: (subset: readonly string[]) => LandscapeObservation;
}

export type StrategyStatus = "FOUND" | "NO_WITNESS" | "UNRESOLVED";

export interface StrategyResult {
  strategy: string;
  status: StrategyStatus;
  candidates: string[][];
  evaluatedSubsets: number;
  proof: SearchProof;
}

export interface ReferenceResult {
  status: "FOUND" | "NO_WITNESS";
  minimumCardinality: number | null;
  minimumWitnesses: string[][];
  totalSubsets: number;
}

export interface CaseStrategyEvaluation {
  caseId: string;
  tags: string[];
  strategy: string;
  result: StrategyResult;
  reference: ReferenceResult;
  sufficientCandidatesOnly: boolean;
  minimumCardinalityCorrect: boolean;
  witnessSetExact: boolean;
  coMinimumComplete: boolean;
  noWitnessDecisionExact: boolean;
  proofSound: boolean;
  certifiableExactRecovery: boolean;
  safeAbstention: boolean;
  unsafeClaim: boolean;
}

export interface StrategyAggregate {
  strategy: string;
  cases: number;
  exactWitnessRecovery: number;
  minimumCardinalityRecovery: number;
  coMinimumComplete: number;
  certifiableExactRecovery: number;
  safeAbstentions: number;
  unsafeClaims: number;
  meanEvaluatedSubsets: number;
}

export interface StudySection {
  cases: number;
  evaluations: CaseStrategyEvaluation[];
  aggregate: StrategyAggregate[];
}

export interface BaselineStudySummary {
  kind: "ProtocolSearchBaselineStudy";
  version: 2;
  strategies: string[];
  authoredAdversarialCases: StudySection;
  completeThreeDimensionCensus: StudySection & {
    dimensions: string[];
    landscapes: number;
    effectSeed: string;
    construction: string;
  };
  interpretation: string[];
}

const THREE_DIMENSION_CENSUS_EFFECT_SEED = "mpw-search-census-effects-v1";
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

function isSufficient(testCase: SearchStudyCase, subset: readonly string[]): boolean {
  return testCase.observation(subset).conclusion === testCase.target.conclusion;
}

function independentReference(testCase: SearchStudyCase): ReferenceResult {
  const subsets = cardinalityOrder(allSubsets(testCase.dimensions));
  const sufficientSubsets = subsets.filter((subset) => isSufficient(testCase, subset));
  if (sufficientSubsets.length === 0) {
    return {
      status: "NO_WITNESS",
      minimumCardinality: null,
      minimumWitnesses: [],
      totalSubsets: subsets.length,
    };
  }
  const minimumCardinality = sufficientSubsets[0].length;
  return {
    status: "FOUND",
    minimumCardinality,
    minimumWitnesses: sufficientSubsets.filter((subset) => subset.length === minimumCardinality),
    totalSubsets: subsets.length,
  };
}

function exactStrategy(testCase: SearchStudyCase): StrategyResult {
  const result = exactWitnessSearch({
    dimensions: testCase.dimensions,
    mode: "landscape",
    maxEvaluations: 2 ** testCase.dimensions.length,
    isSufficient: (subset) => isSufficient(testCase, subset),
  });
  return {
    strategy: "exact-cardinality-landscape",
    status: result.status === "FOUND" ? "FOUND" : "NO_WITNESS",
    candidates: result.minimumWitnesses,
    evaluatedSubsets: result.evaluatedSubsets,
    proof: result.proof,
  };
}

function oneAtATime(testCase: SearchStudyCase): StrategyResult {
  const dimensions = normalizedDimensions(testCase.dimensions);
  let evaluatedSubsets = 1;
  if (isSufficient(testCase, [])) {
    return {
      strategy: "one-at-a-time",
      status: "FOUND",
      candidates: [[]],
      evaluatedSubsets,
      proof: { minimumProven: true, coMinimumComplete: true, landscapeExhaustive: dimensions.length === 0 },
    };
  }
  const candidates: string[][] = [];
  for (const dimension of dimensions) {
    evaluatedSubsets++;
    if (isSufficient(testCase, [dimension])) candidates.push([dimension]);
  }
  if (candidates.length > 0) {
    return {
      strategy: "one-at-a-time",
      status: "FOUND",
      candidates,
      evaluatedSubsets,
      proof: { minimumProven: true, coMinimumComplete: true, landscapeExhaustive: dimensions.length <= 1 },
    };
  }
  return {
    strategy: "one-at-a-time",
    status: "UNRESOLVED",
    candidates: [],
    evaluatedSubsets,
    proof: { minimumProven: false, coMinimumComplete: false, landscapeExhaustive: dimensions.length <= 1 },
  };
}

function firstSufficientBitmask(testCase: SearchStudyCase): StrategyResult {
  const subsets = allSubsets(testCase.dimensions);
  for (let index = 0; index < subsets.length; index++) {
    if (isSufficient(testCase, subsets[index])) {
      return {
        strategy: "first-sufficient-bitmask",
        status: "FOUND",
        candidates: [subsets[index]],
        evaluatedSubsets: index + 1,
        proof: { minimumProven: false, coMinimumComplete: false, landscapeExhaustive: index + 1 === subsets.length },
      };
    }
  }
  return {
    strategy: "first-sufficient-bitmask",
    status: "NO_WITNESS",
    candidates: [],
    evaluatedSubsets: subsets.length,
    proof: { minimumProven: true, coMinimumComplete: true, landscapeExhaustive: true },
  };
}

function greedyEffectMatching(testCase: SearchStudyCase): StrategyResult {
  const dimensions = normalizedDimensions(testCase.dimensions);
  let chosen: string[] = [];
  let evaluatedSubsets = 1;
  if (isSufficient(testCase, chosen)) {
    return {
      strategy: "greedy-effect-matching",
      status: "FOUND",
      candidates: [[]],
      evaluatedSubsets,
      proof: { minimumProven: false, coMinimumComplete: false, landscapeExhaustive: dimensions.length === 0 },
    };
  }
  while (chosen.length < dimensions.length) {
    const candidates = dimensions
      .filter((dimension) => !chosen.includes(dimension))
      .map((dimension) => [...chosen, dimension].sort(compare));
    evaluatedSubsets += candidates.length;
    candidates.sort((left, right) => {
      const leftDistance = Math.abs(testCase.observation(left).effect - testCase.target.effect);
      const rightDistance = Math.abs(testCase.observation(right).effect - testCase.target.effect);
      return leftDistance - rightDistance || compare(subsetKey(left), subsetKey(right));
    });
    chosen = candidates[0];
    if (isSufficient(testCase, chosen)) {
      return {
        strategy: "greedy-effect-matching",
        status: "FOUND",
        candidates: [chosen],
        evaluatedSubsets,
        proof: { minimumProven: false, coMinimumComplete: false, landscapeExhaustive: false },
      };
    }
  }
  return {
    strategy: "greedy-effect-matching",
    status: "UNRESOLVED",
    candidates: [],
    evaluatedSubsets,
    proof: { minimumProven: false, coMinimumComplete: false, landscapeExhaustive: false },
  };
}

function fnv1a32(value: string): number {
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
  const sampled = subsets
    .map((subset) => ({ subset, rank: fnv1a32(`${testCase.id}|${subsetKey(subset)}`) }))
    .sort((left, right) => left.rank - right.rank || compare(subsetKey(left.subset), subsetKey(right.subset)))
    .slice(0, budget);
  const sufficientSample = sampled.filter(({ subset }) => isSufficient(testCase, subset));
  const landscapeExhaustive = budget === subsets.length;

  if (sufficientSample.length === 0) {
    return {
      strategy: "budgeted-random-8",
      status: landscapeExhaustive ? "NO_WITNESS" : "UNRESOLVED",
      candidates: [],
      evaluatedSubsets: budget,
      proof: {
        minimumProven: landscapeExhaustive,
        coMinimumComplete: landscapeExhaustive,
        landscapeExhaustive,
      },
    };
  }

  sufficientSample.sort((left, right) =>
    left.subset.length - right.subset.length || compare(subsetKey(left.subset), subsetKey(right.subset))
  );
  return {
    strategy: "budgeted-random-8",
    status: "FOUND",
    candidates: [[...sufficientSample[0].subset]],
    evaluatedSubsets: budget,
    proof: { minimumProven: false, coMinimumComplete: false, landscapeExhaustive },
  };
}

function hasDimension(subset: readonly string[], dimension: string): boolean {
  return subset.includes(dimension);
}

const endpointTarget = (effect: number): LandscapeObservation => ({ conclusion: "TARGET", effect });

export const PROTOCOL_SEARCH_STUDY_CASES: SearchStudyCase[] = [
  {
    id: "unique-singleton",
    tags: ["singleton", "monotone"],
    dimensions: ["budget", "parser", "retry"],
    target: endpointTarget(-0.12),
    observation: (subset) => ({
      conclusion: hasDimension(subset, "budget") ? "TARGET" : "BASE",
      effect: 0.1 - (hasDimension(subset, "budget") ? 0.22 : 0) + (hasDimension(subset, "parser") ? 0.04 : 0),
    }),
  },
  {
    id: "pair-interaction",
    tags: ["interaction", "minimum-2"],
    dimensions: ["x", "y", "nuisance"],
    target: endpointTarget(-0.09),
    observation: (subset) => ({
      conclusion: hasDimension(subset, "x") && hasDimension(subset, "y") ? "TARGET" : "BASE",
      effect: (hasDimension(subset, "x") ? -0.04 : 0.11) + (hasDimension(subset, "y") ? -0.08 : 0) + (hasDimension(subset, "nuisance") ? 0.03 : 0),
    }),
  },
  {
    id: "triple-interaction",
    tags: ["interaction", "minimum-3"],
    dimensions: ["a", "b", "c", "irrelevant"],
    target: endpointTarget(-0.15),
    observation: (subset) => ({
      conclusion: ["a", "b", "c"].every((dimension) => hasDimension(subset, dimension)) ? "TARGET" : "BASE",
      effect: 0.18 - ["a", "b", "c"].filter((dimension) => hasDimension(subset, dimension)).length * 0.11,
    }),
  },
  {
    id: "co-minimum-singletons",
    tags: ["co-minimum", "singleton"],
    dimensions: ["x", "y", "z"],
    target: endpointTarget(-0.1),
    observation: (subset) => ({
      conclusion: hasDimension(subset, "x") || hasDimension(subset, "y") ? "TARGET" : "BASE",
      effect: hasDimension(subset, "x") || hasDimension(subset, "y") ? -0.1 : 0.1,
    }),
  },
  {
    id: "co-minimum-pairs",
    tags: ["co-minimum", "minimum-2"],
    dimensions: ["a", "b", "c", "d"],
    target: endpointTarget(-0.12),
    observation: (subset) => ({
      conclusion: hasDimension(subset, "a") && (hasDimension(subset, "b") || hasDimension(subset, "c")) ? "TARGET" : "BASE",
      effect: hasDimension(subset, "a") ? -0.02 - (hasDimension(subset, "b") || hasDimension(subset, "c") ? 0.1 : 0) : 0.13,
    }),
  },
  {
    id: "non-monotone",
    tags: ["non-monotone", "interaction"],
    dimensions: ["x", "y", "z"],
    target: endpointTarget(-0.08),
    observation: (subset) => {
      const target = (hasDimension(subset, "x") && !hasDimension(subset, "y")) || ["x", "y", "z"].every((dimension) => hasDimension(subset, dimension));
      return { conclusion: target ? "TARGET" : "BASE", effect: target ? -0.08 : 0.06 };
    },
  },
  {
    id: "bitmask-order-trap",
    tags: ["non-minimum-first", "coexisting-explanations"],
    dimensions: ["a", "b", "c"],
    target: endpointTarget(-0.12),
    observation: (subset) => ({
      conclusion: (hasDimension(subset, "a") && hasDimension(subset, "b")) || hasDimension(subset, "c") ? "TARGET" : "BASE",
      effect: hasDimension(subset, "c") ? -0.12 : hasDimension(subset, "a") && hasDimension(subset, "b") ? -0.04 : 0.1,
    }),
  },
  {
    id: "greedy-effect-trap",
    tags: ["greedy-trap", "minimum-2"],
    dimensions: ["a", "b", "c"],
    target: endpointTarget(-0.2),
    observation: (subset) => {
      const target = (hasDimension(subset, "a") && hasDimension(subset, "c")) || ["a", "b", "c"].every((dimension) => hasDimension(subset, dimension));
      const effect = subsetKey(subset) === "b" ? -0.18 : target ? -0.2 : 0.12 - subset.length * 0.03;
      return { conclusion: target ? "TARGET" : "BASE", effect };
    },
  },
  {
    id: "empty-witness",
    tags: ["empty", "no-categorical-dispute"],
    dimensions: ["x", "y"],
    target: endpointTarget(0.04),
    observation: (subset) => ({ conclusion: "TARGET", effect: 0.02 + subset.length * 0.01 }),
  },
  {
    id: "no-exposed-witness",
    tags: ["unresolved", "omitted-coordinate"],
    dimensions: ["x", "y", "z"],
    target: endpointTarget(-0.2),
    observation: (subset) => ({
      conclusion: subset.length % 2 === 0 ? "BASE" : "OTHER",
      effect: 0.12 - subset.length * 0.02,
    }),
  },
  {
    id: "nuisance-effect",
    tags: ["nuisance", "effect-vs-conclusion"],
    dimensions: ["winner", "nuisance"],
    target: endpointTarget(-0.05),
    observation: (subset) => ({
      conclusion: hasDimension(subset, "winner") ? "TARGET" : "BASE",
      effect: hasDimension(subset, "winner") ? -0.05 : hasDimension(subset, "nuisance") ? -0.2 : 0.15,
    }),
  },
];

const STRATEGIES = [exactStrategy, oneAtATime, firstSufficientBitmask, greedyEffectMatching, budgetedRandom];

function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function evaluateStrategy(
  testCase: SearchStudyCase,
  strategy: (value: SearchStudyCase) => StrategyResult
): CaseStrategyEvaluation {
  const reference = independentReference(testCase);
  const result = strategy(testCase);
  const candidateKeys = new Set(result.candidates.map(subsetKey));
  const referenceKeys = new Set(reference.minimumWitnesses.map(subsetKey));
  const sufficientCandidatesOnly = result.candidates.every((candidate) => isSufficient(testCase, candidate));
  const minimumCardinalityCorrect = reference.status === "NO_WITNESS"
    ? result.status === "NO_WITNESS"
    : result.status === "FOUND" && result.candidates.length > 0 &&
      result.candidates.every((candidate) => candidate.length === reference.minimumCardinality);
  const witnessSetExact = result.status === reference.status && sameSet(candidateKeys, referenceKeys);
  const coMinimumComplete = reference.status === "NO_WITNESS"
    ? result.status === "NO_WITNESS"
    : reference.minimumWitnesses.every((candidate) => candidateKeys.has(subsetKey(candidate)));
  const noWitnessDecisionExact = result.status === "NO_WITNESS" && reference.status === "NO_WITNESS";
  const minimumProofSound = !result.proof.minimumProven ||
    (reference.status === "NO_WITNESS"
      ? result.status === "NO_WITNESS"
      : minimumCardinalityCorrect);
  const coMinimumProofSound = !result.proof.coMinimumComplete || witnessSetExact;
  const landscapeProofSound = !result.proof.landscapeExhaustive || result.evaluatedSubsets === reference.totalSubsets;
  const proofSound = minimumProofSound && coMinimumProofSound && landscapeProofSound;
  const falseNoWitnessClaim = result.status === "NO_WITNESS" && reference.status !== "NO_WITNESS";
  const certifiableExactRecovery = witnessSetExact && result.proof.minimumProven && result.proof.coMinimumComplete;
  const safeAbstention = result.status === "UNRESOLVED" && result.candidates.length === 0;
  const unsafeClaim = !sufficientCandidatesOnly || falseNoWitnessClaim || !proofSound;
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
    noWitnessDecisionExact,
    proofSound,
    certifiableExactRecovery,
    safeAbstention,
    unsafeClaim,
  };
}

function aggregateEvaluations(evaluations: readonly CaseStrategyEvaluation[]): StrategyAggregate[] {
  const strategies = [...new Set(evaluations.map((evaluation) => evaluation.strategy))];
  return strategies.map((strategy) => {
    const rows = evaluations.filter((evaluation) => evaluation.strategy === strategy);
    return {
      strategy,
      cases: rows.length,
      exactWitnessRecovery: rows.filter((row) => row.witnessSetExact).length,
      minimumCardinalityRecovery: rows.filter((row) => row.minimumCardinalityCorrect).length,
      coMinimumComplete: rows.filter((row) => row.coMinimumComplete).length,
      certifiableExactRecovery: rows.filter((row) => row.certifiableExactRecovery).length,
      safeAbstentions: rows.filter((row) => row.safeAbstention).length,
      unsafeClaims: rows.filter((row) => row.unsafeClaim).length,
      meanEvaluatedSubsets: rows.reduce((sum, row) => sum + row.result.evaluatedSubsets, 0) / rows.length,
    };
  });
}

function section(cases: readonly SearchStudyCase[]): StudySection {
  const evaluations = cases.flatMap((testCase) => STRATEGIES.map((strategy) => evaluateStrategy(testCase, strategy)));
  return { cases: cases.length, evaluations, aggregate: aggregateEvaluations(evaluations) };
}

function deterministicEffect(landscape: number, subset: readonly string[]): number {
  const unit = fnv1a32(`${THREE_DIMENSION_CENSUS_EFFECT_SEED}|${String(landscape)}|${subsetKey(subset)}`) / 4294967296;
  return (unit - 0.5) * 0.5;
}

export function completeThreeDimensionCases(): SearchStudyCase[] {
  const dimensions = ["a", "b", "c"];
  const subsets = allSubsets(dimensions);
  return Array.from({ length: 2 ** subsets.length }, (_, landscape) => ({
    id: `boolean-3-${landscape.toString(16).padStart(2, "0")}`,
    tags: ["complete-boolean-census", "three-dimensions"],
    dimensions: [...dimensions],
    target: { conclusion: "TARGET", effect: -0.2 },
    observation: (subset: readonly string[]) => {
      const index = dimensions.reduce((mask, dimension, bit) =>
        hasDimension(subset, dimension) ? mask | (1 << bit) : mask, 0);
      const target = (landscape & (1 << index)) !== 0;
      return {
        conclusion: target ? "TARGET" : "BASE",
        effect: deterministicEffect(landscape, subset),
      };
    },
  }));
}

export function runProtocolSearchBaselineStudy(): BaselineStudySummary {
  const authoredAdversarialCases = section(PROTOCOL_SEARCH_STUDY_CASES);
  const censusCases = completeThreeDimensionCases();
  const completeThreeDimensionCensus = {
    ...section(censusCases),
    dimensions: ["a", "b", "c"],
    landscapes: censusCases.length,
    effectSeed: THREE_DIMENSION_CENSUS_EFFECT_SEED,
    construction:
      "All 2^(2^3)=256 Boolean sufficiency functions over the eight subsets; effect values are deterministic hash-derived nuisance values used only by effect-greedy baselines.",
  };
  return {
    kind: "ProtocolSearchBaselineStudy",
    version: 2,
    strategies: STRATEGIES.map((strategy) => strategy(PROTOCOL_SEARCH_STUDY_CASES[0]).strategy),
    authoredAdversarialCases,
    completeThreeDimensionCensus,
    interpretation: [
      "The authored section targets named failure modes; the complete three-dimensional census removes cherry-picking over Boolean sufficiency landscapes.",
      "Exact cardinality search is combinatorial but is the only evaluated strategy with complete minimum-cardinality and co-minimum proof over arbitrary non-monotone sufficiency.",
      "A heuristic may return a correct candidate without a certificate of global minimality. Exact recovery, safe abstention, and proof soundness are therefore reported separately.",
      "This deterministic study is algorithmic evidence, not an estimate of performance on real evaluation disputes.",
    ],
  };
}
