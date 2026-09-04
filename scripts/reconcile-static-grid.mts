import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  reconcileStaticProtocolGridPackage,
  verifyStaticProtocolGridPackage,
  type StaticProtocolGridPackage,
} from "../src/research/staticGridPackage.js";
import type { ReconciliationDirection } from "../src/research/reconciliation.js";

const args = process.argv.slice(2);
const pathArg = args.find((argument) => !argument.startsWith("--"));
const integrityOnly = args.includes("--integrity-only");
const directionArgument = args.find((argument) => argument.startsWith("--direction="));
const directionValue = directionArgument?.slice("--direction=".length);

if (!pathArg) {
  console.error(
    "usage: npx vite-node scripts/reconcile-static-grid.mts <package.json> " +
      "[--integrity-only] [--direction=A_TO_B|B_TO_A|both]"
  );
  process.exit(2);
}

if (
  directionValue !== undefined &&
  directionValue !== "A_TO_B" &&
  directionValue !== "B_TO_A" &&
  directionValue !== "both"
) {
  console.error(`invalid --direction value: ${directionValue}`);
  process.exit(2);
}

function summarize(
  packageObject: StaticProtocolGridPackage,
  direction: ReconciliationDirection
) {
  const result = reconcileStaticProtocolGridPackage(packageObject, {
    direction,
    searchMode: "landscape",
  });
  return {
    direction,
    baseConclusion: result.base.conclusion,
    targetConclusion: result.target.conclusion,
    differences: result.differences,
    exposedDimensions: result.exposedDimensions,
    omittedDifferences: result.omittedDifferences,
    minimumCardinality: result.search.minimumCardinality,
    minimumWitnesses: result.search.minimumWitnesses,
    evaluatedSubsets: result.search.evaluatedSubsets,
    totalSubsetsExact: result.search.totalSubsetsExact,
    proof: result.search.proof,
  };
}

try {
  const parsed = JSON.parse(await readFile(resolve(pathArg), "utf8")) as unknown;
  const integrity = verifyStaticProtocolGridPackage(parsed);
  if (integrityOnly) {
    console.log(JSON.stringify(integrity, null, 2));
  } else {
    const packageObject = parsed as StaticProtocolGridPackage;
    const directions: ReconciliationDirection[] =
      directionValue === "A_TO_B" || directionValue === "B_TO_A"
        ? [directionValue]
        : ["A_TO_B", "B_TO_A"];
    console.log(
      JSON.stringify(
        {
          integrity,
          reconciliations: directions.map((direction) => summarize(packageObject, direction)),
        },
        null,
        2
      )
    );
  }
} catch (error) {
  const candidate = error as Error & { code?: string; checks?: unknown };
  console.error(
    JSON.stringify(
      {
        status: "INVALID",
        code: candidate.code ?? "UNEXPECTED_ERROR",
        error: candidate.message,
        checks: candidate.checks ?? [],
      },
      null,
      2
    )
  );
  process.exit(1);
}
