import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { TOOLS } from "../../src/webmcp/tools";

const AVOID = [
  "cause found",
  "truth discovered",
  "lab a is wrong",
  "model b is smarter",
  "universal winner",
  "first-ever",
  "unprecedented",
  "invented harness comparison",
  "invented executable science",
  "invented scientific verification",
];

describe("language", () => {
  it("tool descriptions stay inside the allowed lines", () => {
    for (const t of TOOLS) {
      const d = t.description.toLowerCase();
      for (const p of AVOID) expect(d.includes(p), `${t.name}: ${p}`).toBe(false);
    }
  });

  it("ui copy stays inside the allowed lines", async () => {
    const src = (await readFile(new URL("../../src/app/App.tsx", import.meta.url), "utf8")).toLowerCase();
    for (const p of AVOID) expect(src.includes(p), p).toBe(false);
  });
});
