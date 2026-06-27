import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBpcCascade, type CascadeFormApi } from "./use-bpc-cascade";
import type { ProcessCatalog } from "@/types/inventory";

/**
 * Build a minimal ProcessCatalog stub — only the `lookup` field is read by
 * the hook, so we leave the rest as empty arrays / placeholder metadata.
 */
function makeCatalog(): ProcessCatalog {
  return {
    metadata: {
      source: "test",
      enrichedDate: "2026-01-01",
      levels: {},
      totalProcesses: 0,
    },
    l1Processes: [],
    l2Processes: [],
    l3Processes: [],
    lookup: {
      l1: {
        "1": "Sales",
        "2": "Service",
      },
      l2: {
        "1.1": "Lead Management",
        "1.2": "Opportunity Management",
        "2.1": "Case Management",
      },
      l3: {
        "1.1.1": "Lead Capture",
        "1.1.2": "Lead Qualification",
        "1.2.1": "Opp Qualification",
        "2.1.1": "Case Intake",
      },
    },
  };
}

/** Build a fake form API backed by a plain object. */
function makeForm(initial: Record<string, string> = {}): CascadeFormApi & {
  store: Record<string, string>;
  setFieldValue: ReturnType<typeof vi.fn>;
} {
  const store: Record<string, string> = { ...initial };
  const setFieldValue = vi.fn((name: string, value: string) => {
    store[name] = value;
  });
  return {
    store,
    getFieldValue: (name: string) => store[name] ?? "",
    setFieldValue,
  };
}

describe("useBpcCascade", () => {
  it("filters L2 options to those under the selected L1", () => {
    const catalog = makeCatalog();
    const form = makeForm();
    const { result } = renderHook(() =>
      useBpcCascade(catalog, form, { l1: "1 Sales", l2: "" }),
    );

    const labels = result.current.l2Options.map((o) => o.label);
    expect(labels).toContain("1.1 Lead Management");
    expect(labels).toContain("1.2 Opportunity Management");
    expect(labels).not.toContain("2.1 Case Management");
  });

  it("filters L3 options to those under the selected L2", () => {
    const catalog = makeCatalog();
    const form = makeForm();
    const { result } = renderHook(() =>
      useBpcCascade(catalog, form, {
        l1: "1 Sales",
        l2: "1.1 Lead Management",
      }),
    );

    const labels = result.current.l3Options.map((o) => o.label);
    expect(labels).toContain("1.1.1 Lead Capture");
    expect(labels).toContain("1.1.2 Lead Qualification");
    expect(labels).not.toContain("1.2.1 Opp Qualification");
    expect(labels).not.toContain("2.1.1 Case Intake");
  });

  it("handleL1Change resets L2 and L3 alongside writing the new L1 value", () => {
    const catalog = makeCatalog();
    const form = makeForm({
      processCatalogL1: "1 Sales",
      processCatalogL2: "1.1 Lead Management",
      processCatalogL3: "1.1.1 Lead Capture",
    });
    const { result } = renderHook(() =>
      useBpcCascade(catalog, form, { l1: "1 Sales", l2: "1.1 Lead Management" }),
    );

    result.current.handleL1Change("2 Service");

    expect(form.setFieldValue).toHaveBeenCalledWith("processCatalogL1", "2 Service");
    expect(form.setFieldValue).toHaveBeenCalledWith("processCatalogL2", "");
    expect(form.setFieldValue).toHaveBeenCalledWith("processCatalogL3", "");
    expect(form.store.processCatalogL1).toBe("2 Service");
    expect(form.store.processCatalogL2).toBe("");
    expect(form.store.processCatalogL3).toBe("");
  });

  it("handleL1Change('__none__') writes empty string to L1", () => {
    const catalog = makeCatalog();
    const form = makeForm({ processCatalogL1: "1 Sales" });
    const { result } = renderHook(() =>
      useBpcCascade(catalog, form, { l1: "1 Sales", l2: "" }),
    );

    result.current.handleL1Change("__none__");

    expect(form.setFieldValue).toHaveBeenCalledWith("processCatalogL1", "");
    expect(form.store.processCatalogL1).toBe("");
  });
});
