export type CostSearchMode = "minimum" | "landscape";

export interface CostedSubsetEvaluation {
  subset: string[];
  totalCost: number;
  sufficient: boolean;
}

export interface ExactMinimumCostSearchResult {
  kind: "ExactMinimumCostSearchResult";
  version: 1;
  objective: "minimum-declared-integer-cost";
  mode: CostSearchMode;
  dimensions: string[];
  costs: Record<string, number>;
  status: "FOUND" | "NO_WITNESS";
  minimumCost: number | null;
  minimumCostWitnesses: string[][];
  evaluatedSubsets: number;
  totalSubsets: number;
  totalSubsetsExact: string;
  evaluatedCostLevels: number[];
  proof: {
    minimumCostProven: boolean;
    coMinimumCostComplete: boolean;
    landscapeExhaustive: boolean;
  };
  evaluations: CostedSubsetEvaluation[];
}

export interface ExactMinimumCostSearchOptions {
  dimensions: readonly string[];
  costs: Readonly<Record<string, number>>;
  isSufficient: (subset: readonly string[]) => boolean;
  mode?: CostSearchMode;
  maxEvaluations?: number;
  maxDimensions?: number;
}

const DEFAULT_MAX_DIMENSIONS = 20;
const DEFAULT_MAX_EVALUATIONS = 1_000_000;
const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const subsetKey = (subset: readonly string[]): string =>
  JSON.stringify([...subset].sort(compare));

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
      `exact cost search supports at most ${maxDimensions} dimensions; got ${dimensions.length}`
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

function normalizeCosts(
  dimensions: readonly string[],
  costs: Readonly<Record<string, number>>
): Record<string, number> {
  if (typeof costs !== "object" || costs === null || Array.isArray(costs)) {
    throw new Error("costs must be an object");
  }
  const expected = [...dimensions].sort(compare);
  const actual = Object.keys(costs).sort(compare);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `cost keys must exactly match dimensions: got [${actual.join(",")}], expected [${expected.join(",")}]`
    );
  }
  const normalized: Record<string, number> = {};
  for (const dimension of expected) {
    const value = costs[dimension];
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`cost for ${dimension} must be a non-negative safe integer`);
    }
    normalized[dimension] = value;
  }
  return normalized;
}

function totalCost(subset: readonly string[], costs: Readonly<Record<string, number>>): number {
  let total = 0;
  for (const dimension of subset) {
    total += costs[dimension];
    if (!Number.isSafeInteger(total)) {
      throw new Error("subset cost exceeds the safe integer range");
    }
  }
  return total;
}

function enumerateCostedSubsets(
  dimensions: readonly string[],
  costs: Readonly<Record<string, number>>
): Array<{ subset: string[]; totalCost: number }> {
  const totalSubsets = 2 ** dimensions.length;
  const subsets: Array<{ subset: string[]; totalCost: number }> = [];
  for (let mask = 0; mask < totalSubsets; mask++) {
    const subset = dimensions.filter((_, index) => (mask & (1 << index)) !== 0);
    subsets.push({ subset, totalCost: totalCost(subset, costs) });
  }
  return subsets.sort(
    (left, right) =>
      left.totalCost - right.totalCost ||
      left.subset.length - right.subset.length ||
      compare(subsetKey(left.subset), subsetKey(right.subset))
  );
}

export function exactMinimumCostWitnessSearch({
  dimensions: rawDimensions,
  costs: rawCosts,
  isSufficient,
  mode = "minimum",
  maxEvaluations = DEFAULT_MAX_EVALUATIONS,
  maxDimensions = DEFAULT_MAX_DIMENSIONS,
}: ExactMinimumCostSearchOptions): ExactMinimumCostSearchResult {
  if (mode !== "minimum" && mode !== "landscape") {
    throw new Error(`unknown cost search mode: ${String(mode)}`);
  }
  if (typeof isSufficient !== "function") {
    throw new Error("isSufficient must be a function");
  }
  if (!Number.isSafeInteger(maxEvaluations) || maxEvaluations <= 0) {
    throw new Error("maxEvaluations must be a positive safe integer");
  }
  const dimensions = normalizeDimensions(rawDimensions, maxDimensions);
  const costs = normalizeCosts(dimensions, rawCosts);
  const candidates = enumerateCostedSubsets(dimensions, costs);
  const totalSubsets = candidates.length;
  const plannedEvaluations =
    mode === "landscape" ? totalSubsets : Math.min(totalSubsets, maxEvaluations);
  if (mode === "landscape" && totalSubsets > maxEvaluations) {
    throw new Error(
      `landscape cost search requires ${totalSubsets} evaluations; budget is ${maxEvaluations}`
    );
  }

  const evaluations: CostedSubsetEvaluation[] = [];
  const evaluatedCostLevels: number[] = [];
  let minimumCost: number | null = null;
  let currentCost: number | null = null;

  for (const candidate of candidates) {
    if (evaluations.length >= maxEvaluations) {
      throw new Error(
        `minimum cost not proven within evaluation budget ${maxEvaluations}; next cost level is ${candidate.totalCost}`
      );
    }
    if (currentCost !== candidate.totalCost) {
      if (
        mode === "minimum" &&
        minimumCost !== null &&
        currentCost !== null &&
        candidate.totalCost > minimumCost
      ) {
        break;
      }
      currentCost = candidate.totalCost;
      evaluatedCostLevels.push(candidate.totalCost);
    }
    const verdict = isSufficient([...candidate.subset]);
    if (typeof verdict !== "boolean") {
      throw new Error("isSufficient must return a boolean");
    }
    evaluations.push({
      subset: [...candidate.subset],
      totalCost: candidate.totalCost,
      sufficient: verdict,
    });
    if (verdict && minimumCost === null) minimumCost = candidate.totalCost;
  }

  if (mode === "minimum" && minimumCost !== null) {
    // The loop exits only after every candidate at the first sufficient cost
    // has been evaluated. No higher-cost row is needed for this proof.
    const unevaluatedSameCost = candidates.some(
      (candidate) =>
        candidate.totalCost === minimumCost &&
        !evaluations.some((row) => subsetKey(row.subset) === subsetKey(candidate.subset))
    );
    if (unevaluatedSameCost) {
      throw new Error("internal error: co-minimum cost level was not completed");
    }
  }

  const minimumCostWitnesses =
    minimumCost === null
      ? []
      : evaluations
          .filter((row) => row.sufficient && row.totalCost === minimumCost)
          .map((row) => [...row.subset]);
  const landscapeExhaustive = evaluations.length === totalSubsets;
  const noWitness = minimumCost === null;
  if (noWitness && !landscapeExhaustive) {
    throw new Error(
      `no-witness cost claim requires all ${totalSubsets} subsets; only ${evaluations.length} were evaluated`
    );
  }

  void plannedEvaluations;
  return {
    kind: "ExactMinimumCostSearchResult",
    version: 1,
    objective: "minimum-declared-integer-cost",
    mode,
    dimensions,
    costs,
    status: noWitness ? "NO_WITNESS" : "FOUND",
    minimumCost,
    minimumCostWitnesses,
    evaluatedSubsets: evaluations.length,
    totalSubsets,
    totalSubsetsExact: String(totalSubsets),
    evaluatedCostLevels,
    proof: {
      minimumCostProven: true,
      coMinimumCostComplete: true,
      landscapeExhaustive,
    },
    evaluations,
  };
}
