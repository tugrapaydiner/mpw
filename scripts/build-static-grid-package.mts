import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildStaticProtocolGridPackage,
  verifyStaticProtocolGridPackage,
  type BuildStaticProtocolGridPackageOptions,
} from "../src/research/staticGridPackage.js";

const args = process.argv.slice(2);
const positional = args.filter((argument) => !argument.startsWith("--"));
const inputPath = positional[0];
const outputPath = positional[1];

if (!inputPath || !outputPath) {
  console.error(
    "usage: npx vite-node scripts/build-static-grid-package.mts " +
      "<package-input.json> <package-output.json>"
  );
  process.exit(2);
}

try {
  const parsed = JSON.parse(await readFile(resolve(inputPath), "utf8")) as
    BuildStaticProtocolGridPackageOptions;
  const packageObject = buildStaticProtocolGridPackage(parsed);
  const verification = verifyStaticProtocolGridPackage(packageObject);
  const destination = resolve(outputPath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(packageObject, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: "WRITTEN_AND_VERIFIED",
        output: destination,
        packageId: packageObject.packageId,
        packageHash: packageObject.packageHash,
        worlds: packageObject.body.worlds.length,
        checks: verification.checks,
      },
      null,
      2
    )
  );
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
