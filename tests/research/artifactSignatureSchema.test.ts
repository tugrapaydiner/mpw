import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  ARTIFACT_IDENTITY_STATEMENT_KIND,
  ARTIFACT_IDENTITY_STATEMENT_VERSION,
  ARTIFACT_SIGNATURE_ALGORITHM,
  ARTIFACT_SIGNATURE_KIND,
  ARTIFACT_SIGNATURE_VERSION,
} from "../../src/research/artifactSignature";

describe("signed artifact identity schema drift", () => {
  it("keeps portable schema constants aligned with runtime", async () => {
    const schema = JSON.parse(
      await readFile(
        new URL(
          "../../schemas/signed-artifact-identity-v1.schema.json",
          import.meta.url
        ),
        "utf8"
      )
    ) as {
      properties: Record<string, { const?: unknown }>;
      $defs: {
        statement: { properties: Record<string, { const?: unknown }> };
      };
      required: string[];
    };
    expect(schema.required.slice().sort()).toEqual(
      [
        "kind",
        "version",
        "algorithm",
        "statement",
        "canonicalStatement",
        "keyFingerprint",
        "signatureBase64Url",
        "signatureId",
      ].sort()
    );
    expect(schema.properties.kind.const).toBe(ARTIFACT_SIGNATURE_KIND);
    expect(schema.properties.version.const).toBe(ARTIFACT_SIGNATURE_VERSION);
    expect(schema.properties.algorithm.const).toBe(ARTIFACT_SIGNATURE_ALGORITHM);
    expect(schema.$defs.statement.properties.kind.const).toBe(
      ARTIFACT_IDENTITY_STATEMENT_KIND
    );
    expect(schema.$defs.statement.properties.version.const).toBe(
      ARTIFACT_IDENTITY_STATEMENT_VERSION
    );
  });
});
