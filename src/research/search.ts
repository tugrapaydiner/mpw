export type ProtocolSubset = string[];
export type SearchMode = "minimum" | "landscape";
export type SearchStatus = "FOUND" | "NO_WITNESS" | "LIMIT_REACHED";

export interface SearchAuditRow {
  subset: ProtocolSubset;
  cardinality: number;
  sufficient: boolean;
  ordinal: number;
}

export interface SearchProof {
  minimumProven: boolean;
  coMinimumComplete: boolean;
  landscapeExhaustive: boolean;
}

export interface ExactWitnessSearchResult {
  status: SearchStatus;
  mode: SearchMode;
  minimumCardinality: number | null;
  minimumWitnesses: ProtocolSubset[];
  provisionalCardinality: number | null;
  provisionalWitnesses: ProtocolSubset[];
  evaluatedSubsets: number;
  totalSubsets: number | null;
  totalSubsetsExact: string;
  completedCardinalities: number[];
  nextCardinality: number | null;
  proof: SearchProof;
  termination: "minimum-layer-complete" | "landscape-complete" | "no-witness" | "evaluation-limit";
  audit: SearchAuditRow[];
}

export interface ExactWitnessSearchOptions {
  dimensions: readonly string[];
  isSufficient: (subset: ProtocolSubset) => boolean;
  mode?: SearchMode;
  maxEvaluations?: number;
  captureAudit?: boolean;
}

const compareCodeUnits = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function validateDimensions(dimensions: readonly string[]): string[] {
  if (!Array.isArray(dimensions)) throw new Error("dimensions must be an array");
  const seen = new Set<string>();
  for (const dimension of dimensions) {
    if (typeof dimension !== "string" || dimension.length === 0) {
      throw new Error("every dimension must be a non-empty string");
    }
    if (seen.has(dimension)) throw new Error(`duplicate dimension: ${dimension}`);
    seen.add(dimension);
  }
  return [...seen].sort(compareCodeUnits);
}

export function binomialBigInt(n: number, k: number): bigint {
  if (!Number.isInteger(n) || n < 0) throw new Error("n must be a non-negative integer");
  if (!Number.isInteger(k) || k < 0 || k > n) return 0n;
  const kk = Math.min(k, n - k);
  let result = 1n;
  for (let i = 1; i <= kk; i++) {
    result = (result * BigInt(n - kk + i)) / BigInt(i);
  }
  return result;
}

export function powerSetSize(n: number): { exact: string; numeric: number | null } {
  if (!Number.isInteger(n) || n < 0) throw new Error("n must be a non-negative integer");
  const exact = 1n << BigInt(n);
  return {
    exact: exact.toString(),
    numeric: exact <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(exact) : null,
  };
}

export function* combinationsOfCardinality(
  dimensions: readonly string[],
  cardinality: number
): Generator<ProtocolSubset> {
  const sorted = validateDimensions(dimensions);
  if (!Number.isInteger(cardinality) || cardinality < 0 || cardinality > sorted.length) return;
  if (cardinality === 0) {
    yield [];
    return;
  }
  const indices = Array.from({ length: cardinality }, (_, index) => index);
  while (true) {
    yield indices.map((index) => sorted[index]);
    let cursor = cardinality - 1;
    while (cursor >= 0 && indices[cursor] === sorted.length - cardinality + cursor) cursor--;
    if (cursor < 0) return;
    indices[cursor]++;
    for (let i = cursor + 1; i < cardinality; i++) indices[i] = indices[i - 1] + 1;
  }
}

function resultWithLimit({
  mode,
  winners,
  winningCardinality,
  provisionalWitnesses,
  provisionalCardinality,
  evaluatedSubsets,
  totalSubsets,
  totalSubsetsExact,
  completedCardinalities,
  nextCardinality,
  audit,
}: {
  mode: SearchMode;
  winners: ProtocolSubset[];
  winningCardinality: number | null;
  provisionalWitnesses: ProtocolSubset[];
  provisionalCardinality: number | null;
  evaluatedSubsets: number;
  totalSubsets: number | null;
  totalSubsetsExact: string;
  completedCardinalities: number[];
  nextCardinality: number | null;
  audit: SearchAuditRow[];
}): ExactWitnessSearchResult {
  const minimumKnown = winningCardinality !== null;
  return {
    status: minimumKnown ? "FOUND" : "LIMIT_REACHED",
    mode,
    minimumCardinality: winningCardinality,
    minimumWitnesses: winners.map((subset) => [...subset]),
    provisionalCardinality,
    provisionalWitnesses: provisionalWitnesses.map((subset) => [...subset]),
    evaluatedSubsets,
    totalSubsets,
    totalSubsetsExact,
    completedCardinalities: [...completedCardinalities],
    nextCardinality,
    proof: {
      minimumProven: minimumKnown,
      coMinimumComplete: minimumKnown,
      landscapeExhaustive: false,
    },
    termination: "evaluation-limit",
    audit,
  };
}

export function exactWitnessSearch({
  dimensions,
  isSufficient,
  mode = "minimum",
  maxEvaluations = 1_000_000,
  captureAudit = true,
}: ExactWitnessSearchOptions): ExactWitnessSearchResult {
  const sorted = validateDimensions(dimensions);
  if (typeof isSufficient !== "function") throw new Error("isSufficient must be a function");
  if (mode !== "minimum" && mode !== "landscape") throw new Error(`unknown search mode: ${String(mode)}`);
  if (!Number.isSafeInteger(maxEvaluations) || maxEvaluations < 1) {
    throw new Error("maxEvaluations must be a positive safe integer");
  }

  const size = powerSetSize(sorted.length);
  const audit: SearchAuditRow[] = [];
  const completedCardinalities: number[] = [];
  let evaluatedSubsets = 0;
  let winningCardinality: number | null = null;
  let winners: ProtocolSubset[] = [];

  for (let cardinality = 0; cardinality <= sorted.length; cardinality++) {
    const winnersAtCardinality: ProtocolSubset[] = [];
    for (const subset of combinationsOfCardinality(sorted, cardinality)) {
      if (evaluatedSubsets >= maxEvaluations) {
        return resultWithLimit({
          mode,
          winners,
          winningCardinality,
          provisionalWitnesses: winnersAtCardinality,
          provisionalCardinality: winnersAtCardinality.length > 0 ? cardinality : null,
          evaluatedSubsets,
          totalSubsets: size.numeric,
          totalSubsetsExact: size.exact,
          completedCardinalities,
          nextCardinality: cardinality,
          audit,
        });
      }
      const sufficient = isSufficient([...subset]);
      if (typeof sufficient !== "boolean") throw new Error("isSufficient must return a boolean");
      evaluatedSubsets++;
      if (captureAudit) {
        audit.push({
          subset: [...subset],
          cardinality,
          sufficient,
          ordinal: evaluatedSubsets,
        });
      }
      if (sufficient) winnersAtCardinality.push([...subset]);
    }
    completedCardinalities.push(cardinality);

    if (winningCardinality === null && winnersAtCardinality.length > 0) {
      winningCardinality = cardinality;
      winners = winnersAtCardinality.map((subset) => [...subset]);
      if (mode === "minimum") {
        const landscapeExhaustive = size.numeric !== null && evaluatedSubsets === size.numeric;
        return {
          status: "FOUND",
          mode,
          minimumCardinality: winningCardinality,
          minimumWitnesses: winners,
          provisionalCardinality: null,
          provisionalWitnesses: [],
          evaluatedSubsets,
          totalSubsets: size.numeric,
          totalSubsetsExact: size.exact,
          completedCardinalities,
          nextCardinality: landscapeExhaustive ? null : cardinality + 1,
          proof: {
            minimumProven: true,
            coMinimumComplete: true,
            landscapeExhaustive,
          },
          termination: "minimum-layer-complete",
          audit,
        };
      }
    }
  }

  if (winningCardinality === null) {
    return {
      status: "NO_WITNESS",
      mode,
      minimumCardinality: null,
      minimumWitnesses: [],
      provisionalCardinality: null,
      provisionalWitnesses: [],
      evaluatedSubsets,
      totalSubsets: size.numeric,
      totalSubsetsExact: size.exact,
      completedCardinalities,
      nextCardinality: null,
      proof: {
        minimumProven: true,
        coMinimumComplete: true,
        landscapeExhaustive: true,
      },
      termination: "no-witness",
      audit,
    };
  }

  return {
    status: "FOUND",
    mode,
    minimumCardinality: winningCardinality,
    minimumWitnesses: winners,
    provisionalCardinality: null,
    provisionalWitnesses: [],
    evaluatedSubsets,
    totalSubsets: size.numeric,
    totalSubsetsExact: size.exact,
    completedCardinalities,
    nextCardinality: null,
    proof: {
      minimumProven: true,
      coMinimumComplete: true,
      landscapeExhaustive: true,
    },
    termination: "landscape-complete",
    audit,
  };
}
