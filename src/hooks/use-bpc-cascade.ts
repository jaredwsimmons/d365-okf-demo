import { useMemo } from "react";
import type { ProcessCatalog } from "@/types/inventory";

interface CascadeOption {
  value: string;
  label: string;
}

/**
 * Form-library-agnostic API used by the BPC cascade dropdowns.
 * The TanStack Form `form` object satisfies this shape via
 * `form.getFieldValue` and `form.setFieldValue`.
 */
export interface CascadeFormApi {
  getFieldValue: (name: string) => unknown;
  setFieldValue: (name: string, value: string) => void;
}

/**
 * Shared hook for L1 → L2 → L3 cascading BPC dropdowns.
 * Used by TagEditPanel and BulkEditPanel to avoid duplicating
 * the grouped-lookup memos and reset handlers.
 *
 * Pass the TanStack Form `form` object directly — it satisfies the
 * `CascadeFormApi` shape via its `getFieldValue` / `setFieldValue` methods.
 *
 * @param trigger A reactive value (e.g. a field-state subscription result)
 *   that re-evaluates the cascade when the L1/L2 selection changes. Without
 *   this, the memoized `l2Options` / `l3Options` would stay stale when the
 *   form value updates outside React's render cycle.
 */
export function useBpcCascade(
  catalog: ProcessCatalog | null | undefined,
  form: CascadeFormApi,
  trigger?: { l1?: string; l2?: string },
) {
  const l1Value = (trigger?.l1 ?? (form.getFieldValue("processCatalogL1") as string)) || "";
  const l2Value = (trigger?.l2 ?? (form.getFieldValue("processCatalogL2") as string)) || "";

  const l1Options = useMemo((): CascadeOption[] => {
    if (!catalog?.lookup?.l1) return [];
    return Object.entries(catalog.lookup.l1)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .map(([code, name]) => ({ value: `${code} ${name}`, label: `${code} ${name}` }));
  }, [catalog]);

  const l2ByL1Prefix = useMemo(() => {
    if (!catalog?.lookup?.l2) return {} as Record<string, CascadeOption[]>;
    const grouped: Record<string, CascadeOption[]> = {};
    Object.entries(catalog.lookup.l2)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .forEach(([code, name]) => {
        const prefix = code.split(".")[0] + ".";
        if (!grouped[prefix]) grouped[prefix] = [];
        grouped[prefix].push({ value: `${code} ${name}`, label: `${code} ${name}` });
      });
    return grouped;
  }, [catalog]);

  const l3ByL2Prefix = useMemo(() => {
    if (!catalog?.lookup?.l3) return {} as Record<string, CascadeOption[]>;
    const grouped: Record<string, CascadeOption[]> = {};
    Object.entries(catalog.lookup.l3)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .forEach(([code, name]) => {
        const parts = code.split(".");
        const prefix = parts[0] + "." + parts[1] + ".";
        if (!grouped[prefix]) grouped[prefix] = [];
        grouped[prefix].push({ value: `${code} ${name}`, label: `${code} ${name}` });
      });
    return grouped;
  }, [catalog]);

  const l2Options = useMemo((): CascadeOption[] => {
    if (!l1Value) return [];
    const l1Code = l1Value.split(" ")[0]!;
    const prefix = l1Code.split(".")[0] + ".";
    return (l2ByL1Prefix[prefix] || []).filter((o) => !o.value.startsWith(l1Code + " "));
  }, [l2ByL1Prefix, l1Value]);

  const l3Options = useMemo((): CascadeOption[] => {
    if (!l2Value) return [];
    const l2Code = l2Value.split(" ")[0];
    const prefix = l2Code + ".";
    return l3ByL2Prefix[prefix] || [];
  }, [l3ByL2Prefix, l2Value]);

  const handleL1Change = (val: string) => {
    form.setFieldValue("processCatalogL1", val === "__none__" ? "" : val);
    form.setFieldValue("processCatalogL2", "");
    form.setFieldValue("processCatalogL3", "");
  };

  const handleL2Change = (val: string) => {
    form.setFieldValue("processCatalogL2", val === "__none__" ? "" : val);
    form.setFieldValue("processCatalogL3", "");
  };

  const handleL3Change = (val: string) => {
    form.setFieldValue("processCatalogL3", val === "__none__" ? "" : val);
  };

  return {
    l1Value,
    l2Value,
    l1Options,
    l2Options,
    l3Options,
    handleL1Change,
    handleL2Change,
    handleL3Change,
  };
}
