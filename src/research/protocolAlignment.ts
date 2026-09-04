import {
  protocolValueEquals,
  validateProtocol,
  validateProtocolSchema,
  type FiniteProtocol,
  type ProtocolCoordinate,
  type ProtocolSchema,
} from "./protocol.js";

export const PROTOCOL_ALIGNMENT_KIND = "FiniteProtocolAlignment" as const;
export const PROTOCOL_ALIGNMENT_VERSION = 1 as const;

type ProtocolValue = FiniteProtocol[string];

export interface ProtocolValueAlignment {
  source: ProtocolValue;
  target: ProtocolValue;
}

export interface ProtocolCoordinateAlignment {
  targetCoordinate: string;
  sourceCoordinate: string;
  values: ProtocolValueAlignment[];
  rationale?: string;
}

export interface FiniteProtocolAlignment {
  kind: typeof PROTOCOL_ALIGNMENT_KIND;
  version: typeof PROTOCOL_ALIGNMENT_VERSION;
  sourceSchema: ProtocolSchema;
  targetSchema: ProtocolSchema;
  coordinates: ProtocolCoordinateAlignment[];
  notes?: string[];
}

export interface ProtocolAlignmentReport {
  kind: "ProtocolAlignmentReport";
  version: 1;
  alignedProtocol: FiniteProtocol;
  unmappedSourceCoordinates: string[];
  lossyTargetCoordinates: string[];
  unusedTargetValues: Record<string, ProtocolValue[]>;
  notes: string[];
  limitations: string[];
}

export interface ProtocolPairAlignmentResult {
  kind: "ProtocolPairAlignmentResult";
  version: 1;
  targetSchema: ProtocolSchema;
  protocolA: FiniteProtocol;
  protocolB: FiniteProtocol;
  reportA: ProtocolAlignmentReport;
  reportB: ProtocolAlignmentReport;
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

function exactKeys(
  value: unknown,
  allowedRequired: readonly string[],
  allowedOptional: readonly string[],
  name: string
): Record<string, unknown> {
  const object = record(value, name);
  const allowed = new Set([...allowedRequired, ...allowedOptional]);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) throw new Error(`${name} has unexpected property ${key}`);
  }
  for (const key of allowedRequired) {
    if (!(key in object)) throw new Error(`${name} is missing ${key}`);
  }
  return object;
}

function coordinateByName(
  schema: ProtocolSchema,
  name: string,
  where: string
): ProtocolCoordinate {
  const coordinate = schema.coordinates.find((candidate) => candidate.name === name);
  if (!coordinate) throw new Error(`${where} references unknown coordinate ${name}`);
  return coordinate;
}

function containsValue(values: readonly ProtocolValue[], value: ProtocolValue): boolean {
  return values.some((candidate) => protocolValueEquals(candidate, value));
}

function countValue(values: readonly ProtocolValue[], value: ProtocolValue): number {
  return values.filter((candidate) => protocolValueEquals(candidate, value)).length;
}

function validateValueMap(
  valuesInput: unknown,
  sourceCoordinate: ProtocolCoordinate,
  targetCoordinate: ProtocolCoordinate,
  where: string
): ProtocolValueAlignment[] {
  if (!Array.isArray(valuesInput) || valuesInput.length === 0) {
    throw new Error(`${where}.values must be a non-empty array`);
  }
  const values = valuesInput.map((entry, index): ProtocolValueAlignment => {
    const object = exactKeys(entry, ["source", "target"], [], `${where}.values[${index}]`);
    const source = object.source as ProtocolValue;
    const target = object.target as ProtocolValue;
    if (!containsValue(sourceCoordinate.values, source)) {
      throw new Error(`${where}.values[${index}].source is outside the source domain`);
    }
    if (!containsValue(targetCoordinate.values, target)) {
      throw new Error(`${where}.values[${index}].target is outside the target domain`);
    }
    return { source: clone(source), target: clone(target) };
  });
  for (const sourceValue of sourceCoordinate.values) {
    const count = values.filter((entry) =>
      protocolValueEquals(entry.source, sourceValue)
    ).length;
    if (count !== 1) {
      throw new Error(
        `${where}.values must map source value ${JSON.stringify(sourceValue)} exactly once; got ${count}`
      );
    }
  }
  if (values.length !== sourceCoordinate.values.length) {
    throw new Error(`${where}.values contains duplicate source mappings`);
  }
  return values;
}

export function validateFiniteProtocolAlignment(
  value: unknown
): FiniteProtocolAlignment {
  const object = exactKeys(
    value,
    ["kind", "version", "sourceSchema", "targetSchema", "coordinates"],
    ["notes"],
    "alignment"
  );
  if (
    object.kind !== PROTOCOL_ALIGNMENT_KIND ||
    object.version !== PROTOCOL_ALIGNMENT_VERSION
  ) {
    throw new Error("alignment kind or version is invalid");
  }
  validateProtocolSchema(object.sourceSchema as ProtocolSchema);
  validateProtocolSchema(object.targetSchema as ProtocolSchema);
  const sourceSchema = clone(object.sourceSchema as ProtocolSchema);
  const targetSchema = clone(object.targetSchema as ProtocolSchema);
  if (!Array.isArray(object.coordinates)) {
    throw new Error("alignment.coordinates must be an array");
  }
  const seenTargets = new Set<string>();
  const seenSources = new Set<string>();
  const coordinates = object.coordinates.map(
    (entry, index): ProtocolCoordinateAlignment => {
      const where = `alignment.coordinates[${index}]`;
      const mapping = exactKeys(
        entry,
        ["targetCoordinate", "sourceCoordinate", "values"],
        ["rationale"],
        where
      );
      if (
        typeof mapping.targetCoordinate !== "string" ||
        mapping.targetCoordinate.length === 0 ||
        typeof mapping.sourceCoordinate !== "string" ||
        mapping.sourceCoordinate.length === 0
      ) {
        throw new Error(`${where} coordinate names must be non-empty strings`);
      }
      if (seenTargets.has(mapping.targetCoordinate)) {
        throw new Error(`duplicate target coordinate mapping: ${mapping.targetCoordinate}`);
      }
      if (seenSources.has(mapping.sourceCoordinate)) {
        throw new Error(`source coordinate reused by multiple targets: ${mapping.sourceCoordinate}`);
      }
      seenTargets.add(mapping.targetCoordinate);
      seenSources.add(mapping.sourceCoordinate);
      const sourceCoordinate = coordinateByName(
        sourceSchema,
        mapping.sourceCoordinate,
        where
      );
      const targetCoordinate = coordinateByName(
        targetSchema,
        mapping.targetCoordinate,
        where
      );
      if (
        mapping.rationale !== undefined &&
        (typeof mapping.rationale !== "string" || mapping.rationale.length === 0)
      ) {
        throw new Error(`${where}.rationale must be a non-empty string when present`);
      }
      return {
        targetCoordinate: mapping.targetCoordinate,
        sourceCoordinate: mapping.sourceCoordinate,
        values: validateValueMap(
          mapping.values,
          sourceCoordinate,
          targetCoordinate,
          where
        ),
        ...(mapping.rationale === undefined
          ? {}
          : { rationale: mapping.rationale }),
      };
    }
  );
  const targetNames = targetSchema.coordinates.map((coordinate) => coordinate.name);
  const missingTargets = targetNames.filter((name) => !seenTargets.has(name));
  if (missingTargets.length > 0 || coordinates.length !== targetNames.length) {
    throw new Error(
      `alignment must map every target coordinate exactly once; missing [${missingTargets.join(",")}]`
    );
  }
  let notes: string[] = [];
  if (object.notes !== undefined) {
    if (
      !Array.isArray(object.notes) ||
      object.notes.some((note) => typeof note !== "string")
    ) {
      throw new Error("alignment.notes must be an array of strings");
    }
    notes = [...object.notes];
  }
  const byTarget = new Map(
    coordinates.map((coordinate) => [coordinate.targetCoordinate, coordinate])
  );
  return {
    kind: PROTOCOL_ALIGNMENT_KIND,
    version: PROTOCOL_ALIGNMENT_VERSION,
    sourceSchema,
    targetSchema,
    coordinates: targetNames.map((name) => clone(byTarget.get(name)!)),
    ...(notes.length === 0 ? {} : { notes }),
  };
}

export function alignFiniteProtocol(
  protocol: FiniteProtocol,
  alignmentInput: FiniteProtocolAlignment
): ProtocolAlignmentReport {
  const alignment = validateFiniteProtocolAlignment(alignmentInput);
  validateProtocol(protocol, alignment.sourceSchema);
  const alignedProtocol: FiniteProtocol = {};
  const lossyTargetCoordinates: string[] = [];
  const unusedTargetValues: Record<string, ProtocolValue[]> = {};

  for (const mapping of alignment.coordinates) {
    const sourceValue = protocol[mapping.sourceCoordinate];
    const valueMapping = mapping.values.find((candidate) =>
      protocolValueEquals(candidate.source, sourceValue)
    );
    if (!valueMapping) {
      throw new Error(
        `alignment has no value mapping for ${mapping.sourceCoordinate}=${JSON.stringify(sourceValue)}`
      );
    }
    alignedProtocol[mapping.targetCoordinate] = clone(valueMapping.target);
    const targetCoordinate = coordinateByName(
      alignment.targetSchema,
      mapping.targetCoordinate,
      "alignment"
    );
    const mappedTargets = mapping.values.map((candidate) => candidate.target);
    if (
      mappedTargets.some((target) => countValue(mappedTargets, target) > 1)
    ) {
      lossyTargetCoordinates.push(mapping.targetCoordinate);
    }
    const unused = targetCoordinate.values.filter(
      (target) => !containsValue(mappedTargets, target)
    );
    if (unused.length > 0) {
      unusedTargetValues[mapping.targetCoordinate] = clone(unused);
    }
  }
  validateProtocol(alignedProtocol, alignment.targetSchema);
  const mappedSources = new Set(
    alignment.coordinates.map((coordinate) => coordinate.sourceCoordinate)
  );
  const unmappedSourceCoordinates = alignment.sourceSchema.coordinates
    .map((coordinate) => coordinate.name)
    .filter((name) => !mappedSources.has(name))
    .sort(compare);
  return {
    kind: "ProtocolAlignmentReport",
    version: 1,
    alignedProtocol,
    unmappedSourceCoordinates,
    lossyTargetCoordinates: [...lossyTargetCoordinates].sort(compare),
    unusedTargetValues,
    notes: [...(alignment.notes ?? [])],
    limitations: [
      "The alignment is an explicit semantic assertion supplied by the study; software validation cannot prove that the mapped coordinates mean the same thing.",
      "Unmapped source coordinates may contain consequential differences and must remain visible in downstream claims.",
      "Lossy value maps merge source states and can change witness cardinality or sufficiency.",
      "Alignment does not establish causality or transportability between evaluation implementations.",
    ],
  };
}

export function alignProtocolPair({
  protocolA,
  alignmentA,
  protocolB,
  alignmentB,
}: {
  protocolA: FiniteProtocol;
  alignmentA: FiniteProtocolAlignment;
  protocolB: FiniteProtocol;
  alignmentB: FiniteProtocolAlignment;
}): ProtocolPairAlignmentResult {
  const validatedA = validateFiniteProtocolAlignment(alignmentA);
  const validatedB = validateFiniteProtocolAlignment(alignmentB);
  if (
    JSON.stringify(validatedA.targetSchema) !==
    JSON.stringify(validatedB.targetSchema)
  ) {
    throw new Error("both alignments must use the same canonical target schema");
  }
  const reportA = alignFiniteProtocol(protocolA, validatedA);
  const reportB = alignFiniteProtocol(protocolB, validatedB);
  return {
    kind: "ProtocolPairAlignmentResult",
    version: 1,
    targetSchema: clone(validatedA.targetSchema),
    protocolA: clone(reportA.alignedProtocol),
    protocolB: clone(reportB.alignedProtocol),
    reportA,
    reportB,
  };
}
