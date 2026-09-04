export interface BoundedJsonLimits {
  maxBytes: number;
  maxDepth: number;
  maxNodes: number;
  maxArrayLength: number;
  maxObjectKeys: number;
  maxStringLength: number;
}

export const DEFAULT_BOUNDED_JSON_LIMITS: BoundedJsonLimits = {
  maxBytes: 10 * 1024 * 1024,
  maxDepth: 32,
  maxNodes: 1_000_000,
  maxArrayLength: 100_000,
  maxObjectKeys: 10_000,
  maxStringLength: 1_000_000,
};

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function positiveSafeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value;
}

export function normalizeBoundedJsonLimits(
  overrides: Partial<BoundedJsonLimits> = {}
): BoundedJsonLimits {
  if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
    throw new Error("JSON limit overrides must be an object");
  }
  for (const key of Object.keys(overrides)) {
    if (!(key in DEFAULT_BOUNDED_JSON_LIMITS)) {
      throw new Error(`unknown JSON limit: ${key}`);
    }
  }
  return {
    maxBytes: positiveSafeInteger(
      overrides.maxBytes ?? DEFAULT_BOUNDED_JSON_LIMITS.maxBytes,
      "maxBytes"
    ),
    maxDepth: positiveSafeInteger(
      overrides.maxDepth ?? DEFAULT_BOUNDED_JSON_LIMITS.maxDepth,
      "maxDepth"
    ),
    maxNodes: positiveSafeInteger(
      overrides.maxNodes ?? DEFAULT_BOUNDED_JSON_LIMITS.maxNodes,
      "maxNodes"
    ),
    maxArrayLength: positiveSafeInteger(
      overrides.maxArrayLength ?? DEFAULT_BOUNDED_JSON_LIMITS.maxArrayLength,
      "maxArrayLength"
    ),
    maxObjectKeys: positiveSafeInteger(
      overrides.maxObjectKeys ?? DEFAULT_BOUNDED_JSON_LIMITS.maxObjectKeys,
      "maxObjectKeys"
    ),
    maxStringLength: positiveSafeInteger(
      overrides.maxStringLength ?? DEFAULT_BOUNDED_JSON_LIMITS.maxStringLength,
      "maxStringLength"
    ),
  };
}

interface PendingNode {
  value: unknown;
  depth: number;
  path: string;
}

export interface BoundedJsonInspection {
  bytes: number;
  nodes: number;
  maximumDepth: number;
  maximumArrayLength: number;
  maximumObjectKeys: number;
  maximumStringLength: number;
}

export interface BoundedJsonParseResult {
  value: unknown;
  inspection: BoundedJsonInspection;
  limits: BoundedJsonLimits;
}

/**
 * Parses JSON only after a UTF-8 byte limit and then performs an iterative
 * structural walk. JSON.parse itself can still allocate up to maxBytes; the
 * pre-parse byte limit is therefore the first availability boundary.
 */
export function parseBoundedJson(
  text: string,
  overrides: Partial<BoundedJsonLimits> = {}
): BoundedJsonParseResult {
  if (typeof text !== "string") throw new Error("JSON input must be a string");
  const limits = normalizeBoundedJsonLimits(overrides);
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > limits.maxBytes) {
    throw new Error(`JSON input is ${bytes} bytes; maximum is ${limits.maxBytes}`);
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`invalid JSON: ${(error as Error).message}`);
  }

  const pending: PendingNode[] = [{ value, depth: 0, path: "$" }];
  let nodes = 0;
  let maximumDepth = 0;
  let maximumArrayLength = 0;
  let maximumObjectKeys = 0;
  let maximumStringLength = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) break;
    nodes++;
    if (nodes > limits.maxNodes) {
      throw new Error(`JSON node count exceeds maximum ${limits.maxNodes}`);
    }
    if (current.depth > limits.maxDepth) {
      throw new Error(
        `JSON depth ${current.depth} exceeds maximum ${limits.maxDepth} at ${current.path}`
      );
    }
    maximumDepth = Math.max(maximumDepth, current.depth);
    const node = current.value;
    if (typeof node === "string") {
      maximumStringLength = Math.max(maximumStringLength, node.length);
      if (node.length > limits.maxStringLength) {
        throw new Error(
          `JSON string length ${node.length} exceeds maximum ${limits.maxStringLength} at ${current.path}`
        );
      }
      continue;
    }
    if (node === null || typeof node === "number" || typeof node === "boolean") {
      continue;
    }
    if (Array.isArray(node)) {
      maximumArrayLength = Math.max(maximumArrayLength, node.length);
      if (node.length > limits.maxArrayLength) {
        throw new Error(
          `JSON array length ${node.length} exceeds maximum ${limits.maxArrayLength} at ${current.path}`
        );
      }
      for (let index = node.length - 1; index >= 0; index--) {
        pending.push({
          value: node[index],
          depth: current.depth + 1,
          path: `${current.path}[${index}]`,
        });
      }
      continue;
    }
    if (typeof node === "object") {
      const object = node as Record<string, unknown>;
      const keys = Object.keys(object);
      maximumObjectKeys = Math.max(maximumObjectKeys, keys.length);
      if (keys.length > limits.maxObjectKeys) {
        throw new Error(
          `JSON object has ${keys.length} keys; maximum is ${limits.maxObjectKeys} at ${current.path}`
        );
      }
      for (const key of keys) {
        if (FORBIDDEN_KEYS.has(key)) {
          throw new Error(`forbidden JSON object key ${key} at ${current.path}`);
        }
        if (key.length > limits.maxStringLength) {
          throw new Error(
            `JSON key length ${key.length} exceeds maximum ${limits.maxStringLength} at ${current.path}`
          );
        }
      }
      for (let index = keys.length - 1; index >= 0; index--) {
        const key = keys[index];
        pending.push({
          value: object[key],
          depth: current.depth + 1,
          path: `${current.path}.${key}`,
        });
      }
      continue;
    }
    throw new Error(`unsupported JSON value at ${current.path}`);
  }

  return {
    value,
    inspection: {
      bytes,
      nodes,
      maximumDepth,
      maximumArrayLength,
      maximumObjectKeys,
      maximumStringLength,
    },
    limits,
  };
}
