import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { checkPublicationIntegrity, checkCrossSourceScope } from "../../src/engine/mpwVerify";
import { evaluateSubset } from "../../src/engine/mpwSimulator";
import { LAB_B_PROTOCOL } from "../../src/engine/mpwFixture";
import { simulateForProtocol } from "../../src/engine/mpwSimulator";

const load = async (f: string) => JSON.parse(await readFile(new URL(`../../data/publications/${f}`, import.meta.url), "utf8"));

describe("source integrity", () => {
  it("valid sources pass full-precision self-consistency", async () => {
    const a = await load("lab-a.json");
    const b = await load("lab-b.json");
    expect(checkPublicationIntegrity(a).status).toBe("OK");
    expect(checkPublicationIntegrity(b).status).toBe("OK");
    expect(checkCrossSourceScope(a, b).status).toBe("OK");
  });

  it("tampered declared score fails", async () => {
    const a = await load("lab-a.json");
    expect(() => checkPublicationIntegrity({ ...a, stats: { ...a.stats, scoreA: 0.5 } })).toThrow(/SOURCE_INTEGRITY_FAILURE/);
  });

  it("wrong protocol declaration fails", async () => {
    const a = await load("lab-a.json");
    expect(() =>
      checkPublicationIntegrity({ ...a, protocol: { ...a.protocol, answer_parser: "strict" } })
    ).toThrow(/SOURCE_INTEGRITY_FAILURE/);
  });

  it("wrong benchmark version fails", async () => {
    const a = await load("lab-a.json");
    expect(() =>
      checkPublicationIntegrity({ ...a, benchmark: { ...a.benchmark, version: 2 } })
    ).toThrow(/SOURCE_INTEGRITY_FAILURE/);
  });

  it("missing item universe fails", async () => {
    const a = await load("lab-a.json");
    expect(() =>
      checkPublicationIntegrity({ ...a, benchmark: { ...a.benchmark, universe: "deadbeef" } })
    ).toThrow(/universe/);
  });

  it("mismatched model fails", async () => {
    const a = await load("lab-a.json");
    expect(() => checkPublicationIntegrity({ ...a, models: ["MODEL_A", "MODEL_C"] })).toThrow(/model/);
  });

  it("hidden fifth protocol difference fails scope", async () => {
    const a = await load("lab-a.json");
    const b = await load("lab-b.json");
    const sneaky = { ...b, protocol: { ...b.protocol, temperature: 0.7 } };
    expect(() => checkCrossSourceScope(a, sneaky)).toThrow(/hidden|keys/);
    const partial = { ...b, protocol: { ...a.protocol, reasoning_budget: 2048 } };
    expect(() => checkCrossSourceScope(a, partial)).toThrow(/exactly the four/);
  });

  it("full hybrid reproduces Lab B semantically, not just the headline", async () => {
    const b = await load("lab-b.json");
    const hybrid = evaluateSubset(["reasoning_budget", "answer_parser", "retry_policy", "tool_access"]);
    const direct = simulateForProtocol({ ...LAB_B_PROTOCOL });
    expect(hybrid.outcomes).toEqual(direct);
    expect(hybrid.stats.mean).toBe(b.stats.delta);
    expect(hybrid.stats.ciLow).toBe(b.stats.ciLow);
    expect(hybrid.stats.ciHigh).toBe(b.stats.ciHigh);
    expect(hybrid.conclusion).toBe(b.stats.conclusion);
  });
});
