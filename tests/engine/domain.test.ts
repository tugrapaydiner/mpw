import { describe, it, expect, expectTypeOf } from "vitest";
import {
  CATEGORY_STRATUM_KEY,
  protocolToRuntime,
  runtimeToProtocol,
  type BenchmarkCategory,
  type Conclusion,
  type ItemReceipt,
  type LabId,
  type ModelId,
  type Protocol,
  type ProtocolDimension,
  type VerificationStatus,
  type WitnessVerification,
} from "../../src/types/domain";

describe("domain", () => {
  it("categories cover all four strata keys", () => {
    expect(Object.keys(CATEGORY_STRATUM_KEY).sort()).toEqual([
      "INSTRUCTION_FOLLOWING",
      "MULTI_STEP_REASONING",
      "QUANTITATIVE_REASONING",
      "TOOL_REASONING",
    ]);
    expect(new Set(Object.values(CATEGORY_STRATUM_KEY)).size).toBe(4);
  });

  it("protocol maps round-trip without loss", () => {
    const p: Protocol = { reasoningBudget: 8192, answerParser: "tolerant", retryPolicy: 1, toolAccess: "standard" };
    const rt = protocolToRuntime(p);
    expect(rt).toEqual({ reasoning_budget: 8192, answer_parser: "tolerant", retry_policy: "one-retry", tool_access: "standard" });
    expect(runtimeToProtocol(rt)).toEqual(p);
    expect(runtimeToProtocol(protocolToRuntime({ ...p, retryPolicy: 0 })).retryPolicy).toBe(0);
    expect(() => runtimeToProtocol({ ...rt, retry_policy: "sometimes" })).toThrow();
  });

  it("names are exact", () => {
    expectTypeOf<LabId>("A").toMatchTypeOf<"A" | "B">();
    expectTypeOf<ModelId>("MODEL_A").toMatchTypeOf<"MODEL_A" | "MODEL_B">();
    expectTypeOf<Conclusion>("INCONCLUSIVE").toMatchTypeOf<"MODEL_A" | "MODEL_B" | "INCONCLUSIVE">();
    expectTypeOf<VerificationStatus>("VERIFIED").toMatchTypeOf<
      "VERIFIED" | "NOT_SUFFICIENT" | "NON_MINIMUM" | "UNRESOLVED"
    >();
    const dims: ProtocolDimension[] = ["reasoning_budget", "answer_parser", "retry_policy", "tool_access"];
    expect(dims.length).toBe(4);
    const cats: BenchmarkCategory[] = ["MULTI_STEP_REASONING", "QUANTITATIVE_REASONING", "INSTRUCTION_FOLLOWING", "TOOL_REASONING"];
    expect(cats.length).toBe(4);
  });

  it("receipt diagnoses mechanism with no winner field", () => {
    const r: ItemReceipt = {
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
    expect("winner" in r).toBe(false);
    expect("conclusion" in r).toBe(false);
    const v: WitnessVerification = {
      status: "VERIFIED",
      minimumCardinality: 1,
      minimumWitnesses: [["reasoning_budget"]],
      coMinimumWitnesses: [["reasoning_budget"]],
      checkedCount: 17,
      totalSubsets: 16,
      exhaustive: true,
    };
    expect(v.status).toBe("VERIFIED");
  });
});
