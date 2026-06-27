"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import { tabGroups, type TabGroup } from "@/lib/theme";
import { iconUrl, legendSections } from "@/lib/icons";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { ScrollArea } from "@/components/ui";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  return (
    <div className="w-56 shrink-0 border-r bg-card flex flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <nav className="p-2">
          {tabGroups.map((group, i) => (
            <div key={group.label} className={i > 0 ? "mt-2 pt-2 border-t border-border/40" : ""}>
              <NavGroup group={group} />
            </div>
          ))}
        </nav>
        <div className="border-t mx-2" />
        <IconLegend />
      </ScrollArea>
    </div>
  );
}

function NavGroup({ group }: { group: TabGroup }) {
  const [open, setOpen] = useState(true);
  const { activeTab, switchTab } = useDashboard();

  const isActive = group.tabs.some((t) => t.id === activeTab);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        isActive && "text-foreground"
      )}>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
        {group.label}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-2 space-y-0.5 py-0.5">
          {group.tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <DashboardIcon tabId={tab.id} className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function IconLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-90"
            )}
          />
          Icon Legend
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-2 px-2 py-1.5 space-y-2.5">
            {legendSections.map((sec) => (
              <div key={sec.section}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-1">
                  {sec.section}
                  {sec.subtitle && (
                    <span className="font-normal ml-1 opacity-60">({sec.subtitle})</span>
                  )}
                </h4>
                <div className="grid grid-cols-[16px_1fr] gap-x-2 gap-y-0.5 items-center">
                  {sec.items.map(([key, label]) => {
                    const url = iconUrl(key);
                    return (
                      <div key={key} className="contents">
                        <div className="flex items-center justify-center">
                          {url ? (
                            <img
                              src={url}
                              alt=""
                              className="w-3.5 h-3.5"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-3.5 h-3.5 bg-muted rounded" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground leading-snug">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
