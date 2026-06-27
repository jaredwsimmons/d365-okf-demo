"use client";

import { useState, useMemo, useCallback } from "react";
import { getField } from "@/lib/field-access";
import { useDashboard } from "@/lib/dashboard-context";
import type { ExplorerConfig, FilterDef, StatDef } from "@/types/inventory";

export function useExplorer<T extends Record<string, unknown>>(
  config: ExplorerConfig<T>,
  items: T[],
) {
  const { selectedItemId, setSelectedItemId, activeScopeConfig } = useDashboard();
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [uncatOnly, setUncatOnly] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [itemOverrides, setItemOverrides] = useState<Record<string, Partial<T>>>({});

  // Sort items once
  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      const af = String(config.sortBy(a) ?? "");
      const bf = String(config.sortBy(b) ?? "");
      return af.localeCompare(bf);
    });
    return copy;
  }, [items, config]);

  // Build filter options from data
  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    (config.filters || []).forEach((f: FilterDef) => {
      const vals = new Set<string>();
      sorted.forEach((item) => {
        const v = getField(item, f.field);
        if (typeof v === "string" && v) vals.add(v);
        else if (Array.isArray(v)) v.forEach((e) => { if (typeof e === "string" && e) vals.add(e); });
      });
      opts[f.id] = Array.from(vals).sort();
    });
    return opts;
  }, [sorted, config.filters]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let scopeRegexes: RegExp[] | null = null;
    if (activeScopeConfig?.filter?.patterns) {
      scopeRegexes = activeScopeConfig.filter.patterns.map(p => {
        const escaped = p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
        return new RegExp(`^${escaped}$`, "i");
      });
    }
    const scopeField = activeScopeConfig?.filter?.field;

    return sorted.filter((item) => {
      if (!showRemoved && (item as Record<string, unknown>)._status === "removed") return false;
      if (scopeRegexes && scopeField) {
        const val = getField(item, scopeField);
        const strVal = typeof val === "string" ? val : "";
        if (strVal && !scopeRegexes.some(re => re.test(strVal))) return false;
      }
      if (uncatOnly) {
        const l1 = getField(item, "tags.processCatalogL1");
        if (l1) return false;
      }
      for (const f of config.filters || []) {
        const fv = filterValues[f.id];
        if (fv) {
          const val = getField(item, f.field);
          if (Array.isArray(val) ? !val.includes(fv) : val !== fv) return false;
        }
      }
      if (q) {
        const hay = (config.searchFields || [])
          .map((sf) => {
            const v = getField(item, sf);
            return typeof v === "string" ? v : Array.isArray(v) ? v.join(" ") : "";
          })
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, search, filterValues, uncatOnly, showRemoved, activeScopeConfig, config]);

  // Resolve selectedItemId from context into a list index within `filtered`
  // (which aligns with displayItems). Derived state — no effect needed.
  const findIn = useCallback((list: T[], id: string): number => {
    let idx = list.findIndex((item) => {
      const rec = item as Record<string, unknown>;
      return String(rec[config.idField] || "") === id;
    });
    if (idx < 0) {
      const lower = id.toLowerCase().trim();
      idx = list.findIndex((item) => {
        const title = config.listTitle(item);
        return title != null && title.toLowerCase().trim() === lower;
      });
    }
    if (idx < 0) {
      const lower = id.toLowerCase().trim();
      idx = list.findIndex((item) => {
        for (const sf of config.searchFields || []) {
          const v = getField(item, sf);
          if (typeof v === "string" && v.toLowerCase().trim() === lower) return true;
        }
        return false;
      });
    }
    return idx;
  }, [config]);

  const selectedIdx = useMemo(() => {
    if (!selectedItemId) return -1;
    return findIn(filtered, selectedItemId);
  }, [selectedItemId, filtered, findIn]);

  // When selectedItemId changes externally (e.g. cross-ref navigation from
  // another tab) and the target is hidden by active filters but exists in
  // the full sorted list, clear filters so it becomes visible. Uses the
  // render-time "previous prop" pattern rather than an effect, so it does
  // NOT fire when the user is typing/toggling (that preserves their input).
  const [prevSelectedItemId, setPrevSelectedItemId] = useState<string | null>(selectedItemId);
  if (prevSelectedItemId !== selectedItemId) {
    setPrevSelectedItemId(selectedItemId);
    if (selectedItemId && selectedIdx < 0 && findIn(sorted, selectedItemId) >= 0) {
      setSearch("");
      setFilterValues({});
      setUncatOnly(false);
    }
  }

  const hasRemoved = useMemo(() =>
    sorted.some(item => (item as Record<string, unknown>)._status === "removed"),
    [sorted]
  );

  const statsItems = useMemo(() =>
    filtered.filter(item => (item as Record<string, unknown>)._status !== "removed"),
    [filtered]
  );

  const stats: StatDef[] = useMemo(() => {
    if (!config.stats) return [];
    return config.stats(statsItems);
  }, [statsItems, config]);

  // Merge local overrides into filtered items
  const displayItems = useMemo(() => {
    if (Object.keys(itemOverrides).length === 0) return filtered;
    return filtered.map((item) => {
      const id = String((item as Record<string, unknown>)[config.idField] || "");
      const ov = itemOverrides[id];
      return ov ? { ...item, ...ov } : item;
    });
  }, [filtered, itemOverrides, config.idField]);

  const selectedItem = selectedIdx >= 0 ? displayItems[selectedIdx] : null;

  const handleSelect = useCallback((idx: number) => {
    setEditing(false);
    if (idx >= 0 && idx < filtered.length) {
      const item = filtered[idx] as Record<string, unknown>;
      const id = String(item[config.idField] || "");
      if (id) setSelectedItemId(id);
    }
  }, [filtered, config.idField, setSelectedItemId]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterValues({});
    setUncatOnly(false);
    setShowRemoved(false);
  }, []);

  const applyOverride = useCallback((itemId: string, override: Partial<T>) => {
    setItemOverrides((prev) => ({ ...prev, [itemId]: override }));
    setEditing(false);
  }, []);

  return {
    // State
    search, setSearch,
    filterValues, setFilterValues,
    uncatOnly, setUncatOnly,
    showRemoved, setShowRemoved,
    editing, setEditing,
    selectedIdx,
    // Derived
    sorted, filtered, displayItems,
    filterOptions, stats,
    selectedItem,
    hasRemoved,
    // Actions
    handleSelect,
    clearFilters,
    applyOverride,
  };
}
