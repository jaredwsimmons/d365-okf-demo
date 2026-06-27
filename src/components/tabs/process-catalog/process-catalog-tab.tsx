"use client";

import { useState, useMemo, useCallback } from "react";
import { useBulkEdit } from "@/hooks/use-bulk-edit";
import { useDashboard } from "@/lib/dashboard-context";
import type { ComponentIndex, IndexedComponent } from "@/lib/component-index";
import { resolveTypeRouting } from "@/lib/inventory-types";
import { useProcessCatalog, useProcessCatalogComponents, useProcessNodeComponents } from "@/hooks/use-inventory-api";
import type { ProcessCatalog } from "@/types/inventory";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { ScrollArea } from "@/components/ui";
import { StatsBar } from "@/components/shared/stats-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { SplitPaneLayout } from "@/components/shared/split-pane-layout";
import { SquarePen, DatabaseZap } from "lucide-react";
import { PCTree, buildTreeData } from "./process-catalog-tree";
import { PCDetail } from "./process-catalog-detail";
import { BulkEditPanel } from "./process-catalog-bulk-edit";

// --- Main Component ---
export function ProcessCatalogTab() {
  const { navigateToTab, pendingBpcCode, diagramManifest } = useDashboard();
  const { data: apiCatalog } = useProcessCatalog();
  const { data: apiCatalogComps } = useProcessCatalogComponents();

  const catalog = (apiCatalog as unknown as ProcessCatalog) ?? null;

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const { checkedComps, toggleCheck, checkAll, uncheckAll } = useBulkEdit();
  const compIndex = useMemo(() => {
    if (apiCatalogComps) {
      // Build a lightweight ComponentIndex from API aggregation counts
      // Each "component" is a placeholder with the right BPC tag for counting
      const byL1: Record<string, Array<{ type: string; name: string; tags: Record<string, unknown> }>> = {};
      const byL2: Record<string, Array<{ type: string; name: string; tags: Record<string, unknown> }>> = {};
      const byL3: Record<string, Array<{ type: string; name: string; tags: Record<string, unknown> }>> = {};
      // Tags store full values like "95.00 Service to deliver", tree uses codes like "95.00"
      // L3 codes are "95.25.100 Receive service requests" → "95.25.100"
      const extractCode = (tagValue: string) => {
        const match = tagValue.match(/^([\d.]+)/);
        return match ? match[1]! : tagValue;
      };
      const counts = apiCatalogComps as { byL1: Record<string, number>; byL2: Record<string, number>; byL3: Record<string, number> };
      for (const [tagValue, count] of Object.entries(counts.byL1 || {})) {
        const code = extractCode(tagValue);
        byL1[code] = (byL1[code] || []).concat(Array(count).fill({ type: "component", name: "", tags: { processCatalogL1: tagValue } }));
      }
      for (const [tagValue, count] of Object.entries(counts.byL2 || {})) {
        const code = extractCode(tagValue);
        byL2[code] = (byL2[code] || []).concat(Array(count).fill({ type: "component", name: "", tags: { processCatalogL2: tagValue } }));
      }
      for (const [tagValue, count] of Object.entries(counts.byL3 || {})) {
        const code = extractCode(tagValue);
        byL3[code] = (byL3[code] || []).concat(Array(count).fill({ type: "component", name: "", tags: { processCatalogL3: tagValue } }));
      }
      return { byL1, byL2, byL3, all: [] } as unknown as ComponentIndex;
    }
    return null;
  }, [apiCatalogComps]);

  // Fetch actual components for the selected BPC node on demand
  const { data: apiNodeComps } = useProcessNodeComponents(
    selectedCode,
    { enabled: !!selectedCode }
  );

  // Inject real components for the selected node into compIndex
  // so PCDetail (which reads from compIndex.byL{1,2,3}[code]) sees them
  const effectiveCompIndex = useMemo(() => {
    if (!compIndex || !selectedCode || !apiNodeComps?.components) {
      return compIndex;
    }
    const realComps = apiNodeComps.components.map((c) => ({
      name: c.name,
      type: c.type,
      itemId: c.id,
      searchName: c.id,
      ...resolveTypeRouting(c.type),
      solution: c.solution || "",
      tags: (c.tags || {}) as import("@/types/inventory").Tags,
      sub: c.solution || "",
      altId: "",
    })) as IndexedComponent[];

    // Replace the placeholder list for the selected code with the real components
    const levelKey = selectedLevel === 1 ? "byL1" : selectedLevel === 2 ? "byL2" : "byL3";
    return {
      ...compIndex,
      [levelKey]: { ...compIndex[levelKey], [selectedCode]: realComps },
    } as ComponentIndex;
  }, [compIndex, selectedCode, selectedLevel, apiNodeComps]);

  // Components for the currently selected process node (for bulk edit)
  const currentComps = useMemo(() => {
    const idx = effectiveCompIndex || compIndex;
    if (!idx || !selectedCode) return [];
    if (selectedLevel === 1) return idx.byL1[selectedCode] || [];
    if (selectedLevel === 2) return idx.byL2[selectedCode] || [];
    if (selectedLevel === 3) return idx.byL3[selectedCode] || [];
    return [];
  }, [effectiveCompIndex, compIndex, selectedCode, selectedLevel]);

  const treeData = useMemo(() => {
    if (!catalog?.lookup) return null;
    return buildTreeData(catalog);
  }, [catalog]);

  const handleSelect = useCallback(
    (code: string, level: number) => {
      setSelectedCode(code);
      setSelectedLevel(level);
      uncheckAll();
    },
    [uncheckAll]
  );

  const toggleExpand = useCallback((code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  // Resolve pending BPC code navigation (from capability map or other tabs)
  // using render-time previous-prop tracking rather than an effect.
  const [prevPendingBpcCode, setPrevPendingBpcCode] = useState<string | null>(pendingBpcCode);
  if (prevPendingBpcCode !== pendingBpcCode) {
    setPrevPendingBpcCode(pendingBpcCode);
    if (pendingBpcCode && catalog) {
      const parts = pendingBpcCode.split(".");
      let level = 1;
      if (parts.length >= 3) level = 3;
      else if (parts.length === 2 && parts[1] !== "00") level = 2;
      const l1Code = parts[0] + ".00";
      const newExpanded = new Set(expanded);
      newExpanded.add(l1Code);
      if (level >= 2) {
        const l2Code = parts[0] + "." + parts[1];
        newExpanded.add(l2Code);
      }
      setExpanded(newExpanded);
      setSelectedCode(pendingBpcCode);
      setSelectedLevel(level);
    }
  }

  const navigateToComponent = useCallback(
    (tabId: string, searchName: string) => {
      navigateToTab(tabId, searchName);
    },
    [navigateToTab]
  );

  const pcStats = useMemo(() => {
    if (!catalog || !compIndex) return [];
    const l1K = catalog.lookup?.l1 || {};
    const l2K = catalog.lookup?.l2 || {};
    const l3K = catalog.lookup?.l3 || {};
    const covL1 = Object.keys(l1K).filter(c => (compIndex.byL1[c]?.length ?? 0) > 0).length;
    const covL2 = Object.keys(l2K).filter(c => (compIndex.byL2[c]?.length ?? 0) > 0).length;
    const covL3 = Object.keys(l3K).filter(c => (compIndex.byL3[c]?.length ?? 0) > 0).length;
    let totalComp = 0;
    Object.values(compIndex.byL1).forEach(arr => (totalComp += arr!.length));
    return [
      { value: `${covL1}/${Object.keys(l1K).length}`, label: "End-to-End Covered" },
      { value: `${covL2}/${Object.keys(l2K).length}`, label: "Areas Covered" },
      { value: `${covL3}/${Object.keys(l3K).length}`, label: "Processes Covered" },
      { value: String(totalComp), label: "Tagged Components" },
    ];
  }, [catalog, compIndex]);

  if (!catalog || !treeData || !compIndex) {
    return (
      <EmptyState
        icon={<DatabaseZap className="w-10 h-10" />}
        title="No data available"
        subtitle="Run the extraction pipeline to populate process catalog data"
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Stats Bar */}
      <StatsBar stats={pcStats} />

      {/* Split pane: tree + detail */}
      <SplitPaneLayout
        defaultWidth={500}
        minLeft={280}
        minRight={320}
        sidePanel={bulkEditOpen ? (
          <BulkEditPanel
            catalog={catalog}
            currentComps={currentComps}
            checkedComps={checkedComps}
            onCheckAll={() => checkAll(currentComps.map(c => `${c.dataKey}::${c.itemId}`))}
            onUncheckAll={uncheckAll}
            onClose={() => { setBulkEditOpen(false); uncheckAll(); }}
            onApplied={() => { setBulkEditOpen(false); uncheckAll(); }}
          />
        ) : undefined}
        listPane={
          <>
            <div className="px-3 py-2 border-b bg-card">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search processes..."
                className="h-8 text-xs"
              />
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="py-1">
                <PCTree
                  catalog={catalog}
                  treeData={treeData}
                  compIndex={compIndex}
                  selectedCode={selectedCode}
                  expanded={expanded}
                  searchQuery={searchQuery}
                  onSelect={handleSelect}
                  onToggle={toggleExpand}
                />
              </div>
            </ScrollArea>
          </>
        }
        detailPane={
          <>
            {/* Edit Components header — height matches left pane search bar (h-8 input + py-2) */}
            <div className="flex items-center justify-end px-3 border-b shrink-0 min-h-[49px]">
              {selectedCode && currentComps.length > 0 && (
                <Button
                  size="sm"
                  className="bg-brand-accent hover:bg-brand-accent/90 text-white"
                  onClick={() => {
                    setBulkEditOpen(!bulkEditOpen);
                    if (bulkEditOpen) uncheckAll();
                  }}
                >
                  <SquarePen />
                  Edit Components
                </Button>
              )}
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="p-4">
                {selectedCode ? (
                  <PCDetail
                    catalog={catalog}
                    treeData={treeData}
                    compIndex={effectiveCompIndex || compIndex}
                    code={selectedCode}
                    level={selectedLevel}
                    onSelect={handleSelect}
                    onNavigate={navigateToComponent}
                    manifest={diagramManifest}
                    bulkEditOpen={bulkEditOpen}
                    checkedComps={checkedComps}
                    onToggleCheck={toggleCheck}
                  />
                ) : (
                  <EmptyState
                    title="Select a process from the tree"
                    subtitle="Click any node to view details and mapped components"
                    className="h-64"
                  />
                )}
              </div>
            </ScrollArea>
          </>
        }
      />
    </div>
  );
}

