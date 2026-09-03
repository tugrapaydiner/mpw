import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { MODELS, STRATA, NUM_ITEMS, EXPOSED_DIMENSIONS, LAB_A_PROTOCOL, LAB_B_PROTOCOL } from "../../src/engine/mpwFixture";

describe("data fixtures", () => {
  it("json files match engine constants", async () => {
    const bench = JSON.parse(await readFile(new URL("../../data/fixtures/benchmark.json", import.meta.url), "utf8"));
    expect(bench.models).toEqual(MODELS);
    expect(bench.strata).toEqual(STRATA);
    expect(bench.numItems).toBe(NUM_ITEMS);
    expect(bench.exposedDimensions).toEqual(EXPOSED_DIMENSIONS);
    const labA = JSON.parse(await readFile(new URL("../../data/publications/lab-a.json", import.meta.url), "utf8"));
    const labB = JSON.parse(await readFile(new URL("../../data/publications/lab-b.json", import.meta.url), "utf8"));
    expect(labA.protocol).toEqual(LAB_A_PROTOCOL);
    expect(labB.protocol).toEqual(LAB_B_PROTOCOL);
    expect(labA.stats.conclusion).toBe("MODEL_A");
    expect(labB.stats.conclusion).toBe("MODEL_B");
    expect(labA.benchmark.universe).toBe(labB.benchmark.universe);
  });
});
