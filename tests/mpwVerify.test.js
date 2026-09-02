import test from "node:test";
import assert from "node:assert/strict";
import { verifyCanonical, verifyCandidateWitness, verifyWitness, checkSourceIntegrity } from "../src/mpwVerify.js";
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

test("candidate statuses work, never forcing an answer", () => {  assert.equal(verifyCandidateWitness(["reasoning_budget"]).status, "VERIFIED");
  assert.equal(verifyCandidateWitness(["reasoning_budget", "answer_parser"]).status, "NON_MINIMUM");
  assert.equal(verifyCandidateWitness([]).status, "NOT_SUFFICIENT");
  const none = verifyWitness({
    candidateSubset: ["a"],
    exposedDimensions: ["a", "b"],
    isSufficient: () => false,
  });
  assert.equal(none.status, "UNRESOLVED");
  assert.equal(none.minimumCardinality, null);
  assert.deepEqual(none.minimumWitnesses, []);
  const multi = verifyWitness({
    candidateSubset: ["a"],
    exposedDimensions: ["a", "b", "c"],
    isSufficient: (s) => s.includes("a") || s.includes("b"),
  });
  assert.equal(multi.status, "VERIFIED");
  assert.equal(multi.minimumCardinality, 1);
  assert.equal(multi.minimumWitnesses.length, 2);
});

test("sources must reproduce their own headlines first", () => {
  assert.equal(checkSourceIntegrity().status, "OK");
  assert.throws(
    () =>
      verifyCanonical([
        { source: "Lab A", subset: [], declared: "MODEL_B" },
        {
          source: "Lab B",
          subset: ["reasoning_budget", "answer_parser", "retry_policy", "tool_access"],
          declared: "MODEL_B",
        },
      ]),
    /SOURCE_INTEGRITY_FAILURE/
  );
});
