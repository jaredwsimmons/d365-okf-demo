"use client";

import { useState } from "react";
import { useInventory } from "@/hooks/use-inventory-api";
import { Card, CardContent } from "@/components/ui";
import { EmptyState } from "@/components/shared/empty-state";
import { ExplorerSkeleton } from "@/components/shared/loading-states";
import { DatabaseZap } from "lucide-react";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";
import { SquarePen } from "lucide-react";
import { TagEditPanel } from "@/components/explorer/tag-edit-panel";
import { StatsBar } from "@/components/shared/stats-bar";
import type { AzureLogicApp, AzureFunction, AzureIntegration } from "@/types/inventory";

type AzureItem = AzureLogicApp | AzureFunction | AzureIntegration;

const DIR_COLORS: Record<string, { border: string; text: string }> = {
  Bidirectional: { border: "var(--color-pill-info)", text: "var(--color-pill-info)" },
  Inbound: { border: "var(--color-pill-service)", text: "var(--color-pill-service)" },
  Outbound: { border: "var(--color-pill-construction)", text: "var(--color-pill-construction)" },
};

function dirStyle(dir?: string) {
  const c = DIR_COLORS[dir || ""] || {
    border: "var(--color-pill-general)",
    text: "var(--color-pill-general)",
  };
  return {
    borderColor: c.border,
    color: c.text,
    background: `color-mix(in srgb, ${c.border} 12%, transparent)`,
  };
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="sm"
      className="h-7 text-xs gap-1 bg-brand-accent hover:bg-brand-accent/90 text-white shrink-0"
      onClick={onClick}
    >
      <SquarePen className="w-3.5 h-3.5" />
      Edit Component
    </Button>
  );
}

export function AzureTab() {
  const { data: apiResult, isLoading } = useInventory("azure");
  const [editingItem, setEditingItem] = useState<AzureItem | null>(null);

  // Build azure structure from flat API items
  const azure = apiResult?.items && apiResult.items.length > 0
    ? {
        logicApps: apiResult.items.filter((i: Record<string, unknown>) => (i._type ?? i.type) === "logicApp") as unknown as AzureLogicApp[],
        functions: apiResult.items.filter((i: Record<string, unknown>) => (i._type ?? i.type) === "function") as unknown as AzureFunction[],
        externalIntegrations: apiResult.items.filter((i: Record<string, unknown>) => (i._type ?? i.type) === "externalIntegration") as unknown as AzureIntegration[],
      }
    : null;

  if (isLoading) return <ExplorerSkeleton />;

  if (!azure) {
    return (
      <EmptyState
        icon={<DatabaseZap className="w-10 h-10" />}
        title="No data available"
        subtitle="Run the extraction pipeline to populate Azure component data"
      />
    );
  }

  const logicApps = azure.logicApps || [];
  const functions = azure.functions || [];
  const integrations = [...(azure.externalIntegrations || [])].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "")
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <StatsBar stats={[
        { value: String(logicApps.length), label: "Logic Apps" },
        { value: String(functions.length), label: "Functions" },
        { value: String(integrations.length), label: "Integrations" },
      ]} />
      <div className="flex-1 flex min-h-0">
      <div className="flex-1 overflow-y-auto custom-scroll px-4 py-4">
        {/* Logic Apps */}
        <Card className="mb-5">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-brand-primary">
              Azure Logic Apps
            </h3>
            <Badge variant="secondary" className="text-xs">
              {logicApps.length}
            </Badge>
          </div>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {logicApps.map((la) => (
                <LogicAppCard key={la.name} item={la} onEdit={() => setEditingItem(la)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Functions */}
        <Card className="mb-5">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-brand-primary">
              Azure Functions
            </h3>
            <Badge variant="secondary" className="text-xs">
              {functions.length}
            </Badge>
          </div>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {functions.map((fn) => (
                <FunctionCard key={fn.name} item={fn} onEdit={() => setEditingItem(fn)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* External Integrations */}
        <Card className="mb-5">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-brand-primary">
              External Integrations
            </h3>
            <Badge variant="secondary" className="text-xs">
              {integrations.length}
            </Badge>
          </div>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {integrations.map((integ) => (
                <IntegrationCard key={integ.name} item={integ} onEdit={() => setEditingItem(integ)} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {editingItem && (
        <TagEditPanel
          dataKey="azure"
          itemId={editingItem.name}
          itemName={editingItem.name}
          currentTags={editingItem.tags || {}}
          onSave={() => {
            setEditingItem(null);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
      </div>
    </div>
  );
}

function LogicAppCard({ item, onEdit }: { item: AzureLogicApp; onEdit: () => void }) {
  return (
    <Card className="border-l-3 border-l-brand-accent bg-muted/30">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-semibold text-brand-primary">
            {item.name}
          </h4>
          <EditButton onClick={onEdit} />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge variant="outline" className="text-xs">
            {item.trigger}
          </Badge>
          <Badge
            variant="outline"
            className="text-xs"
            style={dirStyle(item.direction)}
          >
            {item.direction}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-1">
          {item.description || "-"}
        </p>
        <p className="text-xs text-brand-primary">
          Entity: {item.relatedEntity || "-"}
        </p>
      </CardContent>
    </Card>
  );
}

function FunctionCard({ item, onEdit }: { item: AzureFunction; onEdit: () => void }) {
  return (
    <Card className="border-l-3 border-l-brand-accent bg-muted/30">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-semibold text-brand-primary">
            {item.name}
          </h4>
          <EditButton onClick={onEdit} />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge variant="outline" className="text-xs">
            {item.trigger}
          </Badge>
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              background: "var(--muted)",
              color: "var(--muted-foreground)",
            }}
          >
            {item.runtime || "-"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-1">
          {item.purpose || item.description || "-"}
        </p>
        <p className="text-xs text-brand-primary">
          Called by: {item.calledBy || "-"}
        </p>
      </CardContent>
    </Card>
  );
}

function IntegrationCard({ item, onEdit }: { item: AzureIntegration; onEdit: () => void }) {
  return (
    <Card className="border-l-3 border-l-brand-primary bg-muted/30">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-semibold text-brand-primary">
            {item.name}
          </h4>
          <EditButton onClick={onEdit} />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge variant="outline" className="text-xs">
            {item.type || "-"}
          </Badge>
          <Badge
            variant="outline"
            className="text-xs"
            style={dirStyle(item.direction)}
          >
            {item.direction || "-"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-1">
          Trigger: {item.trigger || "-"}
        </p>
        <p className="text-xs text-brand-primary">
          Connector: {item.connector || "-"}
        </p>
      </CardContent>
    </Card>
  );
}
