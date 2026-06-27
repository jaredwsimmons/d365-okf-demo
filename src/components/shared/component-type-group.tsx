"use client";

import { useState, memo } from "react";
import type { IndexedComponent } from "@/lib/component-index";
import { Button } from "@/components/ui";
import { Checkbox } from "@/components/ui";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { compIconKey, subIconKey } from "@/lib/icons";
import { TYPE_LABELS } from "@/lib/constants";

interface ComponentTypeGroupProps {
  type: string;
  items: IndexedComponent[];
  /** Max items to show before truncating (default 50) */
  limit?: number;
  /** Show a "Show N more..." button (true) or static "+N more" text (false). Default true. */
  expandable?: boolean;
  onNavigate: (tabId: string, searchName: string) => void;
  /** When provided, shows checkboxes for bulk editing */
  bulkEdit?: {
    checkedComps: Set<string>;
    onToggleCheck: (key: string) => void;
  };
  /** Label map override — defaults to TYPE_LABELS (full names) */
  typeLabels?: Record<string, string>;
}

export const ComponentTypeGroup = memo(function ComponentTypeGroup({
  type,
  items,
  limit = 50,
  expandable = true,
  onNavigate,
  bulkEdit,
  typeLabels = TYPE_LABELS,
}: ComponentTypeGroupProps) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, limit);
  const hasMore = items.length > limit;

  return (
    <div className="mb-3">
      <h4 className="text-xs font-semibold text-foreground/80 mb-1 flex items-center gap-1">
        <DashboardIcon iconKey={type} className="w-3.5 h-3.5 shrink-0" />
        {typeLabels[type] || type}{" "}
        <span className="font-normal text-muted-foreground">
          {items.length}
        </span>
      </h4>
      <div className="space-y-0">
        {shown.map((c, ci) => {
          const compKey = `${c.dataKey}::${c.itemId}`;
          const isBRE = type === "WebResource" && c.name.startsWith("Rules ");
          const isImage = type === "WebResource" && ["PNG", "JPG", "Vector"].includes(c.sub || "");
          const ik = compIconKey(type, c.tags, { isBRE, isImage });
          // Use language icon only when compIconKey returned the raw type (no specific enrichment)
          const langIcon = ik === type ? subIconKey(type, c.sub) : undefined;
          const displayIcon = langIcon ?? ik;
          return (
            <div
              key={`${c.tabId}-${c.searchName}-${ci}`}
              className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-accent/50 cursor-pointer text-xs"
              onClick={() => onNavigate(c.tabId, c.itemId || c.searchName)}
            >
              {bulkEdit && (
                <Checkbox
                  checked={bulkEdit.checkedComps.has(compKey)}
                  onCheckedChange={() => bulkEdit.onToggleCheck(compKey)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                />
              )}
              <DashboardIcon iconKey={displayIcon} fallbackType={type} className="w-3 h-3 shrink-0 opacity-50" />
              <span className="flex-1 truncate">{c.name}</span>
              {c.sub && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {c.sub}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {hasMore && !showAll && (
        expandable ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 text-xs h-6"
            onClick={() => setShowAll(true)}
          >
            Show {items.length - limit} more...
          </Button>
        ) : (
          <div className="text-center text-[10px] text-muted-foreground py-1">
            +{items.length - limit} more
          </div>
        )
      )}
    </div>
  );
});
