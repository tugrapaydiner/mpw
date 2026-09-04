import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  RECONCILIATION_CERTIFICATE_CANONICALIZATION,
  RECONCILIATION_CERTIFICATE_HASH_ALGORITHM,
  RECONCILIATION_CERTIFICATE_KIND,
  RECONCILIATION_CERTIFICATE_SCHEMA_VERSION,
} from "../../src/research/certificate";
import {
  STATIC_GRID_PACKAGE_CANONICALIZATION,
  STATIC_GRID_PACKAGE_HASH_ALGORITHM,
  STATIC_GRID_PACKAGE_KIND,
  STATIC_GRID_PACKAGE_VERSION,
} from "../../src/research/staticGridPackage";

interface SchemaDocument {
  $schema?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  $defs?: Record<string, unknown>;
}

async function schema(path: string): Promise<SchemaDocument> {
  return JSON.parse(
    await readFile(new URL(`../../${path}`, import.meta.url), "utf8")
  ) as SchemaDocument;
}

function bodyProperties(document: SchemaDocument): Record<string, unknown> {
  const body = document.$defs?.body as { properties?: Record<string, unknown> } | undefined;
  if (!body?.properties) throw new Error("schema body properties missing");
  return body.properties;
}

describe("portable schema drift guards", () => {
  it("keeps reconciliation certificate schema constants aligned with runtime", async () => {
    const document = await schema("schemas/reconciliation-certificate-v2.schema.json");
    expect(document.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(document.required?.slice().sort()).toEqual(
      ["body", "canonical", "certificateHash", "certificateId"].sort()
    );
    const properties = bodyProperties(document) as {
      kind: { const: string };
      schemaVersion: { const: number };
      canonicalization: { const: string };
      hashAlgorithm: { const: string };
    };
    expect(properties.kind.const).toBe(RECONCILIATION_CERTIFICATE_KIND);
    expect(properties.schemaVersion.const).toBe(
      RECONCILIATION_CERTIFICATE_SCHEMA_VERSION
    );
    expect(properties.canonicalization.const).toBe(
      RECONCILIATION_CERTIFICATE_CANONICALIZATION
    );
    expect(properties.hashAlgorithm.const).toBe(
      RECONCILIATION_CERTIFICATE_HASH_ALGORITHM
    );
  });

  it("keeps static grid package schema constants aligned with runtime", async () => {
    const document = await schema("schemas/static-protocol-grid-package-v1.schema.json");
    expect(document.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(document.required?.slice().sort()).toEqual(
      ["body", "canonical", "packageHash", "packageId"].sort()
    );
    const properties = bodyProperties(document) as {
      kind: { const: string };
      schemaVersion: { const: number };
      canonicalization: { const: string };
      hashAlgorithm: { const: string };
    };
    expect(properties.kind.const).toBe(STATIC_GRID_PACKAGE_KIND);
    expect(properties.schemaVersion.const).toBe(STATIC_GRID_PACKAGE_VERSION);
    expect(properties.canonicalization.const).toBe(
      STATIC_GRID_PACKAGE_CANONICALIZATION
    );
    expect(properties.hashAlgorithm.const).toBe(
      STATIC_GRID_PACKAGE_HASH_ALGORITHM
    );
  });
});
