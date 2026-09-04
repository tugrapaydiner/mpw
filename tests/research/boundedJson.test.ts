import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOUNDED_JSON_LIMITS,
  normalizeBoundedJsonLimits,
  parseBoundedJson,
} from "../../src/research/boundedJson";

describe("bounded JSON ingestion", () => {
  it("returns deterministic structural inspection for valid JSON", () => {
    const text = JSON.stringify({ a: [1, "two", { c: true }], d: null });
    const result = parseBoundedJson(text);
    expect(result.value).toEqual({ a: [1, "two", { c: true }], d: null });
    expect(result.inspection).toMatchObject({
      bytes: new TextEncoder().encode(text).length,
      nodes: 7,
      maximumDepth: 3,
      maximumArrayLength: 3,
      maximumObjectKeys: 2,
      maximumStringLength: 3,
    });
    expect(result.limits).toEqual(DEFAULT_BOUNDED_JSON_LIMITS);
  });

  it("rejects the input before parsing when the UTF-8 byte limit is exceeded", () => {
    expect(() => parseBoundedJson('"é"', { maxBytes: 3 })).toThrow(/bytes/);
    expect(parseBoundedJson('"é"', { maxBytes: 4 }).value).toBe("é");
  });

  it("rejects excessive depth, nodes, array length, object keys, and strings", () => {
    expect(() =>
      parseBoundedJson(JSON.stringify({ a: { b: { c: 1 } } }), { maxDepth: 2 })
    ).toThrow(/depth/);
    expect(() => parseBoundedJson("[1,2,3]", { maxNodes: 3 })).toThrow(/node count/);
    expect(() => parseBoundedJson("[1,2,3]", { maxArrayLength: 2 })).toThrow(/array length/);
    expect(() => parseBoundedJson('{"a":1,"b":2}', { maxObjectKeys: 1 })).toThrow(/keys/);
    expect(() => parseBoundedJson('"abcd"', { maxStringLength: 3 })).toThrow(/string length/);
    expect(() => parseBoundedJson('{"abcd":1}', { maxStringLength: 3 })).toThrow(/key length/);
  });

  it("rejects prototype-sensitive keys at any depth", () => {
    expect(() => parseBoundedJson('{"__proto__":{"polluted":true}}')).toThrow(
      /forbidden JSON object key __proto__/
    );
    expect(() => parseBoundedJson('{"nested":{"constructor":1}}')).toThrow(
      /forbidden JSON object key constructor/
    );
    expect(() => parseBoundedJson('{"prototype":1}')).toThrow(
      /forbidden JSON object key prototype/
    );
  });

  it("rejects invalid JSON and invalid limit overrides", () => {
    let parseError: unknown;
    try {
      parseBoundedJson("{");
    } catch (error) {
      parseError = error;
    }
    expect(parseError).toBeInstanceOf(Error);
    expect((parseError as Error).message).toMatch(/invalid JSON/);
    expect((parseError as Error & { cause?: unknown }).cause).toBeInstanceOf(SyntaxError);
    expect(() => normalizeBoundedJsonLimits({ maxBytes: 0 })).toThrow(/positive safe integer/);
    expect(() =>
      normalizeBoundedJsonLimits({ unknown: 1 } as unknown as { maxBytes: number })
    ).toThrow(/unknown JSON limit/);
    expect(() => normalizeBoundedJsonLimits(null as never)).toThrow(/must be an object/);
  });

  it("uses an iterative walk for deep-but-allowed structures", () => {
    let value: unknown = 0;
    for (let index = 0; index < 100; index++) value = [value];
    const result = parseBoundedJson(JSON.stringify(value), {
      maxDepth: 100,
      maxNodes: 101,
      maxArrayLength: 1,
    });
    expect(result.inspection.maximumDepth).toBe(100);
    expect(result.inspection.nodes).toBe(101);
  });
});
