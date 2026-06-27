"use client";

import type { ProcessCatalog, L4Process, L5Process } from "@/types/inventory";
import type { ComponentIndex } from "@/lib/component-index";
import { Badge } from "@/components/ui";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui";
import { ChevronRight } from "lucide-react";

// --- Tree Data ---
export interface TreeData {
  l1s: string[];
  l2sByL1: Record<string, string[]>;
  l3sByL2: Record<string, string[]>;
  l4sByL3: Record<string, L4Process[]>;
  l5sByL4: Record<string, L5Process[]>;
}

export function buildTreeData(catalog: ProcessCatalog): TreeData {
  const l1K = catalog.lookup.l1 || {};
  const l2K = catalog.lookup.l2 || {};
  const l3K = catalog.lookup.l3 || {};

  const l1s = Object.keys(l1K).sort(
    (a, b) => parseFloat(a) - parseFloat(b)
  );

  const l2sByL1: Record<string, string[]> = {};
  Object.keys(l2K)
    .sort((a, b) => parseFloat(a) - parseFloat(b))
    .forEach((code) => {
      const parent = code.split(".")[0] + ".00";
      if (!l2sByL1[parent]) l2sByL1[parent] = [];
      l2sByL1[parent].push(code);
    });

  const l3sByL2: Record<string, string[]> = {};
  Object.keys(l3K)
    .sort((a, b) => parseFloat(a) - parseFloat(b))
    .forEach((code) => {
      const parts = code.split(".");
      const parent = parts[0] + "." + parts[1];
      if (!l3sByL2[parent]) l3sByL2[parent] = [];
      l3sByL2[parent].push(code);
    });

  const l4sByL3: Record<string, L4Process[]> = {};
  (catalog.l4Processes || []).forEach((p) => {
    const k = p.parentL3Code;
    if (!l4sByL3[k]) l4sByL3[k] = [];
    l4sByL3[k].push(p);
  });

  const l5sByL4: Record<string, L5Process[]> = {};
  (catalog.l5Processes || []).forEach((p) => {
    const k = p.parentL4Code || "";
    if (!l5sByL4[k]) l5sByL4[k] = [];
    l5sByL4[k].push(p);
  });

  return { l1s, l2sByL1, l3sByL2, l4sByL3, l5sByL4 };
}

// --- Coverage Dot ---
const DOT_VARS: Record<number, string> = {
  1: "var(--color-dot-l1)",
  2: "var(--color-dot-l2)",
  3: "var(--color-dot-l3)",
  4: "var(--color-dot-l4)",
  5: "var(--color-dot-l5)",
};

export function CoverageDot({
  hasComponents,
  level,
}: {
  hasComponents: boolean;
  level: number;
}) {
  const color = hasComponents ? DOT_VARS[level] || "var(--color-dot-l5)" : "var(--color-dot-empty)";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ background: color }}
    />
  );
}

// --- Tree Component ---
export function PCTree({
  catalog,
  treeData,
  compIndex,
  selectedCode,
  expanded,
  searchQuery,
  onSelect,
  onToggle,
}: {
  catalog: ProcessCatalog;
  treeData: TreeData;
  compIndex: ComponentIndex;
  selectedCode: string | null;
  expanded: Set<string>;
  searchQuery: string;
  onSelect: (code: string, level: number) => void;
  onToggle: (code: string) => void;
}) {
  const l1K = catalog.lookup.l1 || {};
  const l2K = catalog.lookup.l2 || {};
  const l3K = catalog.lookup.l3 || {};
  const query = searchQuery.toLowerCase().trim();

  // Search helpers — check if a node or any descendant matches
  const l5Matches = (l5: L5Process) =>
    `${l5.code} ${l5.title}`.toLowerCase().includes(query);

  const l4Matches = (l4: L4Process) =>
    `${l4.code} ${l4.title}`.toLowerCase().includes(query) ||
    (treeData.l5sByL4[l4.code] || []).some(l5Matches);

  const l3Matches = (l3c: string) =>
    `${l3c} ${l3K[l3c] || ""}`.toLowerCase().includes(query) ||
    (treeData.l4sByL3[l3c] || []).some(l4Matches);

  const l2Matches = (l2c: string) =>
    `${l2c} ${l2K[l2c] || ""}`.toLowerCase().includes(query) ||
    (treeData.l3sByL2[l2c] || []).some(l3Matches);

  return (
    <>
      {treeData.l1s.map((l1Code) => {
        const l1Name = l1K[l1Code] || "";
        const l1Comps = compIndex.byL1[l1Code] || [];
        const l2Codes = treeData.l2sByL1[l1Code] || [];
        const isExpanded = expanded.has(l1Code);

        // Search filtering
        if (query) {
          const l1Match = `${l1Code} ${l1Name}`.toLowerCase().includes(query);
          const childMatch = l2Codes.some(l2Matches);
          if (!l1Match && !childMatch) return null;
        }

        const forceOpen = !!query;

        return (
          <Collapsible
            key={l1Code}
            open={isExpanded || forceOpen}
            onOpenChange={() => onToggle(l1Code)}
          >
            {/* L1 Header */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-accent/50 text-sm font-semibold ${
                selectedCode === l1Code ? "bg-accent" : ""
              }`}
              onClick={() => onSelect(l1Code, 1)}
              onDoubleClick={() => onToggle(l1Code)}
            >
              <CollapsibleTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <button className="w-4 text-muted-foreground shrink-0 transition-transform duration-150 data-[state=open]:rotate-90">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </CollapsibleTrigger>
              <CoverageDot hasComponents={l1Comps.length > 0} level={1} />
              <span className="truncate">
                {l1Code} {l1Name}
              </span>
              {l1Comps.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-auto text-[10px] px-1.5 py-0 h-auto shrink-0"
                >
                  {l1Comps.length}
                </Badge>
              )}
            </div>

            {/* L2 children */}
            <CollapsibleContent className="ml-2 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              {l2Codes.map((l2Code) => {
                const l2Name = l2K[l2Code] || "";
                const l2Comps = compIndex.byL2[l2Code] || [];
                const l3Codes = treeData.l3sByL2[l2Code] || [];
                const l2Expanded = expanded.has(l2Code);

                if (query) {
                  const l2Match = `${l2Code} ${l2Name}`
                    .toLowerCase()
                    .includes(query);
                  const childMatch = l3Codes.some(l3Matches);
                  if (!l2Match && !childMatch) return null;
                }

                const l3CovCount = l3Codes.filter(
                  (c) => (compIndex.byL3[c] || []).length > 0
                ).length;

                return (
                  <Collapsible
                    key={l2Code}
                    open={l2Expanded || forceOpen}
                    onOpenChange={() => onToggle(l2Code)}
                  >
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-accent/50 text-xs ${
                        selectedCode === l2Code ? "bg-accent" : ""
                      }`}
                      onClick={() => onSelect(l2Code, 2)}
                      onDoubleClick={() => l3Codes.length > 0 && onToggle(l2Code)}
                    >
                      {l3Codes.length > 0 ? (
                        <CollapsibleTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button className="w-4 text-muted-foreground shrink-0 transition-transform duration-150 data-[state=open]:rotate-90">
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </CollapsibleTrigger>
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                      <CoverageDot
                        hasComponents={l2Comps.length > 0}
                        level={2}
                      />
                      <span className="font-mono text-xs text-muted-foreground shrink-0 min-w-[36px]">
                        {l2Code}
                      </span>
                      <span className="truncate flex-1">{l2Name}</span>
                      {l3Codes.length > 0 && l3CovCount > 0 && (
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px] px-1 py-0 h-auto shrink-0"
                        >
                          {l3CovCount}/{l3Codes.length}
                        </Badge>
                      )}
                    </div>

                    {/* L3 children */}
                    {l3Codes.length > 0 && (
                      <CollapsibleContent className="ml-4 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                        {l3Codes.map((l3Code) => {
                          const l3Name = l3K[l3Code] || "";
                          const l3Comps = compIndex.byL3[l3Code] || [];
                          const l4s = treeData.l4sByL3[l3Code] || [];
                          const l3Expanded = expanded.has(l3Code);

                          if (query && !l3Matches(l3Code)) {
                            return null;
                          }

                          return (
                            <Collapsible
                              key={l3Code}
                              open={l3Expanded}
                              onOpenChange={() => l4s.length > 0 && onToggle(l3Code)}
                            >
                              <div
                                className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-accent/50 text-xs ${
                                  selectedCode === l3Code ? "bg-accent" : ""
                                }`}
                                onClick={() => onSelect(l3Code, 3)}
                                onDoubleClick={() => l4s.length > 0 && onToggle(l3Code)}
                              >
                                {l4s.length > 0 ? (
                                  <CollapsibleTrigger
                                    asChild
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button className="w-4 text-muted-foreground shrink-0 transition-transform duration-150 data-[state=open]:rotate-90">
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </CollapsibleTrigger>
                                ) : (
                                  <span className="w-4 shrink-0" />
                                )}
                                <CoverageDot
                                  hasComponents={l3Comps.length > 0}
                                  level={3}
                                />
                                <span className="font-mono text-xs text-muted-foreground shrink-0">
                                  {l3Code}
                                </span>
                                <span className="truncate flex-1">
                                  {l3Name}
                                </span>
                              </div>

                              {/* L4 children */}
                              {l4s.length > 0 && (
                                <CollapsibleContent className="ml-4 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                  {l4s
                                    .sort((a, b) =>
                                      a.code.localeCompare(b.code)
                                    )
                                    .map((l4) => {
                                      if (query && !l4Matches(l4)) return null;
                                      const l5s =
                                        treeData.l5sByL4[l4.code] || [];
                                      const l4Expanded = expanded.has(
                                        l4.code
                                      );
                                      return (
                                        <Collapsible
                                          key={l4.code}
                                          open={l4Expanded}
                                          onOpenChange={() => l5s.length > 0 && onToggle(l4.code)}
                                        >
                                          <div
                                            className={`flex items-center gap-1.5 px-2 py-0.5 cursor-pointer hover:bg-accent/50 text-xs ${
                                              selectedCode === l4.code
                                                ? "bg-accent"
                                                : ""
                                            }`}
                                            onClick={() =>
                                              onSelect(l4.code, 4)
                                            }
                                            onDoubleClick={() => l5s.length > 0 && onToggle(l4.code)}
                                          >
                                            {l5s.length > 0 ? (
                                              <CollapsibleTrigger
                                                asChild
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <button className="w-4 text-muted-foreground shrink-0 transition-transform duration-150 data-[state=open]:rotate-90">
                                                  <ChevronRight className="w-3 h-3" />
                                                </button>
                                              </CollapsibleTrigger>
                                            ) : (
                                              <span className="w-4 shrink-0" />
                                            )}
                                            <CoverageDot
                                              hasComponents={false}
                                              level={4}
                                            />
                                            <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                                              {l4.code}
                                            </span>
                                            <span className="truncate flex-1 text-foreground/80">
                                              {l4.title}
                                            </span>
                                          </div>

                                          {/* L5 children */}
                                          {l5s.length > 0 && (
                                            <CollapsibleContent className="ml-4 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                              {l5s
                                                .sort((a, b) =>
                                                  a.code.localeCompare(
                                                    b.code
                                                  )
                                                )
                                                .map((l5) => {
                                                  if (query && !l5Matches(l5)) return null;
                                                  return (
                                                  <div
                                                    key={l5.code}
                                                    className={`flex items-center gap-1.5 px-2 py-0.5 cursor-pointer hover:bg-accent/50 text-xs ${
                                                      selectedCode ===
                                                      l5.code
                                                        ? "bg-accent"
                                                        : ""
                                                    }`}
                                                    onClick={() =>
                                                      onSelect(l5.code, 5)
                                                    }
                                                  >
                                                    <span className="w-4 shrink-0" />
                                                    <CoverageDot
                                                      hasComponents={false}
                                                      level={5}
                                                    />
                                                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                                                      {l5.code}
                                                    </span>
                                                    <span className="truncate flex-1 text-foreground/70">
                                                      {l5.title}
                                                    </span>
                                                  </div>
                                                  );
                                                })}
                                            </CollapsibleContent>
                                          )}
                                        </Collapsible>
                                      );
                                    })}
                                </CollapsibleContent>
                              )}
                            </Collapsible>
                          );
                        })}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </>
  );
}
