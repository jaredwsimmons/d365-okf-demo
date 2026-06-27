"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Network, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { FlowDiagram } from "@/components/shared/flow-diagram";
import {
  useWorkflowDefinitionManifest,
  useWorkflowDefinition,
  useWorkflowNameMap,
} from "@/hooks/use-inventory-api";
import type { WorkflowDefinition } from "@/lib/workflow-parser";

export function WorkflowFlowSection({ workflowId }: { workflowId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Extract GUID from workflow ID (strip curly braces)
  const guid = workflowId.replace(/[{}]/g, "").toUpperCase();

  const { data: manifest } = useWorkflowDefinitionManifest();
  const manifestEntry = manifest?.[guid] ?? null;
  const hasDefinition = manifest ? !!manifestEntry : null;

  const { data: detail, isLoading, error } = useWorkflowDefinition(
    expanded ? guid : null,
  );

  const { data: nameMapObj } = useWorkflowNameMap({ enabled: expanded });
  const nameMap = useMemo(() => {
    if (!nameMapObj) return undefined;
    return new Map(Object.entries(nameMapObj));
  }, [nameMapObj]);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreen]);

  // Don't render if manifest not loaded or definition doesn't exist
  if (hasDefinition === null) return null;
  if (hasDefinition === false) return null;

  const definition = (detail?.definition as WorkflowDefinition | undefined) ?? null;
  const errorMessage = error instanceof Error ? error.message : undefined;

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Header / toggle — two sibling buttons like EntityRelationDiagram */}
      <div className="flex items-center">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex flex-1 items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors text-left"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <Network className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">Flow Diagram</span>
          {manifestEntry && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-auto shrink-0">
              {manifestEntry.actionCount} actions
            </Badge>
          )}
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />}
        </button>
        {expanded && (
          <button
            onClick={() => setFullscreen(true)}
            className="px-2 py-1.5 hover:bg-accent/50 transition-colors border-l border-border"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Diagram area */}
      {expanded && (
        <div className={
          fullscreen
            ? "fixed inset-0 z-50 bg-background flex flex-col"
            : "h-[500px] bg-background border-t border-border relative"
        }>
          {/* Fullscreen header bar */}
          {fullscreen && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 shrink-0">
              <Network className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground">Flow Diagram</span>
              {manifestEntry && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-auto">
                  {manifestEntry.actionCount} actions
                </Badge>
              )}
              <button
                onClick={() => setFullscreen(false)}
                className="ml-auto p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Exit fullscreen (Esc)"
              >
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          <div className={fullscreen ? "flex-1 relative" : "h-full relative"}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading flow definition...</span>
              </div>
            ) : (
              <FlowDiagram definition={definition} workflowNameMap={nameMap} error={errorMessage} />
            )}
            {/* Legend */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 bg-card/90 backdrop-blur-sm border border-border rounded-md px-2 py-1.5 text-[9px] text-muted-foreground z-10">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500/50" />Trigger</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/50" />Connector</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/50" />Variable</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500/50" />Condition</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-500/50" />Scope</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/50" />Response</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
