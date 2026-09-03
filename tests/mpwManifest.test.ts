import { describe, it, expect } from "vitest";
import {
  canonicalize,
  buildPublicationManifestCore,
  canonicalManifest,
  sortItems,
  sortReceipts,
  sortWitnessSubsets,
  sortVerificationTable,
  protocolIdForSubset,
} from "../src/engine/mpwManifest";

describe("manifest", () => {
  it("canonical form ignores key order", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
    expect(canonicalize({ x: { d: 4, c: 3 }, a: 1 })).toBe(canonicalize({ a: 1, x: { c: 3, d: 4 } }));
  });

  it("manifest core carries no hashes yet", () => {
    const core = buildPublicationManifestCore({
      source: "Lab A",
      protocol: { reasoning_budget: 8192 },
      declared: "MODEL_A",
      seeds: { sim: "mpw-canonical-v1", boot: "mpw-boot-v1" },
    });
    expect(core.kind).toBe("PublicationManifestCore");
    expect(JSON.stringify(core).toLowerCase().includes("hash")).toBe(false);
    expect(canonicalManifest(core)).toBe(canonicalize(core));
  });

  it("ordering is canonical, meaningful array order kept", () => {
    expect(sortItems([{ id: "item-2" }, { id: "item-10" }, { id: "item-1" }]).map((x) => x.id)).toEqual([
      "item-1",
      "item-10",
      "item-2",
    ]);
    const receipts = [
      { subset: ["b"], id: "item-1", model: "MODEL_B" },
      { subset: [], id: "item-2", model: "MODEL_A" },
      { subset: [], id: "item-1", model: "MODEL_B" },
    ];
    expect(sortReceipts(receipts).map((r) => protocolIdForSubset(r.subset) + r.id)).toEqual([
      "item-1",
      "item-2",
      "bitem-1",
    ]);
    expect(sortWitnessSubsets([["b", "a"], ["c"], []])).toEqual([[], ["c"], ["a", "b"]]);
    const rows = [{ subset: ["b", "a"] }, { subset: [] }, { subset: ["c"] }, { subset: ["b"] }];
    expect(sortVerificationTable(rows).map((r) => r.subset)).toEqual([[], ["b"], ["c"], ["a", "b"]]);
    expect(canonicalize([2, 1])).not.toBe(canonicalize([1, 2]));
  });
});
