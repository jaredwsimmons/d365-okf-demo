"use client";

import { useRef, useEffect, useMemo, useState, useId, useCallback } from "react";
import * as d3 from "d3";
import { useInventory, useEntityRelationships } from "@/hooks/use-inventory-api";
import { ExplorerSkeleton } from "@/components/shared/loading-states";
import { CUSTOMER_PREFIX, CUSTOMER_LABEL } from "@/lib/customer-config";
import { Input } from "@/components/ui";
import { Checkbox } from "@/components/ui";
import { Label } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  type GraphNode,
  type GraphLink,
  nodeColor,
  nodeRadius,
  shortLabel,
  buildNodeInfo,
  DiagramLegend,
  NodeInfoPanel,
} from "@/components/shared/entity-relation-diagram";

// ── Full-graph D3 canvas ───────────────────────────────────────────

function FullGraphCanvas({
  graphNodes,
  graphLinks,
  markerId,
  pinnedId,
  showLabels,
  onNodeClick,
  onBackgroundClick,
}: {
  graphNodes: GraphNode[];
  graphLinks: GraphLink[];
  markerId: string;
  pinnedId: string | null;
  showLabels: boolean;
  onNodeClick?: (nodeId: string) => void;
  onBackgroundClick?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Stable refs so D3 handlers always use latest callbacks without rebuilding
  const onNodeClickRef = useRef(onNodeClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
    onBackgroundClickRef.current = onBackgroundClick;
  });

  // Effect 1: Build simulation (reruns when graph data changes)
  useEffect(() => {
    const svgEl = svgRef.current;
    const container = containerRef.current;
    if (!svgEl || !container || graphNodes.length === 0) return;

    d3.select(svgEl).selectAll("*").remove();

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 600;

    const svg = d3.select(svgEl).attr("width", W).attr("height", H);

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

    svg.on("click", () => onBackgroundClickRef.current?.());

    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 6])
        .on("zoom", (e) => g.attr("transform", e.transform.toString()))
    );

    // Spread-copy so D3 mutation doesn't touch original arrays
    const simNodes = graphNodes.map(n => ({ ...n }));
    const simLinks = graphLinks.map(l => ({ ...l }));

    const sim = d3.forceSimulation<GraphNode>(simNodes)
      .alphaDecay(0.03)
      .force("link",      d3.forceLink<GraphNode, GraphLink>(simLinks).id(d => d.id).distance(75))
      .force("charge",    d3.forceManyBody<GraphNode>().strength(-90))
      .force("collision", d3.forceCollide<GraphNode>().radius(d => nodeRadius(d) + 8))
      .force("center",    d3.forceCenter(W / 2, H / 2));

    const linkSel = g.append("g")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(simLinks)
      .join("line")
      .attr("class", "erd-link")
      .attr("stroke-width", 1.5)
      .attr("stroke",           d => d.type === "ManyToMany" ? "rgba(139,92,246,0.45)" : "rgba(100,116,139,0.35)")
      .attr("stroke-dasharray", d => d.type === "ManyToMany" ? "5 3" : null)
      .attr("marker-end",       d => d.type === "OneToMany"  ? `url(#${markerId})` : null);

    const nodeSel = g.append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(simNodes)
      .join("g")
      .attr("class", "erd-node")
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
            d.fx = null; d.fy = null;
          })
      );

    nodeSel.on("click", (event, d) => {
      event.stopPropagation();
      onNodeClickRef.current?.(d.id);
    });

    nodeSel.append("circle")
      .attr("r",            nodeRadius)
      .attr("fill",         d => nodeColor(d.id, d.isCenter))
      .attr("stroke",       d => d3.color(nodeColor(d.id, d.isCenter))?.brighter(0.7).toString() ?? "#fff")
      .attr("stroke-width", 1.5);

    nodeSel.append("text")
      .attr("class",          "erd-label")
      .attr("dx",             d => nodeRadius(d) + 4)
      .attr("dy",             "0.35em")
      .attr("font-size",      "9px")
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

  // Effect 2: Highlight/fade on pin — no simulation rebuild
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const nodeSel = d3.select(svgEl).selectAll<SVGGElement, GraphNode>(".erd-node");
    const linkSel = d3.select(svgEl).selectAll<SVGLineElement, GraphLink>(".erd-link");

    if (!pinnedId) {
      nodeSel.classed("erd-node-hl", false).classed("erd-node-fade", false);
      linkSel.classed("erd-link-hl", false).classed("erd-link-fade", false);
      return;
    }

    nodeSel
      .classed("erd-node-hl",   d => d.id === pinnedId)
      .classed("erd-node-fade", d => d.id !== pinnedId);

    linkSel
      .classed("erd-link-hl", d => {
        const src = typeof d.source === "object" ? (d.source as GraphNode).id : d.source as string;
        const tgt = typeof d.target === "object" ? (d.target as GraphNode).id : d.target as string;
        return src === pinnedId || tgt === pinnedId;
      })
      .classed("erd-link-fade", d => {
        const src = typeof d.source === "object" ? (d.source as GraphNode).id : d.source as string;
        const tgt = typeof d.target === "object" ? (d.target as GraphNode).id : d.target as string;
        return src !== pinnedId && tgt !== pinnedId;
      });
  }, [pinnedId, graphNodes, graphLinks]);

  // Effect 3: Label visibility — no simulation rebuild
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    d3.select(svgEl).selectAll(".erd-label")
      .style("display", showLabels ? "" : "none");
  }, [showLabels, graphNodes, graphLinks]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}

// ── Main tab component ─────────────────────────────────────────────

export function EntityDiagramTab() {
  const { data: apiEntities, isLoading: entLoading } = useInventory("entities");
  const { data: apiRels } = useEntityRelationships();

  const [search,     setSearch]     = useState("");
  const [prefix,     setPrefix]     = useState("all");
  const [show1N,     setShow1N]     = useState(true);
  const [showNN,     setShowNN]     = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [pinnedId,   setPinnedId]   = useState<string | null>(null);
  const markerId = useId().replace(/:/g, "");

  const clearPin = useCallback(() => setPinnedId(null), []);

  // Build entity display-name map
  const displayMap = useMemo(() => {
    const map = new Map<string, string>();
    if (apiEntities?.items) {
      for (const e of apiEntities.items as Record<string, unknown>[]) {
        const ln = (e.logicalName as string) || "";
        map.set(ln.toLowerCase(), (e.displayName as string) || ln);
      }
    }
    return map;
  }, [apiEntities]);

  // Build full graph from all entity relationships
  const { allNodes, allLinks } = useMemo(() => {
    const rels = apiRels?.entityRelationships as Array<{ name: string; type: string; from: string; to: string; lookupField?: string }> | undefined;
    if (!rels?.length) return { allNodes: [], allLinks: [] };

    const degreeMap = new Map<string, number>();
    for (const r of rels) {
      degreeMap.set(r.from, (degreeMap.get(r.from) ?? 0) + 1);
      degreeMap.set(r.to,   (degreeMap.get(r.to)   ?? 0) + 1);
    }

    const nodeIds = new Set<string>();
    for (const r of rels) { nodeIds.add(r.from); nodeIds.add(r.to); }

    const allNodes: GraphNode[] = Array.from(nodeIds).map(id => ({
      id,
      label:    shortLabel(displayMap.get(id) || id, id),
      isCenter: false,
      degree:   degreeMap.get(id) ?? 1,
    }));

    const allLinks: GraphLink[] = rels
      .filter(r => r.from !== r.to)
      .map(r => ({
        source:      r.from,
        target:      r.to,
        type:        r.type,
        lookupField: r.lookupField,
        relName:     r.name,
      }));

    return { allNodes, allLinks };
  }, [displayMap, apiRels]);

  // Apply toolbar filters
  const { visibleNodes, visibleLinks, stats } = useMemo(() => {
    const searchLower = search.toLowerCase();

    const nodePassesFilter = (n: GraphNode): boolean => {
      if (prefix === "custom" && !n.id.startsWith(CUSTOMER_PREFIX))   return false;
      if (prefix === "msft" && !n.id.startsWith("msdyn_")) return false;
      if (prefix === "d365" && (n.id.startsWith(CUSTOMER_PREFIX) || n.id.startsWith("msdyn_"))) return false;
      if (searchLower && !n.label.toLowerCase().includes(searchLower) && !n.id.includes(searchLower)) return false;
      return true;
    };

    const filteredIds = new Set(allNodes.filter(nodePassesFilter).map(n => n.id));

    const visibleLinks = allLinks.filter(l => {
      const src = l.source as string;
      const tgt = l.target as string;
      if (!filteredIds.has(src) || !filteredIds.has(tgt)) return false;
      if (!show1N && l.type === "OneToMany")  return false;
      if (!showNN && l.type === "ManyToMany") return false;
      return true;
    });

    // When not searching, drop isolated nodes (no visible links)
    const connectedIds = new Set<string>();
    for (const l of visibleLinks) {
      connectedIds.add(l.source as string);
      connectedIds.add(l.target as string);
    }

    const visibleNodes = allNodes.filter(n =>
      filteredIds.has(n.id) && (searchLower ? true : connectedIds.has(n.id))
    );

    return {
      visibleNodes,
      visibleLinks,
      stats: { nodes: visibleNodes.length, links: visibleLinks.length },
    };
  }, [allNodes, allLinks, search, prefix, show1N, showNN]);

  // Info panel data for pinned node
  const selectedInfo = useMemo(
    () => pinnedId ? buildNodeInfo(pinnedId, visibleNodes, visibleLinks) : null,
    [pinnedId, visibleNodes, visibleLinks],
  );

  if (entLoading) return <ExplorerSkeleton />;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 border-b shrink-0 flex-wrap">
        <Input
          placeholder="Search entities..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPinnedId(null); }}
          className="h-7 w-48 text-xs"
        />
        <Select value={prefix} onValueChange={v => { setPrefix(v); setPinnedId(null); }}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All prefixes</SelectItem>
            <SelectItem value="custom">{CUSTOMER_LABEL} ({CUSTOMER_PREFIX})</SelectItem>
            <SelectItem value="msft">MSFT (msdyn_)</SelectItem>
            <SelectItem value="d365">D365</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="erd-1n"
            checked={show1N}
            onCheckedChange={v => setShow1N(!!v)}
            className="h-3.5 w-3.5"
          />
          <Label htmlFor="erd-1n" className="text-xs cursor-pointer">1:N</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="erd-nn"
            checked={showNN}
            onCheckedChange={v => setShowNN(!!v)}
            className="h-3.5 w-3.5"
          />
          <Label htmlFor="erd-nn" className="text-xs cursor-pointer">N:N</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="erd-labels"
            checked={showLabels}
            onCheckedChange={v => setShowLabels(!!v)}
            className="h-3.5 w-3.5"
          />
          <Label htmlFor="erd-labels" className="text-xs cursor-pointer">Labels</Label>
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {stats.nodes} entities · {stats.links} relationships
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 bg-muted/20 relative">
        {visibleNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No entities match the current filters
          </div>
        ) : (
          <FullGraphCanvas
            graphNodes={visibleNodes}
            graphLinks={visibleLinks}
            markerId={markerId}
            pinnedId={pinnedId}
            showLabels={showLabels}
            onNodeClick={setPinnedId}
            onBackgroundClick={clearPin}
          />
        )}
        {selectedInfo && (
          <NodeInfoPanel info={selectedInfo} onClose={clearPin} />
        )}
      </div>

      {/* Legend */}
      <DiagramLegend />
    </div>
  );
}
