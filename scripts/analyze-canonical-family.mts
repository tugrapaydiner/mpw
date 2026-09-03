import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCanonicalProtocolFamily } from "../src/engine/mpwFamilyAnalysis.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const output = resolve(root, "data/analysis/canonical-family-inference.json");
const report = analyzeCanonicalProtocolFamily();

if (process.argv.includes("--write")) {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

const compact = {
  kind: report.kind,
  version: report.version,
  familySize: report.family.familySize,
  items: report.family.n,
  replicates: report.family.replicates,
  criticalValue: report.family.criticalValue,
  pointwiseCompatibility: report.pointwiseCompatibility,
  pointwise: {
    A_TO_B: {
      base: report.reconciliations.pointwise.A_TO_B.baseConclusion,
      target: report.reconciliations.pointwise.A_TO_B.targetConclusion,
      minimumWitnesses: report.reconciliations.pointwise.A_TO_B.search.minimumWitnesses,
    },
    B_TO_A: {
      base: report.reconciliations.pointwise.B_TO_A.baseConclusion,
      target: report.reconciliations.pointwise.B_TO_A.targetConclusion,
      minimumWitnesses: report.reconciliations.pointwise.B_TO_A.search.minimumWitnesses,
    },
  },
  simultaneous: {
    A_TO_B: {
      base: report.reconciliations.simultaneous.A_TO_B.baseConclusion,
      target: report.reconciliations.simultaneous.A_TO_B.targetConclusion,
      minimumWitnesses: report.reconciliations.simultaneous.A_TO_B.search.minimumWitnesses,
    },
    B_TO_A: {
      base: report.reconciliations.simultaneous.B_TO_A.baseConclusion,
      target: report.reconciliations.simultaneous.B_TO_A.targetConclusion,
      minimumWitnesses: report.reconciliations.simultaneous.B_TO_A.search.minimumWitnesses,
    },
  },
  output: process.argv.includes("--write") ? output : null,
};
console.log(JSON.stringify(compact, null, 2));
