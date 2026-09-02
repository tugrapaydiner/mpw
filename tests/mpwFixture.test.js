import test from "node:test";
import assert from "node:assert/strict";
import {
  MODELS,
  STRATA,
  NUM_ITEMS,
  NUM_COMBINATIONS,
  EXPOSED_DIMENSIONS,
  LAB_A_PROTOCOL,
  LAB_B_PROTOCOL,
  buildBenchmarkItems,
  protocolForSubset,
  listAllProtocolCombinations,
} from "../src/mpwFixture.js";

test("benchmark is 400 paired items, 100 per stratum", () => {
  const items = buildBenchmarkItems();
  assert.equal(items.length, 400);
  assert.equal(NUM_ITEMS, 400);
  assert.equal(STRATA.length, 4);
  for (const s of STRATA) assert.equal(s.count, 100);
  const byStratum = {};
  for (const it of items) byStratum[it.stratum] = (byStratum[it.stratum] || 0) + 1;
  assert.deepEqual(Object.values(byStratum).sort((a, b) => a - b), [100, 100, 100, 100]);
  assert.deepEqual(
    STRATA.map((s) => s.name).sort(),
    ["instruction-following", "multi-step-reasoning", "quantitative-reasoning", "tool-reasoning"]
  );
  const ids = new Set(items.map((it) => it.id));
  assert.equal(ids.size, 400);
  assert.deepEqual(buildBenchmarkItems(), items);
  assert.equal(MODELS.length, 2);
  assert.ok(MODELS.includes("MODEL_A") && MODELS.includes("MODEL_B"));
});

test("four binary exposed dimensions, canonical Lab A vs Lab B values", () => {
  assert.deepEqual([...EXPOSED_DIMENSIONS].sort(), [
    "answer_parser",
    "reasoning_budget",
    "retry_policy",
    "tool_access",
  ]);
  assert.equal(LAB_A_PROTOCOL.reasoning_budget, 8192);
  assert.equal(LAB_B_PROTOCOL.reasoning_budget, 2048);
  assert.equal(LAB_A_PROTOCOL.answer_parser, "tolerant");
  assert.equal(LAB_B_PROTOCOL.answer_parser, "strict");
  assert.equal(LAB_A_PROTOCOL.retry_policy, "one-retry");
  assert.equal(LAB_B_PROTOCOL.retry_policy, "no-retry");
  assert.equal(LAB_A_PROTOCOL.tool_access, "standard");
  assert.equal(LAB_B_PROTOCOL.tool_access, "restricted");
});

test("subset adoption starts at Lab A and flips exactly the chosen dims", () => {
  assert.deepEqual(protocolForSubset([]), LAB_A_PROTOCOL);
  assert.deepEqual(protocolForSubset([...EXPOSED_DIMENSIONS]), LAB_B_PROTOCOL);
  const one = protocolForSubset(["answer_parser"]);
  assert.equal(one.answer_parser, "strict");
  assert.equal(one.reasoning_budget, 8192);
  assert.equal(one.retry_policy, "one-retry");
  assert.equal(one.tool_access, "standard");
  assert.throws(() => protocolForSubset(["nope"]));
  assert.throws(() => protocolForSubset(["answer_parser", "answer_parser"]));
});

test("all 16 exposed protocol combinations are enumerated once", () => {
  const combos = listAllProtocolCombinations();
  assert.equal(combos.length, 16);
  assert.equal(NUM_COMBINATIONS, 16);
  const keys = new Set(combos.map((c) => [...c.subset].sort().join("+")));
  assert.equal(keys.size, 16);
  assert.ok(combos.some((c) => c.subset.length === 0));
  assert.ok(combos.some((c) => c.subset.length === 4));
  const counts = [0, 0, 0, 0, 0];
  for (const c of combos) {
    counts[c.subset.length]++;
    assert.deepEqual(Object.keys(c.protocol).sort(), [...EXPOSED_DIMENSIONS].sort());
  }
  assert.deepEqual(counts, [1, 4, 6, 4, 1]);
});

test("fixture uses no hidden randomness source", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/mpwFixture.js", import.meta.url), "utf8");
  assert.ok(!src.includes("Math.random"), "fixture must not use Math.random");
  assert.ok(!src.includes("Date.now"), "fixture must not use wall-clock");
});
