import { binomialCoefficientBigInt } from "./queryLowerBound.js";

export type AnytimeSearchStatus =
  | "EXACT_MINIMUM"
  | "EXACT_NO_WITNESS"
  | "PARTIAL_NO_SUFFICIENT_OBSERVED"
  | "PARTIAL_MINIMUM_TIES_INCOMPLETE";

export interface AnytimeSubsetEvaluation {
  subset: string[];
  cardinality: number;
  sufficient: boolean;
}

export interface AnytimeCardinalitySearchResult {
  kind: "AnytimeCardinalitySearchResult";
  version: 1;
  status: AnytimeSearchStatus;
  dimensions: string[];
  evaluationBudget: number;
  evaluatedSubsets: number;
  totalSubsetsExact: string;
  completedCardinalities: number[];
  activeCardinality: number | null;
  evaluatedAtActiveCardinality: number;
  totalAtActiveCardinalityExact: string | null;
  minimumCardinalityLowerBound: number;
  minimumCardinalityUpperBound: number | null;
  minimumCardinality: number | null;
  knownMinimumWitnesses: string[][];
  proof: {
    minimumCardinalityProven: boolean;
    coMinimumComplete: boolean;
    noWitnessProven: boolean;
    landscapeExhaustive: boolean;
  };
  evaluations: AnytimeSubsetEvaluation[];
  limitation: string;
}

export interface AnytimeCardinalitySearchOptions {
  dimensions: readonly string[];
  isSufficient: (subset: readonly string[]) => boolean;
  maxEvaluations: number;
  maxDimensions?: number;
}

const DEFAULT_MAX_DIMENSIONS = 1024;
const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function normalizeDimensions(
  dimensions: readonly string[],
  maxDimensions: number
): string[] {
  if (!Array.isArray(dimensions)) throw new Error("dimensions must be an array");
  if (!Number.isSafeInteger(maxDimensions) || maxDimensions < 0) {
    throw new Error("maxDimensions must be a non-negative safe integer");
  }
  if (dimensions.length > maxDimensions) {
    throw new Error(
      `anytime search supports at most ${maxDimensions} dimensions; got ${dimensions.length}`
    );
  }
  const seen = new Set<string>();
  for (const dimension of dimensions) {
    if (typeof dimension !== "string" || dimension.length === 0) {
      throw new Error("every dimension must be a non-empty string");
    }
    if (seen.has(dimension)) throw new Error(`duplicate dimension: ${dimension}`);
    seen.add(dimension);
  }
  return [...seen].sort(compare);
}

function* indexCombinations(n: number, k: number): Generator<number[]> {
  if (k === 0) {
    yield [];
    return;
  }
  const indices = Array.from({ length: k }, (_, index) => index);
  for (;;) {
    yield [...indices];
    let position = k - 1;
    while (
      position >= 0 &&
      indices[position] === n - k + position
    ) {
      position--;
    }
    if (position < 0) return;
    indices[position]++;
    for (let index = position + 1; index < k; index++) {
      indices[index] = indices[index - 1] + 1;
    }
  }
}

function totalSubsetsExact(n: number): string {
  return (1n << BigInt(n)).toString();
}

function result({
  status,
  dimensions,
  maxEvaluations,
  completedCardinalities,
  activeCardinality,
  evaluatedAtActiveCardinality,
  minimumCardinalityLowerBound,
  minimumCardinalityUpperBound,
  minimumCardinality,
  knownMinimumWitnesses,
  evaluations,
}: {
  status: AnytimeSearchStatus;
  dimensions: string[];
  maxEvaluations: number;
  completedCardinalities: number[];
  activeCardinality: number | null;
  evaluatedAtActiveCardinality: number;
  minimumCardinalityLowerBound: number;
  minimumCardinalityUpperBound: number | null;
  minimumCardinality: number | null;
  knownMinimumWitnesses: string[][];
  evaluations: AnytimeSubsetEvaluation[];
}): AnytimeCardinalitySearchResult {
  const exactMinimum = status === "EXACT_MINIMUM";
  const partialMinimum = status === "PARTIAL_MINIMUM_TIES_INCOMPLETE";
  const noWitness = status === "EXACT_NO_WITNESS";
  const landscapeExhaustive = noWitness;
  return {
    kind: "AnytimeCardinalitySearchResult",
    version: 1,
    status,
    dimensions: [...dimensions],
    evaluationBudget: maxEvaluations,
    evaluatedSubsets: evaluations.length,
    totalSubsetsExact: totalSubsetsExact(dimensions.length),
    completedCardinalities: [...completedCardinalities],
    activeCardinality,
    evaluatedAtActiveCardinality,
    totalAtActiveCardinalityExact:
      activeCardinality === null
        ? null
        : binomialCoefficientBigInt(
            dimensions.length,
            activeCardinality
          ).toString(),
    minimumCardinalityLowerBound,
    minimumCardinalityUpperBound,
    minimumCardinality,
    knownMinimumWitnesses: knownMinimumWitnesses.map((witness) => [...witness]),
    proof: {
      minimumCardinalityProven: exactMinimum || partialMinimum,
      coMinimumComplete: exactMinimum,
      noWitnessProven: noWitness,
      landscapeExhaustive,
    },
    evaluations: evaluations.map((evaluation) => ({
      subset: [...evaluation.subset],
      cardinality: evaluation.cardinality,
      sufficient: evaluation.sufficient,
    })),
    limitation:
      status.startsWith("PARTIAL")
        ? "The evaluation budget ended before the required cardinality level or landscape was complete; no complete global witness certificate is issued."
        : "Exactness is conditional on the declared dimensions and sufficiency predicate; no monotonicity or causal claim is implied.",
  };
}

export function anytimeCardinalityWitnessSearch({
  dimensions: rawDimensions,
  isSufficient,
  maxEvaluations,
  maxDimensions = DEFAULT_MAX_DIMENSIONS,
}: AnytimeCardinalitySearchOptions): AnytimeCardinalitySearchResult {
  if (typeof isSufficient !== "function") {
    throw new Error("isSufficient must be a function");
  }
  if (!Number.isSafeInteger(maxEvaluations) || maxEvaluations <= 0) {
    throw new Error("maxEvaluations must be a positive safe integer");
  }
  const dimensions = normalizeDimensions(rawDimensions, maxDimensions);
  const evaluations: AnytimeSubsetEvaluation[] = [];
  const completedCardinalities: number[] = [];

  for (let cardinality = 0; cardinality <= dimensions.length; cardinality++) {
    const knownAtLevel: string[][] = [];
    let evaluatedAtLevel = 0;
    for (const combination of indexCombinations(dimensions.length, cardinality)) {
      if (evaluations.length >= maxEvaluations) {
        if (knownAtLevel.length > 0) {
          return result({
            status: "PARTIAL_MINIMUM_TIES_INCOMPLETE",
            dimensions,
            maxEvaluations,
            completedCardinalities,
            activeCardinality: cardinality,
            evaluatedAtActiveCardinality: evaluatedAtLevel,
            minimumCardinalityLowerBound: cardinality,
            minimumCardinalityUpperBound: cardinality,
            minimumCardinality: cardinality,
            knownMinimumWitnesses: knownAtLevel,
            evaluations,
          });
        }
        return result({
          status: "PARTIAL_NO_SUFFICIENT_OBSERVED",
          dimensions,
          maxEvaluations,
          completedCardinalities,
          activeCardinality: cardinality,
          evaluatedAtActiveCardinality: evaluatedAtLevel,
          minimumCardinalityLowerBound: cardinality,
          minimumCardinalityUpperBound: null,
          minimumCardinality: null,
          knownMinimumWitnesses: [],
          evaluations,
        });
      }
      const subset = combination.map((index) => dimensions[index]);
      const verdict = isSufficient([...subset]);
      if (typeof verdict !== "boolean") {
        throw new Error("isSufficient must return a boolean");
      }
      evaluations.push({
        subset: [...subset],
        cardinality,
        sufficient: verdict,
      });
      evaluatedAtLevel++;
      if (verdict) knownAtLevel.push([...subset]);
    }
    completedCardinalities.push(cardinality);
    if (knownAtLevel.length > 0) {
      return result({
        status: "EXACT_MINIMUM",
        dimensions,
        maxEvaluations,
        completedCardinalities,
        activeCardinality: cardinality,
        evaluatedAtActiveCardinality: evaluatedAtLevel,
        minimumCardinalityLowerBound: cardinality,
        minimumCardinalityUpperBound: cardinality,
        minimumCardinality: cardinality,
        knownMinimumWitnesses: knownAtLevel,
        evaluations,
      });
    }
  }

  return result({
    status: "EXACT_NO_WITNESS",
    dimensions,
    maxEvaluations,
    completedCardinalities,
    activeCardinality: dimensions.length,
    evaluatedAtActiveCardinality: 1,
    minimumCardinalityLowerBound: dimensions.length + 1,
    minimumCardinalityUpperBound: null,
    minimumCardinality: null,
    knownMinimumWitnesses: [],
    evaluations,
  });
}
