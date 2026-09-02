import test from "node:test";
import assert from "node:assert/strict";
import { stratifiedPairedBootstrap, classifyBootstrap, BOOT_SEED } from "../src/mpwCore.js";

const mk = (rows) => rows.map((r, i) => ({ id: `item-${i}`, stratum: r[0], a: r[1], b: r[2] }));

test("deterministic for same input", () => {
  const out = mk([
    ["s1", 1, 0],
    ["s1", 0, 0],
    ["s2", 1, 1],
    ["s2", 0, 1],
  ]);
  const r1 = stratifiedPairedBootstrap(out, { seed: BOOT_SEED, replicates: 1000 });
  const r2 = stratifiedPairedBootstrap(out, { seed: BOOT_SEED, replicates: 1000 });
  assert.deepEqual(r1, r2);
  assert.equal(r1.method, "stratified-paired-bootstrap");
});

test("CI-only rule never uses the point estimate", () => {
  assert.equal(classifyBootstrap({ ciLow: -0.1, ciHigh: 0.1 }).conclusion, "INCONCLUSIVE");
  assert.equal(classifyBootstrap({ ciLow: 0.01, ciHigh: 0.2 }).conclusion, "MODEL_A");
  assert.equal(classifyBootstrap({ ciLow: -0.2, ciHigh: -0.01 }).conclusion, "MODEL_B");
});

test("stratified resampling stays within stratum sizes", () => {
  const out = [];
  for (let i = 0; i < 100; i++) out.push({ id: `a-${i}`, stratum: "s1", a: 1, b: 0 });
  for (let i = 0; i < 100; i++) out.push({ id: `b-${i}`, stratum: "s2", a: 0, b: 1 });
  const r = stratifiedPairedBootstrap(out, { seed: BOOT_SEED, replicates: 1000 });
  assert.equal(r.n, 200);
  assert.ok(r.ciLow <= r.mean && r.mean <= r.ciHigh);
});
