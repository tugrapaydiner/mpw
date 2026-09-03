// mints the two finalized publication bundles from the live engine.
import { writeFileSync } from "node:fs";
import { finalizePublication, verifyFinalizedBundle } from "../src/engine/mpwPublication.js";

for (const source of ["Lab A", "Lab B"] as const) {
  const bundle = finalizePublication(source);
  const check = verifyFinalizedBundle(bundle);
  if (check.status !== "VALID") throw new Error(`${source} bundle failed self-check`);
  const name = source === "Lab A" ? "lab-a.bundle.json" : "lab-b.bundle.json";
  writeFileSync(new URL(`../data/publications/${name}`, import.meta.url), `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`${name}: VALID ${bundle.manifestHash.slice(0, 12)}`);
}
