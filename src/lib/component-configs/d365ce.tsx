// Component configs for D365 Customer Engagement — explorer + detail configs co-located
import type {
  DashboardData,
  ExplorerConfig,
  PillDef,
  DetailConfig,
  CrossReferenceSection,
  CrossReferenceItem,
  EntityItem,
  PluginItem,
  FormItem,
  ViewItem,
  SecurityRoleItem,
  OptionSetItem,
  PluginStepItem,
} from "@/types/inventory";
import { entityIconKey } from "@/lib/icons";
import { EntityRelationDiagram } from "@/components/shared/entity-relation-diagram";
import { AccordionSection } from "@/components/shared/accordion-section";
import { SecurityDetail } from "@/components/details/security-detail";
import { verticalPill, topCounts, boolToYes } from "./shared";

// ============================================================
// DETAIL CONFIGS
// ============================================================

// ========== ENTITY DETAIL CONFIG ==========
export const entityDetailConfig: DetailConfig<EntityItem> = {
  getHeader: (item) => ({
    title: item.displayName || item.logicalName,
    subtitle: item.logicalName,
  }),

  getDescription: (item) => {
    // Use best available description: CDM > D365 Docs > Solution XML > extracted
    const descs = item.tags?.descriptions as Array<{ text: string; source: string }> | undefined;
    if (descs?.length) return descs[0]!.text;
    return item._entityDescription || item.description;
  },

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      // Identity
      { label: "Logical Name", value: item.logicalName, mono: true },
      { label: "Primary Field", value: item.primaryField },
      { label: "Solution", value: item.solution },
      { label: "Ownership", value: item._entitySettings?.ownershipType as string | undefined },
      // Classification
      { label: "CDM Group", value: t.cdmGroup },
      { label: "CDM Entity", value: t.cdmEntity, mono: true },
      { label: "CDM Standard", value: t.cdmStandard ? "Yes" : t.cdmGroup ? "No" : undefined },
      { label: "D365 Module", value: t.d365Module },
      { label: "OOB", value: boolToYes(t.isOOB) },
      { label: "Vertical", value: t.vertical },
      { label: "Capability", value: t.capability },
      // Platform settings
      { label: "Audit Enabled", value: item._entitySettings?.isAuditEnabled != null ? (item._entitySettings.isAuditEnabled ? "Yes" : "No") : undefined },
      { label: "BPF Entity", value: item._entitySettings?.isBPFEntity != null ? (item._entitySettings.isBPFEntity ? "Yes" : "No") : undefined },
      { label: "Change Tracking", value: item._entitySettings?.changeTrackingEnabled != null ? (item._entitySettings.changeTrackingEnabled ? "Yes" : "No") : undefined },
      { label: "Mobile Enabled", value: item._entitySettings?.isMobileEnabled != null ? (item._entitySettings.isMobileEnabled ? "Yes" : "No") : undefined },
      { label: "Mobile Offline", value: item._entitySettings?.isMobileOffline != null ? (item._entitySettings.isMobileOffline ? "Yes" : "No") : undefined },
      // Customization
      { label: "Has Plugins", value: boolToYes(t.hasPlugins) },
      { label: "Plugin Count", value: t.pluginCount != null ? String(t.pluginCount) : undefined },
    ].filter((row) => row.value != null);
  },

  getCrossReferences: (item) => {
    const sections: CrossReferenceSection[] = [];

    if (item._relFormDetails?.length) {
      sections.push({
        title: `Forms (${item._relFormDetails.length})`,
        icon: "forms",
        items: item._relFormDetails.map(f => ({ name: f.name, subtitle: f.formType, tabId: "forms", searchName: f.name, itemId: f.formId })),
      });
    }
    if (item._relViewDetails?.length) {
      sections.push({
        title: `Views (${item._relViewDetails.length})`,
        icon: "views",
        items: item._relViewDetails.map(v => ({ name: v.name, tabId: "views", searchName: v.name, itemId: v.viewId })),
      });
    }
    if (item._relPluginStepDetails?.length) {
      sections.push({
        title: `Plugin Steps (${item._relPluginStepDetails.length})`,
        icon: "pluginsteps",
        items: item._relPluginStepDetails.map(s => ({ name: s.name, subtitle: s.message, tabId: "pluginsteps", searchName: s.name, itemId: s.id })),
      });
    }
    if (item._relWorkflowNames?.length) {
      sections.push({
        title: `Workflows (${item._relWorkflowNames.length})`,
        icon: "workflows",
        items: item._relWorkflowNames.map(name => ({ name, tabId: "workflows", itemId: name, searchName: name })),
      });
    }
    if (item._relOptionSets?.length) {
      sections.push({
        title: `Option Sets (${item._relOptionSets.length})`,
        icon: "optionsets",
        items: item._relOptionSets.map(name => ({ name, tabId: "optionsets", itemId: name, searchName: name })),
      });
    }
    if (item.keyRelationships?.length) {
      sections.push({
        title: `Related Entities (${item.keyRelationships.length})`,
        icon: "entities",
        items: item.keyRelationships.map(name => ({ name, tabId: "entities", itemId: name, searchName: name })),
      });
    }
    if (item._relFlows?.length) {
      sections.push({
        title: `Power Automate Flows (${item._relFlows.length})`,
        icon: "workflows",
        items: item._relFlows.map(f => ({
          name: f.name,
          subtitle: f.operations.join(", "),
          tabId: "workflows",
          itemId: f.name,
          searchName: f.name,
        })),
      });
    }
    {
      const seen = new Set<string>();
      const allApps: CrossReferenceItem[] = [];
      for (const name of (item._relApps || [])) {
        const key = name.toLowerCase();
        if (!seen.has(key)) { seen.add(key); allApps.push({ name, subtitle: "Model-driven", tabId: "apps", searchName: name }); }
      }
      for (const ca of (item._relCanvasApps || [])) {
        const key = ca.displayName.toLowerCase();
        if (!seen.has(key)) { seen.add(key); allApps.push({ name: ca.displayName, subtitle: "Canvas", tabId: "apps", searchName: ca.displayName }); }
      }
      allApps.sort((a, b) => a.name.localeCompare(b.name));
      if (allApps.length) {
        sections.push({ title: `Apps (${allApps.length})`, icon: "apps", items: allApps });
      }
    }
    if (item._relEntityMapsFrom?.length) {
      sections.push({
        title: `Field Mappings From (${item._relEntityMapsFrom.length})`,
        icon: "arrow-left",
        items: item._relEntityMapsFrom.map(m => ({ name: m.target, subtitle: `${m.fieldCount} fields`, tabId: "entities", itemId: m.target, searchName: m.target })),
      });
    }
    if (item._relEntityMapsTo?.length) {
      sections.push({
        title: `Field Mappings To (${item._relEntityMapsTo.length})`,
        icon: "arrow-right",
        items: item._relEntityMapsTo.map(m => ({ name: m.source, subtitle: `${m.fieldCount} fields`, tabId: "entities", itemId: m.source, searchName: m.source })),
      });
    }
    if (item._relJsHandlers?.length) {
      sections.push({
        title: `JavaScript Handlers (${item._relJsHandlers.length})`,
        icon: "braces",
        items: item._relJsHandlers.map(h => {
          const libFile = h.library?.split("/").pop() || h.library;
          return {
            name: `${h.event}: ${h.function || "(auto)"}`,
            subtitle: libFile,
            tabId: "webresources",
            searchName: h.library,
          };
        }),
      });
    }
    if (item._relSubgrids?.length) {
      sections.push({
        title: `Embedded As Subgrid (${item._relSubgrids.length})`,
        icon: "forms",
        items: item._relSubgrids.map(s => ({ name: s.label || s.targetEntity, subtitle: `Tab: ${s.tab}`, tabId: "forms", itemId: s.formId, searchName: s.label || s.targetEntity })),
      });
    }
    if (item._relPluginRules?.length) {
      const totalRules = item._relPluginRules.reduce((sum, r) => sum + r.ruleCount, 0);
      sections.push({
        title: `Business Rules (${totalRules})`,
        icon: "pluginsteps",
        items: item._relPluginRules.map(r => ({
          name: r.stepName,
          subtitle: `${r.ruleCount} rules`,
          tabId: "pluginsteps",
          searchName: r.stepName,
        })),
      });
    }
    if (item._relRibbon?.length) {
      sections.push({
        title: `Command Bar (${item._relRibbon.length})`,
        icon: "apps",
        items: item._relRibbon.map(r => ({ name: r.id, subtitle: r.type })),
      });
    }
    return sections.sort((a, b) => a.title.localeCompare(b.title));
  },

  getPillSections: (item) => {
    const sections: { title: string; items: string[] }[] = [];
    if (item._relSolutionFootprint?.length) {
      sections.push({ title: "Solution Footprint", items: item._relSolutionFootprint });
    }
    return sections;
  },

  renderExtra: (item) => {
    const cdmAttrs = item.tags?.cdmAttributes as Array<{ name: string; dataType?: unknown; displayName?: string; description?: string }> | undefined;
    const extendsEntity = item.tags?.cdmExtendsEntity as string | undefined;
    const columns = item._columns as Array<{ logicalName: string; displayName?: string; description?: string; type?: string; isCustom?: boolean; requiredLevel?: string; solution?: string }> | undefined;

    // Safely extract dataType string — CDM schemas sometimes store objects instead of strings
    const getTypeStr = (dt: unknown): string => {
      if (!dt) return "?";
      if (typeof dt === "string") return dt;
      if (typeof dt === "object" && dt !== null && "dataTypeReference" in (dt as Record<string, unknown>)) return "lookup";
      return "?";
    };

    const TYPE_COLORS: Record<string, string> = {
      string: "text-green-600 dark:text-green-400",
      nvarchar: "text-green-600 dark:text-green-400",
      ntext: "text-green-600 dark:text-green-400",
      memo: "text-green-600 dark:text-green-400",
      integer: "text-blue-600 dark:text-blue-400",
      int: "text-blue-600 dark:text-blue-400",
      bigint: "text-blue-600 dark:text-blue-400",
      decimal: "text-blue-600 dark:text-blue-400",
      money: "text-blue-600 dark:text-blue-400",
      float: "text-blue-600 dark:text-blue-400",
      double: "text-blue-600 dark:text-blue-400",
      boolean: "text-amber-600 dark:text-amber-400",
      bit: "text-amber-600 dark:text-amber-400",
      dateTime: "text-purple-600 dark:text-purple-400",
      datetime: "text-purple-600 dark:text-purple-400",
      lookup: "text-cyan-600 dark:text-cyan-400",
      uniqueidentifier: "text-cyan-600 dark:text-cyan-400",
      name: "text-green-600 dark:text-green-400",
      email: "text-green-600 dark:text-green-400",
      picklist: "text-orange-600 dark:text-orange-400",
      state: "text-orange-600 dark:text-orange-400",
      status: "text-orange-600 dark:text-orange-400",
      entityId: "text-cyan-600 dark:text-cyan-400",
      listLookup: "text-orange-600 dark:text-orange-400",
      listLookupCorrelated: "text-orange-600 dark:text-orange-400",
    };

    return (
      <div className="space-y-1">
        {/* CDM Standard Attributes (from CDM schema) */}
        {cdmAttrs && cdmAttrs.length > 0 && (
          <AccordionSection title={`CDM Standard Attributes (${cdmAttrs.length})`} iconKey="cdmattributes">
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto custom-scroll">
              {cdmAttrs.map((attr, i) => {
                const typeStr = getTypeStr(attr.dataType);
                return (
                  <div key={i} className="px-3 py-1.5 flex items-start gap-3 text-xs hover:bg-accent/30">
                    <span className="font-mono font-medium text-foreground w-[180px] shrink-0 truncate" title={attr.name}>
                      {attr.name}
                    </span>
                    <span className={`w-[70px] shrink-0 font-mono ${TYPE_COLORS[typeStr] || "text-muted-foreground"}`}>
                      {typeStr}
                    </span>
                    <span className="text-muted-foreground flex-1 truncate" title={typeof attr.description === "string" ? attr.description : undefined}>
                      {(typeof attr.description === "string" ? attr.description : null) || (typeof attr.displayName === "string" ? attr.displayName : null) || ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </AccordionSection>
        )}

        {/* Entity Columns (from EntityColumnInventory) */}
        {columns && columns.length > 0 && (
          <AccordionSection title={`Entity Columns (${columns.length})`} iconKey="entitycolumns">
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto custom-scroll">
              {columns.map((col, i) => (
                <div key={i} className="px-3 py-1.5 flex items-start gap-3 text-xs hover:bg-accent/30">
                  <span className="font-mono font-medium text-foreground w-[180px] shrink-0 truncate" title={col.logicalName}>
                    {col.isCustom && <span className="text-[9px] text-muted-foreground mr-1">*</span>}
                    {col.logicalName}
                  </span>
                  <span className={`w-[70px] shrink-0 font-mono ${TYPE_COLORS[col.type || ""] || "text-muted-foreground"}`}>
                    {col.type || "?"}
                  </span>
                  <span className="text-muted-foreground flex-1 truncate" title={col.description || col.displayName}>
                    {col.displayName || col.description || ""}
                  </span>
                  {col.requiredLevel === "required" && (
                    <span className="text-[9px] text-red-500 shrink-0">req</span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t">
              <span className="mr-3">* = custom column</span>
              <span className="text-red-500 mr-1">req</span> = required
            </div>
          </AccordionSection>
        )}

        {/* Entity Relationships diagram */}
        <EntityRelationDiagram key={item.logicalName} entity={item} />

        {/* Parent entity chain */}
        {extendsEntity && (
          <AccordionSection title={`Parent Entity: ${extendsEntity.split("/").pop()}`} iconKey="parententity">
            <div className="px-3 py-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{item.logicalName}</span>
              <span className="mx-2 text-muted-foreground/50">extends</span>
              <span className="font-mono text-xs font-medium text-foreground">{extendsEntity}</span>
            </div>
          </AccordionSection>
        )}
      </div>
    );
  },
};

// ========== PLUGIN DETAIL CONFIG ==========
export const pluginDetailConfig: DetailConfig<PluginItem> = {
  getHeader: (item) => ({
    title: item.name,
    subtitle: (item.assembly || "").replace("Plugins.", ""),
  }),

  getDescription: (item) => item.businessLogic,

  getGridRows: (item) => {
    const t = item.tags || {};
    const assembly = (item.assembly || "").replace("Plugins.", "");
    return [
      { label: "ID", value: item.id, mono: true },
      { label: "Assembly", value: assembly },
      { label: "Entity", value: item.primaryEntity || item.entity },
      { label: "Message", value: item.message },
      { label: "Stage", value: item.stage },
      { label: "Status", value: item.status },
      { label: "Vertical", value: t.vertical },
      { label: "Capability", value: t.capability },
      { label: "User Facing", value: boolToYes(t.userFacing) },
      { label: "File", value: item.file, mono: true },
    ].filter((row) => row.value != null);
  },

  getPillSections: (item) => {
    const t = item.tags || {};
    if (t.integration) {
      return [{ title: "Integration", items: [t.integration] }];
    }
    return [];
  },
};

// ========== FORM DETAIL CONFIG ==========
export const formDetailConfig: DetailConfig<FormItem> = {
  getHeader: (item) => ({
    title: item.name,
    subtitle: item.entity || item.entityDisplayName,
  }),

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "Entity", value: item.entity, mono: true },
      { label: "Form Type", value: item.formType },
      { label: "Solution", value: item.solution },
      { label: "Active", value: boolToYes(item.isActive) },
      { label: "Version", value: item.version },
      { label: "Tabs", value: item.tabCount != null ? String(item.tabCount) : undefined },
      { label: "Sections", value: item.sectionCount != null ? String(item.sectionCount) : undefined },
      { label: "Controls", value: item.controlCount != null ? String(item.controlCount) : undefined },
      { label: "Subgrids", value: item.subgridCount != null ? String(item.subgridCount) : undefined },
      { label: "Vertical", value: t.vertical },
      { label: "Complexity", value: t.complexity },
    ].filter((row) => row.value != null);
  },

  getPillSections: (item) => {
    const flags: string[] = [];
    if (item.hasCanvasApp) flags.push("Canvas App");
    if (item.hasBPF) flags.push("BPF");
    return flags.length > 0 ? [{ title: "Features", items: flags }] : [];
  },
};

// ========== VIEW DETAIL CONFIG ==========
export const viewDetailConfig: DetailConfig<ViewItem> = {
  getHeader: (item) => ({
    title: item.name,
    subtitle: item.entity || item.entityDisplayName,
  }),

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "Entity", value: item.entity, mono: true },
      { label: "Query Type", value: item.queryType },
      { label: "Solution", value: item.solution },
      { label: "Columns", value: item.columnCount != null ? String(item.columnCount) : undefined },
      { label: "Filters", value: item.filterCount != null ? String(item.filterCount) : undefined },
      { label: "Vertical", value: t.vertical },
      { label: "Complexity", value: t.complexity },
    ].filter((row) => row.value != null);
  },

  getPillSections: (item) => {
    const flags: string[] = [];
    if (item.isDefault) flags.push("Default");
    if (item.isQuickFind) flags.push("Quick Find");
    if (item.hasJoins) flags.push("Has Joins");
    if (item.hasFilters) flags.push("Has Filters");
    const sections = [];
    if (flags.length > 0) sections.push({ title: "Flags", items: flags });
    if (item._viewDetails?.columns?.length) {
      sections.push({ title: "Columns", items: item._viewDetails.columns.map(c => c.name) });
    }
    if (item._viewDetails?.sortFields?.length) {
      sections.push({ title: "Sort", items: item._viewDetails.sortFields.map(s => `${s.field} ${s.descending ? "↓" : "↑"}`) });
    }
    if (item._viewDetails?.filters?.length) {
      sections.push({ title: "Filters", items: item._viewDetails.filters.map(f => `${f.field} ${f.operator}${f.value ? " " + f.value : ""}`) });
    }
    return sections;
  },

  getCrossReferences: (item) => {
    if (!item._viewDetails?.linkedEntities?.length) return [];
    return [{
      title: `Linked Entities (${item._viewDetails.linkedEntities.length})`,
      icon: "entities",
      items: item._viewDetails.linkedEntities.map(le => ({
        name: le.entity,
        subtitle: `${le.from} → ${le.to}${le.alias ? ` (${le.alias})` : ""}`,
        tabId: "entities",
        itemId: le.entity,
        searchName: le.entity,
      })),
    }];
  },
};

// ========== PLUGIN STEP DETAIL CONFIG ==========
export const pluginStepDetailConfig: DetailConfig<PluginStepItem> = {
  getHeader: (item) => ({
    title: item.shortClassName || item.name,
    subtitle: item.assembly,
  }),

  getDescription: (item) => item.description,

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "ID", value: item.id, mono: true },
      { label: "Class", value: item.className, mono: true },
      { label: "Assembly", value: item.assembly },
      { label: "Entity", value: item.entity ?? undefined },
      { label: "Message", value: item.message },
      { label: "Stage", value: item.stage },
      { label: "Mode", value: item.mode },
      { label: "Rank", value: item.rank != null ? String(item.rank) : undefined },
      { label: "Filtering Attrs", value: item.filteringAttributeCount != null ? String(item.filteringAttributeCount) : undefined },
      { label: "Solution", value: item.solution },
      { label: "Vertical", value: t.vertical },
    ].filter((row) => row.value != null);
  },

  getCrossReferences: (item) => {
    const sections: CrossReferenceSection[] = [];
    if (item._businessRules?.length) {
      sections.push({
        title: `Field Rules (${item._businessRules.length})`,
        icon: "pluginsteps",
        items: item._businessRules.map(r => ({
          name: r.attribute,
          subtitle: r.dataType,
          children: [
            ...(r.when && r.when !== "Always" ? [{ name: `When: ${r.when}` }] : []),
            ...(r.setValue ? [{ name: `Set to: ${r.setValue}` }] : []),
            { name: `Runs: ${r.deployForm ? "Form" : ""}${r.deployForm && r.deployPlugin ? " + " : ""}${r.deployPlugin ? "Plugin" : ""}` },
          ],
        })),
      });
    }
    return sections;
  },

  getPillSections: () => [],
};

// ========== OPTION SET DETAIL CONFIG ==========
export const optionSetDetailConfig: DetailConfig<OptionSetItem> = {
  getHeader: (item) => ({
    title: item.displayName || item.schemaName,
    subtitle: item.schemaName,
  }),

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "Schema Name", value: item.schemaName, mono: true },
      { label: "Type", value: item.optionSetType },
      { label: "Global", value: boolToYes(item.isGlobal) },
      { label: "Option Count", value: item.optionCount != null ? String(item.optionCount) : undefined },
      { label: "Entities", value: item.entities?.length ? String(item.entities.length) : undefined },
      { label: "Solution", value: item.solution },
      { label: "Prefix", value: item.prefix },
      { label: "Category", value: item.category },
      { label: "Vertical", value: t.vertical },
      { label: "Version", value: item.version },
    ].filter((row) => row.value != null);
  },

  getPillSections: () => [],

  getCrossReferences: (item) => {
    const sections: CrossReferenceSection[] = [];
    if (item.entities?.length) {
      sections.push({
        title: `Used By Entities (${item.entities.length})`,
        icon: "entities",
        items: item.entities.map(name => ({ name, tabId: "entities", searchName: name })),
      });
    }
    if (item.options?.length) {
      sections.push({
        title: `Options (${item.options.length})`,
        icon: "optionsets",
        items: item.options.map(o => ({ name: `${o.label}`, subtitle: String(o.value) })),
      });
    }
    return sections;
  },
};

// ============================================================
// EXPLORER CONFIGS
// ============================================================

// --- PLUGINS ---
export const pluginsConfig: ExplorerConfig<PluginItem> = {
  dataKey: "plugins",
  fileName: "PluginInventory.json",
  idField: "id",
  icon: "plugins",
  getItems: (d: DashboardData) => d.plugins?.plugins || [],
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search plugins...",
  searchFields: ["id", "name", "assembly", "entity", "primaryEntity", "message", "tags.processCatalogL1", "tags.vertical"],
  listTitle: (item) => item.name,
  listSubtitle: (item) => {
    const ent = item.primaryEntity || item.entity || "";
    return [ent, item.status].filter(Boolean).join(" | ");
  },
  listPills: (item) => {
    const pills: PillDef[] = [];
    const vp = verticalPill(item.tags);
    if (vp) pills.push(vp);
    return pills;
  },
  filters: [
    { id: "assembly", label: "All Assemblies", field: "assembly" },
    { id: "status", label: "All Statuses", field: "status" },
    { id: "l1", label: "All L1 Processes", field: "tags.processCatalogL1" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    ...topCounts(items, (p) => (p.assembly || "?").replace("Plugins.", "")),
  ],
  detailConfig: pluginDetailConfig,
  editableFields: [
    { key: "name", label: "Plugin Name", type: "text", placeholder: "Plugin name..." },
    { key: "businessLogic", label: "Business Logic", type: "textarea", placeholder: "Describe the business logic..." },
    { key: "message", label: "Message", type: "select", options: ["Create", "Update", "Delete", "Retrieve", "RetrieveMultiple", "Associate", "Disassociate", "SetState"] },
    { key: "stage", label: "Stage", type: "select", options: ["PreValidation", "PreOperation", "PostOperation"] },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
  ],
};

// --- ENTITIES ---
export const entitiesConfig: ExplorerConfig<EntityItem> = {
  dataKey: "entities",
  fileName: "EntityInventory.json",
  idField: "logicalName",
  icon: "entities",
  getItems: (d: DashboardData) => {
    if (!d.entities?.entities) return [];
    return Object.values(d.entities.entities).flat();
  },
  sortBy: (item) => item.logicalName || item.displayName || "",
  searchPlaceholder: "Search entities...",
  searchFields: ["logicalName", "displayName", "solution", "tags.processCatalogL1", "tags.d365Module", "tags.cdmGroup"],
  listTitle: (item) => item.displayName || item.logicalName,
  listSubtitle: (item) => item.logicalName,
  listPills: (item) => {
    const pills: PillDef[] = [];
    const t = item.tags;
    if (t?.d365Module) pills.push({ text: t.d365Module as string, color: "var(--color-pill-info)", iconKey: entityIconKey(t) });
    return pills;
  },
  filters: [
    { id: "module", label: "All Modules", field: "tags.d365Module" },
    { id: "cdmGroup", label: "All CDM Groups", field: "tags.cdmGroup" },
    { id: "l1", label: "All L1 Processes", field: "tags.processCatalogL1" },
  ],
  stats: (items) => {
    let cdmStd = 0, d365Only = 0, custom = 0;
    for (const e of items) {
      if (e.tags?.cdmStandard) cdmStd++;
      else if (e.tags?.cdmGroup && e.tags.cdmGroup !== "Custom") d365Only++;
      else custom++;
    }
    return [
      { num: items.length, label: "Total" },
      { num: cdmStd, label: "CDM Standard" },
      { num: d365Only, label: "D365 Specific" },
      { num: custom, label: "Custom" },
    ];
  },
  detailConfig: entityDetailConfig,
  editableFields: [
    { key: "displayName", label: "Display Name", type: "text", placeholder: "Entity display name..." },
    { key: "description", label: "Description", type: "textarea", placeholder: "Describe this entity..." },
    { key: "solution", label: "Solution", type: "text", placeholder: "Solution name..." },
    { key: "primaryField", label: "Primary Field", type: "text", placeholder: "Primary field name..." },
  ],
};

// --- FORMS ---
export const formsConfig: ExplorerConfig<FormItem> = {
  dataKey: "forms",
  fileName: "FormInventory.json",
  idField: "formId",
  icon: "forms",
  getItems: (d: DashboardData) => d.forms?.forms || [],
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search forms...",
  searchFields: ["name", "entity", "formType", "solution", "tags.processCatalogL1"],
  listTitle: (item) => item.name,
  listSubtitle: (item) => (item.entityDisplayName || item.entity) + (item.formType ? ` | ${item.formType}` : ""),
  listPills: (item) => {
    const pills: PillDef[] = [];
    const t = item.tags;
    if (t?.complexity) {
      const c = t.complexity as string;
      const color = c === "High" ? "var(--color-status-high)" : c === "Medium" ? "var(--color-status-medium)" : "var(--color-status-low)";
      pills.push({ text: c, color });
    }
    return pills;
  },
  filters: [
    { id: "formType", label: "All Form Types", field: "formType" },
    { id: "complexity", label: "All Complexity", field: "tags.complexity" },
    { id: "l1", label: "All L1 Processes", field: "tags.processCatalogL1" },
  ],
  stats: (items) => {
    const active = items.filter((i) => i.isActive).length;
    return [
      { num: items.length, label: "Total" },
      { num: active, label: "Active" },
      ...topCounts(items, (f) => f.formType || "?", 3),
    ];
  },
  detailConfig: formDetailConfig,
  editableFields: [
    { key: "name", label: "Form Name", type: "text", placeholder: "Form name..." },
    { key: "formType", label: "Form Type", type: "select", options: ["Main", "Quick Create", "Quick View", "Card", "Dialog", "Task Flow"] },
    { key: "isActive", label: "Active", type: "checkbox" },
    { key: "version", label: "Version", type: "text", placeholder: "1.0.0" },
  ],
};

// --- VIEWS ---
export const viewsConfig: ExplorerConfig<ViewItem> = {
  dataKey: "views",
  fileName: "ViewInventory.json",
  idField: "viewId",
  icon: "views",
  getItems: (d: DashboardData) => d.views?.views || [],
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search views...",
  searchFields: ["name", "entity", "queryType", "solution", "tags.processCatalogL1"],
  listTitle: (item) => item.name,
  listSubtitle: (item) => (item.entityDisplayName || item.entity) + (item.queryType ? ` | ${item.queryType}` : ""),
  listPills: (item) => {
    const pills: PillDef[] = [];
    const qt = item.queryType || (item.isQuickFind ? "Quick Find" : item.isDefault ? "Default" : "");
    if (qt) pills.push({ text: qt, color: qt === "Quick Find" ? "var(--color-pill-alt)" : "var(--color-pill-info)" });
    return pills;
  },
  filters: [
    { id: "queryType", label: "All Query Types", field: "queryType" },
    { id: "l1", label: "All L1 Processes", field: "tags.processCatalogL1" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    { num: items.filter((i) => i.isDefault).length, label: "Default" },
    { num: items.filter((i) => i.isQuickFind).length, label: "Quick Find" },
  ],
  detailConfig: viewDetailConfig,
  editableFields: [
    { key: "name", label: "View Name", type: "text", placeholder: "View name..." },
    { key: "queryType", label: "Query Type", type: "select", options: ["Public", "System", "User"] },
    { key: "solution", label: "Solution", type: "text", placeholder: "Solution name..." },
    { key: "isDefault", label: "Default View", type: "checkbox" },
    { key: "isQuickFind", label: "Quick Find", type: "checkbox" },
  ],
};

// --- SECURITY ROLES ---
export const securityConfig: ExplorerConfig<SecurityRoleItem> = {
  dataKey: "securityRoles",
  fileName: "SecurityRoleInventory.json",
  idField: "id",
  icon: "security",
  getItems: (d: DashboardData) => d.securityRoles?.roles || [],
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search security roles...",
  searchFields: ["id", "name", "category", "solution", "tags.vertical", "tags.processCatalogL1"],
  listTitle: (item) => item.name,
  listSubtitle: (item) => item.category || "",
  listPills: (item) => {
    const pills: PillDef[] = [];
    const vp = verticalPill(item.tags);
    if (vp) pills.push(vp);
    return pills;
  },
  filters: [
    { id: "vertical", label: "All Verticals", field: "tags.vertical" },
    { id: "category", label: "All Categories", field: "category" },
    { id: "l1", label: "All L1 Processes", field: "tags.processCatalogL1" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    ...topCounts(items, (r) => r.category || "?", 5),
  ],
  renderDetail: (item, onNavigate) => <SecurityDetail item={item} icon="security" onNavigate={onNavigate} />,
  editableFields: [
    { key: "name", label: "Role Name", type: "text", placeholder: "Role name..." },
    { key: "solution", label: "Solution", type: "text", placeholder: "Solution name..." },
    { key: "category", label: "Category", type: "text", placeholder: "Category..." },
    { key: "isCustomizable", label: "Customizable", type: "checkbox" },
  ],
};

// --- OPTION SETS ---
export const optionSetsConfig: ExplorerConfig<OptionSetItem> = {
  dataKey: "optionSets",
  fileName: "OptionSetInventory.json",
  idField: "schemaName",
  icon: "optionsets",
  getItems: (d: DashboardData) => d.optionSets?.optionSets || [],
  sortBy: (item) => item.displayName || item.schemaName || "",
  searchPlaceholder: "Search option sets...",
  searchFields: ["schemaName", "displayName", "solution", "category", "tags.vertical", "entities"],
  listTitle: (item) => item.displayName || item.schemaName,
  listSubtitle: (item) => [item.optionSetType, item.solution].filter(Boolean).join(" | "),
  listPills: (item) => {
    const pills: PillDef[] = [];
    if (item.isGlobal) pills.push({ text: "Global", color: "var(--color-pill-info)" });
    return pills;
  },
  filters: [
    { id: "type", label: "All Types", field: "optionSetType" },
    { id: "category", label: "All Categories", field: "category" },
    { id: "vertical", label: "All Verticals", field: "tags.vertical" },
    { id: "entity", label: "All Entities", field: "entities" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    { num: items.filter((i) => i.isGlobal).length, label: "Global" },
    ...topCounts(items, (i) => i.category || "?", 3),
  ],
  detailConfig: optionSetDetailConfig,
};

// --- PLUGIN STEPS ---
export const pluginStepsConfig: ExplorerConfig<PluginStepItem> = {
  dataKey: "pluginSteps",
  fileName: "PluginStepInventory.json",
  idField: "id",
  icon: "pluginsteps",
  getItems: (d: DashboardData) => d.pluginSteps?.pluginSteps || [],
  sortBy: (item) => item.shortClassName || item.name || "",
  searchPlaceholder: "Search plugin steps...",
  searchFields: ["id", "name", "shortClassName", "className", "assembly", "entity", "message", "stage", "solution"],
  listTitle: (item) => item.shortClassName || item.name,
  listSubtitle: (item) => [item.entity, item.message, item.stage].filter(Boolean).join(" | "),
  listPills: (item) => {
    const pills: PillDef[] = [];
    if (item.mode) pills.push({ text: item.mode, color: item.mode === "Asynchronous" ? "var(--color-pill-alt)" : "var(--color-pill-secondary)" });
    return pills;
  },
  filters: [
    { id: "assembly", label: "All Assemblies", field: "assembly" },
    { id: "stage", label: "All Stages", field: "stage" },
    { id: "message", label: "All Messages", field: "message" },
    { id: "mode", label: "All Modes", field: "mode" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    { num: items.filter((s) => s.mode === "Asynchronous").length, label: "Async" },
    ...topCounts(items, (s) => s.stage || "?"),
  ],
  detailConfig: pluginStepDetailConfig,
};
