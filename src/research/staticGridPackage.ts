import type { JsonValue } from "../engine/mpwManifest.js";
import { canonicalBytes } from "../engine/mpwProvenance.js";
import { sha256Hex } from "../engine/sha256.js";
import {
  protocolDifferences,
  protocolKey,
  validateProtocol,
  validateProtocolSchema,
  type FiniteProtocol,
  type ProtocolSchema,
} from "./protocol.js";
import {
  reconcileDirection,
  type ReconciliationDirection,
  type ReconciliationObservation,
  type ReconciliationResult,
} from "./reconciliation.js";

export const STATIC_GRID_PACKAGE_KIND = "StaticProtocolGridPackage" as const;
export const STATIC_GRID_PACKAGE_VERSION = 1 as const;
export const STATIC_GRID_PACKAGE_CANONICALIZATION = "RFC8785/JCS" as const;
export const STATIC_GRID_PACKAGE_HASH_ALGORITHM = "SHA-256" as const;
export const MAX_STATIC_GRID_DIFFERENCES = 20;

export interface StaticGridPublication<Conclusion extends string = string> {
  publicationId: string;
  publicationHash: string;
  protocol: FiniteProtocol;
  declaredObservation: ReconciliationObservation<Conclusion>;
}

export interface StaticGridWorld<Conclusion extends string = string> {
  protocol: FiniteProtocol;
  observation: ReconciliationObservation<Conclusion>;
}

export interface StaticProtocolGridPackageBody<Conclusion extends string = string> {
  kind: typeof STATIC_GRID_PACKAGE_KIND;
  schemaVersion: typeof STATIC_GRID_PACKAGE_VERSION;
  canonicalization: typeof STATIC_GRID_PACKAGE_CANONICALIZATION;
  hashAlgorithm: typeof STATIC_GRID_PACKAGE_HASH_ALGORITHM;
  benchmark: Record<string, JsonValue>;
  protocolSchema: ProtocolSchema;
  publications: {
    A: StaticGridPublication<Conclusion>;
    B: StaticGridPublication<Conclusion>;
  };
  worlds: StaticGridWorld<Conclusion>[];
  limitations: string[];
}

export interface StaticProtocolGridPackage<Conclusion extends string = string> {
  body: StaticProtocolGridPackageBody<Conclusion>;
  canonical: string;
  packageHash: string;
  packageId: string;
}

export interface BuildStaticProtocolGridPackageOptions<Conclusion extends string = string> {
  benchmark: Record<string, JsonValue>;
  protocolSchema: ProtocolSchema;
  publicationA: StaticGridPublication<Conclusion>;
  publicationB: StaticGridPublication<Conclusion>;
  worlds: readonly StaticGridWorld<Conclusion>[];
  limitations?: readonly string[];
}

export interface StaticGridPackageCheck {
  check: string;
  pass: boolean;
  detail: string;
}

export interface StaticGridPackageError extends Error {
  code: "STATIC_GRID_PACKAGE_INVALID";
  checks: StaticGridPackageCheck[];
}

const compare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: unknown, expected: readonly string[], name: string): Record<string, unknown> {
  const object = record(value, name);
  const actual = Object.keys(object).sort(compare);
  const wanted = [...expected].sort(compare);
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${name} keys differ: got [${actual.join(",")}], expected [${wanted.join(",")}]`);
  }
  return object;
}

function normalizeObservation<Conclusion extends string>(
  observation: ReconciliationObservation<Conclusion>,
  name: string
): ReconciliationObservation<Conclusion> {
  const object = record(observation, name);
  for (const key of Object.keys(object)) {
    if (!["conclusion", "effect", "evidenceId", "metadata"].includes(key)) {
      throw new Error(`${name} has unexpected property ${key}`);
    }
  }
  if (typeof observation.conclusion !== "string" || observation.conclusion.length === 0) {
    throw new Error(`${name}.conclusion must be a non-empty string`);
  }
  if (observation.effect !== undefined && !Number.isFinite(observation.effect)) {
    throw new Error(`${name}.effect must be finite`);
  }
  if (
    observation.evidenceId !== undefined &&
    (typeof observation.evidenceId !== "string" || observation.evidenceId.length === 0)
  ) {
    throw new Error(`${name}.evidenceId must be a non-empty string`);
  }
  if (observation.metadata !== undefined) {
    const metadata = record(observation.metadata, `${name}.metadata`);
    for (const [key, value] of Object.entries(metadata)) {
      const valid =
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value));
      if (!valid) throw new Error(`${name}.metadata.${key} must be a finite JSON scalar`);
    }
  }
  return clone(observation);
}

function normalizePublication<Conclusion extends string>(
  publication: StaticGridPublication<Conclusion>,
  schema: ProtocolSchema,
  name: string
): StaticGridPublication<Conclusion> {
  exactKeys(
    publication,
    ["publicationId", "publicationHash", "protocol", "declaredObservation"],
    name
  );
  if (typeof publication.publicationId !== "string" || publication.publicationId.length === 0) {
    throw new Error(`${name}.publicationId must be non-empty`);
  }
  if (!/^[0-9a-f]{64}$/.test(publication.publicationHash)) {
    throw new Error(`${name}.publicationHash must be a lowercase SHA-256 digest`);
  }
  validateProtocol(publication.protocol, schema);
  return {
    publicationId: publication.publicationId,
    publicationHash: publication.publicationHash,
    protocol: { ...publication.protocol },
    declaredObservation: normalizeObservation(
      publication.declaredObservation,
      `${name}.declaredObservation`
    ),
  };
}

function endpointCube(
  base: FiniteProtocol,
  source: FiniteProtocol,
  schema: ProtocolSchema
): FiniteProtocol[] {
  const differences = protocolDifferences(base, source, schema);
  if (differences.length > MAX_STATIC_GRID_DIFFERENCES) {
    throw new Error(
      `endpoint cube has ${differences.length} differences; maximum is ${MAX_STATIC_GRID_DIFFERENCES}`
    );
  }
  const count = 2 ** differences.length;
  const worlds: FiniteProtocol[] = [];
  for (let mask = 0; mask < count; mask++) {
    const protocol: FiniteProtocol = { ...base };
    differences.forEach((dimension, index) => {
      if ((mask & (1 << index)) !== 0) protocol[dimension] = source[dimension];
    });
    validateProtocol(protocol, schema);
    worlds.push(protocol);
  }
  return worlds.sort((left, right) => compare(protocolKey(left, schema), protocolKey(right, schema)));
}

function normalizeWorlds<Conclusion extends string>(
  worlds: readonly StaticGridWorld<Conclusion>[],
  schema: ProtocolSchema,
  expectedProtocols: readonly FiniteProtocol[]
): StaticGridWorld<Conclusion>[] {
  if (!Array.isArray(worlds)) throw new Error("worlds must be an array");
  const expected = new Set(expectedProtocols.map((protocol) => protocolKey(protocol, schema)));
  const seen = new Set<string>();
  const normalized = worlds.map((world, index) => {
    exactKeys(world, ["protocol", "observation"], `worlds[${index}]`);
    validateProtocol(world.protocol, schema);
    const key = protocolKey(world.protocol, schema);
    if (seen.has(key)) throw new Error(`duplicate protocol world at worlds[${index}]`);
    if (!expected.has(key)) throw new Error(`worlds[${index}] is outside the endpoint substitution cube`);
    seen.add(key);
    return {
      protocol: { ...world.protocol },
      observation: normalizeObservation(world.observation, `worlds[${index}].observation`),
    };
  });
  const missing = [...expected].filter((key) => !seen.has(key));
  if (missing.length > 0) {
    throw new Error(`endpoint substitution cube is incomplete: ${missing.length} world(s) missing`);
  }
  if (normalized.length !== expected.size) {
    throw new Error(`world count ${normalized.length} differs from endpoint cube size ${expected.size}`);
  }
  return normalized.sort((left, right) =>
    compare(protocolKey(left.protocol, schema), protocolKey(right.protocol, schema))
  );
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalBytes(left) === canonicalBytes(right);
}

function observationAt<Conclusion extends string>(
  worlds: readonly StaticGridWorld<Conclusion>[],
  protocol: FiniteProtocol,
  schema: ProtocolSchema
): ReconciliationObservation<Conclusion> {
  const key = protocolKey(protocol, schema);
  const world = worlds.find((candidate) => protocolKey(candidate.protocol, schema) === key);
  if (!world) throw new Error(`no observation for protocol ${key}`);
  return clone(world.observation);
}

export function buildStaticProtocolGridPackage<Conclusion extends string = string>(
  options: BuildStaticProtocolGridPackageOptions<Conclusion>
): StaticProtocolGridPackage<Conclusion> {
  record(options.benchmark, "benchmark");
  canonicalBytes(options.benchmark);
  validateProtocolSchema(options.protocolSchema);
  const publicationA = normalizePublication(options.publicationA, options.protocolSchema, "publicationA");
  const publicationB = normalizePublication(options.publicationB, options.protocolSchema, "publicationB");
  const expectedProtocols = endpointCube(
    publicationA.protocol,
    publicationB.protocol,
    options.protocolSchema
  );
  const worlds = normalizeWorlds(options.worlds, options.protocolSchema, expectedProtocols);
  const observedA = observationAt(worlds, publicationA.protocol, options.protocolSchema);
  const observedB = observationAt(worlds, publicationB.protocol, options.protocolSchema);
  if (!sameCanonical(observedA, publicationA.declaredObservation)) {
    throw new Error("publication A declaration does not match its grid endpoint");
  }
  if (!sameCanonical(observedB, publicationB.declaredObservation)) {
    throw new Error("publication B declaration does not match its grid endpoint");
  }
  const limitations = options.limitations ?? [];
  if (!Array.isArray(limitations) || limitations.some((item) => typeof item !== "string")) {
    throw new Error("limitations must be an array of strings");
  }
  const body: StaticProtocolGridPackageBody<Conclusion> = {
    kind: STATIC_GRID_PACKAGE_KIND,
    schemaVersion: STATIC_GRID_PACKAGE_VERSION,
    canonicalization: STATIC_GRID_PACKAGE_CANONICALIZATION,
    hashAlgorithm: STATIC_GRID_PACKAGE_HASH_ALGORITHM,
    benchmark: clone(options.benchmark),
    protocolSchema: clone(options.protocolSchema),
    publications: { A: publicationA, B: publicationB },
    worlds,
    limitations: [...limitations],
  };
  const canonical = canonicalBytes(body);
  const packageHash = sha256Hex(canonical);
  return {
    body,
    canonical,
    packageHash,
    packageId: `mpw-grid-v1-${packageHash.slice(0, 16)}`,
  };
}

function invalid(checks: StaticGridPackageCheck[], check: string, detail: string): never {
  checks.push({ check, pass: false, detail });
  const error = new Error(`STATIC_GRID_PACKAGE_INVALID: ${check}: ${detail}`) as StaticGridPackageError;
  error.code = "STATIC_GRID_PACKAGE_INVALID";
  error.checks = checks;
  throw error;
}

function passed(checks: StaticGridPackageCheck[], check: string, detail: string): void {
  checks.push({ check, pass: true, detail });
}

export function verifyStaticProtocolGridPackage(
  wrapper: unknown
): { status: "STATIC_GRID_PACKAGE_VALID"; packageId: string; checks: StaticGridPackageCheck[] } {
  const checks: StaticGridPackageCheck[] = [];
  let outer: Record<string, unknown>;
  try {
    outer = exactKeys(wrapper, ["body", "canonical", "packageHash", "packageId"], "wrapper");
  } catch (error) {
    return invalid(checks, "wrapper.shape", (error as Error).message);
  }
  passed(checks, "wrapper.shape", "exact keys");
  let body: StaticProtocolGridPackageBody<string>;
  try {
    const candidate = record(outer.body, "body");
    if (
      candidate.kind !== STATIC_GRID_PACKAGE_KIND ||
      candidate.schemaVersion !== STATIC_GRID_PACKAGE_VERSION ||
      candidate.canonicalization !== STATIC_GRID_PACKAGE_CANONICALIZATION ||
      candidate.hashAlgorithm !== STATIC_GRID_PACKAGE_HASH_ALGORITHM
    ) {
      throw new Error("kind, version, canonicalization, or hash algorithm differs");
    }
    body = candidate as unknown as StaticProtocolGridPackageBody<string>;
  } catch (error) {
    return invalid(checks, "body.identity", (error as Error).message);
  }
  passed(checks, "body.identity", "v1 / SHA-256 / RFC8785-JCS");
  let rebuilt: StaticProtocolGridPackage<string>;
  try {
    rebuilt = buildStaticProtocolGridPackage({
      benchmark: body.benchmark,
      protocolSchema: body.protocolSchema,
      publicationA: body.publications.A,
      publicationB: body.publications.B,
      worlds: body.worlds,
      limitations: body.limitations,
    });
  } catch (error) {
    return invalid(checks, "body.rebuild", (error as Error).message);
  }
  passed(checks, "body.rebuild", `${rebuilt.body.worlds.length} endpoint worlds complete`);
  if (outer.canonical !== rebuilt.canonical) {
    return invalid(checks, "wrapper.canonical", "canonical body differs");
  }
  passed(checks, "wrapper.canonical", `${rebuilt.canonical.length} bytes`);
  if (outer.packageHash !== rebuilt.packageHash) {
    return invalid(checks, "wrapper.packageHash", "SHA-256 differs");
  }
  if (outer.packageId !== rebuilt.packageId) {
    return invalid(checks, "wrapper.packageId", String(outer.packageId));
  }
  passed(checks, "wrapper.hash-and-id", rebuilt.packageId);
  return { status: "STATIC_GRID_PACKAGE_VALID", packageId: rebuilt.packageId, checks };
}

export function reconcileStaticProtocolGridPackage<Conclusion extends string = string>(
  wrapper: StaticProtocolGridPackage<Conclusion>,
  {
    direction,
    searchMode = "landscape",
    maxEvaluations,
  }: {
    direction: ReconciliationDirection;
    searchMode?: "minimum" | "landscape";
    maxEvaluations?: number;
  }
): ReconciliationResult<Conclusion> {
  verifyStaticProtocolGridPackage(wrapper);
  const body = wrapper.body;
  const publicationA = body.publications.A;
  const publicationB = body.publications.B;
  const base = direction === "A_TO_B" ? publicationA : publicationB;
  const source = direction === "A_TO_B" ? publicationB : publicationA;
  const observations = new Map(
    body.worlds.map((world) => [
      protocolKey(world.protocol, body.protocolSchema),
      clone(world.observation),
    ])
  );
  return reconcileDirection({
    schema: body.protocolSchema,
    baseProtocol: base.protocol,
    sourceProtocol: source.protocol,
    evaluator: (protocol) => {
      const observation = observations.get(protocolKey(protocol, body.protocolSchema));
      if (!observation) throw new Error("static grid has no observation for requested hybrid");
      return clone(observation);
    },
    direction,
    exposedDimensions: protocolDifferences(
      publicationA.protocol,
      publicationB.protocol,
      body.protocolSchema
    ),
    searchMode,
    maxEvaluations: maxEvaluations ?? body.worlds.length,
  });
}
