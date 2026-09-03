// temporary smoke tool. proves the real webmcp path, nothing scientific.
import { invokeSmoke } from "../state/smokeStore.js";
import type { ToolDef } from "../types/index.js";

function modelContext(): { registerTool: (tool: Record<string, unknown>) => Promise<unknown> } | null {
  const g = globalThis as unknown as {
    document?: { modelContext?: { registerTool: (tool: Record<string, unknown>) => Promise<unknown> } };
    navigator?: { modelContext?: { registerTool: (tool: Record<string, unknown>) => Promise<unknown> } };
  };
  return g.document?.modelContext ?? g.navigator?.modelContext ?? null;
}

function rejectExtra(args: Record<string, unknown> | undefined, allowed: string[]): void {
  for (const k of Object.keys(args ?? {})) if (!allowed.includes(k)) throw new Error(`unexpected prop: ${k}`);
}

export const SMOKE_TOOL: ToolDef = {
  name: "reconciler_smoke_test",
  description:
    "Sends a short text message that increments this page's visible invocation counter and appends one activity entry. Use it to prove the WebMCP path works end to end.",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "short text to record as the last invocation message",
        minLength: 1,
        maxLength: 500,
      },
    },
    required: ["message"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: false },
  execute: async (args = {}) => {
    try {
      rejectExtra(args, ["message"]);
      const r = invokeSmoke(args["message"]);
      return { ok: true, ...r };
    } catch (e) {
      return { ok: false, error: String((e as Error).message || e) };
    }
  },
};

let done = false;

export async function registerSmokeTool(): Promise<{ registered: string[]; reason?: string }> {
  if (done) return { registered: [], reason: "already-registered" };
  const mc = modelContext();
  if (!mc || typeof mc.registerTool !== "function") return { registered: [], reason: "no-webmcp" };
  await mc.registerTool({
    name: SMOKE_TOOL.name,
    description: SMOKE_TOOL.description,
    inputSchema: SMOKE_TOOL.inputSchema,
    annotations: SMOKE_TOOL.annotations,
    execute: SMOKE_TOOL.execute,
  });
  done = true;
  return { registered: [SMOKE_TOOL.name] };
}

export function __resetSmokeRegistrationForTests(): void {
  done = false;
}
