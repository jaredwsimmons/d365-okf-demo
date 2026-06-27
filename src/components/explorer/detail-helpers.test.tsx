import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  BPCPath,
  DetailDesc,
  DetailGrid,
  DetailHeader,
  DetailSection,
  PillList,
} from "./detail-helpers";

describe("detail-helpers", () => {
  it("DetailHeader renders the title and subtitle", () => {
    render(<DetailHeader title="My Entity" subtitle="A subtitle" />);
    expect(screen.getByText("My Entity")).toBeInTheDocument();
    expect(screen.getByText("A subtitle")).toBeInTheDocument();
  });

  it("DetailGrid renders provided rows and skips empty ones", () => {
    render(
      <DetailGrid
        rows={[
          { label: "Name", value: "Alice" },
          { label: "Empty", value: "" },
          { label: "Nullish", value: null },
          { label: "Count", value: 42 },
        ]}
      />,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.queryByText("Empty")).toBeNull();
    expect(screen.queryByText("Nullish")).toBeNull();
  });

  it("DetailDesc renders text inside a Description block", () => {
    render(<DetailDesc text="A description" />);
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("A description")).toBeInTheDocument();
  });

  it("DetailDesc returns null when no text", () => {
    const { container } = render(<DetailDesc text={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("PillList renders the title and each pill, dropping falsy items", () => {
    render(
      <PillList title="Tags" items={["alpha", "beta", null, undefined, ""]} />,
    );
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("DetailSection wraps children under the section title", () => {
    render(
      <DetailSection title="Section A">
        <div>child-content</div>
      </DetailSection>,
    );
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("child-content")).toBeInTheDocument();
  });

  it("BPCPath renders the L1/L2/L3 codes when tags are populated", () => {
    render(
      <BPCPath
        tags={{
          processCatalogL1: "1 Sales",
          processCatalogL2: "1.1 Lead Management",
          processCatalogL3: "1.1.1 Lead Capture",
        }}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getByText("1.1")).toBeInTheDocument();
    expect(screen.getByText("Lead Management")).toBeInTheDocument();
    expect(screen.getByText("1.1.1")).toBeInTheDocument();
    expect(screen.getByText("Lead Capture")).toBeInTheDocument();
  });

  it("BPCPath shows 'no assignment' fallback when tags is null", () => {
    render(<BPCPath tags={null} />);
    expect(screen.getByText("No process catalog assignment")).toBeInTheDocument();
  });
});
