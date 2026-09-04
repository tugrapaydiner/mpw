import {
  exactMinimumCostWitnessSearch,
  type ExactMinimumCostSearchResult,
} from "./costSearch.js";
import {
  protocolDifferences,
  protocolKey,
  type FiniteProtocol,
} from "./protocol.js";
import type { ReconciliationDirection } from "./reconciliation.js";
import {
  verifyStaticProtocolGridPackage,
  type StaticProtocolGridPackage,
} from "./staticGridPackage.js";

export interface StaticGridCostReconciliationResult<Conclusion extends string = string> {
  kind: "StaticGridCostReconciliationResult";
  version: 1;
  objective: "minimum-declared-integer-cost";
  packageId: string;
  direction: ReconciliationDirection;
  baseProtocol: FiniteProtocol;
  targetProtocol: FiniteProtocol;
  targetConclusion: Conclusion;
  exposedDimensions: string[];
  costs: Record<string, number>;
  search: ExactMinimumCostSearchResult;
  limitation: string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function hybridFor(
  base: FiniteProtocol,
  source: FiniteProtocol,
  subset: readonly string[]
): FiniteProtocol {
  const protocol: FiniteProtocol = { ...base };
  for (const dimension of subset) protocol[dimension] = source[dimension];
  return protocol;
}

function declaredIntegerCosts(
  packageObject: StaticProtocolGridPackage,
  dimensions: readonly string[]
): Record<string, number> {
  const byName = new Map(
    packageObject.body.protocolSchema.coordinates.map((coordinate) => [
      coordinate.name,
      coordinate,
    ])
  );
  const costs: Record<string, number> = {};
  for (const dimension of dimensions) {
    const coordinate = byName.get(dimension);
    if (!coordinate) throw new Error(`missing schema coordinate ${dimension}`);
    if (!Number.isSafeInteger(coordinate.cost) || (coordinate.cost as number) < 0) {
      throw new Error(
        `coordinate ${dimension} needs a predeclared non-negative integer cost`
      );
    }
    costs[dimension] = coordinate.cost as number;
  }
  return costs;
}

export function reconcileStaticProtocolGridPackageByCost<
  Conclusion extends string = string,
>(
  packageObject: StaticProtocolGridPackage<Conclusion>,
  {
    direction,
    mode = "minimum",
    maxEvaluations,
  }: {
    direction: ReconciliationDirection;
    mode?: "minimum" | "landscape";
    maxEvaluations?: number;
  }
): StaticGridCostReconciliationResult<Conclusion> {
  const integrity = verifyStaticProtocolGridPackage(packageObject);
  const publicationA = packageObject.body.publications.A;
  const publicationB = packageObject.body.publications.B;
  const base = direction === "A_TO_B" ? publicationA : publicationB;
  const target = direction === "A_TO_B" ? publicationB : publicationA;
  const exposedDimensions = protocolDifferences(
    publicationA.protocol,
    publicationB.protocol,
    packageObject.body.protocolSchema
  );
  const costs = declaredIntegerCosts(packageObject, exposedDimensions);
  const observations = new Map(
    packageObject.body.worlds.map((world) => [
      protocolKey(world.protocol, packageObject.body.protocolSchema),
      clone(world.observation),
    ])
  );
  const search = exactMinimumCostWitnessSearch({
    dimensions: exposedDimensions,
    costs,
    mode,
    maxEvaluations: maxEvaluations ?? packageObject.body.worlds.length,
    isSufficient: (subset) => {
      const protocol = hybridFor(base.protocol, target.protocol, subset);
      const observation = observations.get(
        protocolKey(protocol, packageObject.body.protocolSchema)
      );
      if (!observation) {
        throw new Error("static grid is missing the requested cost-search hybrid");
      }
      return observation.conclusion === target.declaredObservation.conclusion;
    },
  });
  return {
    kind: "StaticGridCostReconciliationResult",
    version: 1,
    objective: "minimum-declared-integer-cost",
    packageId: integrity.packageId,
    direction,
    baseProtocol: { ...base.protocol },
    targetProtocol: { ...target.protocol },
    targetConclusion: target.declaredObservation.conclusion,
    exposedDimensions,
    costs,
    search,
    limitation:
      "Minimum cost is conditional on the predeclared additive integer coordinate costs and the recorded static grid; it is not causal or universally cheapest.",
  };
}
