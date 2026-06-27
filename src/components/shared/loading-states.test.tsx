import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ExplorerSkeleton,
  PageLoader,
  ProcessCatalogSkeleton,
  InlineLoader,
} from "./loading-states";

describe("loading-states", () => {
  it("InlineLoader renders a spinner element", () => {
    const { container } = render(<InlineLoader />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains("animate-spin")).toBe(true);
  });

  it("InlineLoader respects the size prop", () => {
    const { container } = render(<InlineLoader size="lg" />);
    const svg = container.querySelector("svg");
    // SVGElement.className is an SVGAnimatedString, not a string — read the
    // raw class attribute instead.
    const cls = svg?.getAttribute("class") ?? "";
    expect(cls).toContain("h-8");
    expect(cls).toContain("w-8");
  });

  it("PageLoader renders the optional message", () => {
    render(<PageLoader message="Loading inventory…" />);
    expect(screen.getByText("Loading inventory…")).toBeInTheDocument();
  });

  it("ExplorerSkeleton renders without crashing", () => {
    const { container } = render(<ExplorerSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });

  it("ProcessCatalogSkeleton renders without crashing", () => {
    const { container } = render(<ProcessCatalogSkeleton />);
    expect(container.firstChild).not.toBeNull();
  });
});
