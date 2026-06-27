"use client";

import { useCallback, useEffect, useState, memo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import {
  parseWorkflowDefinition,
  buildElkGraph,
  applyElkLayout,
  type WorkflowDefinition,
} from "@/lib/workflow-parser";
import {
  Zap,
  GitBranch,
  Database,
  Variable,
  Box,
  Play,
  Square,
  Send,
  Workflow,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// ── Node styling by category ───────────────────────────────────────

const CATEGORY_STYLES: Record<
  string,
  { bg: string; border: string; icon: typeof Zap; text: string }
> = {
  trigger: {
    bg: "bg-purple-300",
    border: "border-purple-500/60",
    icon: Zap,
    text: "text-purple-700",
  },
  connector: {
    bg: "bg-blue-300",
    border: "border-blue-500/60",
    icon: Database,
    text: "text-blue-700",
  },
  variable: {
    bg: "bg-amber-300",
    border: "border-amber-500/60",
    icon: Variable,
    text: "text-amber-700",
  },
  scope: {
    bg: "bg-slate-300/25",
    border: "border-slate-500/60",
    icon: Box,
    text: "text-slate-700",
  },
  condition: {
    bg: "bg-orange-300/10",
    border: "border-orange-500/60",
    icon: GitBranch,
    text: "text-orange-700",
  },
  control: {
    bg: "bg-cyan-300",
    border: "border-cyan-500/60",
    icon: Play,
    text: "text-cyan-700",
  },
  terminate: {
    bg: "bg-red-300",
    border: "border-red-500/60",
    icon: Square,
    text: "text-red-700",
  },
  response: {
    bg: "bg-green-300",
    border: "border-green-500/60",
    icon: Send,
    text: "text-green-700",
  },
  workflow: {
    bg: "bg-indigo-300",
    border: "border-indigo-500/60",
    icon: Workflow,
    text: "text-indigo-700",
  },
  "condition-yes": {
    bg: "bg-green-300/25",
    border: "border-green-500/60",
    icon: GitBranch,
    text: "text-green-700",
  },
  "condition-no": {
    bg: "bg-red-300/25",
    border: "border-red-500/60",
    icon: GitBranch,
    text: "text-red-700",
  },
  "condition-case": {
    bg: "bg-orange-300/25",
    border: "border-orange-500/60",
    icon: GitBranch,
    text: "text-orange-700",
  },
  default: {
    bg: "bg-gray-300/10",
    border: "border-gray-500/60",
    icon: Play,
    text: "text-gray-700",
  },
};

// ── Custom Node Components ─────────────────────────────────────────

const FlowActionNode = memo(({ data }: NodeProps) => {
  const category = (data.category as string) || "default";
  const style = (CATEGORY_STYLES[category] || CATEGORY_STYLES.default)!;
  const Icon = style.icon;
  const label = data.label as string;
  const actionType = data.actionType as string;
  const detail = data.detail as string | undefined;
  const subLines = data.subLines as string[] | undefined;
  const description = data.description as string | undefined;

  // Type badge text
  const typeBadge = actionType;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/50 !border-0" />
      <div
        className={`px-3 py-2 rounded-lg border ${style.bg} ${style.border} min-w-[280px] max-w-[360px] shadow-sm`}
      >
        <div className="flex items-start gap-2">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${style.text} mt-0.5`} />
          <span className="text-xs font-medium text-foreground break-words flex-1" title={label}>{label}</span>
          <span className={`text-[8px] ${style.text} opacity-70 shrink-0 font-medium mt-0.5`}>{typeBadge}</span>
        </div>
        {detail && (
          <div className="text-[10px] text-muted-foreground mt-0.5 ml-5.5 break-words font-mono" title={detail}>{detail}</div>
        )}
        {subLines && subLines.length > 0 && (
          <div className="mt-0.5 ml-5.5">
            {subLines.map((line, i) => (
              <div key={i} className="text-[9px] text-muted-foreground font-mono leading-4">{line}</div>
            ))}
          </div>
        )}
        {description && (
          <div className="text-[9px] text-muted-foreground/75 mt-0.5 ml-5.5 italic break-words" title={description}>{description}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/50 !border-0" />
    </>
  );
});
FlowActionNode.displayName = "FlowActionNode";

const FlowGroupNode = memo(({ data }: NodeProps) => {
  const category = (data.category as string) || "scope";
  const style = (CATEGORY_STYLES[category] || CATEGORY_STYLES.scope)!;
  const Icon = style.icon;
  const label = data.label as string;
  const detail = data.detail as string | undefined;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/50 !border-0" />
      <div className={`w-full h-full rounded-xl border-2 border-dashed ${style.border} ${style.bg} p-1`}>
        <div className="flex items-start gap-1.5 px-2 py-1">
          <Icon className={`w-3 h-3 shrink-0 ${style.text} mt-px`} />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide break-words">{label}</span>
        </div>
        {detail && (
          <div className="text-[9px] text-muted-foreground/70 px-2 break-words font-mono" title={detail}>{detail}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/50 !border-0" />
    </>
  );
});
FlowGroupNode.displayName = "FlowGroupNode";

const FlowBranchNode = memo(({ data }: NodeProps) => {
  const category = (data.category as string) || "condition-case";
  const style = (CATEGORY_STYLES[category] || CATEGORY_STYLES.default)!;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/50 !border-0" />
      <div className={`px-2 py-1 rounded border ${style.bg} ${style.border}`}>
        <span className={`text-[10px] font-semibold ${style.text}`}>{data.label as string}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/50 !border-0" />
    </>
  );
});
FlowBranchNode.displayName = "FlowBranchNode";

const nodeTypes = {
  flowAction: FlowActionNode,
  flowGroup: FlowGroupNode,
  flowBranch: FlowBranchNode,
};

// ── ELK layout ─────────────────────────────────────────────────────

const elk = new ELK();

async function computeLayout(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const elkGraph = buildElkGraph(nodes, edges);
  const result = await elk.layout(elkGraph);
  // After layout(), ELK guarantees x/y are populated on all nodes
  return applyElkLayout(nodes, result as unknown as Parameters<typeof applyElkLayout>[1]);
}

// ── Inner component (needs ReactFlowProvider) ──────────────────────

function FlowDiagramInner({
  nodes,
  edges,
}: {
  nodes: Node[];
  edges: Edge[];
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    // Fit view after nodes are positioned
    const timer = setTimeout(() => fitView({ padding: 0.1 }), 100);
    return () => clearTimeout(timer);
  }, [nodes, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      fitView
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#94a3b8" },
      }}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1} color="hsl(var(--muted-foreground)/0.1)" />
      <Controls
        showInteractive={false}
        className="!bg-card !border-border !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-accent"
      />
      <MiniMap
        nodeColor={(n) => {
          const cat = (n.data?.category as string) || "default";
          if (cat === "trigger") return "#a855f7";
          if (cat === "connector") return "#3b82f6";
          if (cat === "variable") return "#f59e0b";
          if (cat === "condition") return "#f97316";
          if (cat === "scope") return "#64748b";
          if (cat === "terminate") return "#ef4444";
          if (cat === "response") return "#22c55e";
          return "#6b7280";
        }}
        maskColor="hsl(var(--background)/0.8)"
        className="!bg-card/80 !border-border"
      />
    </ReactFlow>
  );
}

// ── Main exported component ────────────────────────────────────────

interface FlowDiagramProps {
  definition: WorkflowDefinition | null;
  workflowNameMap?: Map<string, string>;
  isLoading?: boolean;
  error?: string;
}

export function FlowDiagram({ definition, workflowNameMap, isLoading, error }: FlowDiagramProps) {
  const [layoutNodes, setLayoutNodes] = useState<Node[]>([]);
  const [layoutEdges, setLayoutEdges] = useState<Edge[]>([]);
  const [layoutError, setLayoutError] = useState<string>();
  const [computing, setComputing] = useState(false);

  const processDefinition = useCallback(async (defn: WorkflowDefinition, nameMap?: Map<string, string>) => {
    setComputing(true);
    setLayoutError(undefined);
    try {
      const { nodes, edges } = parseWorkflowDefinition(defn, nameMap);
      const positioned = await computeLayout(nodes, edges);
      setLayoutNodes(positioned);
      setLayoutEdges(edges);
    } catch (err) {
      console.error("Flow diagram layout error:", err);
      setLayoutError(err instanceof Error ? err.message : "Failed to compute layout");
    } finally {
      setComputing(false);
    }
  }, []);

  useEffect(() => {
    if (!definition) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      processDefinition(definition, workflowNameMap);
    });
    return () => { cancelled = true; };
  }, [definition, workflowNameMap, processDefinition]);

  if (isLoading || computing) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Computing flow layout...</span>
      </div>
    );
  }

  if (error || layoutError) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-sm">{error || layoutError}</span>
      </div>
    );
  }

  if (!definition || layoutNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <span className="text-sm">No flow definition available</span>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <FlowDiagramInner nodes={layoutNodes} edges={layoutEdges} />
    </ReactFlowProvider>
  );
}
