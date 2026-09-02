import test from "node:test";
import assert from "node:assert/strict";
import { buildCertificate, buildCertificateBody } from "../src/mpwCertificate.js";
import { canonicalize } from "../src/mpwManifest.js";

test("same science twice gives same identity", () => {
  const a = buildCertificate();
  const b = buildCertificate();
  assert.equal(a.canonical, b.canonical);
  assert.equal(a.certificateHash, b.certificateHash);
  assert.equal(a.certificateId, b.certificateId);
  assert.ok(a.certificateId.includes(a.certificateHash.slice(0, 16)));
  assert.equal(a.canonical, canonicalize(a.body));
});

test("body has no clock, ui stays outside", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/mpwCertificate.js", import.meta.url), "utf8");
  assert.ok(!src.includes("Date.now"));
  const blob = JSON.stringify(buildCertificateBody()).toLowerCase();
  for (const k of ["displayedat", "downloadedat", "createdat", "timestamp", "wallclock"]) {
    assert.ok(!blob.includes(k));
  }
});

test("cert carries the canonical result", () => {
  const { body } = buildCertificate();
  assert.equal(body.witness.minimumCardinality, 1);
  assert.deepEqual(body.witness.minimumWitnesses, [["reasoning_budget"]]);
  assert.equal(body.table.length, 16);
});
