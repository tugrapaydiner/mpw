// captures reference investigation states for ui review. deterministic.
import { writeFileSync } from "node:fs";
import {
  getInvestigationState,
  readDispute,
  runCounterfactualOp,
  inspectEvidenceOp,
  verifyWitnessOp,
} from "../src/state/investigation.js";

const snap = () => JSON.parse(JSON.stringify(getInvestigationState()));
const states: Record<string, unknown> = { initial: snap() };

readDispute("HUMAN");
states["after-read"] = snap();

const parser = runCounterfactualOp("HUMAN", { adopt: ["answer_parser"] });
if (parser.ok) inspectEvidenceOp("HUMAN", { experimentId: parser.result.experimentId, limit: 5 });
states["parser-experiment"] = snap();

const budget = runCounterfactualOp("HUMAN", { adopt: ["reasoning_budget"] });
if (budget.ok) inspectEvidenceOp("HUMAN", { experimentId: budget.result.experimentId, limit: 5 });
states["budget-experiment"] = snap();

verifyWitnessOp("HUMAN", { candidate: ["reasoning_budget"] });
states["verification-certificate"] = snap();

writeFileSync(new URL("../docs/ui-reference-states.json", import.meta.url), `${JSON.stringify(states, null, 2)}\n`);
console.log(`captured ${Object.keys(states).length} states`);
