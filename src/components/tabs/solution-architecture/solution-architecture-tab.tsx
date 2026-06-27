"use client";

import { useState, useMemo, useCallback } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { buildSolutionIndexFromApi, getSolutionType, type SolutionIndex, type SolutionInfo, type SolutionLayer, type LayerInfo } from "@/lib/solution-index";
import { useSolutions, useSolutionComponents } from "@/hooks/use-inventory-api";
import { ComponentTypeGroup } from "@/components/shared/component-type-group";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { StatsBar } from "@/components/shared/stats-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { SplitPaneLayout } from "@/components/shared/split-pane-layout";
import { TYPE_LABELS } from "@/lib/constants";
import { Input } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Separator } from "@/components/ui";
import { ScrollArea } from "@/components/ui";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Layer colors ---
const LAYER_COLORS: Record<SolutionLayer, string> = {
  "Core": "var(--color-chart-1)",
  "Vertical: Services": "var(--color-chart-4)",
  "Vertical: Construction": "var(--color-chart-2)",
  "Integrated": "var(--color-chart-3)",
  "Company / Security": "var(--color-chart-5)",
  "ISV / External": "var(--color-muted-foreground)",
};

// --- Selection type ---
type Selection =
  | { kind: "layer"; layer: SolutionLayer }
  | { kind: "solution"; solutionName: string };

// --- Type breakdown bar ---
function TypeBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs w-28 shrink-0 text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs w-8 text-right tabular-nums">{count}</span>
    </div>
  );
}

// --- Main Component ---
export function SolutionArchitectureTab() {
  const { navigateToTab } = useDashboard();
  const { data: apiSolutions } = useSolutions();
  const { data: apiSolComponents } = useSolutionComponents();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expandedLayers, setExpandedLayers] = useState<Set<SolutionLayer>>(
    new Set(["Core", "Vertical: Services", "Vertical: Construction", "Integrated"])
  );
  const [searchQuery, setSearchQuery] = useState("");

  const solIndex = useMemo<SolutionIndex | null>(() => {
    if (!apiSolutions) return null;
    return buildSolutionIndexFromApi(
      apiSolutions as { solutions: Record<string, unknown>[]; dependencies: Record<string, unknown>[] },
      (apiSolComponents || undefined) as Parameters<typeof buildSolutionIndexFromApi>[1],
    );
  }, [apiSolutions, apiSolComponents]);

  // Filter solutions by search
  const filteredByLayer = useMemo(() => {
    if (!solIndex) return new Map<SolutionLayer, SolutionInfo[]>();
    const q = searchQuery.toLowerCase().trim();
    const result = new Map<SolutionLayer, SolutionInfo[]>();
    for (const layer of solIndex.layerOrder) {
      const layerInfo = solIndex.byLayer.get(layer)!;
      if (!q) {
        result.set(layer, layerInfo.solutions);
      } else {
        result.set(layer, layerInfo.solutions.filter(s =>
          s.name.toLowerCase().includes(q)
        ));
      }
    }
    return result;
  }, [solIndex, searchQuery]);

  // Auto-expand layers with search matches
  const effectiveLayers = useMemo(() => {
    if (!searchQuery.trim()) return expandedLayers;
    const auto = new Set<SolutionLayer>();
    for (const [layer, sols] of filteredByLayer) {
      if (sols.length > 0) auto.add(layer);
    }
    return auto;
  }, [searchQuery, expandedLayers, filteredByLayer]);

  const toggleLayer = useCallback((layer: SolutionLayer) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  }, []);

  const handleNavigate = useCallback((tabId: string, searchName: string) => {
    navigateToTab(tabId, searchName);
  }, [navigateToTab]);

  // Stats
  const stats = useMemo(() => {
    if (!solIndex) return { total: 0, layers: 0, totalComps: 0, largest: "", largestCount: 0 };
    let largest = "";
    let largestCount = 0;
    for (const sol of solIndex.allSolutions) {
      if (sol.totalCount > largestCount) {
        largest = sol.name;
        largestCount = sol.totalCount;
      }
    }
    const activeLayers = solIndex.layerOrder.filter(l => (solIndex.byLayer.get(l)?.solutions.length || 0) > 0).length;
    return {
      total: solIndex.allSolutions.length,
      layers: activeLayers,
      totalComps: solIndex.totalComponents,
      largest,
      largestCount,
    };
  }, [solIndex]);

  // Selected detail data
  const selectedLayer = useMemo<LayerInfo | null>(() => {
    if (!solIndex || !selection || selection.kind !== "layer") return null;
    return solIndex.byLayer.get(selection.layer) || null;
  }, [solIndex, selection]);

  const selectedSolution = useMemo<SolutionInfo | null>(() => {
    if (!solIndex || !selection || selection.kind !== "solution") return null;
    return solIndex.bySolution.get(selection.solutionName) || null;
  }, [solIndex, selection]);

  // L1 name lookup (not available in solution architecture — would need process catalog API)
  const l1Lookup: Record<string, string> = {};

  if (!solIndex) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Stats bar */}
      <StatsBar stats={[
        { value: String(stats.total), label: "Solutions" },
        { value: String(stats.layers), label: "Layers" },
        { value: stats.totalComps.toLocaleString(), label: "Components" },
        { value: `${stats.largest} (${stats.largestCount})`, label: "Largest Solution" },
      ]} />

      {/* Split pane */}
      <SplitPaneLayout
        defaultWidth={380}
        minLeft={260}
        minRight={320}
        listPane={
          <>
            <div className="px-3 py-2 border-b bg-card">
              <Input
                placeholder="Search solutions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="py-1">
                {solIndex.layerOrder.map(layer => {
                  const layerInfo = solIndex.byLayer.get(layer)!;
                  const solutions = filteredByLayer.get(layer) || [];
                  const isExpanded = effectiveLayers.has(layer);
                  const isLayerSelected = selection?.kind === "layer" && selection.layer === layer;

                  return (
                    <div key={layer}>
                      {/* Layer header — always shows layer color on left border */}
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-accent/50 transition-colors border-l-2",
                          isLayerSelected && "bg-accent",
                        )}
                        style={{ borderLeftColor: LAYER_COLORS[layer] }}
                        onClick={() => {
                          setSelection({ kind: "layer", layer });
                          toggleLayer(layer);
                        }}
                      >
                        <ChevronRight className={cn(
                          "w-3.5 h-3.5 shrink-0 transition-transform text-muted-foreground",
                          isExpanded && "rotate-90",
                        )} />
                        <span className="text-xs font-semibold flex-1">{layer}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-auto shrink-0">
                          {layerInfo.solutions.length}s / {layerInfo.totalCount}c
                        </Badge>
                      </div>

                      {/* Solution rows */}
                      {isExpanded && solutions.map(sol => {
                        const isSolSelected = selection?.kind === "solution" && selection.solutionName === sol.name;
                        return (
                          <div
                            key={sol.name}
                            className={cn(
                              "flex items-center gap-2 pl-7 pr-2 py-2.5 cursor-pointer hover:bg-accent/50 text-xs transition-colors border-l-2",
                              isSolSelected ? "bg-accent border-l-primary" : "border-l-transparent",
                            )}
                            onClick={() => setSelection({ kind: "solution", solutionName: sol.name })}
                          >
                            <span className="flex-1 truncate">{sol.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-auto shrink-0">{sol.totalCount}</Badge>
                          </div>
                        );
                      })}

                      {isExpanded && solutions.length === 0 && searchQuery && (
                        <div className="pl-7 pr-2 py-1 text-[10px] text-muted-foreground">No matches</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        }
        detailPane={
          !selection ? (
            <EmptyState title="Select a layer or solution" subtitle="Click any item in the tree to view details" />
          ) : selection.kind === "layer" && selectedLayer ? (
            <LayerDetail
              layerInfo={selectedLayer}
              l1Lookup={l1Lookup}
              onSelectSolution={name => setSelection({ kind: "solution", solutionName: name })}
            />
          ) : selection.kind === "solution" && selectedSolution ? (
            <SolutionDetail
              solution={selectedSolution}
              l1Lookup={l1Lookup}
              onNavigate={handleNavigate}
              solutionDeps={null}
            />
          ) : null
        }
      />
    </div>
  );
}

// --- Layer Detail ---

function LayerDetail({
  layerInfo,
  l1Lookup,
  onSelectSolution,
}: {
  layerInfo: LayerInfo;
  l1Lookup: Record<string, string>;
  onSelectSolution: (name: string) => void;
}) {
  const sortedTypes = useMemo(() => {
    return Object.entries(layerInfo.countsByType)
      .sort((a, b) => b[1] - a[1]);
  }, [layerInfo]);

  const maxTypeCount = sortedTypes.length > 0 ? sortedTypes[0]![1] : 0;

  return (
    <ScrollArea className="flex-1 h-0">
      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{layerInfo.layer}</h2>
          <p className="text-xs text-muted-foreground">
            {layerInfo.solutions.length} solutions, {layerInfo.totalCount.toLocaleString()} components
          </p>
        </div>

        <Separator />

        {/* Type breakdown bars */}
        <div>
          <h3 className="text-xs font-semibold text-foreground/80 mb-2">Component Breakdown</h3>
          {sortedTypes.map(([type, count]) => (
            <TypeBar key={type} label={TYPE_LABELS[type] || type} count={count} max={maxTypeCount} />
          ))}
        </div>

        <Separator />

        {/* Solution cards */}
        <div>
          <h3 className="text-xs font-semibold text-foreground/80 mb-2">Solutions</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {layerInfo.solutions
              .sort((a, b) => b.totalCount - a.totalCount)
              .map(sol => {
                const bpcName = sol.bpcL1Code ? l1Lookup[sol.bpcL1Code] : null;
                return (
                  <div
                    key={sol.name}
                    className="border rounded-md p-3 hover:bg-accent/30 cursor-pointer transition-colors"
                    onClick={() => onSelectSolution(sol.name)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{sol.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-auto shrink-0 ml-2">{sol.totalCount}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px] py-0 h-auto">{getSolutionType(sol.name)}</Badge>
                      {bpcName && (
                        <Badge variant="outline" className="text-[10px] py-0 h-auto">{sol.bpcL1Code} {bpcName}</Badge>
                      )}
                    </div>
                    {/* Mini type breakdown */}
                    <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                      {Object.entries(sol.countsByType)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([type, count]) => (
                          <span key={type}>{TYPE_LABELS[type] || type}: {count}</span>
                        ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// --- Solution Detail ---

function SolutionDetail({
  solution,
  l1Lookup,
  onNavigate,
  solutionDeps,
}: {
  solution: SolutionInfo;
  l1Lookup: Record<string, string>;
  onNavigate: (tabId: string, searchName: string) => void;
  solutionDeps: import("@/types/inventory").SolutionDependenciesData | null;
}) {
  const bpcName = solution.bpcL1Code ? l1Lookup[solution.bpcL1Code] : null;

  // Find dependency info for this solution
  const depInfo = useMemo(() => {
    if (!solutionDeps) return null;
    const sol = solutionDeps.solutions.find(s => s.uniqueName === solution.name);
    const dependsOn = solutionDeps.dependencies
      .filter(d => d.from === solution.name)
      .map(d => ({ name: d.to, componentCount: d.componentCount }));
    const dependedBy = solutionDeps.dependencies
      .filter(d => d.to === solution.name)
      .map(d => ({ name: d.from, componentCount: d.componentCount }));
    const missingDeps = solutionDeps.missingDependencies.find(m => m.solution === solution.name);
    return {
      version: sol?.version,
      publisher: sol?.publisher,
      publisherPrefix: sol?.publisherPrefix,
      isManaged: sol?.isManaged,
      dependsOn,
      dependedBy,
      missingCount: missingDeps?.count ?? 0,
    };
  }, [solutionDeps, solution.name]);

  // Group components by type for ComponentTypeGroup
  const groupedByType = useMemo(() => {
    const groups: Record<string, typeof solution.components> = {};
    for (const c of solution.components) {
      if (!groups[c.type]) groups[c.type] = [];
      groups[c.type]!.push(c);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [solution]);

  const sortedTypes = useMemo(() => {
    return Object.entries(solution.countsByType).sort((a, b) => b[1] - a[1]);
  }, [solution]);

  return (
    <ScrollArea className="flex-1 h-0">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold">{solution.name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Badge style={{ borderColor: LAYER_COLORS[solution.layer] }} variant="outline" className="text-[10px] py-0 h-auto">
              {solution.layer}
            </Badge>
            <Badge variant="outline" className="text-[10px] py-0 h-auto">{getSolutionType(solution.name)}</Badge>
            {bpcName && (
              <Badge variant="outline" className="text-[10px] py-0 h-auto">{solution.bpcL1Code} {bpcName}</Badge>
            )}
          </div>
        </div>

        {/* Solution metadata from dependencies */}
        {depInfo && (
          <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-xs bg-muted/50 rounded-md px-3 py-2">
            {depInfo.version && <><span className="text-muted-foreground">Version</span><span>{depInfo.version}</span></>}
            {depInfo.publisher && <><span className="text-muted-foreground">Publisher</span><span>{depInfo.publisher}</span></>}
            {depInfo.publisherPrefix && <><span className="text-muted-foreground">Prefix</span><span className="font-mono">{depInfo.publisherPrefix}</span></>}
            <span className="text-muted-foreground">Managed</span><span>{depInfo.isManaged ? "Yes" : "No"}</span>
            <span className="text-muted-foreground">Depends On</span><span>{depInfo.dependsOn.length} solutions</span>
            <span className="text-muted-foreground">Depended By</span><span>{depInfo.dependedBy.length} solutions</span>
            {depInfo.missingCount > 0 && <><span className="text-muted-foreground text-destructive">Missing Deps</span><span className="text-destructive">{depInfo.missingCount} components</span></>}
          </div>
        )}

        {/* Dependency lists */}
        {depInfo?.dependsOn.length ? (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Depends On ({depInfo.dependsOn.length})</h3>
            <div className="space-y-0.5">
              {depInfo.dependsOn.sort((a, b) => a.name.localeCompare(b.name)).map(d => (
                <div key={d.name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 text-xs cursor-pointer"
                  onClick={() => { /* could navigate to that solution */ }}>
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-[10px] text-muted-foreground">{d.componentCount} deps</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {depInfo?.dependedBy.length ? (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Depended By ({depInfo.dependedBy.length})</h3>
            <div className="space-y-0.5">
              {depInfo.dependedBy.sort((a, b) => a.name.localeCompare(b.name)).map(d => (
                <div key={d.name} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 text-xs">
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-[10px] text-muted-foreground">{d.componentCount} deps</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Stat pills */}
        <div className="flex flex-wrap gap-1.5">
          {sortedTypes.map(([type, count]) => (
            <Badge
              key={type}
              variant="outline"
              className="text-xs font-normal flex items-center gap-1"
            >
              <DashboardIcon iconKey={type} className="w-3.5 h-3.5 shrink-0" />
              {count} {TYPE_LABELS[type] || type}
            </Badge>
          ))}
        </div>

        <Separator />

        {/* Component list by type */}
        {groupedByType.map(([type, items]) => (
          <ComponentTypeGroup
            key={type}
            type={type}
            items={items}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
