import { describe, it, expect } from "vitest";
import { hashSeedString } from "../../src/engine/mpwCore";
import { simulateForSubset } from "../../src/engine/mpwSimulator";

describe("sanity", () => {
  it("seed hashing is stable", () => {
    expect(hashSeedString("mpw-canonical-v1")).toBe(hashSeedString("mpw-canonical-v1"));
  });

  it("same subset gives same outcomes", () => {
    expect(simulateForSubset([])).toEqual(simulateForSubset([]));
  });
});
