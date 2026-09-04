export type ProtocolScalar = string | number | boolean | null;
export type FiniteProtocol = Readonly<Record<string, ProtocolScalar>>;

export interface ProtocolCoordinate {
  name: string;
  values: readonly ProtocolScalar[];
  description?: string;
  cost?: number;
}

export interface ProtocolSchema {
  kind: "FiniteProtocolSchema";
  version: 1;
  coordinates: readonly ProtocolCoordinate[];
}

const compareCodeUnits = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function isProtocolScalar(value: unknown): value is ProtocolScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function scalarKey(value: ProtocolScalar): string {
  if (value === null) return "null:null";
  if (typeof value === "number") return `number:${Object.is(value, -0) ? 0 : value}`;
  return `${typeof value}:${String(value)}`;
}

export function protocolValueEquals(a: ProtocolScalar, b: ProtocolScalar): boolean {
  return a === b || (typeof a === "number" && typeof b === "number" && Object.is(a, b));
}

export function validateProtocolSchema(schema: ProtocolSchema): ProtocolSchema {
  if (typeof schema !== "object" || schema === null || schema.kind !== "FiniteProtocolSchema" || schema.version !== 1) {
    throw new Error("invalid finite protocol schema kind/version");
  }
  if (!Array.isArray(schema.coordinates)) throw new Error("schema.coordinates must be an array");
  const seen = new Set<string>();
  for (const [index, coordinate] of schema.coordinates.entries()) {
    if (typeof coordinate !== "object" || coordinate === null) {
      throw new Error(`schema coordinate ${index} must be an object`);
    }
    if (typeof coordinate.name !== "string" || coordinate.name.length === 0) {
      throw new Error(`schema coordinate ${index} needs a non-empty name`);
    }
    if (seen.has(coordinate.name)) throw new Error(`duplicate protocol coordinate: ${coordinate.name}`);
    seen.add(coordinate.name);
    if (!Array.isArray(coordinate.values) || coordinate.values.length === 0) {
      throw new Error(`coordinate ${coordinate.name} needs at least one value`);
    }
    const values = new Set<string>();
    for (const value of coordinate.values) {
      if (!isProtocolScalar(value)) throw new Error(`coordinate ${coordinate.name} has a non-finite or unsupported value`);
      const key = scalarKey(value);
      if (values.has(key)) throw new Error(`coordinate ${coordinate.name} has duplicate value ${String(value)}`);
      values.add(key);
    }
    if (coordinate.description !== undefined && typeof coordinate.description !== "string") {
      throw new Error(`coordinate ${coordinate.name} description must be a string`);
    }
    if (
      coordinate.cost !== undefined &&
      (typeof coordinate.cost !== "number" || !Number.isFinite(coordinate.cost) || coordinate.cost < 0)
    ) {
      throw new Error(`coordinate ${coordinate.name} cost must be a finite non-negative number`);
    }
  }
  return schema;
}

export function schemaCoordinateNames(schema: ProtocolSchema): string[] {
  validateProtocolSchema(schema);
  return schema.coordinates.map((coordinate) => coordinate.name);
}

export function validateProtocol(protocol: FiniteProtocol, schema: ProtocolSchema): FiniteProtocol {
  validateProtocolSchema(schema);
  if (typeof protocol !== "object" || protocol === null || Array.isArray(protocol)) {
    throw new Error("protocol must be a plain record");
  }
  const names = schemaCoordinateNames(schema);
  const protocolKeys = Object.keys(protocol).sort(compareCodeUnits);
  const schemaKeys = [...names].sort(compareCodeUnits);
  if (JSON.stringify(protocolKeys) !== JSON.stringify(schemaKeys)) {
    throw new Error(`protocol keys [${protocolKeys.join(",")}] do not match schema [${schemaKeys.join(",")}]`);
  }
  for (const coordinate of schema.coordinates) {
    const value = protocol[coordinate.name];
    if (!isProtocolScalar(value)) throw new Error(`protocol coordinate ${coordinate.name} is invalid`);
    if (!coordinate.values.some((allowed) => protocolValueEquals(allowed, value))) {
      throw new Error(`protocol coordinate ${coordinate.name} has value outside its finite domain`);
    }
  }
  return protocol;
}

export function protocolDifferences(
  a: FiniteProtocol,
  b: FiniteProtocol,
  schema: ProtocolSchema
): string[] {
  validateProtocol(a, schema);
  validateProtocol(b, schema);
  return schema.coordinates
    .map((coordinate) => coordinate.name)
    .filter((name) => !protocolValueEquals(a[name], b[name]));
}

export function normalizeSubset(subset: readonly string[], allowed: readonly string[]): string[] {
  if (!Array.isArray(subset)) throw new Error("subset must be an array");
  const allowedSet = new Set(allowed);
  const seen = new Set<string>();
  for (const coordinate of subset) {
    if (typeof coordinate !== "string" || coordinate.length === 0) {
      throw new Error("subset coordinates must be non-empty strings");
    }
    if (!allowedSet.has(coordinate)) throw new Error(`unknown or unexposed protocol coordinate: ${coordinate}`);
    if (seen.has(coordinate)) throw new Error(`duplicate protocol coordinate: ${coordinate}`);
    seen.add(coordinate);
  }
  return [...seen].sort(compareCodeUnits);
}

export function substituteProtocol({
  base,
  source,
  subset,
  schema,
  exposedDimensions,
}: {
  base: FiniteProtocol;
  source: FiniteProtocol;
  subset: readonly string[];
  schema: ProtocolSchema;
  exposedDimensions?: readonly string[];
}): FiniteProtocol {
  validateProtocol(base, schema);
  validateProtocol(source, schema);
  const differences = protocolDifferences(base, source, schema);
  const exposed = exposedDimensions === undefined ? differences : normalizeSubset(exposedDimensions, differences);
  const selected = normalizeSubset(subset, exposed);
  const selectedSet = new Set(selected);
  const hybrid: Record<string, ProtocolScalar> = {};
  for (const coordinate of schema.coordinates) {
    const name = coordinate.name;
    hybrid[name] = selectedSet.has(name) ? source[name] : base[name];
  }
  assertExactSubstitution({ base, source, hybrid, subset: selected, schema });
  return Object.freeze(hybrid);
}

export function assertExactSubstitution({
  base,
  source,
  hybrid,
  subset,
  schema,
}: {
  base: FiniteProtocol;
  source: FiniteProtocol;
  hybrid: FiniteProtocol;
  subset: readonly string[];
  schema: ProtocolSchema;
}): void {
  validateProtocol(base, schema);
  validateProtocol(source, schema);
  validateProtocol(hybrid, schema);
  const selected = new Set(normalizeSubset(subset, schemaCoordinateNames(schema)));
  for (const coordinate of schema.coordinates) {
    const name = coordinate.name;
    const expected = selected.has(name) ? source[name] : base[name];
    if (!protocolValueEquals(hybrid[name], expected)) {
      throw new Error(`substitution invariant failed for ${name}`);
    }
  }
}

export function protocolKey(protocol: FiniteProtocol, schema: ProtocolSchema): string {
  validateProtocol(protocol, schema);
  return JSON.stringify(
    schema.coordinates.map((coordinate) => [coordinate.name, protocol[coordinate.name]])
  );
}
