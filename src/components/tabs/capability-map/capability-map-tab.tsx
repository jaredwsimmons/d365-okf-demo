"use client";

import { useState, useMemo, useCallback } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useCapabilityMap } from "@/hooks/use-inventory-api";
import { ExplorerSkeleton } from "@/components/shared/loading-states";
import type { ComponentIndex, IndexedComponent } from "@/lib/component-index";
import type { Capability, CapabilityMap } from "@/types/inventory";
import { Separator } from "@/components/ui";
import { ScrollArea } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Input } from "@/components/ui";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { ComponentTypeGroup } from "@/components/shared/component-type-group";
import { StatsBar } from "@/components/shared/stats-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { DatabaseZap } from "lucide-react";
import { SplitPaneLayout } from "@/components/shared/split-pane-layout";
import { TYPE_ORDER, TYPE_LABELS } from "@/lib/constants";

// Heat color utility
function getHeatColor(count: number, maxCount: number): string {
  if (maxCount === 0) return "#3b82f6";
  const ratio = count / maxCount;
  if (ratio === 0) return "#3b82f6";
  if (ratio < 0.2) return "#10b981";
  if (ratio < 0.4) return "#fcd34d";
  if (ratio < 0.6) return "#f97316";
  return "#f43f5e";
}

function HeatDot({ count, maxCount }: { count: number; maxCount: number }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: getHeatColor(count, maxCount) }}
    />
  );
}

// --- Main Component ---
export function CapabilityMapTab() {
  const { navigateToTab } = useDashboard();
  const { data: apiCapMap, isLoading: capLoading } = useCapabilityMap();

  const capabilityMap = (apiCapMap ?? null) as CapabilityMap | null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const compIndex: ComponentIndex | null = null;

  const maxCount = useMemo(() => {
    if (!capabilityMap) return 0;
    return Math.max(...capabilityMap.capabilities.map((c) => c.componentCount), 0);
  }, [capabilityMap]);

  const selectedCap = useMemo(() => {
    if (!capabilityMap || !selectedId) return null;
    return capabilityMap.capabilities.find((c) => c.id === selectedId) ?? null;
  }, [capabilityMap, selectedId]);

  // Filter capabilities by search
  const filtered = useMemo(() => {
    if (!capabilityMap) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return capabilityMap.capabilities;
    return capabilityMap.capabilities.filter((cap) =>
      `${cap.id} ${cap.name} ${cap.description}`.toLowerCase().includes(q)
    );
  }, [capabilityMap, searchQuery]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  if (capLoading) return <ExplorerSkeleton />;

  if (!capabilityMap) {
    return (
      <EmptyState
        icon={<DatabaseZap className="w-10 h-10" />}
        title="No data available"
        subtitle="Run the extraction pipeline to populate capability map data"
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Stats Bar */}
      <StatsBar
        stats={[
          { value: String(capabilityMap.capabilities.length), label: "Capabilities" },
          { value: String((capabilityMap as Record<string, unknown>).totalComponentsClustered as number || 0), label: "Components Mapped" },
        ]}
        rightSlot={
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Density:</span>
            {["#3b82f6", "#10b981", "#fcd34d", "#f97316", "#f43f5e"].map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
            ))}
            <span className="text-[10px] text-muted-foreground">Low &rarr; High</span>
          </div>
        }
      />

      <SplitPaneLayout
        defaultWidth={400}
        minLeft={280}
        minRight={320}
        listPane={
          <>
            <div className="px-3 py-2 border-b bg-card flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search capabilities..."
                className="h-8 text-xs flex-1"
              />
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="py-1">
                {filtered.map((cap) => (
                  <div
                    key={cap.id}
                    className={`flex items-center gap-1.5 px-3 py-2.5 cursor-pointer hover:bg-accent/50 border-l-2 ${
                      selectedId === cap.id ? "bg-accent border-l-primary" : "border-l-transparent"
                    }`}
                    onClick={() => handleSelect(cap.id)}
                  >
                    <HeatDot count={cap.componentCount} maxCount={maxCount} />
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{cap.id}</span>
                    <span className="text-sm truncate flex-1">{cap.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                      {cap.componentCount}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        }
        detailPane={
          <ScrollArea className="flex-1 h-0">
            <div className="p-4">
              {selectedCap ? (
                <CapDetail
                  capability={selectedCap}
                  maxCount={maxCount}
                  compIndex={compIndex}
                  onNavigate={navigateToTab}
                />
              ) : (
                <EmptyState
                  title="Select a capability from the list"
                  subtitle="Click any item to view its components"
                  className="h-64"
                />
              )}
            </div>
          </ScrollArea>
        }
      />
    </div>
  );
}

// --- Detail Panel ---
function CapDetail({
  capability,
  maxCount,
  compIndex,
  onNavigate,
}: {
  capability: Capability;
  maxCount: number;
  compIndex: ComponentIndex | null;
  onNavigate: (tabId: string, searchName: string) => void;
}) {
  const components = useMemo(() => {
    if (!compIndex) return [];
    const componentIds = capability.components || [];
    const lookup = new Map<string, IndexedComponent>();
    compIndex.all.forEach((comp) => {
      lookup.set(`${comp.dataKey}:${comp.itemId}`, comp);
    });
    return componentIds.map((id) => lookup.get(id)).filter(Boolean) as IndexedComponent[];
  }, [capability.components, compIndex]);

  // Group by type
  const byType: Record<string, IndexedComponent[]> = {};
  components.forEach((c) => {
    if (!byType[c.type]) byType[c.type] = [];
    byType[c.type]!.push(c);
  });

  // Entities in this capability
  const entities = useMemo(() => {
    const set = new Set<string>();
    components.forEach((c) => {
      if (c.type === "Entity") set.add(c.name);
    });
    return Array.from(set).sort();
  }, [components]);

  return (
    <>
      {/* Title */}
      <div className="flex items-start gap-2 mb-1">
        <HeatDot count={capability.componentCount} maxCount={maxCount} />
        <div className="flex-1">
          <h2 className="text-base font-semibold">{capability.name}</h2>
          <span className="text-xs text-muted-foreground font-mono">{capability.id}</span>
        </div>
      </div>

      {/* Description */}
      {capability.description && (
        <div className="text-sm text-foreground/80 bg-muted rounded-md px-3 py-2 leading-relaxed mb-3 border-l-2 border-muted-foreground/20">
          {capability.description}
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TYPE_ORDER.filter((t) => byType[t]).map((t) => (
          <Badge key={t} variant="outline" className="text-xs font-normal flex items-center gap-1">
            <DashboardIcon iconKey={t} className="w-3.5 h-3.5 shrink-0" />
            {byType[t]!.length} {TYPE_LABELS[t] || t}
          </Badge>
        ))}
      </div>

      {/* Entities summary */}
      {entities.length > 0 && (
        <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 text-xs mb-3 bg-muted/50 rounded-md px-3 py-2">
          <span className="text-muted-foreground">Entities</span>
          <span>{entities.join(", ")}</span>
        </div>
      )}

      <Separator className="mb-3" />

      {/* Components by type */}
      {components.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Components ({components.length})
          </h3>
          {TYPE_ORDER.filter((t) => byType[t]).map((type) => {
            const items = byType[type]!.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
            return (
              <ComponentTypeGroup
                key={type}
                type={type}
                items={items}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-muted/50 rounded-md px-3 py-3 text-sm text-muted-foreground">
          No components mapped to this capability yet.
        </div>
      )}
    </>
  );
}
