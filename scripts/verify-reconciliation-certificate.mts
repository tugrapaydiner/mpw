import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { verifyCanonicalReconciliationCertificate } from "../src/engine/mpwCanonicalCertificate.js";
import { verifyCertificateIntegrity } from "../src/research/certificate.js";

const args = process.argv.slice(2);
const integrityOnly = args.includes("--integrity-only");
const pathArg = args.find((arg) => !arg.startsWith("--"));
if (!pathArg) {
  console.error("usage: npm run verify:certificate -- <certificate.json> [--integrity-only]");
  process.exit(2);
}

try {
  const parsed = JSON.parse(await readFile(resolve(pathArg), "utf8")) as unknown;
  const result = integrityOnly
    ? verifyCertificateIntegrity(parsed)
    : verifyCanonicalReconciliationCertificate(parsed);
  console.log(JSON.stringify(result, null, 2));
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
