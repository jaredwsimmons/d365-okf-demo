"use client";

import { useState, type ReactNode, type ElementType } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardIcon } from "./dashboard-icon";

/**
 * Reusable collapsible accordion shell used by detail panel cross-references,
 * entity accordions, and related-object accordions.
 */
export function AccordionSection({
  title,
  icon,
  iconKey,
  lucideIcon: LucideIcon,
  defaultOpen = false,
  children,
}: {
  title: string;
  /** Tab ID for icon resolution (e.g. "entities", "apps") */
  icon?: string;
  /** Explicit icon key override (takes precedence over icon) */
  iconKey?: string;
  /** Direct Lucide icon component (takes precedence over iconKey and icon) */
  lucideIcon?: ElementType;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-90")} />
        {LucideIcon ? (
          <LucideIcon className="h-3.5 w-3.5 shrink-0" />
        ) : (iconKey || icon) ? (
          <DashboardIcon
            {...(iconKey ? { iconKey } : { tabId: icon })}
            className="h-3.5 w-3.5 shrink-0"
          />
        ) : null}
        <span className="font-medium">{title}</span>
      </button>
      {open && (
        <div className="border-t px-2 py-1 space-y-0">
          {children}
        </div>
      )}
    </div>
  );
}
