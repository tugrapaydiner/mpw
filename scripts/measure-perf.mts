// performance measurement. prints wall times for the demo-critical path.
// no science altered: same functions the ui calls.
import { dispute } from "../src/engine/mpwService.js";
import { readDispute, runCounterfactualOp, verifyWitnessOp } from "../src/state/investigation.js";
import { stratifiedPairedBootstrap } from "../src/engine/mpwCore.js";
import { simulateForProtocol } from "../src/engine/mpwSimulator.js";
import { LAB_A_PROTOCOL } from "../src/engine/mpwFixture.js";
import { buildCertificate } from "../src/engine/mpwCertificate.js";

const timed = <T,>(name: string, fn: () => T): T => {
  const t0 = performance.now();
  const out = fn();
  console.log(`${name}: ${Math.round(performance.now() - t0)}ms`);
  return out;
};

timed("dispute read (service)", () => dispute());
timed("dispute read (state)", () => readDispute("HUMAN"));
const outcomes = simulateForProtocol({ ...LAB_A_PROTOCOL });
timed("10k stratified bootstrap (400 items)", () => stratifiedPairedBootstrap(outcomes, {}));
const run = timed("counterfactual run", () =>
  runCounterfactualOp("HUMAN", { adopt: ["reasoning_budget"] })
);
if (run.ok) console.log(`conclusion ${run.result.conclusion}`);
timed("all-16 verification + certificate", () => verifyWitnessOp("HUMAN", { candidate: ["reasoning_budget"] }));
timed("standalone certificate build", () => buildCertificate());
