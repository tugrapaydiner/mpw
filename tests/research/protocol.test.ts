import { describe, expect, it } from "vitest";
import {
  assertExactSubstitution,
  protocolDifferences,
  protocolKey,
  substituteProtocol,
  validateProtocol,
  validateProtocolSchema,
  type ProtocolSchema,
} from "../../src/research/protocol";

const schema: ProtocolSchema = {
  kind: "FiniteProtocolSchema",
  version: 1,
  coordinates: [
    { name: "budget", values: [1024, 4096] },
    { name: "parser", values: ["strict", "tolerant"] },
    { name: "retry", values: [false, true] },
  ],
};
const base = { budget: 4096, parser: "tolerant", retry: true } as const;
const source = { budget: 1024, parser: "strict", retry: false } as const;

describe("finite protocol schema", () => {
  it("changes exactly the selected coordinates", () => {
    const hybrid = substituteProtocol({ base, source, subset: ["parser"], schema });
    expect(hybrid).toEqual({ budget: 4096, parser: "strict", retry: true });
    expect(() => assertExactSubstitution({ base, source, hybrid, subset: ["parser"], schema })).not.toThrow();
  });

  it("derives differences and normalizes order without hard-coded names", () => {
    expect(protocolDifferences(base, source, schema)).toEqual(["budget", "parser", "retry"]);
    const a = substituteProtocol({ base, source, subset: ["retry", "budget"], schema });
    const b = substituteProtocol({ base, source, subset: ["budget", "retry"], schema });
    expect(protocolKey(a, schema)).toBe(protocolKey(b, schema));
  });

  it("supports an intentionally partial exposed space", () => {
    const hybrid = substituteProtocol({
      base,
      source,
      subset: ["budget"],
      schema,
      exposedDimensions: ["budget"],
    });
    expect(hybrid).toEqual({ budget: 1024, parser: "tolerant", retry: true });
    expect(() =>
      substituteProtocol({ base, source, subset: ["parser"], schema, exposedDimensions: ["budget"] })
    ).toThrow(/unexposed/);
  });

  it("rejects duplicate schema values, missing keys, and invalid finite values", () => {
    expect(() =>
      validateProtocolSchema({
        kind: "FiniteProtocolSchema",
        version: 1,
        coordinates: [{ name: "x", values: [1, 1] }],
      })
    ).toThrow(/duplicate value/);
    expect(() => validateProtocol({ budget: 4096, parser: "tolerant" }, schema)).toThrow(/keys/);
    expect(() => validateProtocol({ budget: 4096, parser: "other", retry: true }, schema)).toThrow(/finite domain/);
  });
});
