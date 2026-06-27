"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";
import { SquarePen } from "lucide-react";
import { TagEditPanel } from "@/components/explorer/tag-edit-panel";
import { StatsBar } from "@/components/shared/stats-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { apiUrl } from "@/lib/asset-path";
import type { Tags } from "@/types/inventory";

interface PCFControl {
  name: string;
  namespace: string;
  version: string;
  displayName: string;
  description: string;
  controlType: string;
  technology: string;
  sourcePath: string;
  boundProperties?: { name: string; type: string; required: boolean }[];
  deployedOn?: { entity: string; form: string; field: string }[];
  tags?: Tags;
  _hasOverride?: boolean;
  [key: string]: unknown;
}

interface PCFData {
  metadata: {
    totalControls: number;
    summary: Record<string, Record<string, number>>;
  };
  controls: PCFControl[];
}

export function PCFTab() {
  const [pcfData, setPcfData] = useState<PCFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingControl, setEditingControl] = useState<PCFControl | null>(null);

  useEffect(() => {
    fetch(apiUrl(`/api/v1/inventory/pcf`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.items) {
          setPcfData({ metadata: { totalControls: d.items.length, summary: {} }, controls: d.items });
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <EmptyState title="Loading PCF data..." />;
  }

  if (!pcfData) {
    return (
      <EmptyState title="No PCF data available" subtitle="Run the extraction pipeline to populate PCF control data" />
    );
  }

  const controls = pcfData.controls || [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <StatsBar stats={[
        { value: String(controls.length), label: "PCF Controls" },
      ]} />
      <div className="flex-1 flex min-h-0">
      <div className="flex-1 overflow-y-auto custom-scroll px-4 py-4">
        <Card className="mb-5">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-brand-primary">
              PCF Controls
            </h3>
            <Badge variant="secondary" className="text-xs">
              {controls.length}
            </Badge>
          </div>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {controls.map((c) => (
                <PCFCard
                  key={c.name}
                  control={c}
                  onEdit={() => setEditingControl(c)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {editingControl && (
        <TagEditPanel
          dataKey="pcf"
          itemId={editingControl.name}
          itemName={editingControl.displayName || editingControl.name}
          currentTags={editingControl.tags || {}}
          onSave={() => {
            setEditingControl(null);
          }}
          onClose={() => setEditingControl(null)}
        />
      )}
      </div>
    </div>
  );
}

function PCFCard({ control, onEdit }: { control: PCFControl; onEdit: () => void }) {
  const deployCount = control.deployedOn?.length || 0;

  return (
    <Card className="border-l-3 border-l-brand-accent transition-shadow hover:shadow-md">
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-semibold text-brand-primary">
            {control.displayName || control.name}
          </h4>
          <Button
            size="sm"
            className="h-7 text-xs gap-1 bg-brand-accent hover:bg-brand-accent/90 text-white shrink-0"
            onClick={onEdit}
          >
            <SquarePen className="w-3.5 h-3.5" />
            Edit Component
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              borderColor: "var(--color-brand-accent)",
              color: "var(--color-brand-accent)",
              background: "color-mix(in srgb, var(--color-brand-accent) 8%, transparent)",
            }}
          >
            v{control.version}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {control.namespace}
          </Badge>
          {control.technology && (
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: "var(--color-pill-info)",
                color: "var(--color-pill-info)",
                background: "color-mix(in srgb, var(--color-pill-info) 8%, transparent)",
              }}
            >
              {control.technology}
            </Badge>
          )}
          {control._hasOverride && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-auto border-orange-300 text-orange-500 bg-orange-50"
            >
              Edited
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {control.description || "-"}
          </p>

          {/* Bound Properties */}
          {control.boundProperties && control.boundProperties.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Bound Properties
              </h5>
              <div className="flex flex-wrap gap-1">
                {control.boundProperties.map((bp) => (
                  <Badge
                    key={bp.name}
                    variant="secondary"
                    className="text-[10px] font-mono"
                  >
                    {bp.name}
                    {bp.required && (
                      <span className="text-brand-accent ml-0.5">*</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Deployments */}
          {deployCount > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Deployed On ({deployCount})
              </h5>
              <div className="space-y-0.5">
                {control.deployedOn!.slice(0, 5).map((d, i) => (
                  <div key={i} className="text-xs text-foreground/70">
                    {d.entity} / {d.form} &rarr; {d.field}
                  </div>
                ))}
                {deployCount > 5 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{deployCount - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Source Path */}
        {control.sourcePath && (
          <div className="mt-2 pt-2 border-t">
            <span className="text-[10px] font-mono text-muted-foreground">
              {control.sourcePath}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
