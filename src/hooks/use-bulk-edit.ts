import { useState, useCallback } from "react";

/**
 * Shared checked-component state for bulk-edit panels.
 * Used by ProcessCatalogTab and CapabilityMapTab.
 */
export function useBulkEdit() {
  const [checkedComps, setCheckedComps] = useState<Set<string>>(new Set());

  const toggleCheck = useCallback((key: string) => {
    setCheckedComps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const checkAll = useCallback((keys: string[]) => {
    setCheckedComps(new Set(keys));
  }, []);

  const uncheckAll = useCallback(() => {
    setCheckedComps(new Set());
  }, []);

  return { checkedComps, toggleCheck, checkAll, uncheckAll };
}
