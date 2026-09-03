// mints the canonical certificate fixture from the live engine.
import { writeFileSync, mkdirSync } from "node:fs";
import { buildCertificate, verifyCertificate } from "../src/engine/mpwCertificate.js";

mkdirSync(new URL("../data/certificates/", import.meta.url), { recursive: true });
const cert = buildCertificate();
const check = verifyCertificate(cert);
if (check.status !== "VALID") throw new Error("canonical certificate failed self-check");
writeFileSync(new URL("../data/certificates/canonical.json", import.meta.url), `${JSON.stringify(cert, null, 2)}\n`);
console.log(`canonical.json: VALID ${cert.certificateHash.slice(0, 12)} (${check.checks.length} checks)`);
