import { describe, it, expect } from "vitest";
import { runCounterfactual, inspectEvidence, witness } from "../../src/engine/mpwService";
import { analyzeEvidence } from "../../src/engine/mpwCore";
import { simulateForProtocol } from "../../src/engine/mpwSimulator";
import { buildBenchmarkItems } from "../../src/engine/mpwFixture";
import { verifyWitness } from "../../src/engine/mpwVerify";
import {
  buildFinalizedBundle,
  finalizePublication,
  type FinalizedPublicationBundle,
} from "../../src/engine/mpwPublication";
import { hashManifestBody, contentHash } from "../../src/engine/mpwProvenance";
import { verifyFinalizedBundle } from "../../src/engine/mpwPublication";
import type { JsonValue } from "../../src/engine/mpwManifest";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// re-mint envelope hashes around a mutated core: only structural and
// scientific gates can still fire. proves the gate, not the hash.
function remint(bundle: FinalizedPublicationBundle): FinalizedPublicationBundle {
  const b = clone(bundle);
  b.hashes.manifestBodyHash = hashManifestBody(b.core as unknown as Record<string, JsonValue>);
  b.manifestHash = contentHash({
    core: b.core as unknown as JsonValue,
    evidence: b.evidence as unknown as JsonValue,
    hashes: b.hashes as unknown as JsonValue,
  });
  return b;
}

describe("adversarial inputs", () => {
  it("every malformed service input throws a coded error, never escapes", () => {
    const bad: Array<() => unknown> = [
      () => runCounterfactual([], "C"),
      () => runCounterfactual(["telepathy"], "A"),
      () => runCounterfactual(["answer_parser", "answer_parser"], "A"),
      () => runCounterfactual("reasoning_budget", "A"),
      () => runCounterfactual(42, "A"),
      () => runCounterfactual(["x".repeat(10000)], "A"),
      () => inspectEvidence([], "A", { stratum: "nope", limit: 5 }),
      () => inspectEvidence([], "A", { stratum: null, limit: 99 }),
      () => inspectEvidence([], "A", { stratum: null, limit: 0 }),
      () => witness("reasoning_budget", "A"),
      () => witness(["telepathy"], "A"),
      () => witness(null, "A"),
    ];
    for (const fn of bad) expect(fn).toThrow();
    // legal edges: empty + full candidates resolve, never hang or crash.
    expect(witness([], "A").status).toBe("NOT_SUFFICIENT");
    expect(["NON_MINIMUM", "VERIFIED"]).toContain(
      witness(["reasoning_budget", "answer_parser", "retry_policy", "tool_access"], "A").status
    );
    const rev = witness([], "B");
    expect(["VERIFIED", "NOT_SUFFICIENT", "NON_MINIMUM", "UNRESOLVED"]).toContain(rev.status);
  });

  it("reverse direction resolves without crashing", () => {
    const r = runCounterfactual([], "B");
    expect(r.baseLab).toBe("B");
    expect(r.conclusion).toBe("MODEL_B");
    expect(r.reproducesTarget).toBe(false);
  });
});

describe("adversarial source data", () => {
  it("mutated bundles fail at the right gate", () => {
    const good = finalizePublication("Lab A");
    const cases: Array<[string, (b: FinalizedPublicationBundle) => void, RegExp]> = [
      ["wrong kind", (b) => { b.core.kind = "Evil" as never; }, /unknown core kind/],
      ["wrong benchmark", (b) => { b.core.benchmark.id = "evil-bench"; }, /wrong benchmark/],
      ["wrong models", (b) => { b.core.models = ["MODEL_A", "MODEL_X"]; }, /model identities/],
      ["wrong protocol", (b) => { (b.core.protocol as Record<string, unknown>).reasoning_budget = 4096; }, /protocolHash mismatch/],
      ["bad declared score", (b) => { b.core.declared.scoreA = 0.5; }, /declared scoreA mismatch/],
      ["bad declared count", (b) => { b.core.declared.coverage = 399; }, /declared coverage mismatch/],
      ["bad sim version", (b) => { b.core.simulator.version = "mpw-sim/9"; }, /simulator version/],
    ];
    for (const [name, mutate, re] of cases) {
      const b = clone(good);
      mutate(b);
      expect(() => verifyFinalizedBundle(remint(b)), name).toThrow(re);
    }
  });

  it("item-set mutations fail", () => {
    const items = buildBenchmarkItems();
    const dup = [...items, { ...items[0] }];
    expect(() => verifyFinalizedBundle(buildFinalizedBundle({ source: "Lab A", items: dup }))).toThrow(/BUNDLE_INVALID/);
    const missing = items.slice(1);
    expect(() => verifyFinalizedBundle(buildFinalizedBundle({ source: "Lab A", items: missing }))).toThrow(/BUNDLE_INVALID/);
    const wrongCat = items.map((x, i) => (i === 3 ? { ...x, stratum: "nope" } : x));
    expect(() => buildFinalizedBundle({ source: "Lab A", items: wrongCat })).toThrow(/unknown stratum/);
  });
});

describe("adversarial science edges", () => {
  it("generic verifier stays honest on edge predicates", () => {
    const pair = verifyWitness({
      candidateSubset: ["a", "b"],
      exposedDimensions: ["a", "b", "c"],
      isSufficient: (s) => s.length >= 2,
    });
    expect(pair.status).toBe("VERIFIED");
    expect(pair.minimumCardinality).toBe(2);
    expect(pair.coMinimumWitnesses.length).toBe(3);
    const none = verifyWitness({ candidateSubset: ["a"], exposedDimensions: ["a"], isSufficient: () => false });
    expect(none.status).toBe("UNRESOLVED");
    expect(none.minimumCardinality).toBe(null);
  });

  it("order shuffles change nothing scientific", () => {
    const outcomes = simulateForProtocol({ reasoning_budget: 8192, answer_parser: "tolerant", retry_policy: "one-retry", tool_access: "standard" });
    const base = analyzeEvidence(outcomes);
    const shuffled = analyzeEvidence([...outcomes].reverse());
    expect(shuffled.scoreA).toBe(base.scoreA);
    expect(shuffled.ciLow).toBe(base.ciLow);
    expect(shuffled.conclusion).toBe(base.conclusion);
  });
});
