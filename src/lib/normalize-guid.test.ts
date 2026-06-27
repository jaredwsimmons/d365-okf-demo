import { describe, expect, it } from "vitest";
import { normalizeGuid } from "./normalize-guid";

describe("normalizeGuid", () => {
  it("strips curly braces", () => {
    expect(normalizeGuid("{abc-123}")).toBe("abc-123");
  });

  it("lowercases the GUID", () => {
    expect(normalizeGuid("ABCDEF-1234")).toBe("abcdef-1234");
  });

  it("strips braces and lowercases together", () => {
    expect(normalizeGuid("{ABCDEF-1234}")).toBe("abcdef-1234");
  });

  it("returns an already-normalized GUID unchanged", () => {
    expect(normalizeGuid("abcdef-1234")).toBe("abcdef-1234");
  });
});
