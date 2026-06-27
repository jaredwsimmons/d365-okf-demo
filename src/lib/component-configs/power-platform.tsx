// Component configs for Power Platform — explorer + detail configs co-located
import type {
  DashboardData,
  ExplorerConfig,
  PillDef,
  DetailConfig,
  CrossReferenceSection,
  WorkflowItem,
  WebResourceItem,
  AppItem,
  ReportItem,
  EnrichedGovernanceFinding,
} from "@/types/inventory";
import { webResourceIconKey } from "@/lib/icons";
import { WorkflowFlowSection } from "@/components/shared/workflow-flow-section";
import { AppDetail } from "@/components/details/app-detail";
import { AccordionSection } from "@/components/shared/accordion-section";
import { topCounts, boolToYes, filterItems } from "./shared";

/** Build a unified Governance cross-reference section from structured findings or legacy flags */
function buildGovernanceSection(
  findings?: EnrichedGovernanceFinding[],
  legacyFlags?: string[],
  legacyDeprecated?: { pattern: string; count: number }[],
  legacyHttpUrls?: string[],
): CrossReferenceSection | null {
  // Prefer structured findings when available
  if (findings?.length) {
    return {
      title: `Governance (${findings.length})`,
      icon: "gavel",
      items: findings.map(f => ({
        name: `${f.ruleId}: ${f.name}`,
        subtitle: [f.detail, f.severity].filter(Boolean).join(" | "),
      })),
    };
  }

  // Fall back to legacy flags (merged with deprecated/httpUrls detail)
  const govItems: CrossReferenceSection["items"] = [];
  for (const flag of legacyFlags ?? []) {
    // Skip summary flags that restate detailed data we show below
    if (flag.startsWith("Uses deprecated Xrm.Page API")) continue;
    if (flag.startsWith("Hardcoded external URLs")) continue;
    govItems.push({ name: flag });
  }
  for (const d of legacyDeprecated ?? []) {
    govItems.push({ name: `Deprecated: ${d.pattern}`, subtitle: `${d.count} occurrence${d.count !== 1 ? "s" : ""}` });
  }
  for (const url of legacyHttpUrls ?? []) {
    let host = url;
    try { host = new URL(url).hostname; } catch { /* keep raw */ }
    govItems.push({ name: `External URL: ${host}`, subtitle: url.length > 60 ? url.substring(0, 57) + "..." : url });
  }
  return govItems.length ? { title: `Governance (${govItems.length})`, icon: "gavel", items: govItems } : null;
}

// ============================================================
// DETAIL CONFIGS
// ============================================================

// ========== WORKFLOW DETAIL CONFIG ==========
export const workflowDetailConfig: DetailConfig<WorkflowItem> = {
  getHeader: (item) => ({
    title: item.name,
    subtitle: item.entity || item.primaryEntity,
  }),

  getDescription: (item) => item.description,

  getGridRows: (item) => {
    const t = item.tags || {};
    const triggerFlags: string[] = [];
    if (item.onCreate) triggerFlags.push("Create");
    if (item.onUpdate) triggerFlags.push("Update");
    if (item.onDelete) triggerFlags.push("Delete");
    if (item.onStatusChange) triggerFlags.push("Status Change");
    const triggers = triggerFlags.join(", ") || undefined;

    return [
      { label: "ID", value: item.id, mono: true },
      { label: "Type", value: item.type || item.category },
      { label: "Solution", value: item.solution },
      { label: "State", value: item.state },
      { label: "Mode", value: item.mode },
      { label: "Format", value: item.format },
      { label: "Triggers", value: triggers },
      { label: "Trigger Type", value: item._paTriggerType },
      { label: "Trigger Entity", value: item._paTriggerEntity },
      { label: "PA Category", value: item._paCategory },
      { label: "File", value: item.fileName, mono: true },
      { label: "Capability", value: t.capability },
      // Flow complexity metrics
      { label: "Complexity", value: item._complexity },
      { label: "Complexity Score", value: item._complexityScore != null ? String(item._complexityScore) + "/100" : undefined },
      { label: "Total Actions", value: item._totalActions != null ? String(item._totalActions) : undefined },
      { label: "Nesting Depth", value: item._maxDepth != null ? String(item._maxDepth) : undefined },
      { label: "Error Handling", value: item._hasErrorHandling != null ? (item._hasErrorHandling ? "Yes (Scope)" : "No") : undefined },
      { label: "Branches", value: item._metrics ? String(item._metrics.ifCount + item._metrics.switchCount) : undefined },
      { label: "Loops", value: item._metrics?.foreachCount ? String(item._metrics.foreachCount) : undefined },
      { label: "HTTP Calls", value: item._metrics?.httpCount ? String(item._metrics.httpCount) : undefined },
      { label: "Scopes", value: item._metrics?.scopeCount ? String(item._metrics.scopeCount) : undefined },
      { label: "Child Flows", value: item._metrics?.childFlows ? String(item._metrics.childFlows) : undefined },
      { label: "Connector Actions", value: item._metrics?.connectorActions ? String(item._metrics.connectorActions) : undefined },
    ].filter((row) => row.value != null);
  },

  getPillSections: (item) => {
    const t = item.tags || {};
    const sections = [];
    if (t.functionalArea) sections.push({ title: "Functional Area", items: [t.functionalArea] });
    if (item._paConnectors?.length) sections.push({ title: "Connectors", items: item._paConnectors });
    return sections;
  },

  getCrossReferences: (item) => {
    const sections: CrossReferenceSection[] = [];
    if (item._relFlowEntities?.length) {
      sections.push({
        title: `Entities Referenced (${item._relFlowEntities.length})`,
        icon: "entities",
        items: item._relFlowEntities.map(fe => ({
          name: fe.entity,
          subtitle: fe.operations.join(", "),
          tabId: "entities",
          searchName: fe.entity,
          itemId: fe.entity,
        })),
      });
    }
    if (item._relEnvVars?.length) {
      sections.push({
        title: `Environment Variables (${item._relEnvVars.length})`,
        icon: "envvars",
        items: item._relEnvVars.map(name => ({ name, tabId: "envvars", searchName: name, itemId: name })),
      });
    }
    // Governance: structured findings preferred, legacy flags as fallback
    {
      const gov = buildGovernanceSection(item._governanceFindings, item._governanceFlags, undefined, item._httpUrls);
      if (gov) sections.push(gov);
    }
    return sections.sort((a, b) => a.title.localeCompare(b.title));
  },

  renderExtra: (item) => {
    if (!item.id) return null;
    return <WorkflowFlowSection key={item.id} workflowId={item.id} />;
  },
};

// ========== WEB RESOURCE DETAIL CONFIG ==========
export const webResourceDetailConfig: DetailConfig<WebResourceItem> = {
  getHeader: (item) => ({
    title: item.displayName || item.name,
    subtitle: item.name,
  }),

  getDescription: (item) => item.description,

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "Name", value: item.name, mono: true },
      { label: "Type", value: item.webResourceType || item.type },
      { label: "Entity", value: item.relatedEntity },
      { label: "Solution", value: item.solution },
      { label: "Prefix", value: item.prefix },
      { label: "Managed", value: boolToYes(item.isManaged) },
      { label: "Customizable", value: boolToYes(item.isCustomizable) },
      { label: "Purpose", value: t.purpose },
      { label: "Inferred Purpose", value: item.inferredPurpose },
      { label: "Path", value: item.logicalPath, mono: true },
      // Code analysis
      { label: "Lines of Code", value: item._codeLineCount ? String(item._codeLineCount) : undefined },
      { label: "Functions", value: item._codeFunctionCount ? String(item._codeFunctionCount) : undefined },
      { label: "API Calls", value: item._codeApiCalls?.length ? String(item._codeApiCalls.length) : undefined },
      { label: "Deprecated APIs", value: item._codeDeprecatedCount ? `${item._codeDeprecatedCount} pattern${item._codeDeprecatedCount !== 1 ? "s" : ""}` : undefined },
      { label: "Field References", value: item._codeFieldRefs?.length ? String(item._codeFieldRefs.length) : undefined },
      { label: "Rules Engine", value: item._isRulesEngine != null ? (item._isRulesEngine ? "Yes (auto-generated)" : "No") : undefined },
      {
        label: "Rules Defined",
        value: item._relPluginStepDetails?.length
          ? String(item._relPluginStepDetails.reduce((sum, s) => sum + (s.rules?.length || 0), 0))
          : undefined,
      },
    ].filter((row) => row.value != null);
  },

  getPillSections: (item) => {
    const t = item.tags || {};
    if (t.functionalArea) return [{ title: "Functional Area", items: [t.functionalArea] }];
    return [];
  },

  getCrossReferences: (item) => {
    const sections: CrossReferenceSection[] = [];
    if (item._relApps?.length) {
      sections.push({
        title: `Apps (${item._relApps.length})`,
        icon: "apps",
        items: item._relApps.map(name => ({ name, tabId: "apps", itemId: name, searchName: name })),
      });
    }
    if (item._codeApiCalls?.length) {
      sections.push({
        title: `Dataverse API Calls (${item._codeApiCalls.length})`,
        icon: "entities",
        items: item._codeApiCalls.map(ac => ({
          name: ac.entity,
          subtitle: ac.operation,
          tabId: "entities",
          searchName: ac.entity,
          itemId: ac.entity,
        })),
      });
    }
    if (item._relPluginStepDetails?.length) {
      sections.push({
        title: `Plugin Steps (${item._relPluginStepDetails.length})`,
        icon: "plugins",
        items: item._relPluginStepDetails.map(s => ({
          name: s.name,
          subtitle: [s.entity, s.message, s.ruleCount ? `${s.ruleCount} rule${s.ruleCount !== 1 ? "s" : ""}` : undefined].filter(Boolean).join(" · "),
          tabId: "pluginSteps",
          searchName: s.name,
          itemId: s.id,
        })),
      });
    }
    if (item._codeFunctions?.length) {
      sections.push({
        title: `Functions (${item._codeFunctions.length})`,
        icon: "webresources",
        items: item._codeFunctions.map(fn => ({ name: fn })),
      });
    }
    if (item._codeFieldRefs?.length) {
      sections.push({
        title: `Field References (${item._codeFieldRefs.length})`,
        icon: "forms",
        items: item._codeFieldRefs.map(f => ({ name: f })),
      });
    }
    // Governance: structured findings preferred, legacy flags as fallback
    {
      const gov = buildGovernanceSection(item._governanceFindings, item._codeGovernanceFlags, item._codeDeprecated);
      if (gov) sections.push(gov);
    }
    return sections.sort((a, b) => a.title.localeCompare(b.title));
  },

  renderExtra: (item) => {
    const steps = item._relPluginStepDetails?.filter(s => (s.rules?.length || 0) > 0);
    if (!steps?.length) return null;

    const DATA_TYPE_COLORS: Record<string, string> = {
      String: "text-green-600 dark:text-green-400",
      Decimal: "text-blue-600 dark:text-blue-400",
      Integer: "text-blue-600 dark:text-blue-400",
      Float: "text-blue-600 dark:text-blue-400",
      Money: "text-blue-600 dark:text-blue-400",
      Boolean: "text-amber-600 dark:text-amber-400",
      DateTime: "text-purple-600 dark:text-purple-400",
      Lookup: "text-cyan-600 dark:text-cyan-400",
      OptionSet: "text-orange-600 dark:text-orange-400",
      Picklist: "text-orange-600 dark:text-orange-400",
    };

    return (
      <div className="space-y-1">
        {steps.map((step) => (
          <AccordionSection
            key={step.id}
            title={`${step.message || "Step"}: ${step.entity} — ${step.rules!.length} rule${step.rules!.length !== 1 ? "s" : ""}`}
            iconKey="plugins"
          >
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto custom-scroll">
              {step.rules!.map((rule, i) => (
                <div key={i} className="px-3 py-2 text-xs hover:bg-accent/30 space-y-1">
                  <div className="flex items-start gap-3">
                    <span className="font-mono font-medium text-foreground w-[200px] shrink-0 truncate" title={rule.attribute}>
                      {rule.isCustomField && <span className="text-[9px] text-muted-foreground mr-1">*</span>}
                      {rule.attribute}
                    </span>
                    <span className={`w-[80px] shrink-0 font-mono ${DATA_TYPE_COLORS[rule.dataType] || "text-muted-foreground"}`}>
                      {rule.dataType}
                    </span>
                    <span className="flex-1 text-muted-foreground">
                      {rule.priority != null && <span className="mr-2">pri {rule.priority}</span>}
                      {rule.deployForm && <span className="mr-1 text-[9px] px-1 rounded bg-accent">form</span>}
                      {rule.deployPlugin && <span className="mr-1 text-[9px] px-1 rounded bg-accent">plugin</span>}
                      {rule.evalOnLoad && <span className="mr-1 text-[9px] px-1 rounded bg-accent">onLoad</span>}
                    </span>
                  </div>
                  {rule.when && (
                    <div className="pl-[0px] text-muted-foreground">
                      <span className="text-[10px] text-muted-foreground/70 mr-1">when:</span>
                      <span className="font-mono text-[11px] break-all">{rule.when}</span>
                    </div>
                  )}
                  {rule.setValue && (
                    <div className="pl-[0px] text-muted-foreground">
                      <span className="text-[10px] text-muted-foreground/70 mr-1">set:</span>
                      <span className="font-mono text-[11px] break-all text-foreground">{rule.setValue}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AccordionSection>
        ))}
      </div>
    );
  },
};

// ========== REPORT DETAIL CONFIG ==========
export const reportDetailConfig: DetailConfig<ReportItem> = {
  getHeader: (item) => ({
    title: item.name,
    subtitle: item.fileName,
  }),

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "ID", value: item.id, mono: true },
      { label: "File", value: item.fileName, mono: true },
      { label: "Type", value: item.reportType },
      { label: "Solution", value: item.solution },
      { label: "Version", value: item.version },
      { label: "Customizable", value: boolToYes(item.isCustomizable) },
      { label: "Purpose", value: t.purpose },
    ].filter((row) => row.value != null);
  },

  getPillSections: (item) => {
    const t = item.tags || {};
    const sections = [];
    const categories = filterItems(item.categories);
    if (categories) sections.push({ title: "Categories", items: categories });
    const visibilities = filterItems(item.visibilities);
    if (visibilities) sections.push({ title: "Visible In", items: visibilities });
    if (t.functionalArea) sections.push({ title: "Functional Area", items: [t.functionalArea] });
    return sections;
  },

  getCrossReferences: (item) => {
    const relatedEntities = filterItems(item.relatedEntities);
    if (!relatedEntities?.length) return [];
    return [{
      title: `Related Entities (${relatedEntities.length})`,
      icon: "entities",
      items: relatedEntities.map(name => ({ name, tabId: "entities", itemId: name, searchName: name })),
    }];
  },
};

// ============================================================
// EXPLORER CONFIGS
// ============================================================

// --- WORKFLOWS ---
export const workflowsConfig: ExplorerConfig<WorkflowItem> = {
  dataKey: "workflows",
  fileName: "WorkflowInventory.json",
  idField: "id",
  icon: "workflows",
  getItems: (d: DashboardData) => [
    ...(d.workflows?.workflows || []),
  ],
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search workflows...",
  searchFields: ["id", "name", "entity", "solution", "category", "tags.processCatalogL1"],
  listTitle: (item) => item.name,
  listSubtitle: (item) => {
    const entity = item.primaryEntity || item.entity || "";
    const cleanEntity = entity.toLowerCase() === "none" ? "" : entity;
    return [cleanEntity, item.solution].filter(Boolean).join(" | ");
  },
  listPills: (item) => {
    const pills: PillDef[] = [];
    const type = item.type || item.category || "";
    if (type) {
      const label = type === "BusinessRule" ? "BRE" : type === "PowerAutomate" ? "Power Automate" : type;
      const iconKey = type === "BusinessRule" ? "BRE" : type === "PowerAutomate" ? "Power Automate" : undefined;
      pills.push({ text: label, ...(iconKey ? { iconKey } : {}), color: "var(--color-pill-info)" });
    }
    return pills;
  },
  filters: [
    { id: "type", label: "All Types", field: "type" },
    { id: "state", label: "All States", field: "state" as string },
    { id: "l1", label: "All L1 Processes", field: "tags.processCatalogL1" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    { num: items.filter((i) => i.state === "Activated").length, label: "Activated" },
  ],
  detailConfig: workflowDetailConfig,
  editableFields: [
    { key: "name", label: "Workflow Name", type: "text", placeholder: "Workflow name..." },
    { key: "description", label: "Description", type: "textarea", placeholder: "Describe this workflow..." },
    { key: "category", label: "Category", type: "select", options: ["Workflow", "Dialog", "Action", "Business Rule", "Business Process Flow"] },
    { key: "state", label: "State", type: "select", options: ["Activated", "Draft", "Suspended"] },
    { key: "mode", label: "Execution Mode", type: "select", options: ["Background", "Realtime"] },
    { key: "onCreate", label: "Trigger on Create", type: "checkbox" },
    { key: "onUpdate", label: "Trigger on Update", type: "checkbox" },
    { key: "onDelete", label: "Trigger on Delete", type: "checkbox" },
  ],
};

// --- WEB RESOURCES ---
export const webresourcesConfig: ExplorerConfig<WebResourceItem> = {
  dataKey: "webresources",
  fileName: "WebResourceInventory.json",
  idField: "name",
  icon: "webresources",
  getItems: (d: DashboardData) => d.webresources?.webResources || [],
  sortBy: (item) => item.displayName || item.name || "",
  searchPlaceholder: "Search web resources...",
  searchFields: [
    "name", "displayName", "description", "tags.processCatalogL1",
    "tags.processCatalogL2", "tags.processCatalogL3", "tags.functionalArea",
  ],
  listTitle: (item) => item.displayName || item.name,
  listSubtitle: () => "",
  listPills: (item) => {
    const pills: PillDef[] = [];
    const dn = item.displayName || item.name || "";
    const desc = item.description || "";
    const t = item.tags;
    const wrType = item.webResourceType || item.type || "";
    if (dn.startsWith("Rules ") || desc.startsWith("HSL Rules Engine")) {
      pills.push({ text: "BRE", iconKey: "BRE", color: "var(--color-pill-info)" });
    } else if (t?.integration === "XOI") {
      pills.push({ text: "XOi", iconKey: "XOI", color: "var(--color-pill-info)" });
    } else {
      const langKey = webResourceIconKey(wrType);
      if (langKey) pills.push({ text: langKey, iconKey: langKey, color: "var(--color-pill-secondary)" });
    }
    return pills;
  },
  filters: [
    { id: "type", label: "All Types", field: "type" },
    { id: "purpose", label: "All Purposes", field: "tags.purpose" },
    { id: "l1", label: "All L1 Processes", field: "tags.processCatalogL1" },
    { id: "area", label: "All Areas", field: "tags.functionalArea" },
  ],
  stats: (items) => {
    const l2 = items.filter((w) => w.tags?.processCatalogL2).length;
    const l3 = items.filter((w) => w.tags?.processCatalogL3).length;
    return [
      { num: items.length, label: "Total" },
      { num: l2, label: "L2 Tagged" },
      { num: l3, label: "L3 Tagged" },
      ...topCounts(items, (w) => w.webResourceType || w.type || "?"),
    ];
  },
  detailConfig: webResourceDetailConfig,
  editableFields: [
    { key: "displayName", label: "Display Name", type: "text", placeholder: "Display name..." },
    { key: "description", label: "Description", type: "textarea", placeholder: "Describe this web resource..." },
    { key: "webResourceType", label: "Type", type: "select", options: ["HTML", "CSS", "JavaScript", "XML", "PNG", "JPG", "GIF", "XAP", "XSL", "ICO", "SVG", "RESX"] },
    { key: "solution", label: "Solution", type: "text", placeholder: "Solution name..." },
  ],
};

// --- APPS ---
export const appsConfig: ExplorerConfig<AppItem> = {
  dataKey: "apps",
  fileName: "AppInventory.json",
  idField: "uniqueName",
  icon: "apps",
  getItems: (d: DashboardData) => {
    if (!d.apps) return [];
    const mdas = (d.apps.modelDrivenApps || []).map((a) => ({ ...a, appType: a.appType || "Model-Driven" }));
    const canvas = (d.apps.canvasApps || []).map((a) => ({ ...a, appType: a.appType || "Canvas" }));
    return [...mdas, ...canvas];
  },
  sortBy: (item) => item.displayName || item.name || "",
  searchPlaceholder: "Search apps...",
  searchFields: ["name", "displayName", "uniqueName", "description", "solution", "appType"],
  listTitle: (item) => item.displayName || item.name || "",
  listSubtitle: (item) => item.appType || "",
  listPills: (item) => {
    const pills: PillDef[] = [];
    if (item.entityCount && item.entityCount > 0) pills.push({ text: `${item.entityCount} entities`, color: "var(--color-pill-secondary)" });
    return pills;
  },
  filters: [
    { id: "appType", label: "All Types", field: "appType" },
  ],
  stats: (items) => {
    const mda = items.filter((a) => a.appType === "Model-Driven").length;
    const canvas = items.filter((a) => a.appType === "Canvas").length;
    const bots = items.filter((a) => a.appType === "Copilot Bot").length;
    const s = [
      { num: items.length, label: "Total" },
      { num: mda, label: "Model-Driven" },
      { num: canvas, label: "Canvas" },
    ];
    if (bots > 0) s.push({ num: bots, label: "Copilot Bots" });
    return s;
  },
  renderDetail: (item, onNavigate) => <AppDetail item={item} icon="PowerApps.svg" onNavigate={onNavigate} />,
  editableFields: [
    { key: "uniqueName", label: "Unique Name", type: "text", placeholder: "Unique name..." },
    { key: "appType", label: "App Type", type: "select", options: ["Model-Driven", "Canvas", "Copilot Bot"] },
    { key: "solution", label: "Solution", type: "text", placeholder: "Solution name..." },
    { key: "status", label: "Status", type: "select", options: ["Published", "Unpublished"] },
  ],
};

// --- REPORTS ---
export const reportsConfig: ExplorerConfig<ReportItem> = {
  dataKey: "reports",
  fileName: "ReportInventory.json",
  idField: "name",
  icon: "reports",
  getItems: (d: DashboardData) => d.reports?.reports || [],
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search reports...",
  searchFields: ["id", "name", "reportType", "solution"],
  listTitle: (item) => item.name,
  listSubtitle: (item) => [item.reportType, item.solution].filter(Boolean).join(" | "),
  listPills: () => [],
  filters: [
    { id: "type", label: "All Types", field: "reportType" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    ...topCounts(items, (r) => r.reportType || "?", 10),
  ],
  detailConfig: reportDetailConfig,
  editableFields: [
    { key: "name", label: "Report Name", type: "text", placeholder: "Report name..." },
    { key: "fileName", label: "File Name", type: "text", placeholder: "File name..." },
    { key: "reportType", label: "Report Type", type: "select", options: ["SSRS", "Power BI", "Other"] },
    { key: "solution", label: "Solution", type: "text", placeholder: "Solution name..." },
    { key: "version", label: "Version", type: "text", placeholder: "1.0.0" },
  ],
};
