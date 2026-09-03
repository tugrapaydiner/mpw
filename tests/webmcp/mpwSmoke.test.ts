import { describe, it, expect, beforeEach } from "vitest";
import { SMOKE_TOOL, registerSmokeTool, __resetSmokeRegistrationForTests } from "../../src/webmcp/smoke";
import { getSmokeState, __resetSmokeForTests } from "../../src/state/smokeStore";

function fakeContext(captured: Array<Record<string, unknown>>) {
  (globalThis as Record<string, unknown>)["document"] = {
    modelContext: { registerTool: async (tool: Record<string, unknown>) => void captured.push(tool) },
  };
}

function clearContext() {
  const g = globalThis as Record<string, unknown>;
  delete g["document"];
  delete g["navigator"];
}

describe("smoke tool", () => {
  beforeEach(() => {
    clearContext();
    __resetSmokeForTests();
    __resetSmokeRegistrationForTests();
  });

  it("no crash without modelContext", async () => {
    const r = await registerSmokeTool();
    expect(r.registered).toEqual([]);
    expect(r.reason).toBe("no-webmcp");
  });

  it("registers exactly once with exact name + strict schema", async () => {
    const captured: Array<Record<string, unknown>> = [];
    fakeContext(captured);
    const r1 = await registerSmokeTool();
    const r2 = await registerSmokeTool();
    expect(r1.registered).toEqual(["reconciler_smoke_test"]);
    expect(r2.reason).toBe("already-registered");
    expect(captured.length).toBe(1);
    expect(SMOKE_TOOL.name).toBe("reconciler_smoke_test");
    const schema = SMOKE_TOOL.inputSchema;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(["message"]);
    const props = schema.properties as Record<string, Record<string, unknown>>;
    expect(props["message"].maxLength).toBe(500);
  });

  it("handler-side validation rejects bad input", async () => {
    expect((await SMOKE_TOOL.execute({})).ok).toBe(false);
    expect((await SMOKE_TOOL.execute({ message: "" })).ok).toBe(false);
    expect((await SMOKE_TOOL.execute({ message: "x".repeat(501) })).ok).toBe(false);
    expect((await SMOKE_TOOL.execute({ message: "hi", extra: 1 })).ok).toBe(false);
  });

  it("valid invocation updates state once with correct result", async () => {
    const r1 = (await SMOKE_TOOL.execute({ message: "hello" })) as { ok: boolean; acceptedMessage: string; invocationCount: number };
    expect(r1.ok).toBe(true);
    expect(r1.acceptedMessage).toBe("hello");
    expect(r1.invocationCount).toBe(1);
    expect(getSmokeState().count).toBe(1);
    expect(getSmokeState().lastMessage).toBe("hello");
    expect(getSmokeState().activity.length).toBe(1);
    const r2 = (await SMOKE_TOOL.execute({ message: "again" })) as { invocationCount: number };
    expect(r2.invocationCount).toBe(2);
    expect(getSmokeState().count).toBe(2);
  });
});
