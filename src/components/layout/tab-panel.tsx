"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { Explorer } from "@/components/explorer/explorer";
import { explorerConfigs } from "@/lib/explorer-configs";
import { useInventory, useInventoryItem } from "@/hooks/use-inventory-api";
import { ProcessCatalogTab } from "@/components/tabs/process-catalog";
import { CapabilityMapTab } from "@/components/tabs/capability-map";
import { PCFTab } from "@/components/tabs/pcf/pcf-tab";
import { AzureTab } from "@/components/tabs/azure/azure-tab";
import { EntityDiagramTab } from "@/components/tabs/entity-diagram/entity-diagram-tab";
import { UntaggedQueueTab } from "@/components/tabs/untagged-queue/untagged-queue-tab";
import { GovernanceTab } from "@/components/tabs/governance/governance-tab";
import { EnvironmentHealthTab } from "@/components/tabs/environment-health";
import { EnvironmentHygieneTab } from "@/components/tabs/environment-hygiene";
import {
  ExplorerSkeleton,
} from "@/components/shared/loading-states";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { AlertCircle, DatabaseZap } from "lucide-react";

const EXPLORER_TABS = new Set([
  "plugins", "pluginsteps", "entities", "forms", "views", "workflows",
  "webresources", "apps", "appactions", "reports", "security",
  "optionsets", "envvars", "sitemaps", "templates", "dashboards",
  "mobileoffline", "aicomponents",
]);

export function TabPanel() {
  const { activeTab } = useDashboard();

  // Explorer tabs
  if (EXPLORER_TABS.has(activeTab)) {
    return (
      <ErrorBoundary>
        <ExplorerTabPanel tabId={activeTab} />
      </ErrorBoundary>
    );
  }

  // Specialized tabs
  switch (activeTab) {
    case "processcatalog":
      return <ProcessCatalogTab />;
    case "capabilitymap":
      return <CapabilityMapTab />;
    case "pcf":
      return <PCFTab />;
    case "azure":
      return <AzureTab />;
    case "entitydiagram":
      return <EntityDiagramTab />;
    case "untaggedqueue":
      return <UntaggedQueueTab />;
    case "solutionarchitecture":
    case "solutionhealth":
      return <EnvironmentHealthTab />;
    case "governance":
      return <GovernanceTab />;
    case "environmenthygiene":
      return <EnvironmentHygieneTab />;
    default:
      return (
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title="Tab not found"
          subtitle={`No content available for "${activeTab}"`}
        />
      );
  }
}

function ExplorerTabPanel({ tabId }: { tabId: string }) {
  const { selectedItemId } = useDashboard();
  const config = explorerConfigs[tabId];

  const { data: apiResult, isLoading: apiLoading } = useInventory(
    config?.dataKey as string,
    undefined,
    { enabled: !!config }
  );

  const selectedIdField = config?.idField;
  const items = (apiResult?.items ?? []) as Record<string, unknown>[];
  const selectedApiItem = selectedItemId
    ? items.find((item) => String(item[selectedIdField || ""] || "") === selectedItemId)
    : null;
  const selectedItemDbId = selectedApiItem ? String(selectedApiItem[selectedIdField || ""] || "") : null;

  const { data: enrichedResult } = useInventoryItem(
    config?.dataKey as string,
    selectedItemDbId,
    { enabled: !!selectedItemDbId }
  );

  if (!config) {
    return (
      <EmptyState
        icon={<AlertCircle className="w-10 h-10" />}
        title="Tab not configured"
        subtitle={`No explorer configuration found for "${tabId}"`}
      />
    );
  }

  if (apiLoading) {
    return <ExplorerSkeleton />;
  }

  const enrichedItem = enrichedResult?.item
    ? enrichedResult.item as Record<string, unknown>
    : null;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<DatabaseZap className="w-10 h-10" />}
        title="No data available"
        subtitle="Run the extraction pipeline to populate this inventory"
      />
    );
  }

  return <Explorer config={config} items={items} enrichedItem={enrichedItem} />;
}
