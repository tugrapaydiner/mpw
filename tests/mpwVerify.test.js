import test from "node:test";
import assert from "node:assert/strict";
import { verifyCanonical } from "../src/mpwVerify.js";
import { protocolForSubset, LAB_A_PROTOCOL, LAB_B_PROTOCOL } from "../src/mpwFixture.js";

test("all 16 evaluated even though min is found early", () => {
  const r = verifyCanonical();
  assert.equal(r.table.length, 16);
  assert.equal(r.checkedCount, 16);
  assert.equal(r.totalSubsets, 16);
  assert.equal(r.exhaustive, true);
});

test("hybrids keep everything outside S identical to base", () => {
  for (const { subset } of verifyCanonical().table) {
    const p = protocolForSubset(subset);
    for (const d of Object.keys(LAB_A_PROTOCOL)) {
      const want = subset.includes(d) ? LAB_B_PROTOCOL[d] : LAB_A_PROTOCOL[d];
      assert.equal(p[d], want);
    }
  }
});

test("sufficient means conclusion equals target, min is unique", () => {
  const r = verifyCanonical();
  for (const row of r.table) assert.equal(row.sufficient, row.conclusion === r.target);
  assert.equal(r.minimumCardinality, 1);
  assert.deepEqual(r.minimumWitnesses, [["reasoning_budget"]]);
  assert.deepEqual(r.coMinimumWitnesses, [["reasoning_budget"]]);
});

test("verifier hardcodes no answer", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/mpwVerify.js", import.meta.url), "utf8");
  assert.ok(!src.includes("reasoning_budget"));
  assert.ok(!src.includes("MODEL_A") && !src.includes("MODEL_B") && !src.includes("INCONCLUSIVE"));
});
