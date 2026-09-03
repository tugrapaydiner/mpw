import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import {
  finalizePublication,
  buildFinalizedBundle,
  verifyFinalizedBundle,
  type FinalizedPublicationBundle,
} from "../../src/engine/mpwPublication";
import { buildBenchmarkItems } from "../../src/engine/mpwFixture";
import { hashManifestBody, contentHash } from "../../src/engine/mpwProvenance";
import type { JsonValue } from "../../src/engine/mpwManifest";

const clone = (b: FinalizedPublicationBundle): FinalizedPublicationBundle =>
  JSON.parse(JSON.stringify(b)) as FinalizedPublicationBundle;

// reverses every object key order recursively: semantically identical.
const reorder = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(reorder);
  if (typeof v === "object" && v !== null) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).reverse()) {
      out[k] = reorder((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
};

describe("publication bundles", () => {
  it("committed Lab A/B bundles load VALID", async () => {
    for (const f of ["lab-a.bundle.json", "lab-b.bundle.json"]) {
      const bundle = JSON.parse(await readFile(new URL(`../../data/publications/${f}`, import.meta.url), "utf8"));
      const r = verifyFinalizedBundle(bundle);
      expect(r.status).toBe("VALID");
      expect(r.checks.every((c) => c.pass)).toBe(true);
    }
  });

  it("bundle carries every required field, no trademarks", async () => {
    const bundle = JSON.parse(
      await readFile(new URL("../../data/publications/lab-a.bundle.json", import.meta.url), "utf8")
    ) as FinalizedPublicationBundle;
    expect(bundle.core.schemaVersion).toBe(1);
    expect(bundle.core.publicationId).toBe("mpw-pub-lab-a/1");
    expect(bundle.core.publisher).toBe("Lab A");
    expect(bundle.core.benchmark.id).toBe("mpw-bench");
    expect(bundle.core.models).toEqual(["MODEL_A", "MODEL_B"]);
    expect(bundle.evidence.receiptCount).toBe(800);
    expect(bundle.evidence.itemCoverage).toBe(400);
    expect(bundle.core.declared.conclusion).toBe("MODEL_A");
    expect(bundle.core.sourceIntegrity).toBe("OK");
    const blob = JSON.stringify(bundle).toLowerCase();
    for (const brand of ["openai", "google", "anthropic", "meta", "microsoft"]) {
      expect(blob.includes(brand)).toBe(false);
    }
  });

  it("semantic reorder stays VALID (keys and receipt-irrelevant order)", () => {
    const valid = finalizePublication("Lab A");
    expect(verifyFinalizedBundle(reorder(valid) as never).status).toBe("VALID");
  });

  it("one receipt changed -> INVALID", () => {
    const tampered = buildFinalizedBundle({
      source: "Lab A",
      flipReceipt: (r) => ({ ...r, finalCorrect: !r.finalCorrect }),
    });
    expect(() => verifyFinalizedBundle(tampered)).toThrow(/BUNDLE_INVALID/);
  });

  it("protocol changed -> INVALID", () => {
    const b = clone(finalizePublication("Lab A"));
    (b.core.protocol as Record<string, unknown>).reasoning_budget = 4096;
    expect(() => verifyFinalizedBundle(b)).toThrow(/BUNDLE_INVALID/);
  });

  it("declared score changed -> INVALID", () => {
    const b = clone(finalizePublication("Lab A"));
    b.core.declared.scoreA = 0.5;
    expect(() => verifyFinalizedBundle(b)).toThrow(/BUNDLE_INVALID/);
  });

  it("benchmark item changed -> INVALID", () => {
    const items = buildBenchmarkItems();
    const changed = items.map((it, i) => (i === 0 ? { ...it, id: "item-evil" } : it));
    const tampered = buildFinalizedBundle({ source: "Lab A", items: changed });
    expect(() => verifyFinalizedBundle(tampered)).toThrow(/BUNDLE_INVALID/);
  });

  it("declared score changed with re-minted hashes still fails at the science gate", () => {
    const b = clone(finalizePublication("Lab A"));
    b.core.declared.scoreA = 0.5;
    b.hashes.manifestBodyHash = hashManifestBody(b.core as unknown as Record<string, JsonValue>);
    b.manifestHash = contentHash({
      core: b.core as unknown as JsonValue,
      evidence: b.evidence as unknown as JsonValue,
      hashes: b.hashes as unknown as JsonValue,
    });
    expect(() => verifyFinalizedBundle(b)).toThrow(/declared scoreA mismatch/);
  });

  it("invalid hash -> INVALID", () => {
    const b = clone(finalizePublication("Lab B"));
    b.manifestHash = "0".repeat(64);
    expect(() => verifyFinalizedBundle(b)).toThrow(/BUNDLE_INVALID/);
    const c = clone(finalizePublication("Lab B"));
    c.hashes.evidenceHash = "f".repeat(64);
    expect(() => verifyFinalizedBundle(c)).toThrow(/BUNDLE_INVALID/);
  });

  it("missing evidence -> INVALID", () => {
    const b = clone(finalizePublication("Lab A")) as unknown as Record<string, unknown>;
    delete b.evidence;
    expect(() => verifyFinalizedBundle(b)).toThrow(/BUNDLE_INVALID/);
  });
});
