import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { verifyCanonical, verifyCandidateWitness, verifyWitness, checkSourceIntegrity } from "../../src/engine/mpwVerify";
import { protocolForSubset, LAB_A_PROTOCOL, LAB_B_PROTOCOL } from "../../src/engine/mpwFixture";

describe("verify", () => {
  it("all 16 evaluated even though min is found early", () => {
    const r = verifyCanonical();
    expect(r.table.length).toBe(16);
    expect(r.checkedCount).toBe(16);
    expect(r.totalSubsets).toBe(16);
    expect(r.exhaustive).toBe(true);
  });

  it("hybrids keep everything outside S identical to base", () => {
    for (const { subset } of verifyCanonical().table) {
      const p = protocolForSubset(subset);
      for (const d of Object.keys(LAB_A_PROTOCOL)) {
        const want = subset.includes(d)
          ? LAB_B_PROTOCOL[d as keyof typeof LAB_B_PROTOCOL]
          : LAB_A_PROTOCOL[d as keyof typeof LAB_A_PROTOCOL];
        expect(p[d as keyof typeof p]).toBe(want);
      }
    }
  });

  it("sufficient means conclusion equals target, min is unique", () => {
    const r = verifyCanonical();
    for (const row of r.table) expect(row.sufficient).toBe(row.conclusion === r.target);
    expect(r.minimumCardinality).toBe(1);
    expect(r.minimumWitnesses).toEqual([["reasoning_budget"]]);
    expect(r.coMinimumWitnesses).toEqual([["reasoning_budget"]]);
  });

  it("candidate statuses work, never forcing an answer", () => {
    expect(verifyCandidateWitness(["reasoning_budget"]).status).toBe("VERIFIED");
    expect(verifyCandidateWitness(["reasoning_budget", "answer_parser"]).status).toBe("NON_MINIMUM");
    expect(verifyCandidateWitness([]).status).toBe("NOT_SUFFICIENT");
    const none = verifyWitness({ candidateSubset: ["a"], exposedDimensions: ["a", "b"], isSufficient: () => false });
    expect(none.status).toBe("UNRESOLVED");
    expect(none.minimumCardinality).toBe(null);
    expect(none.minimumWitnesses).toEqual([]);
    const multi = verifyWitness({
      candidateSubset: ["a"],
      exposedDimensions: ["a", "b", "c"],
      isSufficient: (s) => s.includes("a") || s.includes("b"),
    });
    expect(multi.status).toBe("VERIFIED");
    expect(multi.minimumCardinality).toBe(1);
    expect(multi.minimumWitnesses.length).toBe(2);
  });

  it("sources must reproduce their own headlines first", () => {
    expect(checkSourceIntegrity().status).toBe("OK");
    expect(() =>
      verifyCanonical([
        { source: "Lab A", subset: [], declared: "MODEL_B" },
        {
          source: "Lab B",
          subset: ["reasoning_budget", "answer_parser", "retry_policy", "tool_access"],
          declared: "MODEL_B",
        },
      ])
    ).toThrow(/SOURCE_INTEGRITY_FAILURE/);
  });

  it("verifier hardcodes no answer", async () => {
    const src = await readFile(new URL("../../src/engine/mpwVerify.ts", import.meta.url), "utf8");
    expect(src.includes("reasoning_budget")).toBe(false);
    expect(src.includes("MODEL_A") && src.includes("MODEL_B") && src.includes("INCONCLUSIVE")).toBe(false);
  });
});
