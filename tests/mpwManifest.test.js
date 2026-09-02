import test from "node:test";
import assert from "node:assert/strict";
import { canonicalize, buildPublicationManifestCore, canonicalManifest } from "../src/mpwManifest.js";

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
