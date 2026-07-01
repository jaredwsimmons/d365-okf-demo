"use client";

import { useState } from "react";
import type { SecurityRoleItem, EntityPermission } from "@/types/inventory";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  DetailHeader,
  DetailGrid,
  BPCPath,
  DetailSection,
  CrossReferenceList,
} from "@/components/explorer/detail-helpers";

const PERM_COLORS: Record<string, string> = {
  C: "var(--color-perm-create)",
  R: "var(--color-perm-read)",
  W: "var(--color-perm-write)",
  D: "var(--color-perm-delete)",
  A: "var(--color-perm-append)",
  S: "var(--color-perm-share)",
};

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  Organization: { bg: "var(--color-level-global-bg)", text: "white" },
  "Business Unit": { bg: "var(--color-level-local-bg)", text: "var(--color-foreground)" },
  User: { bg: "var(--color-level-basic-bg)", text: "var(--color-muted-foreground)" },
};

/** Map JSON keys (Global/Local/Basic) to display labels */
const LEVEL_KEY_MAP: Record<string, string> = {
  Global: "Organization",
  Local: "Business Unit",
  Basic: "User",
};

export function SecurityDetail({ item, icon, onNavigate }: { item: SecurityRoleItem; icon?: string; onNavigate?: (tabId: string, searchName: string) => void }) {
  const t = item.tags || {};
  const privCounts = item.privilegeCounts || {};
  const levelCounts = item.levelCounts || {};
  const perms = Array.isArray(item.entityPermissions) ? item.entityPermissions : [];

  return (
    <>
      <DetailHeader icon={icon}
        title={item.name}
        subtitle={item.category || "Unknown"}
      />
      <DetailGrid
        rows={[
          { label: "ID", value: item.id, mono: true },
          { label: "Category", value: item.category },
          { label: "Solution", value: item.solution },
          { label: "Customizable", value: item.isCustomizable != null ? (item.isCustomizable ? "Yes" : "No") : undefined },
          { label: "Privileges", value: item.totalPrivileges != null ? String(item.totalPrivileges) : undefined },
          { label: "Entities", value: String(item.entityAccessCount ?? perms.length) },
          { label: "Vertical", value: t.vertical as string },
        ]}
      />

      {/* Privilege type badges */}
      <DetailSection title="Privilege Counts">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PERM_COLORS).map(([key, color]) => {
            const fullKey =
              key === "C" ? "Create" :
              key === "R" ? "Read" :
              key === "W" ? "Write" :
              key === "D" ? "Delete" :
              key === "A" ? "Assign" : "Share";
            const count = privCounts[fullKey] || 0;
            return (
              <Badge
                key={key}
                variant="outline"
                className="text-xs font-medium"
                style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, color, background: `color-mix(in srgb, ${color} 8%, transparent)` }}
              >
                {key}:{count}
              </Badge>
            );
          })}
        </div>
      </DetailSection>

      {/* Level distribution */}
      <DetailSection title="Access Levels">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(LEVEL_KEY_MAP).map(([jsonKey, displayLabel]) => {
            const count = levelCounts[jsonKey] || 0;
            const style = LEVEL_COLORS[displayLabel] || { bg: "var(--color-pill-general)", text: "var(--color-foreground)" };
            return (
              <Badge
                key={jsonKey}
                className="text-xs font-medium"
                style={{ background: style.bg, color: style.text, border: "none" }}
              >
                {displayLabel}: {count}
              </Badge>
            );
          })}
        </div>
      </DetailSection>

      {(() => {
        const raw = (item as Record<string, unknown>).keyEntities;
        const arr: string[] = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
        if (!arr.length || !onNavigate) return null;
        return (
          <CrossReferenceList
            sections={[{
              title: `Key Entities (${arr.length})`,
              icon: "entities",
              items: arr.map(name => ({ name, tabId: "entities", searchName: name })),
            }]}
            onNavigate={onNavigate}
          />
        );
      })()}
      <BPCPath tags={t} />

      {perms.length > 0 && (
        <EntityPermissionsGrid permissions={perms} />
      )}
    </>
  );
}

function EntityPermissionsGrid({
  permissions,
}: {
  permissions: EntityPermission[];
}) {
  const [expanded, setExpanded] = useState(false);
  const limit = 30;
  const shown = expanded ? permissions : permissions.slice(0, limit);
  const hasMore = permissions.length > limit;

  return (
    <DetailSection title={`Entity Permissions (${permissions.length})`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Entity</TableHead>
            <TableHead className="text-xs w-10 text-center">C</TableHead>
            <TableHead className="text-xs w-10 text-center">R</TableHead>
            <TableHead className="text-xs w-10 text-center">W</TableHead>
            <TableHead className="text-xs w-10 text-center">D</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((p) => (
            <TableRow key={p.entity}>
              <TableCell className="font-mono text-xs py-1.5">
                {p.entity}
              </TableCell>
              <TableCell className="text-center py-1.5">
                <LevelBadge level={p.create} />
              </TableCell>
              <TableCell className="text-center py-1.5">
                <LevelBadge level={p.read} />
              </TableCell>
              <TableCell className="text-center py-1.5">
                <LevelBadge level={p.write} />
              </TableCell>
              <TableCell className="text-center py-1.5">
                <LevelBadge level={p.delete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore && !expanded && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-xs"
          onClick={() => setExpanded(true)}
        >
          Show {permissions.length - limit} more...
        </Button>
      )}
    </DetailSection>
  );
}

function LevelBadge({ level }: { level: string }) {
  if (!level || level === "None") {
    return <span className="text-muted-foreground/30">-</span>;
  }
  const displayLabel = LEVEL_KEY_MAP[level] || level;
  const lvl = LEVEL_COLORS[displayLabel] || { bg: "var(--color-pill-general)", text: "var(--color-foreground)" };
  return (
    <Badge
      className="text-[10px] px-1 py-0 h-auto border-0"
      style={{ background: lvl.bg, color: lvl.text }}
    >
      {displayLabel.charAt(0)}
    </Badge>
  );
}
