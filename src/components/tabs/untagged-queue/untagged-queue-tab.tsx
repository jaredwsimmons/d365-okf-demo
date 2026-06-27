"use client";

import { useState, useMemo, useCallback } from "react";
import { useBulkEdit } from "@/hooks/use-bulk-edit";
import { SquarePen } from "lucide-react";
import { Button } from "@/components/ui";
import { StatsBar } from "@/components/shared/stats-bar";
import { Checkbox } from "@/components/ui";
import { ScrollArea } from "@/components/ui";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { compIconKey, subIconKey } from "@/lib/icons";
import { BulkEditPanel } from "@/components/tabs/process-catalog/process-catalog-bulk-edit";
import type { IndexedComponent } from "@/lib/component-index";
import { useUntagged } from "@/hooks/use-inventory-api";
import { ExplorerSkeleton } from "@/components/shared/loading-states";
import { TYPE_ORDER, TYPE_LABELS } from "@/lib/constants";
import { resolveTypeRouting } from "@/lib/inventory-types";

type GapFilter = "all" | "bpc" | "orphaned";

const GAP_OPTIONS: { value: GapFilter; label: string }[] = [
  { value: "all", label: "All Components" },
  { value: "bpc", label: "No BPC" },
  { value: "orphaned", label: "Orphaned" },
];

// Max items per group when showing all types (keeps DOM light)
const GROUP_PREVIEW_LIMIT = 10;

export function UntaggedQueueTab() {
  const { data: apiUntagged, isLoading: untaggedLoading } = useUntagged();
  const catalog = null;

  const [gapFilter, setGapFilter] = useState<GapFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const { checkedComps, toggleCheck, checkAll, uncheckAll } = useBulkEdit();
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Compute untagged lists and stats
  const { untagged, stats } = useMemo(() => {
    if (apiUntagged) {
      // Convert API response to IndexedComponent format
      const items = (apiUntagged.items || []).map((item: Record<string, unknown>) => ({
        name: item.name as string,
        type: item.type as string,
        itemId: item.id as string,
        searchName: item.id as string,
        ...resolveTypeRouting(item.type as string),
        solution: item.solution as string || "",
        tags: {},
        sub: "",
        altId: "",
      })) as IndexedComponent[];

      return {
        untagged: { all: items, bpc: items, orphaned: [] as IndexedComponent[] },
        stats: { total: items.length, noBpc: items.length, orphaned: 0, either: items.length },
      };
    }

    return {
      untagged: { all: [] as IndexedComponent[], bpc: [] as IndexedComponent[], orphaned: [] as IndexedComponent[] },
      stats: { total: 0, noBpc: 0, orphaned: 0, either: 0 },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, apiUntagged]);

  // Active list based on gap filter
  const activeList = untagged[gapFilter];

  // Type counts for filter chips (from active gap list)
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of activeList) counts[c.type] = (counts[c.type] || 0) + 1;
    return counts;
  }, [activeList]);

  // Apply type filter
  const filtered = useMemo(
    () => (typeFilter ? activeList.filter((c) => c.type === typeFilter) : activeList),
    [activeList, typeFilter],
  );

  // Group by type for display
  const grouped = useMemo(() => {
    const byType: Record<string, IndexedComponent[]> = {};
    for (const comp of filtered) {
      if (!byType[comp.type]) byType[comp.type] = [];
      byType[comp.type]!.push(comp);
    }
    // Sort each group alphabetically
    for (const items of Object.values(byType)) {
      items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    const allTypes = [
      ...TYPE_ORDER,
      ...Object.keys(byType).filter((t) => !TYPE_ORDER.includes(t)),
    ];
    return allTypes
      .filter((type) => byType[type]?.length)
      .map((type) => ({
        type,
        label: TYPE_LABELS[type] || type,
        items: byType[type]!,
      }));
  }, [filtered]);

  // Types that appear in the active list (for chips)
  const typeChips = useMemo(() => {
    const allTypes = [
      ...TYPE_ORDER,
      ...Object.keys(typeCounts).filter((t) => !TYPE_ORDER.includes(t)),
    ];
    return allTypes.filter((t) => (typeCounts[t] ?? 0) > 0);
  }, [typeCounts]);

  // Checkbox helpers
  const compKey = (c: IndexedComponent) => `${c.dataKey}::${c.itemId}`;

  // After bulk edit saves
  const handleApplied = useCallback(() => {
    setRefreshKey((k) => k + 1);
    uncheckAll();
  }, [uncheckAll]);

  if (untaggedLoading) return <ExplorerSkeleton />;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-background">
      {/* Stats bar */}
      <StatsBar
        stats={[
          { value: stats.either.toLocaleString(), label: "Untagged", highlight: stats.either > 0 },
          { value: stats.total.toLocaleString(), label: "Total Components" },
          { value: stats.orphaned.toLocaleString(), label: "Orphaned" },
        ]}
      />

      {/* Gap filter */}
      <div className="px-4 py-2 border-b bg-white dark:bg-background shrink-0 flex items-center gap-2">
        <div className="flex rounded-md overflow-hidden border">
          {GAP_OPTIONS.map((opt) => {
            return (
              <button
                key={opt.value}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  gapFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent"
                }`}
                onClick={() => {
                  setGapFilter(opt.value);
                  setTypeFilter(null);
                  uncheckAll();
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <Button
          size="sm"
          className="ml-auto bg-brand-accent hover:bg-brand-accent/90 text-white"
          onClick={() => setShowBulkEdit(!showBulkEdit)}
        >
          <SquarePen />
          Edit Components
        </Button>
      </div>

      {/* Main content: list + optional bulk edit panel */}
      <div className="flex flex-1 min-h-0">
        {/* Left: type chips + component list */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-background">
          {/* Type filter chips */}
          <div className="px-4 py-2 border-b shrink-0 flex items-center gap-1.5 flex-wrap">
            <button
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                !typeFilter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              onClick={() => setTypeFilter(null)}
            >
              All ({activeList.length.toLocaleString()})
            </button>
            {typeChips.map((type) => (
              <button
                key={type}
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  typeFilter === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
                onClick={() => {
                  setTypeFilter(type === typeFilter ? null : type);
                  uncheckAll();
                }}
              >
                {TYPE_LABELS[type] || type} ({typeCounts[type]})
              </button>
            ))}
          </div>

          {/* Component list */}
          <ScrollArea className="flex-1 h-0">
            <div className="p-2">
              {grouped.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  {stats.either === 0
                    ? "All components are tagged!"
                    : "No components match the current filters."}
                </div>
              ) : (
                grouped.map((group) => {
                  const isCapped = !typeFilter && group.items.length > GROUP_PREVIEW_LIMIT;
                  const visible = isCapped ? group.items.slice(0, GROUP_PREVIEW_LIMIT) : group.items;
                  return (
                    <div key={group.type} className="mb-3">
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                        {group.label} ({group.items.length})
                      </div>
                      {visible.map((comp, i) => {
                        const key = compKey(comp);
                        const isChecked = checkedComps.has(key);
                        return (
                          <label
                            key={`${key}::${String(comp.sub || "")}::${i}`}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-accent"
                                : "hover:bg-accent/50"
                            }`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleCheck(key)}
                            />
                            {(() => {
                              const isBRE = comp.type === "WebResource" && comp.name.startsWith("Rules ");
                              const isImage = comp.type === "WebResource" && ["PNG", "JPG", "Vector"].includes(comp.sub || "");
                              const ik = compIconKey(comp.type, comp.tags, { isBRE, isImage });
                              const langIcon = ik === comp.type ? subIconKey(comp.type, comp.sub) : undefined;
                              const displayIcon = langIcon ?? ik;
                              return <DashboardIcon iconKey={displayIcon} fallbackType={comp.type} className="h-4 w-4 shrink-0" />;
                            })()}
                            <span className="flex-1 truncate text-sm">
                              {comp.name}
                            </span>
                            {comp.sub && (
                              <span className="text-xs text-muted-foreground shrink-0 max-w-[140px] truncate">
                                {String(comp.sub)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                      {isCapped && (
                        <button
                          className="w-full px-2 py-1.5 text-xs text-primary hover:text-primary/80 hover:bg-accent/30 rounded-md transition-colors text-left"
                          onClick={() => setTypeFilter(group.type)}
                        >
                          Show all {group.items.length} {group.label.toLowerCase()}...
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: bulk edit panel */}
        {showBulkEdit && catalog && (
          <BulkEditPanel
            catalog={catalog}
            currentComps={filtered}
            checkedComps={checkedComps}
            onCheckAll={() => checkAll(filtered.map(compKey))}
            onUncheckAll={uncheckAll}
            onClose={() => setShowBulkEdit(false)}
            onApplied={handleApplied}
          />
        )}
      </div>
    </div>
  );
}
