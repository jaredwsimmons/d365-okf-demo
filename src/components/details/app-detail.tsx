"use client";

import { useState } from "react";
import type { AppItem } from "@/types/inventory";
import { Badge } from "@/components/ui";
import { cn, toArray } from "@/lib/utils";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { AccordionSection } from "@/components/shared/accordion-section";
import {
  DetailHeader,
  DetailDesc,
  DetailGrid,
  BPCPath,
  PillList,
  DetailSection,
} from "@/components/explorer/detail-helpers";

type NavFn = (tabId: string, searchName: string) => void;
type RelDetail = { name: string; subtitle: string; searchName: string; itemId?: string };
type EntityDetail = { logicalName: string; displayName: string; iconKey: string; searchName: string };

export function AppDetail({
  item,
  icon,
  onNavigate,
}: {
  item: AppItem;
  icon?: string;
  onNavigate?: NavFn;
}) {
  const ext = item as Record<string, unknown>;
  const type = (ext.type as string) || "";

  if (type === "ModelDrivenApp") return <ModelDrivenDetail item={ext} icon={icon} onNavigate={onNavigate} />;
  if (type === "CanvasApp")      return <CanvasDetail item={ext} icon={icon} onNavigate={onNavigate} />;
  if (type === "CopilotBot")     return <CopilotDetail item={ext} icon={icon} onNavigate={onNavigate} />;
  return <GenericAppDetail item={ext} icon={icon} onNavigate={onNavigate} />;
}

// ---------------------------------------------------------------------------
// Model-Driven
// ---------------------------------------------------------------------------

function ModelDrivenDetail({
  item,
  icon,
  onNavigate,
}: {
  item: Record<string, unknown>;
  icon?: string;
  onNavigate?: NavFn;
}) {
  const t = (item.tags as Record<string, unknown>) || {};
  const embeddedCanvas = toArray<string>(item.embeddedCanvasApps);
  const entityDetails = (item._relEntityDetails as EntityDetail[]) || [];
  const entityCount = toArray<string>(item.entities).length;

  return (
    <>
      <DetailHeader icon={icon} title={item.displayName as string || ""} subtitle="Model-Driven App" />
      <DetailDesc text={item.description as string} />
      <DetailGrid
        rows={[
          { label: "Unique Name", value: item.uniqueName as string, mono: true },
          { label: "Solution",    value: item.solution as string },
          { label: "Client",      value: item.clientType as string },
          { label: "Form Factor", value: item.formFactor as string },
          { label: "Version",     value: item.version as string },
          { label: "Active",      value: item.isActive != null ? (item.isActive ? "Yes" : "No") : undefined },
          { label: "Charts",      value: item.chartCount != null ? String(item.chartCount) : undefined },
          { label: "Primary Vertical", value: t.primaryModule as string },
          { label: "User Role",   value: t.userRole as string },
        ]}
      />
      <PillList title="Functional Area" items={[t.functionalArea as string]} />
      <BPCPath tags={t} />
      <AppRelatedObjects
        item={item}
        entityDetails={entityDetails}
        entityCount={entityCount}
        embeddedCanvas={embeddedCanvas}
        onNavigate={onNavigate}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

function CanvasDetail({
  item,
  icon,
  onNavigate,
}: {
  item: Record<string, unknown>;
  icon?: string;
  onNavigate?: NavFn;
}) {
  const t = (item.tags as Record<string, unknown>) || {};
  const entityDetails = (item._relEntityDetails as EntityDetail[]) || [];
  const conns = toArray<string>(item.connections);
  const screenNames = toArray<string>(item.screenNames);
  const controlCounts = (item.controlCounts as Record<string, number>) || {};
  const parserErrors = (item.parserErrors as number) || 0;
  const bindingErrors = (item.bindingErrors as number) || 0;
  const hasHealth = item.parserErrors != null || item.bindingErrors != null;

  return (
    <>
      <DetailHeader icon={icon} title={item.displayName as string || ""} subtitle="Canvas App" />
      <DetailDesc text={item.description as string} />
      <DetailGrid
        rows={[
          { label: "Solution",        value: item.solution as string },
          { label: "Type",            value: item.appType as string },
          { label: "Status",          value: item.status as string },
          { label: "Orientation",     value: item.orientation as string },
          { label: "Layout",          value: item.layoutWidth && item.layoutHeight ? `${item.layoutWidth} × ${item.layoutHeight}` : undefined },
          { label: "Screens",         value: item.screenCount != null ? String(item.screenCount) : undefined },
          { label: "Controls",        value: item.totalControls ? String(item.totalControls) : undefined },
          { label: "Last Saved",      value: item.lastSaved as string },
          { label: "Third-Party PCF", value: item.hasThirdPartyPcf != null ? (item.hasThirdPartyPcf ? "Yes" : "No") : undefined },
          { label: "Purpose",         value: t.purpose as string },
        ]}
      />
      {hasHealth && (
        <DetailGrid
          rows={[
            { label: "Parser Errors",  value: String(parserErrors) },
            { label: "Binding Errors", value: String(bindingErrors) },
          ]}
        />
      )}
      <PillList title="Functional Area" items={[t.functionalArea as string]} />
      <BPCPath tags={t} />

      {screenNames.length > 0 && (
        <PillList title={`Screens (${screenNames.length})`} items={screenNames} />
      )}
      {Object.keys(controlCounts).filter(k => k !== "screen").length > 0 && (
        <ControlCountSection counts={controlCounts} />
      )}

      <AppRelatedObjects
        item={item}
        entityDetails={entityDetails}
        entityCount={entityDetails.length}
        embeddedCanvas={[]}
        connections={conns}
        onNavigate={onNavigate}
      />
    </>
  );
}

function ControlCountSection({ counts }: { counts: Record<string, number> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(counts)
    .filter(([k]) => k !== "screen")
    .sort((a, b) => b[1] - a[1]);
  const limit = 6;
  const shown = expanded ? entries : entries.slice(0, limit);

  return (
    <DetailSection title="Control Breakdown">
      <div className="flex flex-wrap gap-1">
        {shown.map(([name, count]) => (
          <Badge key={name} variant="secondary" className="text-xs font-normal">
            {name
              .replace(/^[A-Za-z_]+_CoreControls_/, "")
              .replace(/^Microsoft_CoreControls_/, "")
              .replace(/^PowerApps_CoreControls_/, "")}: {count}
          </Badge>
        ))}
      </div>
      {entries.length > limit && !expanded && (
        <button onClick={() => setExpanded(true)} className="text-xs text-brand-primary hover:underline mt-1">
          Show {entries.length - limit} more...
        </button>
      )}
    </DetailSection>
  );
}

// ---------------------------------------------------------------------------
// Copilot
// ---------------------------------------------------------------------------

function CopilotDetail({
  item,
  icon,
  onNavigate,
}: {
  item: Record<string, unknown>;
  icon?: string;
  onNavigate?: NavFn;
}) {
  const t = (item.tags as Record<string, unknown>) || {};
  return (
    <>
      <DetailHeader icon={icon} title={item.displayName as string || ""} subtitle="Copilot Bot" />
      <DetailGrid
        rows={[
          { label: "Solution", value: item.solution as string },
          { label: "Language", value: item.language as string },
          { label: "Status",   value: item.publishStatus as string },
          { label: "Template", value: item.template as string },
          { label: "Published",value: item.lastPublished as string },
          { label: "Purpose",  value: t.purpose as string },
        ]}
      />
      <PillList title="Functional Area" items={[t.functionalArea as string]} />
      <BPCPath tags={t} />
      <AppRelatedObjects item={item} entityDetails={[]} entityCount={0} embeddedCanvas={[]} onNavigate={onNavigate} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Generic fallback
// ---------------------------------------------------------------------------

function GenericAppDetail({
  item,
  icon,
  onNavigate,
}: {
  item: Record<string, unknown>;
  icon?: string;
  onNavigate?: NavFn;
}) {
  const t = (item.tags as Record<string, unknown>) || {};
  return (
    <>
      <DetailHeader
        icon={icon}
        title={(item.displayName as string) || (item.name as string) || ""}
        subtitle={item.appType as string}
      />
      <DetailGrid
        rows={[
          { label: "Solution", value: item.solution as string },
          { label: "Type",     value: item.appType as string },
        ]}
      />
      <BPCPath tags={t} />
      <AppRelatedObjects item={item} entityDetails={[]} entityCount={0} embeddedCanvas={[]} onNavigate={onNavigate} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared Related Objects section — all accordions, all clickable
// ---------------------------------------------------------------------------

function AppRelatedObjects({
  item,
  entityDetails,
  entityCount,
  embeddedCanvas,
  connections,
  onNavigate,
}: {
  item: Record<string, unknown>;
  entityDetails: EntityDetail[];
  entityCount: number;
  embeddedCanvas: string[];
  connections?: string[];
  onNavigate?: NavFn;
}) {
  const dashboards = (item._relDashboardDetails as RelDetail[]) || [];
  const siteMaps   = (item._relSiteMapDetails  as RelDetail[]) || [];
  const wrs        = (item._relWebResourceDetails as RelDetail[]) || [];
  const wrRawCount = (item._relWebResources as string[] || []).length;

  const hasAny =
    entityDetails.length > 0 ||
    entityCount > 0 ||
    embeddedCanvas.length > 0 ||
    (connections?.length ?? 0) > 0 ||
    dashboards.length > 0 ||
    siteMaps.length > 0 ||
    wrs.length > 0 ||
    wrRawCount > 0;

  if (!hasAny) return null;

  // Build entity items from pre-resolved details, or fall back to raw logicalNames
  const entityItems: EntityDetail[] = entityDetails.length > 0
    ? entityDetails
    : (Array.isArray(item.entities) ? (item.entities as string[]) : []).map(ln => ({
        logicalName: ln, displayName: ln, iconKey: "Entity", searchName: ln,
      }));

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Related Objects
      </h3>
      <div className="space-y-1">

        {/* Entities / Entity Dependencies */}
        {entityItems.length > 0 && (
          <EntityAccordion
            title={`Entities (${entityItems.length})`}
            items={entityItems}
            onNavigate={onNavigate}
          />
        )}

        {/* Embedded canvas apps */}
        {embeddedCanvas.length > 0 && (
          <RelatedObjectAccordion
            title={`Embedded Canvas Apps (${embeddedCanvas.length})`}
            icon="apps"
            items={embeddedCanvas.map((n) => {
              const baseName = n.replace(/_[a-f0-9]{4,}(_DocumentUri)?$/i, "");
              return { name: baseName, subtitle: "", searchName: baseName };
            })}
            onNavigate={onNavigate ? (_, __, searchName, itemId) => onNavigate("apps", itemId ?? searchName ?? _) : undefined}
          />
        )}

        {/* Connections — display only, no nav target */}
        {(connections?.length ?? 0) > 0 && (
          <RelatedObjectAccordion
            title={`Connections (${connections!.length})`}
            icon="azure"
            items={connections!.map(c => ({ name: c, subtitle: "", searchName: c }))}
          />
        )}

        {/* Dashboards */}
        {dashboards.length > 0 && (
          <RelatedObjectAccordion
            title={`Dashboards (${dashboards.length})`}
            icon="dashboards"
            items={dashboards}
            onNavigate={onNavigate ? (_, __, searchName, itemId) => onNavigate("dashboards", itemId ?? searchName ?? _) : undefined}
          />
        )}

        {/* Site Maps */}
        {siteMaps.length > 0 && (
          <RelatedObjectAccordion
            title={`Site Maps (${siteMaps.length})`}
            icon="sitemaps"
            items={siteMaps}
            onNavigate={onNavigate ? (_, __, searchName, itemId) => onNavigate("sitemaps", itemId ?? searchName ?? _) : undefined}
          />
        )}

        {/* Web Resources */}
        {(wrs.length > 0 || wrRawCount > 0) && (
          <RelatedObjectAccordion
            title={`Web Resources (${wrs.length || wrRawCount})`}
            icon="webresources"
            items={wrs}
            onNavigate={onNavigate ? (_, __, searchName, itemId) => onNavigate("webresources", itemId ?? searchName ?? _) : undefined}
          />
        )}

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entity accordion — shows module icon beside each entity name
// ---------------------------------------------------------------------------

function EntityAccordion({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: EntityDetail[];
  onNavigate?: NavFn;
}) {
  return (
    <AccordionSection title={title} icon="entities">
      {items.map((e) => (
        <button
          key={e.logicalName}
          onClick={onNavigate ? () => onNavigate("entities", e.searchName) : undefined}
          className={cn(
            "flex w-full items-center gap-2 px-2 py-1 rounded text-xs text-left transition-colors",
            onNavigate ? "hover:bg-accent/50" : "cursor-default"
          )}
        >
          <DashboardIcon iconKey={e.iconKey} className="h-3.5 w-3.5 shrink-0 opacity-80" />
          <span className={cn("flex-1 truncate", onNavigate ? "text-primary/80 hover:text-primary" : "text-foreground/80")}>
            {e.displayName}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">{e.logicalName}</span>
        </button>
      ))}
    </AccordionSection>
  );
}

// ---------------------------------------------------------------------------
// Generic related object accordion
// ---------------------------------------------------------------------------

function RelatedObjectAccordion({
  title,
  icon,
  items,
  onNavigate,
}: {
  title: string;
  icon: string;
  items: { name: string; subtitle: string; searchName?: string; itemId?: string }[];
  onNavigate?: (name: string, subtitle: string, searchName?: string, itemId?: string) => void;
}) {
  return (
    <AccordionSection title={title} icon={icon}>
      {items.length === 0 ? (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">No details available</p>
      ) : (
        items.map((item, i) => (
          <ItemRow
            key={`${item.name}-${i}`}
            name={item.name}
            subtitle={item.subtitle}
            onClick={onNavigate ? () => onNavigate(item.name, item.subtitle, item.searchName, item.itemId) : undefined}
          />
        ))
      )}
    </AccordionSection>
  );
}

function ItemRow({
  name,
  subtitle,
  onClick,
}: {
  name: string;
  subtitle: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className={cn("flex-1 truncate", onClick ? "text-primary/80" : "text-foreground/80")}>
        {name}
      </span>
      {subtitle && (
        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{subtitle}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex w-full items-center px-2 py-1 rounded hover:bg-accent/50 text-xs text-left transition-colors"
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="flex w-full items-center px-2 py-1 text-xs">
      {inner}
    </div>
  );
}

