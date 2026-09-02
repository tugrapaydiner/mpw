import test from "node:test";
import assert from "node:assert/strict";
import { findMinimumWitnesses, binomialCoefficient } from "../src/mpwWitness.js";

const has = (list, want) =>
  list.some((w) => w.length === want.length && want.every((d) => w.includes(d)));

test("global minimum beats an inclusion-minimal distractor", () => {
  // {a,b} is inclusion-minimal but size 2; {c} alone works, so only {c} is an MPW.
  const res = findMinimumWitnesses({
    exposedDimensions: ["a", "b", "c"],
    isSufficient: (s) => s.includes("c") || (s.includes("a") && s.includes("b")),
  });
  assert.equal(res.minimumCardinality, 1);
  assert.equal(res.minimumWitnesses.length, 1);
  assert.deepEqual(res.minimumWitnesses[0], ["c"]);
  assert.deepEqual(res.coMinimumWitnesses, res.minimumWitnesses);
  assert.equal(res.status, "found");
  assert.equal(res.exhaustive, true);
});

test("returns every co-minimum witness at the global minimum", () => {
  const res = findMinimumWitnesses({
    exposedDimensions: ["a", "b", "c"],
    isSufficient: (s) =>
      (s.includes("a") && s.includes("b")) || (s.includes("a") && s.includes("c")),
  });
  assert.equal(res.minimumCardinality, 2);
  assert.equal(res.minimumWitnesses.length, 2);
  assert.ok(has(res.minimumWitnesses, ["a", "b"]));
  assert.ok(has(res.minimumWitnesses, ["a", "c"]));
  assert.deepEqual(res.coMinimumWitnesses, res.minimumWitnesses);
});

test("empty subset wins when base already reproduces the target", () => {
  const res = findMinimumWitnesses({
    exposedDimensions: ["x", "y"],
    isSufficient: () => true,
  });
  assert.equal(res.minimumCardinality, 0);
  assert.deepEqual(res.minimumWitnesses, [[]]);
  assert.equal(res.checkedCount, 1);
  assert.equal(res.totalSubsets, 4);
});

test("reports none-sufficient after checking everything", () => {
  const res = findMinimumWitnesses({
    exposedDimensions: ["x", "y"],
    isSufficient: () => false,
  });
  assert.equal(res.minimumCardinality, null);
  assert.deepEqual(res.minimumWitnesses, []);
  assert.deepEqual(res.coMinimumWitnesses, []);
  assert.equal(res.status, "none-sufficient");
  assert.equal(res.checkedCount, 4);
  assert.equal(res.totalSubsets, 4);
});

test("proof counts match exhaustive sums below and at the minimum", () => {
  // n=4, minimum at k=2 -> checked = C(4,0)+C(4,1)+C(4,2) = 1+4+6 = 11 of 16.
  const res = findMinimumWitnesses({
    exposedDimensions: ["a", "b", "c", "d"],
    isSufficient: (s) => s.includes("a") && s.includes("b"),
  });
  assert.equal(res.minimumCardinality, 2);
  assert.equal(res.checkedCount, 1 + 4 + 6);
  assert.equal(res.totalSubsets, 16);
  assert.deepEqual(res.searchedCardinalities, [0, 1, 2]);
  assert.equal(binomialCoefficient(4, 2), 6);
});

test("input order does not change the result", () => {
  const mk = (dims) =>
    findMinimumWitnesses({
      exposedDimensions: dims,
      isSufficient: (s) => s.includes("b"),
    });
  const r1 = mk(["b", "a", "c"]);
  const r2 = mk(["c", "a", "b"]);
  assert.deepEqual(r1.minimumWitnesses, r2.minimumWitnesses);
  assert.deepEqual(r1.sortedDimensions, ["a", "b", "c"]);
});

test("rejects bad inputs instead of guessing", () => {
  assert.throws(() =>
    findMinimumWitnesses({ exposedDimensions: ["a", "a"], isSufficient: () => false })
  );
  assert.throws(() =>
    findMinimumWitnesses({ exposedDimensions: [""], isSufficient: () => false })
  );
  assert.throws(() =>
    findMinimumWitnesses({ exposedDimensions: ["a"], isSufficient: () => 1 })
  );
  assert.throws(() =>
    findMinimumWitnesses({
      exposedDimensions: Array.from({ length: 21 }, (_, i) => `d${i}`),
      isSufficient: () => false,
    })
  );
});

test("witness module uses no hidden randomness source", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/mpwWitness.js", import.meta.url), "utf8");
  assert.ok(!src.includes("Math.random"), "witness search must not use Math.random");
  assert.ok(!src.includes("Date.now"), "witness search must not use wall-clock");
});
