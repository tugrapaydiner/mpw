// four top-level-page tools, same service as the ui. no answer in descriptions.
import { dispute, runCounterfactual, inspectEvidence, witness } from "./mpwService.js";
import { EXPOSED_DIMENSIONS } from "./mpwFixture.js";
import { STRATA } from "./mpwFixture.js";

const DIM_ENUM = [...EXPOSED_DIMENSIONS].sort();
const STRATUM_ENUM = STRATA.map((s) => s.name);

function rejectExtra(args, allowed) {
  for (const k of Object.keys(args ?? {})) if (!allowed.includes(k)) throw new Error(`unexpected prop: ${k}`);
}

function asSubset(v) {
  if (!Array.isArray(v)) throw new Error("subset must be an array");
  return [...v];
}

export const READONLY = { readOnlyHint: true };

export const TOOLS = [
  {
    name: "read_dispute",
    description:
      "Summarizes the Lab A vs Lab B evaluation dispute: models, benchmark makeup, exposed protocol dimensions, and each lab's declared headline. Good starting context before running experiments.",
    inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
    annotations: { ...READONLY },
    execute: async () => ({ ok: true, dispute: dispute() }),
  },
  {
    name: "run_counterfactual",
    description:
      "Evaluates one hybrid protocol built from Lab A by adopting exactly the given exposed dimensions from Lab B, with the deterministic simulator and stratified bootstrap. Returns accuracies, difference with 95% interval, conclusion, and whether it reproduces the Lab B conclusion.",
    inputSchema: {
      type: "object",
      properties: {
        subset: { type: "array", items: { type: "string", enum: DIM_ENUM }, minItems: 0, maxItems: 4, uniqueItems: true },
      },
      required: ["subset"],
      additionalProperties: false,
    },
    annotations: { ...READONLY },
    execute: async (args = {}) => {
      try {
        rejectExtra(args, ["subset"]);
        return { ok: true, result: runCounterfactual(asSubset(args.subset)) };
      } catch (e) {
        return { ok: false, error: String(e.message || e) };
      }
    },
  },
  {
    name: "inspect_evidence",
    description:
      "Shows supporting evidence for one hybrid protocol: per-stratum accuracy plus a small sample of item outcomes. Handy for sanity-checking a result without pulling all 400 items.",
    inputSchema: {
      type: "object",
      properties: {
        subset: { type: "array", items: { type: "string", enum: DIM_ENUM }, minItems: 0, maxItems: 4, uniqueItems: true },
        stratum: { type: "string", enum: STRATUM_ENUM },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 5 },
      },
      required: ["subset"],
      additionalProperties: false,
    },
    annotations: { ...READONLY },
    execute: async (args = {}) => {
      try {
        rejectExtra(args, ["subset", "stratum", "limit"]);
        return {
          ok: true,
          result: inspectEvidence(asSubset(args.subset), { stratum: args.stratum ?? null, limit: args.limit ?? 5 }),
        };
      } catch (e) {
        return { ok: false, error: String(e.message || e) };
      }
    },
  },
  {
    name: "verify_witness",
    description:
      "Deterministically checks one proposed witness subset against every exposed combination. Returns VERIFIED, NOT_SUFFICIENT, NON_MINIMUM, or UNRESOLVED with the global minimum. The only place that certifies an answer.",
    inputSchema: {
      type: "object",
      properties: {
        candidateSubset: { type: "array", items: { type: "string", enum: DIM_ENUM }, minItems: 0, maxItems: 4, uniqueItems: true },
      },
      required: ["candidateSubset"],
      additionalProperties: false,
    },
    annotations: { ...READONLY },
    execute: async (args = {}) => {
      try {
        rejectExtra(args, ["candidateSubset"]);
        if (!Array.isArray(args.candidateSubset)) throw new Error("candidateSubset must be an array");
        return { ok: true, result: witness([...args.candidateSubset]) };
      } catch (e) {
        const msg = String(e.message || e);
        if (msg.includes("SOURCE_INTEGRITY_FAILURE"))
          return { ok: false, code: "SOURCE_INTEGRITY_FAILURE", error: msg };
        return { ok: false, error: msg };
      }
    },
  },
];

export async function registerWebMcpTools() {
  const mc = globalThis.document?.modelContext ?? globalThis.navigator?.modelContext ?? null;
  if (!mc || typeof mc.registerTool !== "function") return { registered: [], reason: "no-webmcp" };
  const out = [];
  for (const t of TOOLS) {
    await mc.registerTool({ name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations, execute: t.execute });
    out.push(t.name);
  }
  return { registered: out };
}
