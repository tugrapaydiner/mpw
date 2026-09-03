// exactly four tools, same application services as the ui (caller AGENT).
// handlers validate independently, never calculate, never decide.
import {
  readDispute,
  runCounterfactualOp,
  inspectEvidenceOp,
  verifyWitnessOp,
} from "../state/investigation.js";
import { EXPOSED_DIMENSIONS, STRATA } from "../engine/mpwFixture.js";
import type { JsonSchema, ToolDef } from "../types";

const DIM_ENUM = [...EXPOSED_DIMENSIONS].sort();
const STRATUM_ENUM = STRATA.map((s) => s.name);

const DIM_GLOSS =
  "exposed protocol dimension: reasoning_budget (thinking effort per item), " +
  "answer_parser (strictness of answer parsing), retry_policy (whether one retry is allowed), " +
  "tool_access (breadth of tool use)";

function rejectExtra(args: Record<string, unknown> | undefined, allowed: string[]): void {
  for (const k of Object.keys(args ?? {})) if (!allowed.includes(k)) throw new Error(`unexpected prop: ${k}`);
}

function asArray(v: unknown, name: string): string[] {
  if (!Array.isArray(v)) throw new Error(`${name} must be an array`);
  return [...v] as string[];
}

const dimArray = (name: string): JsonSchema => ({
  type: "array",
  description: `${name}: ${DIM_GLOSS}`,
  items: { type: "string", enum: DIM_ENUM } as unknown as JsonSchema,
  minItems: 0,
  maxItems: 4,
  uniqueItems: true,
});

const disputeIdProp = (): JsonSchema => ({
  type: "string",
  description: "dispute id from read_dispute; omit to use the single canonical dispute",
});

const baseLabProp = (): JsonSchema => ({
  type: "string",
  description: "lab whose protocol is the starting point; the target conclusion is always the other lab's",
  enum: ["A", "B"],
});

export const TOOLS: ToolDef[] = [
  {
    name: "read_dispute",
    description:
      "Summarizes the active evaluation dispute: both labs' conclusions with scores and intervals, benchmark identity, evidence coverage, integrity status, and the protocol dimensions where the labs differ.",
    inputSchema: {
      type: "object",
      properties: { disputeId: disputeIdProp() },
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (args = {}) => {
      try {
        rejectExtra(args, ["disputeId"]);
        const r = readDispute("AGENT", args["disputeId"]);
        if (!r.ok) return { ok: false, code: r.code, error: r.error };
        return { ok: true, ...JSON.parse(JSON.stringify(r.dispute)) };
      } catch (e) {
        return { ok: false, error: String((e as Error).message || e) };
      }
    },
  },
  {
    name: "run_counterfactual",
    description:
      "Builds one hybrid protocol from a lab baseline by adopting selected dimensions from the other lab, then runs the deterministic synthetic evaluation with paired statistics.",
    inputSchema: {
      type: "object",
      properties: {
        disputeId: disputeIdProp(),
        baseLab: baseLabProp(),
        adopt: dimArray("dimensions taken from the other lab; empty re-runs the baseline as a control"),
      },
      required: ["baseLab", "adopt"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (args = {}) => {
      try {
        rejectExtra(args, ["disputeId", "baseLab", "adopt"]);
        const r = runCounterfactualOp("AGENT", {
          disputeId: args["disputeId"],
          baseLab: args["baseLab"],
          adopt: asArray(args["adopt"], "adopt"),
        });
        if (!r.ok) return { ok: false, code: r.code, error: r.error };
        return { ok: true, ...r.result };
      } catch (e) {
        return { ok: false, error: String((e as Error).message || e) };
      }
    },
  },
  {
    name: "inspect_evidence",
    description:
      "Reads stored diagnostics for a completed experiment: the numbers behind a result — coverage, paired outcome counts, parser, retry and tool behavior, category summary, and evidence hash.",
    inputSchema: {
      type: "object",
      properties: {
        experimentId: {
          type: "string",
          description: "experiment id returned by run_counterfactual",
        },
        category: {
          type: "string",
          description: "optional stratum slice; omit for all four strata",
          enum: STRATUM_ENUM,
        } as unknown as JsonSchema,
        limit: {
          type: "integer",
          description: "sample receipts, 1 to 20, default 5; hundreds are never returned",
          minimum: 1,
          maximum: 20,
          default: 5,
        } as unknown as JsonSchema,
      },
      required: ["experimentId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: async (args = {}) => {
      try {
        rejectExtra(args, ["experimentId", "category", "limit"]);
        const r = inspectEvidenceOp("AGENT", {
          experimentId: args["experimentId"],
          category: args["category"],
          limit: args["limit"],
        });
        if (!r.ok) return { ok: false, code: r.code, error: r.error };
        return { ok: true, ...r.result };
      } catch (e) {
        return { ok: false, error: String((e as Error).message || e) };
      }
    },
  },
  {
    name: "verify_witness",
    description:
      "Exhaustively checks every combination of the exposed dimensions and decides whether a proposed candidate reproduces the other lab's conclusion with the smallest possible dimension set. The target is the other lab's conclusion from read_dispute.",
    inputSchema: {
      type: "object",
      properties: {
        disputeId: disputeIdProp(),
        baseLab: baseLabProp(),
        candidate: dimArray("proposed witness subset; empty is a legal vacuous check"),
      },
      required: ["baseLab", "candidate"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: async (args = {}) => {
      try {
        rejectExtra(args, ["disputeId", "baseLab", "candidate"]);
        const r = verifyWitnessOp("AGENT", {
          disputeId: args["disputeId"],
          baseLab: args["baseLab"],
          candidate: asArray(args["candidate"], "candidate"),
        });
        if (!r.ok) return { ok: false, code: r.code, error: r.error };
        const { certificate, limitation, ...rest } = r.result as unknown as Record<string, unknown>;
        const cert = certificate as { id: string; hash: string } | null;
        return {
          ok: true,
          ...rest,
          subsetsEvaluated: (rest as { checkedCount: number }).checkedCount,
          subsetsTotal: (rest as { totalSubsets: number }).totalSubsets,
          certificate: cert,
          limitation,
        };
      } catch (e) {
        return { ok: false, error: String((e as Error).message || e) };
      }
    },
  },
];

let done = false;

export function __resetWebmcpRegistrationForTests(): void {
  done = false;
}

export async function registerWebMcpTools(): Promise<{ registered: string[]; reason?: string }> {
  if (done) return { registered: [], reason: "already-registered" };
  const g = globalThis as unknown as {
    document?: { modelContext?: { registerTool: (tool: Record<string, unknown>) => Promise<unknown> } };
    navigator?: { modelContext?: { registerTool: (tool: Record<string, unknown>) => Promise<unknown> } };
  };
  const mc = g.document?.modelContext ?? g.navigator?.modelContext ?? null;
  if (!mc || typeof mc.registerTool !== "function") return { registered: [], reason: "no-webmcp" };
  const out: string[] = [];
  for (const t of TOOLS) {
    await mc.registerTool({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations,
      execute: t.execute,
    });
    out.push(t.name);
  }
  done = true;
  return { registered: out };
}
