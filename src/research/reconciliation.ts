import {
  type FiniteProtocol,
  type ProtocolSchema,
  normalizeSubset,
  protocolDifferences,
  protocolKey,
  substituteProtocol,
  validateProtocol,
  validateProtocolSchema,
} from "./protocol.js";
import {
  exactWitnessSearch,
  type ExactWitnessSearchResult,
  type ProtocolSubset,
  type SearchMode,
} from "./search.js";

export interface ReconciliationObservation<Conclusion extends string = string> {
  conclusion: Conclusion;
  effect?: number;
  evidenceId?: string;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export type ProtocolEvaluator<Conclusion extends string = string> = (
  protocol: FiniteProtocol
) => ReconciliationObservation<Conclusion>;

export type ReconciliationDirection = "A_TO_B" | "B_TO_A";

export interface ReconciliationEvaluation<Conclusion extends string = string> {
  subset: ProtocolSubset;
  protocol: FiniteProtocol;
  observation: ReconciliationObservation<Conclusion>;
  sufficient: boolean;
}

export interface WitnessDiagnostic {
  subset: ProtocolSubset;
  effectDistanceToTarget: number | null;
  restorationFraction: number | null;
}

export interface ReconciliationResult<Conclusion extends string = string> {
  direction: ReconciliationDirection;
  differences: string[];
  exposedDimensions: string[];
  omittedDifferences: string[];
  base: ReconciliationObservation<Conclusion>;
  target: ReconciliationObservation<Conclusion>;
  search: ExactWitnessSearchResult;
  evaluations: ReconciliationEvaluation<Conclusion>[];
  witnessDiagnostics: WitnessDiagnostic[];
}

export interface ReconcileDirectionOptions<Conclusion extends string = string> {
  schema: ProtocolSchema;
  baseProtocol: FiniteProtocol;
  sourceProtocol: FiniteProtocol;
  evaluator: ProtocolEvaluator<Conclusion>;
  direction?: ReconciliationDirection;
  exposedDimensions?: readonly string[];
  searchMode?: SearchMode;
  maxEvaluations?: number;
}

function checkObservation<Conclusion extends string>(
  observation: ReconciliationObservation<Conclusion>,
  where: string
): ReconciliationObservation<Conclusion> {
  if (typeof observation !== "object" || observation === null) {
    throw new Error(`${where} evaluator result must be an object`);
  }
  if (typeof observation.conclusion !== "string" || observation.conclusion.length === 0) {
    throw new Error(`${where} evaluator result needs a non-empty conclusion`);
  }
  if (observation.effect !== undefined && !Number.isFinite(observation.effect)) {
    throw new Error(`${where} evaluator effect must be finite when present`);
  }
  return observation;
}

const sameSubset = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

function effectDiagnostic(
  subset: ProtocolSubset,
  base: ReconciliationObservation,
  target: ReconciliationObservation,
  current: ReconciliationObservation
): WitnessDiagnostic {
  if (base.effect === undefined || target.effect === undefined || current.effect === undefined) {
    return { subset: [...subset], effectDistanceToTarget: null, restorationFraction: null };
  }
  const effectDistanceToTarget = Math.abs(current.effect - target.effect);
  const sourceGap = Math.abs(base.effect - target.effect);
  return {
    subset: [...subset],
    effectDistanceToTarget,
    restorationFraction: sourceGap === 0 ? null : 1 - effectDistanceToTarget / sourceGap,
  };
}

export function reconcileDirection<Conclusion extends string = string>({
  schema,
  baseProtocol,
  sourceProtocol,
  evaluator,
  direction = "A_TO_B",
  exposedDimensions,
  searchMode = "minimum",
  maxEvaluations = 1_000_000,
}: ReconcileDirectionOptions<Conclusion>): ReconciliationResult<Conclusion> {
  validateProtocolSchema(schema);
  validateProtocol(baseProtocol, schema);
  validateProtocol(sourceProtocol, schema);
  if (typeof evaluator !== "function") throw new Error("evaluator must be a function");

  const differences = protocolDifferences(baseProtocol, sourceProtocol, schema);
  const exposed =
    exposedDimensions === undefined
      ? [...differences]
      : normalizeSubset(exposedDimensions, differences);
  const exposedSet = new Set(exposed);
  const omittedDifferences = differences.filter((dimension) => !exposedSet.has(dimension));

  const cache = new Map<string, ReconciliationEvaluation<Conclusion>>();
  const evaluateSubset = (subset: ProtocolSubset): ReconciliationEvaluation<Conclusion> => {
    const normalized = normalizeSubset(subset, exposed);
    const protocol = substituteProtocol({
      base: baseProtocol,
      source: sourceProtocol,
      subset: normalized,
      schema,
      exposedDimensions: exposed,
    });
    const key = protocolKey(protocol, schema);
    const prior = cache.get(key);
    if (prior) return prior;
    const observation = checkObservation(evaluator(protocol), `subset [${normalized.join(",")}]`);
    const entry: ReconciliationEvaluation<Conclusion> = {
      subset: normalized,
      protocol,
      observation,
      sufficient: false,
    };
    cache.set(key, entry);
    return entry;
  };

  const base = checkObservation(evaluator(baseProtocol), "base protocol");
  const target = checkObservation(evaluator(sourceProtocol), "source protocol");

  const search = exactWitnessSearch({
    dimensions: exposed,
    mode: searchMode,
    maxEvaluations,
    isSufficient: (subset) => {
      const entry = evaluateSubset(subset);
      const sufficient = entry.observation.conclusion === target.conclusion;
      entry.sufficient = sufficient;
      return sufficient;
    },
  });

  const evaluations = [...cache.values()]
    .map((entry) => ({
      ...entry,
      subset: [...entry.subset],
      protocol: { ...entry.protocol },
      observation: { ...entry.observation },
    }))
    .sort(
      (a, b) =>
        a.subset.length - b.subset.length ||
        (a.subset.join("\u0000") < b.subset.join("\u0000") ? -1 : a.subset.join("\u0000") > b.subset.join("\u0000") ? 1 : 0)
    );

  const witnessDiagnostics = search.minimumWitnesses.map((subset) => {
    const evaluation = evaluations.find((entry) => sameSubset(entry.subset, subset));
    if (!evaluation) throw new Error(`missing cached evaluation for witness [${subset.join(",")}]`);
    return effectDiagnostic(subset, base, target, evaluation.observation);
  });

  return {
    direction,
    differences: [...differences],
    exposedDimensions: [...exposed],
    omittedDifferences,
    base: { ...base },
    target: { ...target },
    search,
    evaluations,
    witnessDiagnostics,
  };
}

export function reconcileBidirectional<Conclusion extends string = string>({
  schema,
  protocolA,
  protocolB,
  evaluator,
  exposedDimensions,
  searchMode = "minimum",
  maxEvaluations = 1_000_000,
}: {
  schema: ProtocolSchema;
  protocolA: FiniteProtocol;
  protocolB: FiniteProtocol;
  evaluator: ProtocolEvaluator<Conclusion>;
  exposedDimensions?: readonly string[];
  searchMode?: SearchMode;
  maxEvaluations?: number;
}): {
  aToB: ReconciliationResult<Conclusion>;
  bToA: ReconciliationResult<Conclusion>;
  asymmetric: boolean;
} {
  const aToB = reconcileDirection({
    schema,
    baseProtocol: protocolA,
    sourceProtocol: protocolB,
    evaluator,
    direction: "A_TO_B",
    exposedDimensions,
    searchMode,
    maxEvaluations,
  });
  const bToA = reconcileDirection({
    schema,
    baseProtocol: protocolB,
    sourceProtocol: protocolA,
    evaluator,
    direction: "B_TO_A",
    exposedDimensions,
    searchMode,
    maxEvaluations,
  });
  const key = (sets: ProtocolSubset[]): string =>
    JSON.stringify(
      sets
        .map((subset) => [...subset].sort())
        .sort((a, b) => {
          const left = a.join("\u0000");
          const right = b.join("\u0000");
          return left < right ? -1 : left > right ? 1 : 0;
        })
    );
  return {
    aToB,
    bToA,
    asymmetric:
      aToB.search.minimumCardinality !== bToA.search.minimumCardinality ||
      key(aToB.search.minimumWitnesses) !== key(bToA.search.minimumWitnesses),
  };
}
