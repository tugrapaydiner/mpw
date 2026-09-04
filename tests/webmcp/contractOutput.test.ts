import { beforeEach, describe, expect, it } from "vitest";
import { witness } from "../../src/engine/mpwService";
import { __resetInvestigationForTests } from "../../src/state/investigation";
import { TOOLS } from "../../src/webmcp/tools";

const tool = (name: string) => {
  const found = TOOLS.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`missing tool ${name}`);
  return found;
};

beforeEach(() => __resetInvestigationForTests());

describe("WebMCP scientific output contract", () => {
  it("returns the integrity data promised by read_dispute", async () => {
    const result = await tool("read_dispute").execute({});
    expect(result.ok).toBe(true);
    expect(result.integrity).toMatchObject({ status: "OK" });
    expect(result.differences).toEqual(expect.arrayContaining([
      "reasoning_budget",
      "answer_parser",
      "retry_policy",
      "tool_access",
    ]));
    expect(result.contentTrust).toMatchObject({
      classification: "UNTRUSTED_SCIENTIFIC_DATA",
      instructionSemantics: false,
    });
  });

  it("chains the exact experiment id through evidence inspection", async () => {
    const experiment = await tool("run_counterfactual").execute({
      baseLab: "A",
      adopt: ["reasoning_budget"],
    });
    expect(experiment.ok).toBe(true);
    expect(typeof experiment.experimentId).toBe("string");
    const evidence = await tool("inspect_evidence").execute({
      experimentId: experiment.experimentId,
      limit: 3,
    });
    expect(evidence.ok).toBe(true);
    expect(evidence.experimentId).toBe(experiment.experimentId);
    expect(evidence.coverage).toBe(400);
    expect(evidence.contentTrust).toMatchObject({ instructionSemantics: false });
  });

  it("returns a direction-bound, replay-verified certificate", async () => {
    const forward = await tool("verify_witness").execute({
      baseLab: "A",
      candidate: ["reasoning_budget"],
    });
    expect(forward).toMatchObject({
      ok: true,
      status: "VERIFIED",
      certificate: {
        direction: "A_TO_B",
        verificationLevel: "SCIENTIFIC_REPLAY_VALID",
      },
    });

    __resetInvestigationForTests();
    const reverseCandidate = witness([], "B").minimumWitnesses[0];
    const reverse = await tool("verify_witness").execute({
      baseLab: "B",
      candidate: reverseCandidate,
    });
    expect(reverse).toMatchObject({
      ok: true,
      status: "VERIFIED",
      certificate: {
        direction: "B_TO_A",
        verificationLevel: "SCIENTIFIC_REPLAY_VALID",
      },
    });
    expect((reverse.certificate as { id: string }).id).not.toBe((forward.certificate as { id: string }).id);
  });

  it("bounds identifiers and preserves stable argument error codes", async () => {
    const tooLong = await tool("inspect_evidence").execute({ experimentId: "x".repeat(513) });
    expect(tooLong).toMatchObject({ ok: false, code: "TOOL_ARGUMENT_ERROR" });
    const duplicate = await tool("run_counterfactual").execute({
      baseLab: "A",
      adopt: ["reasoning_budget", "reasoning_budget"],
    });
    expect(duplicate).toMatchObject({ ok: false, code: "DUPLICATE_DIMENSION" });
  });
});
