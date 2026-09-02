import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSubset, simulateForSubset, conclusionForSubset } from "../src/mpwSimulator.js";
import { findMinimumWitnesses } from "../src/mpwWitness.js";
import { EXPOSED_DIMENSIONS } from "../src/mpwFixture.js";

test("opposite winners for Lab A vs Lab B", () => {
  assert.equal(evaluateSubset([]).conclusion, "MODEL_A");
  assert.equal(evaluateSubset([...EXPOSED_DIMENSIONS]).conclusion, "MODEL_B");
});

test("only reasoning_budget alone flips", () => {
  const base = evaluateSubset([]);
  const ans = evaluateSubset(["answer_parser"]);
  assert.equal(ans.conclusion, "MODEL_A");
  assert.ok(Math.abs(ans.stats.mean - base.stats.mean) >= 0.03);
  assert.equal(evaluateSubset(["reasoning_budget"]).conclusion, "MODEL_B");
  assert.equal(evaluateSubset(["retry_policy"]).conclusion, "MODEL_A");
  assert.equal(evaluateSubset(["tool_access"]).conclusion, "MODEL_A");
});

test("same subset gives same items", () => {
  assert.deepEqual(simulateForSubset(["reasoning_budget"]), simulateForSubset(["reasoning_budget"]));
});

test("unique cardinality-1 MPW emerges from outcomes", () => {
  const target = conclusionForSubset([...EXPOSED_DIMENSIONS]);
  const res = findMinimumWitnesses({
    exposedDimensions: [...EXPOSED_DIMENSIONS],
    isSufficient: (s) => conclusionForSubset(s) === target,
  });
  assert.equal(res.minimumCardinality, 1);
  assert.deepEqual(res.minimumWitnesses, [["reasoning_budget"]]);
  assert.deepEqual(res.coMinimumWitnesses, [["reasoning_budget"]]);
});

test("simulator never hardcodes the answer", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/mpwSimulator.js", import.meta.url), "utf8");
  assert.ok(!src.includes("minimumCardinality"));
  assert.ok(!src.includes("INCONCLUSIVE"));
  assert.ok(!src.includes("2048"));
});
