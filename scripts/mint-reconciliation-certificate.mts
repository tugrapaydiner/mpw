import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCanonicalReconciliationCertificate } from "../src/engine/mpwCanonicalCertificate.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const output = resolve(root, "data/certificates/canonical-v2.json");
const certificate = buildCanonicalReconciliationCertificate({
  baseLab: "A",
  candidate: ["reasoning_budget"],
});
const serialized = `${JSON.stringify(certificate, null, 2)}\n`;

if (process.argv.includes("--write")) {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, serialized, "utf8");
  console.log(`wrote ${output}`);
} else {
  console.log(serialized.trimEnd());
}
