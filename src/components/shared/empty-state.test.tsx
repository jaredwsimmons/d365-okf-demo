import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<EmptyState title="No items" subtitle="Try adjusting filters" />);
    expect(screen.getByText("Try adjusting filters")).toBeInTheDocument();
  });

  it("renders the icon node when provided", () => {
    render(
      <EmptyState
        title="No items"
        icon={<span data-testid="empty-icon">icon</span>}
      />,
    );
    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
  });
});
