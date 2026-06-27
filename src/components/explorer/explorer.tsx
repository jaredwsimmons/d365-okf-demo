"use client";

import { memo } from "react";
import { Input } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";
import { ScrollArea } from "@/components/ui";
import { Card } from "@/components/ui";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { StatsBar } from "@/components/shared/stats-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { SplitPaneLayout } from "@/components/shared/split-pane-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  TooltipProvider,
} from "@/components/ui";
import { SquarePen, CircleOff, ArrowLeft, Trash2, MousePointer2 } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import { useExplorer } from "@/hooks/use-explorer";
import { TagEditPanel } from "./tag-edit-panel";
import { DynamicDetail } from "@/components/details/dynamic-detail";
import type {
  ExplorerConfig,
  PillDef,
  FilterDef,
  Tags,
} from "@/types/inventory";

interface ExplorerProps<T> {
  config: ExplorerConfig<T>;
  items: T[];
}

export function Explorer<T extends Record<string, unknown>>({
  config,
  items,
  enrichedItem,
}: ExplorerProps<T> & { enrichedItem?: T | null }) {
  const { navigateToTab, navigateBack, canGoBack } = useDashboard();
  const {
    search, setSearch,
    filterValues, setFilterValues,
    uncatOnly, setUncatOnly,
    showRemoved, setShowRemoved,
    editing, setEditing,
    sorted, filtered, displayItems,
    filterOptions, stats,
    selectedItem,
    hasRemoved,
    handleSelect,
    clearFilters,
    applyOverride,
    selectedIdx,
  } = useExplorer(config, items);

  return (
    <TooltipProvider>
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        <div className="flex-1 flex flex-col px-4 mt-4 min-h-0 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Input
              placeholder={config.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 h-8 text-sm"
            />
            {(config.filters || []).map((f: FilterDef) => (
              <Select
                key={f.id}
                value={filterValues[f.id] || "all"}
                onValueChange={(v) =>
                  setFilterValues((prev) => ({
                    ...prev,
                    [f.id]: v === "all" ? "" : v,
                  }))
                }
              >
                <SelectTrigger size="sm" className="w-auto text-xs">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{f.label}</SelectItem>
                  {(filterOptions[f.id] || []).map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            <button
              onClick={() => setUncatOnly(!uncatOnly)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                uncatOnly ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "hover:bg-accent"
              }`}
            >
              <CircleOff className="w-3.5 h-3.5" />
              Uncategorized
            </button>
            {hasRemoved && (
              <button
                onClick={() => setShowRemoved(!showRemoved)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  showRemoved ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "hover:bg-accent"
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Removed
              </button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={clearFilters}
            >
              Clear
            </Button>
            <Badge variant="secondary" className="ml-auto text-xs font-normal">
              {filtered.length} of {sorted.length}
            </Badge>
          </div>

          {/* Split pane: list + detail */}
          <Card className="flex-1 flex flex-col overflow-hidden py-0 gap-0 min-h-0">
            {stats.length > 0 && (
              <StatsBar stats={stats.map(s => ({ value: String(s.num), label: s.label }))} />
            )}
            <SplitPaneLayout
              defaultWidth={300}
              listPaneClassName="flex flex-col overflow-hidden shrink-0"
              detailPaneClassName="min-w-[280px]"
              listPane={
                <ScrollArea className="flex-1 h-0">
                  <div className="divide-y">
                    {displayItems.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No items match your filters.
                      </div>
                    ) : (
                      displayItems.map((item, i) => (
                        <ExplorerListItem
                          key={i}
                          item={item}
                          config={config}
                          index={i}
                          selected={i === selectedIdx}
                          onSelect={handleSelect}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              }
              detailPane={
                selectedItem ? (
                  <ScrollArea className="flex-1 h-0">
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        {canGoBack ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={navigateBack}
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back
                          </Button>
                        ) : <div />}
                        <Button
                          size="sm"
                          className="bg-brand-accent hover:bg-brand-accent/90 text-white"
                          onClick={() => setEditing(true)}
                        >
                          <SquarePen />
                          Edit Components
                        </Button>
                      </div>
                      {config.detailConfig ? (
                        <DynamicDetail item={(enrichedItem || selectedItem) as T} config={config.detailConfig} icon={config.icon} onNavigate={navigateToTab} />
                      ) : config.renderDetail ? (
                        config.renderDetail((enrichedItem || selectedItem) as T, navigateToTab)
                      ) : null}
                    </div>
                  </ScrollArea>
                ) : (
                  <EmptyState
                    icon={<MousePointer2 className="w-10 h-10" />}
                    title="Select an item"
                    subtitle="Click any item to view details"
                  />
                )
              }
            />
          </Card>
        </div>

        {/* Tag Edit Panel */}
        {editing && selectedItem && (
          <TagEditPanel
            dataKey={config.dataKey as string}
            itemId={String((selectedItem as Record<string, unknown>)[config.idField] || "")}
            itemName={config.listTitle(selectedItem)}
            currentTags={((selectedItem as Record<string, unknown>).tags as Tags) || {}}
            currentItem={selectedItem as Record<string, unknown>}
            editableFields={config.editableFields}
            onSave={({ tags, fields }) => {
              const id = String((selectedItem as Record<string, unknown>)[config.idField] || "");
              applyOverride(id, {
                tags,
                ...(fields || {}),
                _hasOverride: true,
              } as unknown as Partial<T>);
            }}
            onClose={() => setEditing(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// --- List Item (memoized to skip re-render when only selectedIdx changes) ---
function ExplorerListItemBase<T extends Record<string, unknown>>({
  item,
  config,
  index,
  selected,
  onSelect,
}: {
  item: T;
  config: ExplorerConfig<T>;
  index: number;
  selected: boolean;
  onSelect: (idx: number) => void;
}) {
  const title = config.listTitle(item);
  const subtitle = config.listSubtitle(item);
  const pills = config.listPills ? config.listPills(item) : [];
  const hasOverride = item._hasOverride as boolean;
  const isRemoved = item._status === "removed";

  return (
    <div
      className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-accent/50 border-l-2 ${
        selected ? "bg-accent border-l-primary" : "border-l-transparent"
      } ${isRemoved ? "opacity-50" : ""}`}
      onClick={() => onSelect(index)}
    >
      <div className="flex items-start gap-1.5 flex-wrap">
        <span className="text-sm font-medium text-foreground break-words">
          {title}
        </span>
        {isRemoved && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-auto text-destructive border-destructive/30"
          >
            Removed
          </Badge>
        )}
        {hasOverride && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-auto border-orange-300 text-orange-500 bg-orange-50 shrink-0"
          >
            Edited
          </Badge>
        )}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-0.5 break-words">
          {subtitle}
        </div>
      )}
      {pills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {pills.map((p: PillDef, j: number) => {
            const iconEl = p.iconKey ? (
              <DashboardIcon iconKey={p.iconKey} className="w-3 h-3" />
            ) : null;
            return p.color ? (
              <Badge
                key={j}
                variant="outline"
                className="text-[10px] py-0 h-auto flex items-center gap-0.5"
                style={{
                  borderColor: p.color,
                  color: p.color,
                  background: `color-mix(in srgb, ${p.color} 8%, transparent)`,
                }}
              >
                {iconEl}
                {p.text}
              </Badge>
            ) : (
              <Badge
                key={j}
                variant="secondary"
                className="text-[10px] py-0 h-auto flex items-center gap-0.5"
              >
                {iconEl}
                {p.text}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
const ExplorerListItem = memo(ExplorerListItemBase) as typeof ExplorerListItemBase;
