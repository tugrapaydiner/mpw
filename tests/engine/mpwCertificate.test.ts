import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { buildCertificate, buildCertificateBody } from "../../src/engine/mpwCertificate";
import { canonicalize } from "../../src/engine/mpwManifest";

describe("certificate", () => {
  it("same science twice gives same identity", () => {
    const a = buildCertificate();
    const b = buildCertificate();
    expect(a.canonical).toBe(b.canonical);
    expect(a.certificateHash).toBe(b.certificateHash);
    expect(a.certificateId).toBe(b.certificateId);
    expect(a.certificateId.includes(a.certificateHash.slice(0, 16))).toBe(true);
    expect(a.canonical).toBe(canonicalize(a.body));
  });

  it("body has no clock, ui stays outside", async () => {
    const src = await readFile(new URL("../../src/engine/mpwCertificate.ts", import.meta.url), "utf8");
    expect(src.includes("Date.now")).toBe(false);
    const blob = JSON.stringify(buildCertificateBody()).toLowerCase();
    for (const k of ["displayedat", "downloadedat", "createdat", "timestamp", "wallclock"]) {
      expect(blob.includes(k)).toBe(false);
    }
  });

  it("cert carries the canonical result", () => {
    const { body } = buildCertificate();
    const w = body["witness"] as { minimumCardinality: number; minimumWitnesses: string[][] };
    const table = body["table"] as unknown[];
    expect(w.minimumCardinality).toBe(1);
    expect(w.minimumWitnesses).toEqual([["reasoning_budget"]]);
    expect(table.length).toBe(16);
  });
});
