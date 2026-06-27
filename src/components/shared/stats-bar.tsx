"use client";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui";
import type { ReactNode } from "react";

export interface StatItem {
  label: string;
  value: string;
  highlight?: boolean;
}

interface StatsBarProps {
  stats: StatItem[];
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
}

export function StatChip({ label, value, highlight }: StatItem) {
  return (
    <div className="text-center">
      <div className={cn("text-sm font-bold tabular-nums", highlight ? "text-brand-accent" : "text-brand-primary")}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">{label}</div>
    </div>
  );
}

export function StatsBar({ stats, leftSlot, rightSlot, className }: StatsBarProps) {
  return (
    <div className={cn("flex items-center gap-4 px-4 py-2 border-b bg-background shrink-0 flex-wrap", className)}>
      {leftSlot}
      {stats.length > 0 && leftSlot && <Separator orientation="vertical" className="h-8" />}
      {stats.map((s, i) => (
        <div key={s.label + i} className="flex items-center gap-4">
          {i > 0 && <Separator orientation="vertical" className="h-8" />}
          <StatChip {...s} />
        </div>
      ))}
      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </div>
  );
}
