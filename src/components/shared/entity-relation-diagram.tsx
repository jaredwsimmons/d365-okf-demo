"use client";

import { useRef, useEffect, useMemo, useState, useId, useCallback } from "react";
import * as d3 from "d3";
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3";
import type { EntityItem } from "@/types/inventory";
import { useEntityRelationships, useInventory } from "@/hooks/use-inventory-api";
import { ChevronRight, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { CUSTOMER_PREFIX, CUSTOMER_LABEL } from "@/lib/customer-config";

// ── Types ─────────────────────────────────────────────────────────

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  isCenter: boolean;
  degree: number;
}

export type GraphLink = SimulationLinkDatum<GraphNode> & {
  type: string;
  lookupField?: string;
  relName: string;
};

export interface NodeInfo {
  id: string;
  label: string;
  isCenter: boolean;
  outgoing: Array<{ id: string; label: string; type: string; lookupField?: string }>;
  incoming: Array<{ id: string; label: string; type: string; lookupField?: string }>;
}

// ── Colors (matches ERD HTML exactly) ────────────────────────────

export const PREFIX_COLORS: [string, string][] = [
  [CUSTOMER_PREFIX, "#ab0634"],
  ["msdyn_", "#00A2ED"],
];
export const DEFAULT_COLOR = "#0952CD";
export const CENTER_COLOR  = "#6b498f";

export function nodeColor(id: string, isCenter: boolean): string {
  if (isCenter) return CENTER_COLOR;
  for (const [prefix, color] of PREFIX_COLORS) {
    if (id.startsWith(prefix)) return color;
  }
  return DEFAULT_COLOR;
}

export function nodeRadius(d: GraphNode): number {
  if (d.isCenter) return 13;
  return Math.max(5, Math.sqrt(d.degree) * 2.5 + 4);
}

export function shortLabel(displayName: string, logicalName: string): string {
  if (displayName && displayName !== logicalName) return displayName;
  return logicalName.replace(new RegExp(`^(${CUSTOMER_PREFIX}|msdyn_)`), "");
}

export function buildNodeInfo(
  nodeId: string,
  graphNodes: GraphNode[],
  graphLinks: GraphLink[],
): NodeInfo | null {
  const node = graphNodes.find(n => n.id === nodeId);
  if (!node) return null;
  const labelMap = new Map(graphNodes.map(n => [n.id, n.label]));
  return {
    id: nodeId,
    label: node.label,
    isCenter: node.isCenter,
    outgoing: graphLinks
      .filter(l => (l.source as string) === nodeId)
      .map(l => ({
        id: l.target as string,
        label: labelMap.get(l.target as string) || (l.target as string),
        type: l.type,
        lookupField: l.lookupField,
      })),
    incoming: graphLinks
      .filter(l => (l.target as string) === nodeId)
      .map(l => ({
        id: l.source as string,
        label: labelMap.get(l.source as string) || (l.source as string),
        type: l.type,
        lookupField: l.lookupField,
      })),
  };
}

// ── Node info overlay ─────────────────────────────────────────────

export function NodeInfoPanel({ info, onClose }: { info: NodeInfo; onClose: () => void }) {
  return (
    <div className="absolute bottom-2 right-2 bg-card border rounded-md shadow-lg p-3 w-[210px] text-xs z-10 max-h-[85%] flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-2 shrink-0">
        <div className="min-w-0">
          <div className="font-semibold leading-tight break-words">{info.label}</div>
          <div className="font-mono text-[9px] text-muted-foreground truncate mt-0.5">{info.id}</div>
        </div>
        <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground mt-0.5">
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="overflow-y-auto custom-scroll flex-1 min-h-0 space-y-2">
        {info.outgoing.length > 0 && (
          <div>
            <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Parent of ({info.outgoing.length})
            </div>
            <div className="space-y-0.5">
              {info.outgoing.map((r, i) => (
                <div key={i} className="flex gap-1 items-start">
                  <span className="text-emerald-600 shrink-0 mt-px">→</span>
                  <div className="min-w-0">
                    <span className="break-words">{r.label}</span>
                    {r.lookupField && (
                      <div className="font-mono text-[9px] text-muted-foreground">via {r.lookupField}</div>
                    )}
                    {r.type === "ManyToMany" && (
                      <span className="text-[9px] text-violet-500 ml-1">N:N</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {info.incoming.length > 0 && (
          <div>
            <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Child of ({info.incoming.length})
            </div>
            <div className="space-y-0.5">
              {info.incoming.map((r, i) => (
                <div key={i} className="flex gap-1 items-start">
                  <span className="text-blue-500 shrink-0 mt-px">←</span>
                  <div className="min-w-0">
                    <span className="break-words">{r.label}</span>
                    {r.lookupField && (
                      <div className="font-mono text-[9px] text-muted-foreground">via {r.lookupField}</div>
                    )}
                    {r.type === "ManyToMany" && (
                      <span className="text-[9px] text-violet-500 ml-1">N:N</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared legend ─────────────────────────────────────────────────

export function DiagramLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-[10px] text-muted-foreground border-t">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full bg-[#6b498f]" /> Selected
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full bg-[#ab0634]" /> {CUSTOMER_LABEL} ({CUSTOMER_PREFIX})
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full bg-[#00A2ED]" /> MSFT (msdyn_)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full bg-[#0952CD]" /> D365
      </span>
      <span className="flex items-center gap-1.5 ml-auto">
        <span className="inline-block w-5 border-t border-dashed border-[#6b498f]/70" /> N:N
      </span>
    </div>
  );
}

// ── D3 canvas (self-contained, reusable in inline + fullscreen) ────

function DiagramCanvas({
  graphNodes,
  graphLinks,
  markerId,
  onNodeClick,
  onBackgroundClick,
}: {
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
  markerId: string;
  onNodeClick?: (nodeId: string) => void;
  onBackgroundClick?: () => void;
}) {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Use refs for callbacks so the D3 effect doesn't re-run on every render
  const onNodeClickRef       = useRef(onNodeClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  useEffect(() => {
    onNodeClickRef.current       = onNodeClick;
    onBackgroundClickRef.current = onBackgroundClick;
  });

  useEffect(() => {
    const svgEl     = svgRef.current;
    const container = containerRef.current;
    if (!svgEl || !container || graphNodes.length === 0) return;

    d3.select(svgEl).selectAll("*").remove();

    const W = container.clientWidth  || 400;
    const H = container.clientHeight || 288;

    const svg = d3.select(svgEl).attr("width", W).attr("height", H);

    // Arrow marker
    svg.append("defs")
      .append("marker")
      .attr("id", markerId)
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 20).attr("refY", 0)
      .attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "rgba(100,116,139,0.55)");

    const g = svg.append("g");

    // Background click handler
    svg.on("click", () => onBackgroundClickRef.current?.());

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 6])
        .on("zoom", (e) => g.attr("transform", e.transform.toString()))
    );

    const simNodes = graphNodes.map(n => ({ ...n }));
    const simLinks = graphLinks.map(l => ({ ...l }));

    const center = simNodes.find(n => n.isCenter);
    if (center) {
      center.fx = W / 2;
      center.fy = H / 2;
    }

    const sim = d3.forceSimulation<GraphNode>(simNodes)
      .alphaDecay(0.04)
      .force("link",      d3.forceLink<GraphNode, GraphLink>(simLinks).id(d => d.id).distance(110))
      .force("charge",    d3.forceManyBody<GraphNode>().strength(-200))
      .force("collision", d3.forceCollide<GraphNode>().radius(d => nodeRadius(d) + 18));

    const linkSel = g.append("g")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("stroke",           d => d.type === "ManyToMany" ? "rgba(139,92,246,0.45)" : "rgba(100,116,139,0.35)")
      .attr("stroke-dasharray", d => d.type === "ManyToMany" ? "5 3" : null)
      .attr("marker-end",       d => d.type === "OneToMany"  ? `url(#${markerId})` : null);

    const nodeSel = g.append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(simNodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag",  (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end",   (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            if (!d.isCenter) { d.fx = null; d.fy = null; }
          })
      );

    // Node click — stop propagation so it doesn't bubble to svg background
    nodeSel.on("click", (event, d) => {
      event.stopPropagation();
      onNodeClickRef.current?.(d.id);
    });

    nodeSel.append("circle")
      .attr("r",            nodeRadius)
      .attr("fill",         d => nodeColor(d.id, d.isCenter))
      .attr("stroke",       d => d3.color(nodeColor(d.id, d.isCenter))?.brighter(0.7).toString() ?? "#fff")
      .attr("stroke-width", d => d.isCenter ? 2.5 : 1.5);

    nodeSel.append("text")
      .attr("dx",             d => nodeRadius(d) + 4)
      .attr("dy",             "0.35em")
      .attr("font-size",      d => d.isCenter ? "11px" : "9px")
      .attr("font-weight",    d => d.isCenter ? "700" : "400")
      .attr("fill",           "currentColor")
      .attr("pointer-events", "none")
      .text(d => d.label);

    sim.on("tick", () => {
      linkSel
        .attr("x1", d => (d.source as GraphNode).x ?? 0)
        .attr("y1", d => (d.source as GraphNode).y ?? 0)
        .attr("x2", d => (d.target as GraphNode).x ?? 0)
        .attr("y2", d => (d.target as GraphNode).y ?? 0);
      nodeSel.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { sim.stop(); };
  }, [graphNodes, graphLinks, markerId]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────

export function EntityRelationDiagram({ entity }: { entity: EntityItem }) {
  const { data: apiRels }             = useEntityRelationships();
  const { data: apiEntities }         = useInventory("entities");
  const [open, setOpen]               = useState(false);
  const [fs,   setFs]                 = useState(false);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [prevLogicalName, setPrevLogicalName] = useState(entity.logicalName);
  if (prevLogicalName !== entity.logicalName) {
    setPrevLogicalName(entity.logicalName);
    setSelectedId(null);
  }
  const uid                           = useId().replace(/:/g, "");
  const inlineMarkerId                = `ego-arrow-${uid}-i`;
  const fsMarkerId                    = `ego-arrow-${uid}-f`;

  const clearSelection = useCallback(() => setSelectedId(null), []);

  const { graphNodes, graphLinks } = useMemo(() => {
    const allRels = (apiRels as Record<string, unknown>)?.entityRelationships as Array<{name: string; from: string; to: string; type: string; lookupField?: string}> | undefined;
    if (!allRels?.length) return { graphNodes: [], graphLinks: [] };

    const entityKey = entity.logicalName.toLowerCase();

    const displayMap = new Map<string, string>();
    const entityItems = (apiEntities?.items ?? []) as EntityItem[];
    for (const e of entityItems) {
      displayMap.set(e.logicalName.toLowerCase(), e.displayName || e.logicalName);
    }

    const egoRels = allRels.filter((r: { from: string; to: string }) => r.from === entityKey || r.to === entityKey);
    if (!egoRels.length) return { graphNodes: [], graphLinks: [] };

    const degreeMap = new Map<string, number>();
    for (const r of egoRels) {
      degreeMap.set(r.from, (degreeMap.get(r.from) ?? 0) + 1);
      degreeMap.set(r.to,   (degreeMap.get(r.to)   ?? 0) + 1);
    }

    const neighborIds = new Set<string>();
    for (const r of egoRels) {
      const neighbor = r.from === entityKey ? r.to : r.from;
      if (neighbor !== entityKey) neighborIds.add(neighbor);
    }
    if (!neighborIds.size) return { graphNodes: [], graphLinks: [] };

    const graphNodes: GraphNode[] = [
      {
        id: entityKey,
        label: shortLabel(entity.displayName || entityKey, entityKey),
        isCenter: true,
        degree: degreeMap.get(entityKey) ?? 0,
      },
      ...Array.from(neighborIds).map(id => ({
        id,
        label: shortLabel(displayMap.get(id) || id, id),
        isCenter: false,
        degree: degreeMap.get(id) ?? 1,
      })),
    ];

    const graphLinks: GraphLink[] = egoRels
      .filter(r => r.from !== r.to)
      .map(r => ({
        source:      r.from,
        target:      r.to,
        type:        r.type,
        lookupField: r.lookupField,
        relName:     r.name,
      }));

    return { graphNodes, graphLinks };
  }, [entity, apiRels, apiEntities]);

  const selectedInfo = useMemo(
    () => selectedId ? buildNodeInfo(selectedId, graphNodes, graphLinks) : null,
    [selectedId, graphNodes, graphLinks],
  );

  if (graphNodes.length === 0) return null;

  const neighborCount     = graphNodes.length - 1;
  const relationshipCount = graphLinks.length;

  return (
    <>
      {/* ── Accordion ──────────────────────────────────────────── */}
      <div className="rounded-md border">
        {/* Header row — two sibling buttons to avoid nested <button> */}
        <div className="flex items-center">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex flex-1 items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors text-left"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-90")} />
            <DashboardIcon tabId="entitydiagram" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium flex-1">Entity Relationships</span>
            <span className="text-[10px] text-muted-foreground">
              {neighborCount} entities · {relationshipCount} rels
            </span>
          </button>
          {open && (
            <button
              onClick={() => setFs(true)}
              className="px-2 py-1.5 hover:bg-accent/50 transition-colors border-l"
              title="Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {open && (
          <div className="border-t">
            <div className="h-72 bg-muted/20 relative">
              <DiagramCanvas
                graphNodes={graphNodes}
                graphLinks={graphLinks}
                markerId={inlineMarkerId}
                onNodeClick={setSelectedId}
                onBackgroundClick={clearSelection}
              />
              {selectedInfo && (
                <NodeInfoPanel info={selectedInfo} onClose={clearSelection} />
              )}
            </div>
            <DiagramLegend />
          </div>
        )}
      </div>

      {/* ── Fullscreen overlay ──────────────────────────────────── */}
      {fs && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
            <span className="text-sm font-semibold">
              Entity Relationships — {entity.displayName || entity.logicalName}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {neighborCount} entities · {relationshipCount} relationships
              </span>
              <button
                onClick={() => { setFs(false); clearSelection(); }}
                className="p-1 rounded hover:bg-accent"
                title="Close fullscreen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-muted/20 relative">
            <DiagramCanvas
              graphNodes={graphNodes}
              graphLinks={graphLinks}
              markerId={fsMarkerId}
              onNodeClick={setSelectedId}
              onBackgroundClick={clearSelection}
            />
            {selectedInfo && (
              <NodeInfoPanel info={selectedInfo} onClose={clearSelection} />
            )}
          </div>
          <DiagramLegend />
        </div>
      )}
    </>
  );
}
