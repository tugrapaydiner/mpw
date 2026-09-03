// clock-free cert: body -> canonical -> sha256 -> id. ui meta stays outside.
import { canonicalize, sortVerificationTable } from "./mpwManifest.js";
import type { JsonValue } from "./mpwManifest.js";
import { hashCertificateBody } from "./mpwProvenance.js";
import { sha256Hex } from "./sha256.js";
import { MODELS, STRATA, NUM_ITEMS, EXPOSED_DIMENSIONS, LAB_A_PROTOCOL, LAB_B_PROTOCOL } from "./mpwFixture.js";
import { SIM_SEED } from "./mpwSimulator.js";
import { BOOT_SEED, BOOT_REPLICATES } from "./mpwCore.js";
import { verifyCanonical, checkSourceIntegrity } from "./mpwVerify.js";

export function buildCertificateBody(): Record<string, JsonValue> {
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
    base: { subset: [] as string[], conclusion: v.base },
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
  return body as unknown as Record<string, JsonValue>;
}

export function certHash(canonical: string): string {
  return sha256Hex(canonical);
}

export function buildCertificate() {
  const body = buildCertificateBody();
  const canonical = canonicalize(body);
  const certificateHash = hashCertificateBody(body);
  return { body, canonical, certificateHash, certificateId: `mpw-${certificateHash.slice(0, 16)}` };
}

export function withUiMetadata<T extends object, U extends object>(cert: T, ui: U): T & { ui: U } {
  return { ...cert, ui: { ...ui } };
}
