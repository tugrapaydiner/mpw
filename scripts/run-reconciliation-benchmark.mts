import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runReconciliationBenchmark } from "../src/research/benchmark.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const output = resolve(root, "data/benchmarks/reconciliation-results.json");
const summary = runReconciliationBenchmark();
const serialized = `${JSON.stringify(summary, null, 2)}\n`;

if (process.argv.includes("--write")) {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, serialized, "utf8");
  console.log(`wrote ${output}`);
} else {
  console.log(serialized.trimEnd());
}

if (!summary.allPassed) process.exitCode = 1;
