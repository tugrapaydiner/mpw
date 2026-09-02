import test from "node:test";
import assert from "node:assert/strict";
import { canonicalize, buildPublicationManifestCore, canonicalManifest, sortItems, sortReceipts, sortWitnessSubsets, sortVerificationTable, protocolIdForSubset } from "../src/mpwManifest.js";

test("canonical form ignores key order", () => {
  assert.equal(canonicalize({ b: 1, a: 2 }), canonicalize({ a: 2, b: 1 }));
  assert.equal(
    canonicalize({ x: { d: 4, c: 3 }, a: 1 }),
    canonicalize({ a: 1, x: { c: 3, d: 4 } })
  );
});

test("manifest core carries no hashes yet", () => {
  const core = buildPublicationManifestCore({
    source: "Lab A",
    protocol: { reasoning_budget: 8192 },
    declared: "MODEL_A",
    seeds: { sim: "mpw-canonical-v1", boot: "mpw-boot-v1" },
  });
  assert.equal(core.kind, "PublicationManifestCore");
  assert.ok(!JSON.stringify(core).toLowerCase().includes("hash"));
  assert.equal(canonicalManifest(core), canonicalize(core));
});

test("ordering is canonical, meaningful array order kept", () => {
  assert.deepEqual(sortItems([{ id: "item-2" }, { id: "item-10" }, { id: "item-1" }]).map((x) => x.id), ["item-1", "item-10", "item-2"]);
  const receipts = [
    { subset: ["b"], id: "item-1", model: "MODEL_B" },
    { subset: [], id: "item-2", model: "MODEL_A" },
    { subset: [], id: "item-1", model: "MODEL_B" },
  ];
  assert.deepEqual(sortReceipts(receipts).map((r) => protocolIdForSubset(r.subset) + r.id), ["item-1", "item-2", "bitem-1"]);
  assert.deepEqual(sortWitnessSubsets([["b", "a"], ["c"], []]), [[], ["c"], ["a", "b"]]);
  const rows = [{ subset: ["b", "a"] }, { subset: [] }, { subset: ["c"] }, { subset: ["b"] }];
  assert.deepEqual(sortVerificationTable(rows).map((r) => r.subset), [[], ["b"], ["c"], ["a", "b"]]);
  assert.notEqual(canonicalize([2, 1]), canonicalize([1, 2]));
});
