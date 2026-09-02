import test from "node:test";
import assert from "node:assert/strict";
import { TOOLS } from "../src/mpwTools.js";
import { dispute, runCounterfactual, inspectEvidence, witness } from "../src/mpwService.js";

const byName = (n) => TOOLS.find((t) => t.name === n);

test("exactly four tools", () => {
  assert.deepEqual(TOOLS.map((t) => t.name).sort(), [
    "inspect_evidence",
    "read_dispute",
    "run_counterfactual",
    "verify_witness",
  ]);
});

test("descriptions leak nothing + no hidden workflow", () => {
  for (const t of TOOLS) {
    assert.ok(!t.description.includes("reasoning_budget"), t.name);
    assert.ok(!/step 1|must first|always call/i.test(t.description), t.name);
  }
});

test("schemas are narrow", () => {
  for (const t of TOOLS) {
    assert.equal(t.inputSchema.additionalProperties, false);
    assert.ok(Array.isArray(t.inputSchema.required));
  }
  assert.deepEqual(byName("run_counterfactual").inputSchema.required, ["subset"]);
  assert.deepEqual(byName("verify_witness").inputSchema.required, ["candidateSubset"]);
});

test("handlers validate on their own", async () => {
  const run = byName("run_counterfactual").execute;
  assert.equal((await run({ subset: ["nope"] })).ok, false);
  assert.equal((await run({ subset: [], extra: 1 })).ok, false);
  const ev = byName("inspect_evidence").execute;
  assert.equal((await ev({ subset: [], limit: 99 })).ok, false);
  const vw = byName("verify_witness").execute;
  assert.equal((await vw({ candidateSubset: ["nope"] })).ok, false);
});

test("tools + ui share the same service", async () => {
  const read = byName("read_dispute").execute;
  assert.deepEqual((await read({})).dispute, dispute());
  const run = byName("run_counterfactual").execute;
  assert.deepEqual((await run({ subset: [] })).result, runCounterfactual([]));
  const ev = byName("inspect_evidence").execute;
  assert.deepEqual(
    (await ev({ subset: [], limit: 5 })).result,
    inspectEvidence([], { stratum: null, limit: 5 })
  );
  const vw = byName("verify_witness").execute;
  assert.deepEqual((await vw({ candidateSubset: [] })).result, witness([]));
});

test("evidence stays small", async () => {
  const ev = byName("inspect_evidence").execute;
  const r = (await ev({ subset: [] })).result;
  assert.ok(r.sample.length <= 5);
  assert.equal(r.strata.length, 4);
});
