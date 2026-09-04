import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface ExternalStudyLedger {
  kind: string;
  version: number;
  studyId: string;
  status: string;
  evidenceStatus: string;
  frozenBeforeExecution: boolean;
  source: {
    workflow: string;
    workflowRunId: number;
    workflowHead: string;
    artifactId: number;
    artifactDigest: string;
    artifactRetentionEnds: string;
  };
  results: {
    frozenCandidates: number;
    candidatesWithGlobalMinimumCardinalityTwoWitness: number;
    candidatesPassingStrictInteractionCriterion: number;
  };
  interpretation: {
    supported: string;
    notSupported: string;
    claimBoundary: string;
  };
  limitations: string[];
}

async function loadLedger(): Promise<ExternalStudyLedger> {
  const url = new URL(
    "../../data/external/fragility-grid-study-result.json",
    import.meta.url
  );
  return JSON.parse(await readFile(url, "utf8")) as ExternalStudyLedger;
}

describe("executed external-study ledger", () => {
  it("binds the compact result to an immutable Actions run and artifact digest", async () => {
    const ledger = await loadLedger();
    expect(ledger).toMatchObject({
      kind: "ExternalProtocolReconciliationStudyResult",
      version: 1,
      studyId: "fragility-grid-held-out-v1",
      status: "COMPLETED",
      evidenceStatus: "VERIFIED_BY_GITHUB_ACTIONS_EXECUTION",
      frozenBeforeExecution: true,
      source: {
        workflow: "External Fragility Grid Study",
        workflowRunId: 33814044740,
        workflowHead: "bcd9482062f7f908475aebf9ab5c37d4107ad8ff",
        artifactId: 9916109342,
        artifactDigest:
          "sha256:abb4252d0fe541f372fd11afec4d46e3116f369001f8169b47bcbee980260e3c",
      },
    });
    expect(ledger.source.artifactDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(Number.isNaN(Date.parse(ledger.source.artifactRetentionEnds))).toBe(false);
  });

  it("preserves the negative interaction finding instead of upgrading it to success", async () => {
    const { results, interpretation } = await loadLedger();
    expect(results).toEqual({
      frozenCandidates: 5,
      candidatesWithGlobalMinimumCardinalityTwoWitness: 5,
      candidatesPassingStrictInteractionCriterion: 0,
    });
    expect(results.candidatesWithGlobalMinimumCardinalityTwoWitness).toBe(
      results.frozenCandidates
    );
    expect(results.candidatesPassingStrictInteractionCriterion).toBe(0);
    expect(interpretation.notSupported).toMatch(/did not establish/i);
    expect(interpretation.claimBoundary).toMatch(/different claims/i);
  });

  it("keeps external validity and causal limitations explicit", async () => {
    const ledger = await loadLedger();
    const limitations = ledger.limitations.join(" ").toLowerCase();
    expect(limitations).toContain("small frozen candidate set");
    expect(limitations).toContain("not a causal attribution");
    expect(limitations).toContain("not a substitute for rerunning");
  });
});
