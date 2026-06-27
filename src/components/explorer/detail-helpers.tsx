"use client";

import React from "react";
import { Badge } from "@/components/ui";
import { Separator } from "@/components/ui";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { AccordionSection } from "@/components/shared/accordion-section";
import type { CrossReferenceSection } from "@/types/inventory";

// --- Detail Header ---
export function DetailHeader({
  title,
  subtitle,
  icon,
  extra,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  extra?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-start gap-3 mb-3">
        {icon && (
          <DashboardIcon tabId={icon} className="h-7 w-7 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground break-words">
            {title}
          </h2>
          {subtitle && subtitle !== title && (
            <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
          )}
        </div>
        {extra}
      </div>
      <Separator className="mb-4" />
    </>
  );
}

// --- Detail Grid (key-value pairs) ---
export function DetailGrid({
  rows,
}: {
  rows: { label: string; value?: string | number | null; mono?: boolean; html?: React.ReactNode }[];
}) {
  const filtered = rows.filter(
    (r) => r.html !== undefined || (r.value !== undefined && r.value !== null && r.value !== "")
  );
  if (filtered.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Properties
      </h3>
      <div className="grid grid-cols-[105px_1fr] gap-x-3 gap-y-1.5 text-sm">
        {filtered.map((r) => (
          <div key={r.label} className="contents">
            <div className="text-muted-foreground font-medium">{r.label}</div>
            <div className={r.mono ? "font-mono text-xs" : "text-foreground"}>
              {r.html ?? String(r.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Description Box ---
export function DetailDesc({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Description
      </h3>
      <div className="text-sm text-foreground/80 bg-muted rounded-md px-3 py-2 leading-relaxed">
        {text}
      </div>
    </div>
  );
}

// --- BPC Path (Process Catalog hierarchy) ---
export function BPCPath({ tags }: { tags?: Record<string, unknown> | null }) {
  if (!tags) {
    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Process Catalog (BPC)
        </h3>
        <div className="text-sm text-muted-foreground/60">
          No process catalog assignment
        </div>
      </div>
    );
  }

  const l1 = (tags.processCatalogL1 as string) || "";
  const l2 = (tags.processCatalogL2 as string) || "";
  const l3 = (tags.processCatalogL3 as string) || "";

  if (!l1) {
    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Process Catalog (BPC)
        </h3>
        <div className="text-sm text-muted-foreground/60">
          No process catalog assignment
        </div>
      </div>
    );
  }

  const parse = (s: string) => {
    const i = s.indexOf(" ");
    return i > 0
      ? { code: s.slice(0, i), name: s.slice(i + 1) }
      : { code: s, name: "" };
  };

  const levels: { code: string; name: string; color: string; indent: string }[] = [];
  const p1 = parse(l1);
  levels.push({ ...p1, color: "var(--color-dot-l1)", indent: "" });
  if (l2) {
    const p2 = parse(l2);
    levels.push({ ...p2, color: "var(--color-dot-l2)", indent: "pl-4" });
  }
  if (l3) {
    const p3 = parse(l3);
    levels.push({ ...p3, color: "var(--color-dot-l3)", indent: "pl-8" });
  }

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Process Catalog (BPC)
      </h3>
      <div className="space-y-1 bg-muted/50 rounded-md px-3 py-2">
        {levels.map((lv) => (
          <div
            key={lv.code}
            className={`flex items-center gap-2 text-sm ${lv.indent}`}
          >
            <Badge
              variant="outline"
              className="font-mono text-xs py-0 h-auto"
              style={{ borderColor: lv.color, color: lv.color }}
            >
              {lv.code}
            </Badge>
            <span className="text-foreground/80">{lv.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Pill List (generic string pills or icon pills) ---
export function PillList({
  title,
  items,
}: {
  title: string;
  items?: (string | null | undefined)[];
}) {
  const filtered = items?.filter(Boolean) as string[] | undefined;
  if (!filtered || filtered.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1">
        {filtered.map((p) => (
          <Badge
            key={p}
            variant="secondary"
            className="text-xs font-normal"
          >
            {p}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// --- Detail Section Wrapper ---
export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

// --- Cross-Reference List (expandable sections with clickable navigation) ---
export function CrossReferenceList({
  sections,
  onNavigate,
  children,
}: {
  sections: CrossReferenceSection[];
  onNavigate: (tabId: string, searchName: string) => void;
  children?: React.ReactNode;
}) {
  if (sections.length === 0 && !children) return null;

  // Build a unified sorted list: cross-ref sections become {title, node} entries,
  // then interleave with children (which are renderExtra accordion nodes).
  // We wrap each cross-ref section and extract renderExtra children's titles for sorting.
  const allItems: { sortKey: string; node: React.ReactNode }[] = [];

  sections.forEach((section) => {
    allItems.push({
      sortKey: section.title.replace(/\s*\(\d+\)$/, ""),
      node: <CrossRefSection key={section.title} section={section} onNavigate={onNavigate} />,
    });
  });

  // Extract renderExtra children — each is an AccordionSection or wrapper div
  if (children) {
    const childArray = React.Children.toArray(children);
    for (const child of childArray) {
      if (React.isValidElement(child) && child.props && typeof child.props === "object") {
        const props = child.props as Record<string, unknown>;
        // AccordionSection has a title prop; div wrappers contain AccordionSections
        if (props.title && typeof props.title === "string") {
          allItems.push({ sortKey: (props.title as string).replace(/\s*\(\d+\)$/, ""), node: child });
        } else if (props.children) {
          // Wrapper div with multiple children — flatten them
          const inner = React.Children.toArray(props.children as React.ReactNode);
          for (const ic of inner) {
            if (React.isValidElement(ic) && ic.props && typeof ic.props === "object") {
              const iProps = ic.props as Record<string, unknown>;
              const title = iProps.title as string || "";
              allItems.push({ sortKey: title.replace(/\s*\(\d+\)$/, ""), node: ic });
            } else if (ic) {
              allItems.push({ sortKey: "zzz", node: ic });
            }
          }
        } else {
          allItems.push({ sortKey: "zzz", node: child });
        }
      }
    }
  }

  allItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Cross-References
      </h3>
      <div className="space-y-1">
        {allItems.map((entry, i) => (
          <React.Fragment key={i}>{entry.node}</React.Fragment>
        ))}
      </div>
    </div>
  );
}

function CrossRefSection({
  section,
  onNavigate,
}: {
  section: CrossReferenceSection;
  onNavigate: (tabId: string, searchName: string) => void;
}) {
  return (
    <AccordionSection title={section.title} icon={section.icon}>
      {section.items.map((item, i) => (
        <div key={`${item.name}-${i}`}>
          {item.tabId ? (
            <button
              onClick={() => onNavigate(item.tabId!, item.itemId ?? item.searchName!)}
              className="flex w-full items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 text-xs text-left transition-colors"
            >
              <span className="flex-1 truncate text-primary/80 hover:text-primary">{item.name}</span>
              {item.subtitle && (
                <span className="text-[10px] text-muted-foreground shrink-0">{item.subtitle}</span>
              )}
            </button>
          ) : (
            <div className="flex w-full items-center gap-2 px-2 py-1 text-xs">
              <span className="flex-1 text-foreground/80">{item.name}</span>
              {item.subtitle && (
                <span className="text-[10px] text-muted-foreground shrink-0">{item.subtitle}</span>
              )}
            </div>
          )}
          {item.children?.length ? (
            <div className="ml-6 border-l border-border/50 pl-2 mb-1">
              {item.children.map((child, ci) => (
                <div
                  key={`${child.name}-${ci}`}
                  className="flex w-full items-center gap-2 px-1 py-0.5 text-[11px] text-muted-foreground"
                >
                  <span className="flex-1 truncate font-mono">{child.name}</span>
                  {child.subtitle && (
                    <span className="text-[10px] shrink-0">{child.subtitle}</span>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </AccordionSection>
  );
}
