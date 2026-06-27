import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignores falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("merges tailwind classes (later wins)", () => {
    // tailwind-merge collapses conflicting utilities — last one wins
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
