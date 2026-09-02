// clock-free cert: body -> canonical -> sha256 -> id. ui meta stays outside.
import { createHash } from "node:crypto";
import { canonicalize, sortVerificationTable } from "./mpwManifest.js";
import { MODELS, STRATA, NUM_ITEMS, EXPOSED_DIMENSIONS, LAB_A_PROTOCOL, LAB_B_PROTOCOL } from "./mpwFixture.js";
import { SIM_SEED } from "./mpwSimulator.js";
import { BOOT_SEED, BOOT_REPLICATES } from "./mpwCore.js";
import { verifyCanonical, checkSourceIntegrity } from "./mpwVerify.js";

export function buildCertificateBody() {
  const integrity = checkSourceIntegrity();
  const v = verifyCanonical();
  const body = {
    kind: "ReconciliationCertificate",
    version: 1,
    fixture: {
      models: [...MODELS],
      strata: STRATA.map((s) => ({ ...s })),
      numItems: NUM_ITEMS,
      exposedDimensions: [...EXPOSED_DIMENSIONS].sort(),
      labA: { ...LAB_A_PROTOCOL },
      labB: { ...LAB_B_PROTOCOL },
    },
    methods: {
      simSeed: SIM_SEED,
      bootSeed: BOOT_SEED,
      replicates: BOOT_REPLICATES,
      uncertainty: "stratified-paired-bootstrap",
      conclusionRule: "MODEL_A iff ciLow>0, MODEL_B iff ciHigh<0, else INCONCLUSIVE",
    },
    sources: integrity.checks.map((c) => ({ ...c })),
    base: { subset: [], conclusion: v.base },
    target: { subset: [...EXPOSED_DIMENSIONS].sort(), conclusion: v.target },
    table: sortVerificationTable(v.table.map((r) => ({ ...r, subset: [...r.subset].sort() }))),
    witness: {
      minimumCardinality: v.minimumCardinality,
      minimumWitnesses: v.minimumWitnesses.map((s) => [...s].sort()),
      coMinimumWitnesses: v.coMinimumWitnesses.map((s) => [...s].sort()),
      checkedCount: v.checkedCount,
      totalSubsets: v.totalSubsets,
      exhaustive: v.exhaustive,
    },
    limits: {
      uncertainty: "resampling items with fixed category mix only",
      notClaimed: ["true cause", "universal causality", "dishonesty", "universal superiority"],
    },
  };
  return body;
}

export function certHash(canonical) {
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function buildCertificate() {
  const body = buildCertificateBody();
  const canonical = canonicalize(body);
  const certificateHash = certHash(canonical);
  return { body, canonical, certificateHash, certificateId: `mpw-${certificateHash.slice(0, 16)}` };
}

export function withUiMetadata(cert, ui) {
  return { ...cert, ui: { ...ui } };
}
