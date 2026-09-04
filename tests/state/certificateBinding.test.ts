import { beforeEach, describe, expect, it } from "vitest";
import { witness } from "../../src/engine/mpwService";
import {
  __resetInvestigationForTests,
  getInvestigationState,
  verifyWitnessOp,
} from "../../src/state/investigation";

beforeEach(() => __resetInvestigationForTests());

describe("investigation certificate binding", () => {
  it("issues a replay-verified certificate for the exact forward request", () => {
    const result = verifyWitnessOp("HUMAN", {
      baseLab: "A",
      candidate: ["reasoning_budget"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.certificate).toMatchObject({
      direction: "A_TO_B",
      verificationLevel: "SCIENTIFIC_REPLAY_VALID",
    });
    expect(getInvestigationState().certificate).toMatchObject({
      direction: "A_TO_B",
      candidate: ["reasoning_budget"],
      verificationLevel: "SCIENTIFIC_REPLAY_VALID",
      valid: true,
    });
  });

  it("does not reuse the canonical forward artifact for a reverse request", () => {
    const forward = verifyWitnessOp("HUMAN", {
      baseLab: "A",
      candidate: ["reasoning_budget"],
    });
    expect(forward.ok).toBe(true);
    if (!forward.ok) return;
    const forwardId = forward.result.certificate?.id;
    __resetInvestigationForTests();

    const reverseCandidate = witness([], "B").minimumWitnesses[0];
    expect(reverseCandidate).toBeDefined();
    const reverse = verifyWitnessOp("AGENT", {
      baseLab: "B",
      candidate: reverseCandidate,
    });
    expect(reverse.ok).toBe(true);
    if (!reverse.ok) return;
    expect(reverse.result.certificate?.direction).toBe("B_TO_A");
    expect(reverse.result.certificate?.verificationLevel).toBe("SCIENTIFIC_REPLAY_VALID");
    expect(reverse.result.certificate?.id).not.toBe(forwardId);
    expect(getInvestigationState().certificate?.candidate).toEqual([...reverseCandidate].sort());
  });

  it("never issues a certificate for a non-minimum candidate", () => {
    const result = verifyWitnessOp("HUMAN", {
      baseLab: "A",
      candidate: ["reasoning_budget", "answer_parser"],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.status).toBe("NON_MINIMUM");
    expect(result.result.certificate).toBe(null);
    expect(getInvestigationState().certificate).toBe(null);
  });
});
