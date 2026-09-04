import {
  findRobustProtocolWitnesses,
  type RobustWitnessOptions,
  type RobustWitnessResult,
} from "./robustWitness.js";
import {
  bonferroniClopperPearsonLowerBound,
  clopperPearsonLowerBound,
} from "./binomialBounds.js";
import {
  exactWitnessSearch,
  type ExactWitnessSearchResult,
} from "./search.js";

export const EXACT_ROBUST_WITNESS_METHOD =
  "bonferroni-clopper-pearson-lower-confidence-bound" as const;
export const EXACT_ROBUST_WITNESS_VERSION = 1 as const;

export interface ExactRobustWitnessRow {
  subset: string[];
  trials: number;
  successes: number;
  empiricalProbability: number;
  pointwiseExactLowerBound: number;
  simultaneousExactLowerBound: number;
  threshold: number;
  robustlySufficient: boolean;
}

export interface ExactRobustWitnessResult {
  kind: "ExactRobustProtocolWitnessResult";
  version: typeof EXACT_ROBUST_WITNESS_VERSION;
  method: typeof EXACT_ROBUST_WITNESS_METHOD;
  estimand: "probability-of-reproducing-predeclared-target-conclusion";
  dimensions: string[];
  familySize: number;
  alpha: number;
  confidence: number;
  perConfigurationAlpha: number;
  threshold: number;
  rows: ExactRobustWitnessRow[];
  search: ExactWitnessSearchResult;
  referenceHoeffdingResult: RobustWitnessResult;
  assumptions: string[];
  limitations: string[];
}

const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
const subsetKey = (subset: readonly string[]): string =>
  JSON.stringify([...subset].sort(compare));

/**
 * Exact finite-sample one-sided binomial bounds for each predeclared subset,
 * combined with Bonferroni familywise control and exact global witness search.
 */
export function findExactRobustProtocolWitnesses(
  options: RobustWitnessOptions
): ExactRobustWitnessResult {
  // Reuse the Hoeffding implementation's complete-family and input validation.
  // The reference result is retained so callers can inspect both conservative
  // lower-bound constructions on identical counts.
  const reference = findRobustProtocolWitnesses(options);
  const rows = reference.rows.map((row): ExactRobustWitnessRow => {
    const pointwiseExactLowerBound = clopperPearsonLowerBound(
      row.successes,
      row.trials,
      reference.alpha
    );
    const simultaneousExactLowerBound = bonferroniClopperPearsonLowerBound(
      row.successes,
      row.trials,
      reference.alpha,
      reference.familySize
    );
    return {
      subset: [...row.subset],
      trials: row.trials,
      successes: row.successes,
      empiricalProbability: row.empiricalProbability,
      pointwiseExactLowerBound,
      simultaneousExactLowerBound,
      threshold: reference.threshold,
      robustlySufficient: simultaneousExactLowerBound >= reference.threshold,
    };
  });
  const rowByKey = new Map(rows.map((row) => [subsetKey(row.subset), row]));
  const search = exactWitnessSearch({
    dimensions: reference.dimensions,
    mode: "landscape",
    maxEvaluations: reference.familySize,
    isSufficient: (subset) => {
      const row = rowByKey.get(subsetKey(subset));
      if (!row) throw new Error(`missing exact robust-witness row for ${subsetKey(subset)}`);
      return row.robustlySufficient;
    },
  });

  return {
    kind: "ExactRobustProtocolWitnessResult",
    version: EXACT_ROBUST_WITNESS_VERSION,
    method: EXACT_ROBUST_WITNESS_METHOD,
    estimand: reference.estimand,
    dimensions: [...reference.dimensions],
    familySize: reference.familySize,
    alpha: reference.alpha,
    confidence: reference.confidence,
    perConfigurationAlpha: reference.perConfigurationAlpha,
    threshold: reference.threshold,
    rows,
    search,
    referenceHoeffdingResult: reference,
    assumptions: [
      ...reference.assumptions,
      "The repeated success count for each subset follows the declared fixed-trial binomial model; no outcome-dependent stopping rule is used.",
    ],
    limitations: [
      "Clopper-Pearson intervals are exact under the fixed-trial binomial model but can still be conservative.",
      "Bonferroni family control is valid without cross-subset independence but may sacrifice power.",
      "The target, threshold, family, stopping rule, and failure handling must be fixed before inspecting outcomes.",
      "Exact robust target reproduction remains descriptive and conditional; it is not causal attribution.",
      "The method does not account for uncertainty in an adaptively selected target publication or protocol schema.",
    ],
  };
}
