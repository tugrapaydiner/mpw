import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSubset, simulateForSubset, conclusionForSubset } from "../src/mpwSimulator.js";
import { findMinimumWitnesses } from "../src/mpwWitness.js";
import { EXPOSED_DIMENSIONS } from "../src/mpwFixture.js";

test("I get opposite winners for Lab A vs Lab B", () => {
  assert.equal(evaluateSubset([]).conclusion, "A>B");
  assert.equal(evaluateSubset([...EXPOSED_DIMENSIONS]).conclusion, "B>B");
});

test("I flip only on reasoning_budget alone", () => {
  const base = evaluateSubset([]);
  const ans = evaluateSubset(["answer_parser"]);
  const bud = evaluateSubset(["reasoning_budget"]);
  const ret = evaluateSubset(["retry_policy"]);
  const tool = evaluateSubset(["tool_access"]);
  assert.equal(ans.conclusion, "A>B");
  assert.ok(Math.abs(ans.stats.mean - base.stats.mean) >= 0.03);
  assert.equal(bud.conclusion, "B>B");
  assert.equal(ret.conclusion, "A>B");
  assert.equal(tool.conclusion, "A>B");
});

test("I reproduce the same items for the same subset", () => {
  assert.deepEqual(simulateForSubset(["reasoning_budget"]), simulateForSubset(["reasoning_budget"]));
});

test("my unique cardinality-1 MPW emerges from outcomes", () => {
  const target = conclusionForSubset([...EXPOSED_DIMENSIONS]);
  const res = findMinimumWitnesses({
    exposedDimensions: [...EXPOSED_DIMENSIONS],
    isSufficient: (s) => conclusionForSubset(s) === target,
  });
  assert.equal(res.minimumCardinality, 1);
  assert.deepEqual(res.minimumWitnesses, [["reasoning_budget"]]);
  assert.deepEqual(res.coMinimumWitnesses, [["reasoning_budget"]]);
});

test("I never hardcode the answer in my simulator", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/mpwSimulator.js", import.meta.url), "utf8");
  assert.ok(!src.includes("minimumCardinality"));
  assert.ok(!src.includes("minimumWitnesses"));
  assert.ok(!src.includes("A>B") && !src.includes("B>B"));
});
