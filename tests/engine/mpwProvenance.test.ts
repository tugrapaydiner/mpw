import { describe, it, expect } from "vitest";
import {
  canonicalBytes,
  contentHash,
  orderDims,
  hashProtocol,
  hashBenchmark,
  hashEvidenceBundle,
  hashExperiment,
  hashManifestBody,
  hashCertificateBody,
  type EvidenceBundle,
} from "../../src/engine/mpwProvenance";
import { sha256Hex } from "../../src/engine/sha256";
import { LAB_A_PROTOCOL, LAB_B_PROTOCOL, EXPOSED_DIMENSIONS } from "../../src/engine/mpwFixture";
import { experimentId, type EngineMeta } from "../../src/engine/mpwManifest";
import type { JsonValue } from "../../src/engine/mpwManifest";

const META: EngineMeta = {
  sim: "s",
  simVersion: "v",
  boot: "b",
  replicates: 10,
  algo: "a",
  algoVersion: 1,
};

const bundle = (): EvidenceBundle => ({
  protocol: { ...LAB_A_PROTOCOL } as unknown as Record<string, JsonValue>,
  subset: ["reasoning_budget"],
  receipts: [
    { id: "item-1", model: "MODEL_A", finalCorrect: true },
    { id: "item-0", model: "MODEL_B", finalCorrect: false },
  ] as unknown as Array<Record<string, JsonValue>>,
  summary: { scoreA: 0.5, scoreB: 0.25 },
});

describe("provenance", () => {
  it("sha256 matches standard vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("JCS vectors: sorted keys, stable numbers, order kept", () => {
    expect(canonicalBytes({ b: [2, 1], a: 1 })).toBe('{"a":1,"b":[2,1]}');
    expect(canonicalBytes({ x: { d: 4, c: 3 }, a: 1 })).toBe('{"a":1,"x":{"c":3,"d":4}}');
    expect(canonicalBytes({ a: -0 })).toBe('{"a":0}');
    expect(canonicalBytes({ e: 2, é: 1 })).toBe('{"e":2,"é":1}');
  });

  it("rejects everything outside JSON", () => {
    for (const bad of [
      NaN,
      Infinity,
      -Infinity,
      undefined,
      { a: undefined },
      { a: NaN },
      [1, Infinity],
      { f: () => 1 },
      { s: Symbol("x") },
      10n,
      new Date(),
    ]) {
      expect(() => canonicalBytes(bad), JSON.stringify(String(bad))).toThrow();
    }
  });

  it("key insertion order irrelevant for every hash", () => {
    const proto = { ...LAB_A_PROTOCOL } as unknown as Record<string, JsonValue>;
    const rev = Object.fromEntries(Object.entries(proto).reverse());
    expect(hashProtocol(rev)).toBe(hashProtocol(proto));
    expect(hashManifestBody({ b: 1, a: 2 } as unknown as Record<string, JsonValue>)).toBe(
      hashManifestBody({ a: 2, b: 1 } as unknown as Record<string, JsonValue>)
    );
    expect(hashCertificateBody({ b: 1, a: 2 } as unknown as Record<string, JsonValue>)).toBe(
      hashCertificateBody({ a: 2, b: 1 } as unknown as Record<string, JsonValue>)
    );
    expect(
      hashExperiment({ baseLab: "A", sourceLab: "B", subset: ["answer_parser", "reasoning_budget"], protocol: rev, engine: META })
    ).toBe(
      hashExperiment({ baseLab: "A", sourceLab: "B", subset: ["reasoning_budget", "answer_parser"], protocol: proto, engine: META })
    );
    const b1 = bundle();
    const b2 = bundle();
    b2.receipts.reverse();
    expect(hashEvidenceBundle(b2)).toBe(hashEvidenceBundle(b1));
  });

  it("subset order follows canonical dimension order", () => {
    expect(orderDims([...EXPOSED_DIMENSIONS].reverse())).toEqual(EXPOSED_DIMENSIONS);
  });

  it("meaningful array order changes the hash", () => {
    expect(canonicalBytes([1, 2])).not.toBe(canonicalBytes([2, 1]));
    const b1 = {
      id: "x",
      version: 1,
      models: ["MODEL_A", "MODEL_B"],
      strata: [
        { name: "s1", count: 1 },
        { name: "s2", count: 1 },
      ],
      items: [{ id: "item-0" }],
    };
    const b2 = { ...b1, strata: [...b1.strata].reverse() };
    expect(hashBenchmark(b2)).not.toBe(hashBenchmark(b1));
    const b3 = { ...b1, models: ["MODEL_B", "MODEL_A"] };
    expect(hashBenchmark(b3)).not.toBe(hashBenchmark(b1));
  });

  it("benchmark item order irrelevant, item change material", () => {
    const items = [{ id: "item-1" }, { id: "item-0" }];
    const base = { id: "x", version: 1, models: ["A"], strata: [], items };
    const reordered = { ...base, items: [...items].reverse() };
    expect(hashBenchmark(reordered)).toBe(hashBenchmark(base));
    expect(hashBenchmark({ ...base, items: [{ id: "item-0" }, { id: "item-X" }] })).not.toBe(hashBenchmark(base));
  });

  it("any content change moves the matching hash", () => {
    const b = bundle();
    expect(hashEvidenceBundle({ ...b, receipts: [{ id: "item-9", model: "MODEL_A", finalCorrect: true }] as never })).not.toBe(
      hashEvidenceBundle(b)
    );
    expect(
      hashEvidenceBundle({ ...b, protocol: { ...LAB_B_PROTOCOL } as unknown as Record<string, JsonValue> })
    ).not.toBe(hashEvidenceBundle(b));
    expect(hashEvidenceBundle({ ...b, summary: { scoreA: 0.75, scoreB: 0.25 } })).not.toBe(hashEvidenceBundle(b));
    expect(hashProtocol({ ...LAB_B_PROTOCOL } as unknown as Record<string, JsonValue>)).not.toBe(
      hashProtocol({ ...LAB_A_PROTOCOL } as unknown as Record<string, JsonValue>)
    );
  });

  it("repeated runs stable", () => {
    const b = bundle();
    const h = hashEvidenceBundle(b);
    expect(hashEvidenceBundle(bundle())).toBe(h);
    expect(contentHash({ a: [1, { b: 2 }] })).toBe(contentHash({ a: [1, { b: 2 }] }));
    expect(
      hashExperiment({ baseLab: "A", sourceLab: "B", subset: ["reasoning_budget"], protocol: b.protocol, engine: META })
    ).toBe(experimentId("A", "B", ["reasoning_budget"], b.protocol, META));
  });
});
