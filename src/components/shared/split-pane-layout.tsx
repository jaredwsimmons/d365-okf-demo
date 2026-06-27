"use client";

import { usePaneResize, DragOverlay, PaneResizeHandle } from "@/hooks/use-pane-resize";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SplitPaneLayoutProps {
  listPane: ReactNode;
  detailPane: ReactNode;
  sidePanel?: ReactNode;
  defaultWidth?: number;
  minLeft?: number;
  minRight?: number;
  listPaneClassName?: string;
  detailPaneClassName?: string;
}

export function SplitPaneLayout({
  listPane,
  detailPane,
  sidePanel,
  defaultWidth = 300,
  minLeft,
  minRight,
  listPaneClassName,
  detailPaneClassName,
}: SplitPaneLayoutProps) {
  const { width, dragging, startResize, containerRef } = usePaneResize(defaultWidth, minLeft, minRight);

  return (
    <div className="flex-1 flex flex-row min-h-0 relative">
      <DragOverlay dragging={dragging} />
      <div ref={containerRef} className="flex-1 flex flex-row min-h-0 overflow-hidden">
        <div
          className={cn("bg-card flex flex-col min-h-0 overflow-hidden shrink-0", listPaneClassName)}
          style={{ width }}
        >
          {listPane}
        </div>
        <PaneResizeHandle onMouseDown={startResize} />
        <div className={cn("flex-1 flex flex-col min-h-0 overflow-hidden bg-card", detailPaneClassName)}>
          {detailPane}
        </div>
      </div>
      {sidePanel}
    </div>
  );
}
