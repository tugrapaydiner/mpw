import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runProtocolSearchBaselineStudy } from "../src/research/baselineStudy.js";

const report = runProtocolSearchBaselineStudy();
const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, "../data/benchmarks/protocol-search-baselines.json");

if (process.argv.includes("--write")) {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

const compact = {
  kind: report.kind,
  version: report.version,
  authoredCases: report.authoredAdversarialCases.cases,
  completeCensusLandscapes: report.completeThreeDimensionCensus.landscapes,
  authored: report.authoredAdversarialCases.aggregate,
  census: report.completeThreeDimensionCensus.aggregate,
  output: process.argv.includes("--write") ? output : null,
};
console.log(JSON.stringify(compact, null, 2));
