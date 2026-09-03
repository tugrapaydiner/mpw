export interface PairedBinaryObservation {
  id: string;
  stratum: string;
  a: 0 | 1;
  b: 0 | 1;
}

export interface DiscordantPairDiagnostics {
  n: number;
  bothCorrect: number;
  bothWrong: number;
  aOnly: number;
  bOnly: number;
  discordant: number;
  delta: number;
  exactTwoSidedP: number;
  method: "exact-conditional-binomial-mcnemar";
  computation: "log-space-binomial-tail";
}

export interface StratifiedDiscordantPairDiagnostics extends DiscordantPairDiagnostics {
  strata: Array<{ stratum: string } & DiscordantPairDiagnostics>;
}

export type IntervalConclusion = "MODEL_A" | "MODEL_B" | "INCONCLUSIVE";

export interface FamilyConfigurationInput {
  id: string;
  outcomes: readonly PairedBinaryObservation[];
}

export interface FamilyConfigurationAnalysis {
  id: string;
  pointEstimate: number;
  pointwise: {
    ciLow: number;
    ciHigh: number;
    conclusion: IntervalConclusion;
  };
  simultaneous: {
    ciLow: number;
    ciHigh: number;
    conclusion: IntervalConclusion;
  };
  discordance: StratifiedDiscordantPairDiagnostics;
}

export interface SimultaneousPairedBootstrapResult {
  kind: "SimultaneousPairedBootstrapResult";
  version: 1;
  method: "synchronized-stratified-max-absolute-deviation-bootstrap";
  estimand: "paired-accuracy-difference-A-minus-B";
  inferenceScope: "predeclared-finite-configuration-family";
  familySize: number;
  n: number;
  strata: Array<{ stratum: string; n: number }>;
  confidence: number;
  alpha: number;
  seed: string;
  replicates: number;
  prng: { id: "mulberry32"; version: 1; seedHash: "fnv1a-32-code-units" };
  criticalValue: number;
  configurations: FamilyConfigurationAnalysis[];
  limitations: string[];
}

export interface SimultaneousPairedBootstrapOptions {
  seed?: string;
  replicates?: number;
  confidence?: number;
}

const DEFAULT_SEED = "mpw-family-bootstrap-v1";
const DEFAULT_REPLICATES = 10_000;
const DEFAULT_CONFIDENCE = 0.95;

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function hashSeedString(value: string): number {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function validateCount(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative safe integer`);
}

function logAdd(left: number, right: number): number {
  if (left === Number.NEGATIVE_INFINITY) return right;
  if (right === Number.NEGATIVE_INFINITY) return left;
  const high = Math.max(left, right);
  const low = Math.min(left, right);
  return high + Math.log1p(Math.exp(low - high));
}

/**
 * Exact conditional two-sided McNemar/binomial p-value for paired binary data.
 * The probability definition is exact; the finite double result is evaluated
 * from the lower binomial tail in log space to avoid combinatorial overflow.
 */
export function exactTwoSidedMcNemarP(aOnly: number, bOnly: number): number {
  validateCount(aOnly, "aOnly");
  validateCount(bOnly, "bOnly");
  const discordant = aOnly + bOnly;
  if (discordant === 0) return 1;
  const tail = Math.min(aOnly, bOnly);
  let logTerm = -discordant * Math.LN2;
  let logSum = logTerm;
  for (let k = 1; k <= tail; k++) {
    logTerm += Math.log(discordant - k + 1) - Math.log(k);
    logSum = logAdd(logSum, logTerm);
  }
  const p = 2 * Math.exp(logSum);
  return p >= 1 ? 1 : p <= 0 ? 0 : p;
}

function validateOutcome(outcome: PairedBinaryObservation, index: number): void {
  if (typeof outcome !== "object" || outcome === null) throw new Error(`outcome ${index} must be an object`);
  if (typeof outcome.id !== "string" || outcome.id.length === 0) throw new Error(`outcome ${index} needs an id`);
  if (typeof outcome.stratum !== "string" || outcome.stratum.length === 0) {
    throw new Error(`outcome ${outcome.id} needs a stratum`);
  }
  if (outcome.a !== 0 && outcome.a !== 1) throw new Error(`outcome ${outcome.id} has non-binary a`);
  if (outcome.b !== 0 && outcome.b !== 1) throw new Error(`outcome ${outcome.id} has non-binary b`);
}

function diagnostics(outcomes: readonly PairedBinaryObservation[]): DiscordantPairDiagnostics {
  if (!Array.isArray(outcomes) || outcomes.length === 0) throw new Error("outcomes must be a non-empty array");
  let bothCorrect = 0;
  let bothWrong = 0;
  let aOnly = 0;
  let bOnly = 0;
  for (const [index, outcome] of outcomes.entries()) {
    validateOutcome(outcome, index);
    if (outcome.a === 1 && outcome.b === 1) bothCorrect++;
    else if (outcome.a === 0 && outcome.b === 0) bothWrong++;
    else if (outcome.a === 1) aOnly++;
    else bOnly++;
  }
  const n = outcomes.length;
  return {
    n,
    bothCorrect,
    bothWrong,
    aOnly,
    bOnly,
    discordant: aOnly + bOnly,
    delta: (aOnly - bOnly) / n,
    exactTwoSidedP: exactTwoSidedMcNemarP(aOnly, bOnly),
    method: "exact-conditional-binomial-mcnemar",
    computation: "log-space-binomial-tail",
  };
}

export function pairedBinaryDiagnostics(
  outcomes: readonly PairedBinaryObservation[]
): StratifiedDiscordantPairDiagnostics {
  const overall = diagnostics(outcomes);
  const groups = new Map<string, PairedBinaryObservation[]>();
  const ids = new Set<string>();
  for (const [index, outcome] of outcomes.entries()) {
    validateOutcome(outcome, index);
    if (ids.has(outcome.id)) throw new Error(`duplicate outcome id: ${outcome.id}`);
    ids.add(outcome.id);
    const group = groups.get(outcome.stratum) ?? [];
    group.push(outcome);
    groups.set(outcome.stratum, group);
  }
  return {
    ...overall,
    strata: [...groups.entries()]
      .sort(([left], [right]) => compare(left, right))
      .map(([stratum, group]) => ({ stratum, ...diagnostics(group) })),
  };
}

function quantile(sorted: readonly number[], probability: number): number {
  if (sorted.length === 0) throw new Error("cannot take a quantile of an empty array");
  if (!(probability >= 0 && probability <= 1)) throw new Error("quantile probability must be in [0,1]");
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(probability * sorted.length) - 1));
  return sorted[index];
}

function classify(ciLow: number, ciHigh: number): IntervalConclusion {
  if (ciLow > 0) return "MODEL_A";
  if (ciHigh < 0) return "MODEL_B";
  return "INCONCLUSIVE";
}

interface PreparedFamily {
  ids: string[];
  strata: Array<{ stratum: string; indices: number[] }>;
  values: number[][];
  pointEstimates: number[];
  outcomeMaps: Array<Map<string, PairedBinaryObservation>>;
}

function prepareFamily(configurations: readonly FamilyConfigurationInput[]): PreparedFamily {
  if (!Array.isArray(configurations) || configurations.length === 0) {
    throw new Error("configurations must be a non-empty array");
  }
  const sorted = [...configurations].sort((left, right) => compare(left.id, right.id));
  const configurationIds = new Set<string>();
  for (const configuration of sorted) {
    if (typeof configuration.id !== "string" || configuration.id.length === 0) {
      throw new Error("every configuration needs a non-empty id");
    }
    if (configurationIds.has(configuration.id)) throw new Error(`duplicate configuration id: ${configuration.id}`);
    configurationIds.add(configuration.id);
    if (!Array.isArray(configuration.outcomes) || configuration.outcomes.length === 0) {
      throw new Error(`configuration ${configuration.id} has no outcomes`);
    }
  }

  const reference = [...sorted[0].outcomes].sort((left, right) => compare(left.id, right.id));
  const referenceIds = new Set<string>();
  for (const [index, outcome] of reference.entries()) {
    validateOutcome(outcome, index);
    if (referenceIds.has(outcome.id)) throw new Error(`duplicate outcome id in reference: ${outcome.id}`);
    referenceIds.add(outcome.id);
  }
  const ids = reference.map((outcome) => outcome.id);
  const referenceStrata = new Map(reference.map((outcome) => [outcome.id, outcome.stratum]));
  const outcomeMaps: Array<Map<string, PairedBinaryObservation>> = [];
  const values: number[][] = [];

  for (const configuration of sorted) {
    const byId = new Map<string, PairedBinaryObservation>();
    for (const [index, outcome] of configuration.outcomes.entries()) {
      validateOutcome(outcome, index);
      if (byId.has(outcome.id)) throw new Error(`duplicate outcome id ${outcome.id} in ${configuration.id}`);
      byId.set(outcome.id, outcome);
    }
    if (byId.size !== ids.length) {
      throw new Error(`configuration ${configuration.id} has ${byId.size} items; expected ${ids.length}`);
    }
    const row: number[] = [];
    for (const id of ids) {
      const outcome = byId.get(id);
      if (!outcome) throw new Error(`configuration ${configuration.id} is missing item ${id}`);
      if (outcome.stratum !== referenceStrata.get(id)) {
        throw new Error(`configuration ${configuration.id} changes stratum for item ${id}`);
      }
      row.push(outcome.a - outcome.b);
    }
    outcomeMaps.push(byId);
    values.push(row);
  }

  const groups = new Map<string, number[]>();
  reference.forEach((outcome, index) => {
    const indices = groups.get(outcome.stratum) ?? [];
    indices.push(index);
    groups.set(outcome.stratum, indices);
  });
  const strata = [...groups.entries()]
    .sort(([left], [right]) => compare(left, right))
    .map(([stratum, indices]) => ({ stratum, indices }));
  const pointEstimates = values.map((row) => row.reduce((sum, value) => sum + value, 0) / row.length);
  return {
    ids: sorted.map((configuration) => configuration.id),
    strata,
    values,
    pointEstimates,
    outcomeMaps,
  };
}

export function simultaneousStratifiedPairedBootstrap(
  configurations: readonly FamilyConfigurationInput[],
  {
    seed = DEFAULT_SEED,
    replicates = DEFAULT_REPLICATES,
    confidence = DEFAULT_CONFIDENCE,
  }: SimultaneousPairedBootstrapOptions = {}
): SimultaneousPairedBootstrapResult {
  if (typeof seed !== "string" || seed.length === 0) throw new Error("seed must be a non-empty string");
  if (!Number.isSafeInteger(replicates) || replicates < 100) {
    throw new Error("replicates must be a safe integer of at least 100");
  }
  if (!(Number.isFinite(confidence) && confidence > 0 && confidence < 1)) {
    throw new Error("confidence must be strictly between 0 and 1");
  }
  const prepared = prepareFamily(configurations);
  const n = prepared.values[0].length;
  const distributions = prepared.values.map(() => new Array<number>(replicates));
  const maximumDeviations = new Array<number>(replicates);

  for (let replicate = 0; replicate < replicates; replicate++) {
    const random = mulberry32(hashSeedString(`${seed}|${replicate}`));
    const sampledIndices: number[] = [];
    for (const stratum of prepared.strata) {
      for (let draw = 0; draw < stratum.indices.length; draw++) {
        sampledIndices.push(stratum.indices[Math.floor(random() * stratum.indices.length)]);
      }
    }
    let maximumDeviation = 0;
    for (let configuration = 0; configuration < prepared.values.length; configuration++) {
      const row = prepared.values[configuration];
      let sum = 0;
      for (const index of sampledIndices) sum += row[index];
      const estimate = sum / n;
      distributions[configuration][replicate] = estimate;
      maximumDeviation = Math.max(
        maximumDeviation,
        Math.abs(estimate - prepared.pointEstimates[configuration])
      );
    }
    maximumDeviations[replicate] = maximumDeviation;
  }

  maximumDeviations.sort((left, right) => left - right);
  const criticalValue = quantile(maximumDeviations, confidence);
  const alpha = 1 - confidence;
  const configurationById = new Map(configurations.map((configuration) => [configuration.id, configuration]));
  const analyses = prepared.ids.map((id, index): FamilyConfigurationAnalysis => {
    const distribution = distributions[index].sort((left, right) => left - right);
    const pointEstimate = prepared.pointEstimates[index];
    // Preserve the repository's declared percentile-rank convention:
    // lower=floor(alpha/2 * R), upper=ceil((1-alpha/2) * R)-1.
    const pointwiseLow = distribution[Math.floor((alpha / 2) * replicates)];
    const pointwiseHigh = distribution[Math.ceil((1 - alpha / 2) * replicates) - 1];
    const simultaneousLow = pointEstimate - criticalValue;
    const simultaneousHigh = pointEstimate + criticalValue;
    return {
      id,
      pointEstimate,
      pointwise: {
        ciLow: pointwiseLow,
        ciHigh: pointwiseHigh,
        conclusion: classify(pointwiseLow, pointwiseHigh),
      },
      simultaneous: {
        ciLow: simultaneousLow,
        ciHigh: simultaneousHigh,
        conclusion: classify(simultaneousLow, simultaneousHigh),
      },
      discordance: pairedBinaryDiagnostics(configurationById.get(id)!.outcomes),
    };
  });

  return {
    kind: "SimultaneousPairedBootstrapResult",
    version: 1,
    method: "synchronized-stratified-max-absolute-deviation-bootstrap",
    estimand: "paired-accuracy-difference-A-minus-B",
    inferenceScope: "predeclared-finite-configuration-family",
    familySize: analyses.length,
    n,
    strata: prepared.strata.map(({ stratum, indices }) => ({ stratum, n: indices.length })),
    confidence,
    alpha,
    seed,
    replicates,
    prng: { id: "mulberry32", version: 1, seedHash: "fnv1a-32-code-units" },
    criticalValue,
    configurations: analyses,
    limitations: [
      "The band is a nonparametric bootstrap approximation over the observed benchmark items, not a finite-sample exact confidence set.",
      "The resampling model preserves declared stratum sizes and pairs model outcomes by item; it does not include repeated model-run, training, or deployment variance.",
      "Familywise interpretation applies only to the predeclared configuration family included in this call.",
    ],
  };
}
