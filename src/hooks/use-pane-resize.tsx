import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook for a draggable split-pane resize handle.
 * Returns width state, dragging flag, mousedown handler, and a ref to attach to the container.
 */
export function usePaneResize(defaultWidth: number, minLeft = 180, minRight = 280) {
  const [width, setWidth] = useState(defaultWidth);
  const [dragging, setDragging] = useState(false);
  const activeRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragging) return;
    activeRef.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!activeRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxW = rect.width - minRight;
      setWidth(Math.max(minLeft, Math.min(ev.clientX - rect.left, maxW)));
    };
    const onUp = () => {
      activeRef.current = false;
      setDragging(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, minLeft, minRight]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  return { width, dragging, startResize, containerRef };
}

/** Drag overlay — render when dragging to capture all mouse events */
export function DragOverlay({ dragging }: { dragging: boolean }) {
  if (!dragging) return null;
  return <div className="fixed inset-0 z-50 cursor-col-resize" style={{ userSelect: "none" }} />;
}

/** Grip handle rendered between panes */
export function PaneResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="w-3 shrink-0 cursor-col-resize border-x border-border bg-muted/50 hover:bg-accent active:bg-primary/20 transition-colors flex items-center justify-center group"
      onMouseDown={onMouseDown}
    >
      <div className="flex flex-col gap-[3px] opacity-30 group-hover:opacity-70 transition-opacity">
        <div className="w-1 h-1 rounded-full bg-foreground" />
        <div className="w-1 h-1 rounded-full bg-foreground" />
        <div className="w-1 h-1 rounded-full bg-foreground" />
        <div className="w-1 h-1 rounded-full bg-foreground" />
        <div className="w-1 h-1 rounded-full bg-foreground" />
      </div>
    </div>
  );
}
