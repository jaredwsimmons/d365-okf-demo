"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { useDashboard } from "@/lib/dashboard-context";
import { searchComponents, type SearchResult } from "@/lib/api-client";
import { TYPE_ORDER, TYPE_LABELS } from "@/lib/constants";

const MAX_RESULTS = 50;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const [apiTotal, setApiTotal] = useState(0);
  const { navigateToTab } = useDashboard();

  // Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Listen for header button trigger
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-command-palette", handler);
    return () => window.removeEventListener("open-command-palette", handler);
  }, []);

  // Fetch total count on open
  useEffect(() => {
    if (open && apiTotal === 0) {
      searchComponents("").then((res) => setApiTotal(res.total)).catch(() => {});
    }
  }, [open, apiTotal]);

  // Debounced search
  useEffect(() => {
    const trimmed = search.trim();
    const timer = setTimeout(() => {
      if (!trimmed) {
        setApiResults([]);
        return;
      }
      searchComponents(search, MAX_RESULTS).then((res) => setApiResults(res.results)).catch(() => {});
    }, trimmed ? 200 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  // Build grouped results
  const grouped = useMemo(() => {
    if (!apiResults.length) return [];
    const byType: Record<string, SearchResult[]> = {};
    for (const r of apiResults) {
      if (!byType[r.type]) byType[r.type] = [];
      byType[r.type]!.push(r);
    }
    const allTypes = [...TYPE_ORDER, ...Object.keys(byType).filter((t) => !TYPE_ORDER.includes(t))];
    return allTypes
      .filter((type) => byType[type]?.length)
      .map((type) => ({ type, label: TYPE_LABELS[type] || type, items: byType[type]!.map((r) => ({ ...r, altId: "" })) }));
  }, [apiResults]);

  const totalCount = apiTotal;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setSearch("");
      }}
      title="Search Components"
      description="Search across all tabs — entities, plugins, workflows, forms, and more."
      showCloseButton={false}
    >
      <CommandInput placeholder="Search components..." value={search} onValueChange={setSearch} />
      <CommandList className="max-h-[400px]">
        {!search.trim() ? (
          <p className="py-14 text-center text-sm text-muted-foreground">
            Search {totalCount.toLocaleString()} components across all tabs
          </p>
        ) : grouped.length === 0 ? (
          <CommandEmpty>No results found.</CommandEmpty>
        ) : null}
        {grouped.map((group) => (
          <CommandGroup key={group.type} heading={group.label}>
            {group.items.map((comp, i) => (
              <CommandItem
                key={`${comp.tabId}-${comp.searchName}-${i}`}
                value={`${comp.name} ${comp.searchName} ${String(comp.sub || "")} ${comp.altId || ""}`}
                onSelect={() => {
                  navigateToTab(comp.tabId, comp.itemId || comp.searchName);
                  setOpen(false);
                }}
              >
                <DashboardIcon iconKey={comp.type} className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{comp.name}</span>
                {comp.sub && (
                  <span className="text-xs text-muted-foreground shrink-0 max-w-[120px] truncate">
                    {comp.sub}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
