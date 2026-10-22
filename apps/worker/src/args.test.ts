import { describe, expect, it } from "vitest";
import { hasFlag } from "./args";

describe("hasFlag", () => {
  it("detects a plain flag", () => {
    expect(hasFlag(["node", "index.ts", "--once"], "once")).toBe(true);
  });
  it("detects a flag with a value", () => {
    expect(hasFlag(["node", "--org=acme"], "org")).toBe(true);
  });
  it("does not match other flags", () => {
    expect(hasFlag(["node", "--watch"], "once")).toBe(false);
  });
});
