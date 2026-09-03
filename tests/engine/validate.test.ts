import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import {
  validateBenchmarkMetadata,
  validateBenchmarkItems,
  validateModelProfiles,
  validateProtocol,
  validatePublicationManifestCore,
  validateDeclaredResult,
  validateReceipt,
  validateExperimentRequest,
  validateWitnessCandidate,
  validateDimensions,
} from "../../src/engine/mpwValidate";
import { buildBenchmarkItems } from "../../src/engine/mpwFixture";
import { MODEL_PROFILE } from "../../src/engine/mpwSimulator";
import { conclusionForSubset } from "../../src/engine/mpwSimulator";
import { verifyWitness } from "../../src/engine/mpwVerify";
import { EXPOSED_DIMENSIONS } from "../../src/engine/mpwFixture";

const goodReceipt = {
  id: "item-000",
  model: "MODEL_A",
  category: "MULTI_STEP_REASONING",
  semanticFirstAttempt: true,
  retried: false,
  retryOutcome: null,
  selectedSemantic: true,
  canonicalState: true,
  parserAcceptance: true,
  toolNeeded: false,
  toolPenalty: 0,
  finalCorrect: true,
};

const goodProtocol = { reasoningBudget: 8192, answerParser: "tolerant", retryPolicy: 1, toolAccess: "standard" };

describe("validate positive", () => {
  it("accepts the shipped data files", async () => {
    const bench = JSON.parse(await readFile(new URL("../../data/fixtures/benchmark.json", import.meta.url), "utf8"));
    validateBenchmarkMetadata(bench);
    validateBenchmarkItems(buildBenchmarkItems().map((b) => ({ ...b, stratum: b.stratum })), 100, [
      "multi-step-reasoning",
      "quantitative-reasoning",
      "instruction-following",
      "tool-reasoning",
    ]);
    const labA = JSON.parse(await readFile(new URL("../../data/publications/lab-a.json", import.meta.url), "utf8"));
    expect(labA.version).toBe(1);
  });

  it("accepts good profiles, protocol, manifest, declared, receipt, request, candidate", () => {
    validateModelProfiles([
      { model: "MODEL_A", ...MODEL_PROFILE.MODEL_A },
      { model: "MODEL_B", ...MODEL_PROFILE.MODEL_B },
    ]);
    expect(validateProtocol(goodProtocol).retryPolicy).toBe(1);
    validatePublicationManifestCore({
      kind: "PublicationManifestCore",
      version: 1,
      source: "Lab A",
      lab: "A",
      protocol: goodProtocol,
      declared: "MODEL_A",
      seeds: { sim: "s", boot: "b" },
      evidence: null,
    });
    expect(validateDeclaredResult({ source: "Lab B", lab: "B", declared: "MODEL_B" }).lab).toBe("B");
    expect(validateReceipt(goodReceipt).finalCorrect).toBe(true);
    expect(validateExperimentRequest({ subset: ["retry_policy"] }).subset).toEqual(["retry_policy"]);
    expect(validateWitnessCandidate(["answer_parser"], [...EXPOSED_DIMENSIONS])).toEqual(["answer_parser"]);
    expect(validateDimensions([])).toEqual([]);
  });
});

describe("validate negative", () => {
  it("rejects versions, ids, enums, dims, counts, numbers, booleans, extras", () => {
    expect(() => validateBenchmarkMetadata({ version: 2 })).toThrow(/version/);
    expect(() => validateBenchmarkMetadata({ version: 1, models: ["MODEL_A", "MODEL_A"], strata: [], numItems: 0, exposedDimensions: [] })).toThrow(/duplicate|exactly/);
    expect(() => validateBenchmarkMetadata({ version: 1, models: ["MODEL_A", "MODEL_X"], strata: [{ name: "a", count: 1 }], numItems: 1, exposedDimensions: ["a", "b", "c", "d"] })).toThrow();
    expect(() => validateBenchmarkItems([{ id: "", stratum: "s", indexInStratum: 0, globalIndex: 0 }], 1, ["s"])).toThrow(/non-empty/);
    expect(() => validateBenchmarkItems([
      { id: "x", stratum: "s", indexInStratum: 0, globalIndex: 0 },
      { id: "x", stratum: "s", indexInStratum: 1, globalIndex: 1 },
    ], 2, ["s"])).toThrow(/duplicate/);
    expect(() => validateBenchmarkItems([{ id: "x", stratum: "s", indexInStratum: 0, globalIndex: 0 }], 2, ["s"])).toThrow(/wrong count/);
    expect(() => validateModelProfiles([{ model: "MODEL_A", base: 1, efficiency: 1, reliability: 1, retry: 1, tool: 1 }, { model: "MODEL_A", base: 1, efficiency: 1, reliability: 1, retry: 1, tool: 1 }])).toThrow(/duplicate model/);
    expect(() => validateModelProfiles([{ model: "MODEL_A", base: NaN, efficiency: 1, reliability: 1, retry: 1, tool: 1 }, { model: "MODEL_B", base: 1, efficiency: 1, reliability: 1, retry: 1, tool: 1 }])).toThrow(/finite/);
    expect(() => validateModelProfiles([{ model: "MODEL_A", base: Infinity, efficiency: 1, reliability: 1, retry: 1, tool: 1 }, { model: "MODEL_B", base: 1, efficiency: 1, reliability: 1, retry: 1, tool: 1 }])).toThrow(/finite/);
    expect(() => validateProtocol({ ...goodProtocol, retryPolicy: "1" })).toThrow(/0\|1/);
    expect(() => validateProtocol({ ...goodProtocol, retryPolicy: true })).toThrow(/0\|1/);
    expect(() => validateProtocol({ ...goodProtocol, answerParser: "lax" })).toThrow();
    expect(() => validateProtocol({ ...goodProtocol, extra: 1 })).toThrow(/unexpected/);
    expect(() => validateReceipt({ ...goodReceipt, finalCorrect: 1 })).toThrow(/boolean/);
    expect(() => validateReceipt({ ...goodReceipt, retried: false, retryOutcome: true })).toThrow(/null when not retried/);
    expect(() => validateReceipt({ ...goodReceipt, category: "VIBES" })).toThrow(/category/);
    expect(() => validateReceipt({ ...goodReceipt, winner: "MODEL_A" })).toThrow(/unexpected/);
    expect(() => validateExperimentRequest({ subset: ["retry_policy", "retry_policy"] })).toThrow(/duplicate/);
    expect(() => validateExperimentRequest({ subset: ["telepathy"] })).toThrow(/unknown dimension/);
    expect(() => validateWitnessCandidate(["retry_policy"], ["answer_parser"])).toThrow(/not exposed/);
    expect(() => validatePublicationManifestCore({ kind: "PublicationManifestCore", version: 9, source: "x", lab: "A", protocol: goodProtocol, declared: "MODEL_A", seeds: { sim: "s", boot: "b" }, evidence: null })).toThrow(/version/);
    expect(() => validateDeclaredResult({ source: "", lab: "B", declared: "MODEL_B" })).toThrow();
  });

  it("errors are deterministic", () => {
    const f = () => validateProtocol({ ...goodProtocol, retryPolicy: 2 });
    let a = "";
    let b = "";
    try { f(); } catch (e) { a = String((e as Error).message); }
    try { f(); } catch (e) { b = String((e as Error).message); }
    expect(a).toBe(b);
    expect(a.includes("retryPolicy")).toBe(true);
  });
});

describe("direction audit", () => {
  it("reverse direction works through the generic verifier", () => {
    const base = conclusionForSubset([]);
    const r = verifyWitness({
      candidateSubset: [],
      exposedDimensions: [...EXPOSED_DIMENSIONS],
      isSufficient: (s) => conclusionForSubset(s) === base,
    });
    expect(r.status).toBe("VERIFIED");
    expect(r.minimumCardinality).toBe(0);
    expect(r.minimumWitnesses).toEqual([[]]);
  });

  it("NON_MINIMUM stays distinct from NOT_SUFFICIENT", () => {
    const dims = ["a", "b"];
    const pred = (s: string[]) => s.includes("a");
    expect(verifyWitness({ candidateSubset: ["a", "b"], exposedDimensions: dims, isSufficient: pred }).status).toBe("NON_MINIMUM");
    expect(verifyWitness({ candidateSubset: ["b"], exposedDimensions: dims, isSufficient: pred }).status).toBe("NOT_SUFFICIENT");
  });
});
