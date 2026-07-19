import { describe, it, expect } from "vitest";

// NOTE: scratch file created while debugging vitest's require() alias resolution
// for packet-0005 — sandbox blocked file deletion, so this was neutralized
// instead of left broken. Safe to delete.
describe("require test (neutralized scratch file)", () => {
  it("no-op", () => {
    expect(true).toBe(true);
  });
});
