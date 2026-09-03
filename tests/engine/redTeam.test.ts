import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { buildBenchmarkItems, LAB_A_PROTOCOL } from "../../src/engine/mpwFixture";
import { evaluateSubset, simulateForProtocol } from "../../src/engine/mpwSimulator";
import { analyzeEvidence } from "../../src/engine/mpwCore";
import { checkSourceIntegrity, checkPublicationIntegrity } from "../../src/engine/mpwVerify";
import { runCounterfactual } from "../../src/engine/mpwCounterfactual";
import {
  buildFinalizedBundle,
  verifyFinalizedBundle,
  finalizePublication,
  type FinalizedPublicationBundle,
} from "../../src/engine/mpwPublication";
import { hashManifestBody, contentHash } from "../../src/engine/mpwProvenance";
import type { JsonValue } from "../../src/engine/mpwManifest";
import {
  buildCertificate,
  canonicalCertificateInputs,
  verifyCertificate,
} from "../../src/engine/mpwCertificate";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// re-mint envelope hashes around a mutated core: only a structural gate can
// still catch the tamper. proves the gate, not the hash, does the work.
function remint(bundle: FinalizedPublicationBundle): FinalizedPublicationBundle {
  const b = clone(bundle);
  b.hashes.manifestBodyHash = hashManifestBody(b.core as unknown as Record<string, JsonValue>);
  b.manifestHash = contentHash({
    core: b.core as unknown as JsonValue,
    evidence: b.evidence as unknown as JsonValue,
    hashes: b.hashes as unknown as JsonValue,
  });
  return b;
}

describe("red team mutations", () => {
  it("hidden fifth dimension fails even with re-minted hashes", () => {
    const b = clone(finalizePublication("Lab A"));
    (b.core.protocol as Record<string, unknown>).telepathy = "full";
    expect(() => verifyFinalizedBundle(remint(b))).toThrow(/protocol shape mismatch/);
    const inputs = clone(canonicalCertificateInputs());
    ((inputs.sourceA.protocol as Record<string, unknown>).telepathy as unknown) = "full";
    expect(() => verifyCertificate(buildCertificate(inputs))).toThrow(/CERT_INVALID/);
  });

  it("altered item propagates to bundle rejection", () => {
    const items = buildBenchmarkItems();
    const changed = items.map((x, i) => (i === 7 ? { ...x, id: "item-zzz" } : x));
    expect(() => verifyFinalizedBundle(buildFinalizedBundle({ source: "Lab A", items: changed }))).toThrow(
      /BUNDLE_INVALID/
    );
  });

  it("altered protocol field moves the science, flipped declaration rejected", async () => {
    const base = analyzeEvidence(simulateForProtocol({ ...LAB_A_PROTOCOL }));
    const mutated = analyzeEvidence(simulateForProtocol({ ...LAB_A_PROTOCOL, reasoning_budget: 100 }));
    expect(mutated.scoreA).not.toBe(base.scoreA);
    const b = clone(finalizePublication("Lab A"));
    b.core.declared.conclusion = "MODEL_B";
    expect(() => verifyFinalizedBundle(remint(b))).toThrow(/BUNDLE_INVALID/);
    expect(() =>
      checkSourceIntegrity([{ source: "Lab A", subset: [], declared: "MODEL_B" }])
    ).toThrow(/SOURCE_INTEGRITY_FAILURE/);
    const labA = JSON.parse(await readFile(new URL("../../data/publications/lab-a.json", import.meta.url), "utf8"));
    expect(() =>
      checkPublicationIntegrity({ ...labA, stats: { ...labA.stats, conclusion: "MODEL_B" } })
    ).toThrow(/SOURCE_INTEGRITY_FAILURE/);
  });

  it("parser behavior flows into results, never bypassed", () => {
    const base = evaluateSubset([]);
    const parserOnly = evaluateSubset(["answer_parser"]);
    expect(parserOnly.stats.mean).not.toBe(base.stats.mean);
    expect(parserOnly.protocol.answer_parser).toBe("strict");
    expect(base.protocol.answer_parser).toBe("tolerant");
    const r = runCounterfactual({ baseLab: "A", sourceLab: "B", subset: ["answer_parser"] });
    expect(r.stats.mean).toBe(parserOnly.stats.mean);
  });

  it("removed evidence collapses every layer", () => {
    expect(() => analyzeEvidence([])).toThrow(/zero items/);
    const inputs = clone(canonicalCertificateInputs());
    inputs.coverage = { expectedItems: 400, accountedItems: 0, percent: 0 };
    expect(() => verifyCertificate(buildCertificate(inputs))).toThrow(/CERT_INVALID/);
  });

  it("no rounding anywhere in the scientific values", () => {
    const a = analyzeEvidence(simulateForProtocol({ ...LAB_A_PROTOCOL }));
    for (const v of [a.scoreA, a.scoreB, a.delta, a.ciLow, a.ciHigh]) {
      expect(Number.isInteger(v * 400)).toBe(true);
    }
  });
});
