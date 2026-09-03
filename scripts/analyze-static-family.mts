import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { analyzeStaticEvaluationFamily, type StaticInferenceMode } from "../src/research/staticFamily.js";

const args = process.argv.slice(2);
const pathArg = args.find((arg) => !arg.startsWith("--"));
const modeArg = args.find((arg) => arg.startsWith("--mode="));
const mode = (modeArg?.slice("--mode=".length) ?? "simultaneous") as StaticInferenceMode;

if (!pathArg) {
  console.error("usage: npx vite-node scripts/analyze-static-family.mts <package.json> [--mode=pointwise|simultaneous]");
  process.exit(2);
}

try {
  const input = JSON.parse(await readFile(resolve(pathArg), "utf8")) as unknown;
  const result = analyzeStaticEvaluationFamily(input, mode);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ status: "INVALID", error: (error as Error).message }, null, 2));
  process.exit(1);
}
