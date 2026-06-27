// Component configs for infrastructure / platform-level types — explorer + detail configs co-located
import type {
  DashboardData,
  ExplorerConfig,
  PillDef,
  DetailConfig,
  EnvironmentVariableItem,
  SiteMapItem,
  DashboardItem,
  MobileOfflineItem,
  TemplateItem,
} from "@/types/inventory";
import { CopyableValue } from "@/components/shared/copyable-value";
import { topCounts, boolToYes } from "./shared";

// ============================================================
// DETAIL CONFIGS
// ============================================================

// ========== ENVIRONMENT VARIABLE DETAIL CONFIG ==========
export const envVarDetailConfig: DetailConfig<EnvironmentVariableItem> = {
  getHeader: (item) => ({
    title: item.displayName || item.schemaName,
    subtitle: item.schemaName,
  }),

  getDescription: (item) => item.description,

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "Schema Name", value: item.schemaName, mono: true },
      { label: "Data Type", value: item.dataType },
      { label: "Secret", value: boolToYes(item.isSecret) },
      { label: "Required", value: boolToYes(item.isRequired) },
      { label: "Has Default", value: boolToYes(item.hasDefaultValue) },
      ...(item.defaultValue ? [{ label: "Default Value", html: <CopyableValue value={item.defaultValue} /> }] : []),
      { label: "Solution", value: item.solution },
      { label: "Category", value: item.category },
      { label: "Vertical", value: t.vertical },
      { label: "Integration", value: t.integration },
    ].filter((row) => row.html !== undefined || row.value != null);
  },

  getPillSections: () => [],

  getCrossReferences: (item) => {
    if (!item._relWorkflows?.length) return [];
    return [{
      title: `Used By Workflows (${item._relWorkflows.length})`,
      icon: "workflows",
      items: item._relWorkflows.map(name => ({ name, tabId: "workflows", itemId: name, searchName: name })),
    }];
  },
};

// ========== SITE MAP DETAIL CONFIG ==========
export const siteMapDetailConfig: DetailConfig<SiteMapItem> = {
  getHeader: (item) => ({
    title: item.name,
    subtitle: item.solution,
  }),

  getGridRows: (item) => [
    { label: "Solution", value: item.solution },
    { label: "Areas", value: item.areaCount != null ? String(item.areaCount) : undefined },
    { label: "Groups", value: item.totalGroups != null ? String(item.totalGroups) : undefined },
    { label: "Sub Areas", value: item.totalSubAreas != null ? String(item.totalSubAreas) : undefined },
    { label: "Entities", value: item.totalEntities != null ? String(item.totalEntities) : undefined },
  ].filter((row) => row.value != null),

  getPillSections: (item) => {
    if (item.areas && item.areas.length > 0) {
      return [{ title: "Areas", items: item.areas.map((a) => a.title) }];
    }
    return [];
  },

  getCrossReferences: (item) => {
    if (!item._relApps?.length) return [];
    return [{
      title: `Included In Apps (${item._relApps.length})`,
      icon: "apps",
      items: item._relApps.map(name => ({ name, tabId: "apps", itemId: name, searchName: name })),
    }];
  },
};

// ========== DASHBOARD DETAIL CONFIG ==========
export const dashboardDetailConfig: DetailConfig<DashboardItem> = {
  getHeader: (item) => ({
    title: item.name,
    subtitle: item.solution,
  }),

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "Solution", value: item.solution },
      { label: "Category", value: item.category },
      { label: "Vertical", value: t.vertical },
      { label: "Default", value: boolToYes(item.isDefault) },
      { label: "Tablet Enabled", value: boolToYes(item.isTabletEnabled) },
      { label: "Customizable", value: boolToYes(item.isCustomizable) },
      { label: "Entity Count", value: item.entityCount != null ? String(item.entityCount) : undefined },
      { label: "Version", value: item.version },
    ].filter((row) => row.value != null);
  },

  getPillSections: () => [],

  getCrossReferences: (item) => {
    if (!item._relApps?.length) return [];
    return [{
      title: `Included In Apps (${item._relApps.length})`,
      icon: "apps",
      items: item._relApps.map(name => ({ name, tabId: "apps", itemId: name, searchName: name })),
    }];
  },
};

// ========== MOBILE OFFLINE DETAIL CONFIG ==========
export const mobileOfflineDetailConfig: DetailConfig<MobileOfflineItem> = {
  getHeader: (item) => ({
    title: item.name,
    subtitle: item.solution,
  }),

  getGridRows: (item) => [
    { label: "Solution", value: item.solution },
    { label: "Entity Count", value: item.entityCount != null ? String(item.entityCount) : undefined },
  ].filter((row) => row.value != null),

  getPillSections: () => [],

  getCrossReferences: (item) => {
    if (!item.entities?.length) return [];
    return [{
      title: `Enabled Entities (${item.entities.length})`,
      icon: "entities",
      items: item.entities.map(e => ({
        name: e.name || e.entitySchemaName,
        subtitle: `${e.syncInterval}min`,
        tabId: "entities",
        itemId: e.name || e.entitySchemaName,
        searchName: e.name || e.entitySchemaName,
      })),
    }];
  },
};

// ========== TEMPLATE DETAIL CONFIG ==========
export const templateDetailConfig: DetailConfig<TemplateItem> = {
  getHeader: (item) => ({
    title: item.title,
    subtitle: item.templateTypeName,
  }),

  getDescription: (item) => item.description ?? undefined,

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "Template Type", value: item.templateTypeName },
      { label: "Solution", value: item.solution },
      { label: "Category", value: item.category },
      { label: "Vertical", value: t.vertical },
      { label: "Customizable", value: boolToYes(item.isCustomizable) },
      { label: "Version", value: item.version },
    ].filter((row) => row.value != null);
  },

  getPillSections: () => [],
};

// ============================================================
// EXPLORER CONFIGS
// ============================================================

// --- ENVIRONMENT VARIABLES ---
export const envVarsConfig: ExplorerConfig<EnvironmentVariableItem> = {
  dataKey: "envVars",
  fileName: "EnvironmentVariableInventory.json",
  idField: "schemaName",
  icon: "envvars",
  getItems: (d: DashboardData) => d.envVars?.environmentVariables || [],
  sortBy: (item) => item.displayName || item.schemaName || "",
  searchPlaceholder: "Search environment variables...",
  searchFields: ["schemaName", "displayName", "description", "dataType", "solution", "category", "tags.integration"],
  listTitle: (item) => item.displayName || item.schemaName,
  listSubtitle: (item) => [item.dataType, item.category].filter(Boolean).join(" | "),
  listPills: () => [],
  filters: [
    { id: "dataType", label: "All Data Types", field: "dataType" },
    { id: "category", label: "All Categories", field: "category" },
    { id: "vertical", label: "All Verticals", field: "tags.vertical" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    { num: items.filter((i) => i.tags?.integration).length, label: "Integration" },
    ...topCounts(items, (i) => i.dataType || "?", 10),
  ],
  detailConfig: envVarDetailConfig,
};

// --- SITE MAPS ---
export const siteMapsConfig: ExplorerConfig<SiteMapItem> = {
  dataKey: "siteMaps",
  fileName: "SiteMapInventory.json",
  idField: "name",
  icon: "sitemaps",
  getItems: (d: DashboardData) => d.siteMaps?.siteMaps || [],
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search site maps...",
  searchFields: ["name", "solution"],
  listTitle: (item) => item.name,
  listSubtitle: (item) => item.solution || "",
  listPills: (item) => {
    const pills: PillDef[] = [];
    if (item.areaCount) pills.push({ text: `${item.areaCount} areas`, color: "var(--color-pill-info)" });
    return pills;
  },
  filters: [
    { id: "solution", label: "All Solutions", field: "solution" },
  ],
  stats: (items) => [
    { num: items.length, label: "Site Maps" },
    { num: items.reduce((s, i) => s + (i.areaCount || 0), 0), label: "Areas" },
    { num: items.reduce((s, i) => s + (i.totalEntities || 0), 0), label: "Entities" },
  ],
  detailConfig: siteMapDetailConfig,
};

// --- DASHBOARDS ---
export const dashboardsConfig: ExplorerConfig<DashboardItem> = {
  dataKey: "dashboards",
  fileName: "DashboardInventory.json",
  idField: "id",
  icon: "dashboards",
  getItems: (d: DashboardData) => d.dashboards?.dashboards || [],
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search dashboards...",
  searchFields: ["id", "name", "solution", "category", "tags.vertical", "tags.processCatalogL1"],
  listTitle: (item) => item.name,
  listSubtitle: () => "",
  listPills: (item) => {
    const pills: PillDef[] = [];
    if (item.category) pills.push({ text: item.category, color: "var(--color-pill-info)" });
    return pills;
  },
  filters: [
    { id: "category", label: "All Categories", field: "category" },
    { id: "vertical", label: "All Verticals", field: "tags.vertical" },
    { id: "l1", label: "All L1 Processes", field: "tags.processCatalogL1" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    ...topCounts(items, (d) => d.category || "?"),
  ],
  detailConfig: dashboardDetailConfig,
};

// --- MOBILE OFFLINE ---
export const mobileOfflineConfig: ExplorerConfig<MobileOfflineItem> = {
  dataKey: "mobileOffline",
  fileName: "MobileOfflineInventory.json",
  idField: "name",
  icon: "mobileoffline",
  getItems: (d: DashboardData) => {
    const profiles = d.mobileOffline?.profiles || [];
    // Normalize: id/name may be arrays in the raw JSON — flatten to strings
    return profiles.map((p) => ({
      ...p,
      name: Array.isArray(p.name) ? (p.name as unknown as string[])[0]! : p.name,
    }));
  },
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search offline profiles...",
  searchFields: ["name", "solution"],
  listTitle: (item) => item.name,
  listSubtitle: (item) => `${item.entityCount || 0} entities`,
  listPills: (item) => {
    const pills: PillDef[] = [];
    if (item.solution) pills.push({ text: item.solution, color: "var(--color-pill-secondary)" });
    return pills;
  },
  filters: [
    { id: "solution", label: "All Solutions", field: "solution" },
  ],
  stats: (items) => [
    { num: items.length, label: "Profiles" },
    { num: items.reduce((s, i) => s + (i.entityCount || 0), 0), label: "Entities" },
  ],
  detailConfig: mobileOfflineDetailConfig,
};

// --- TEMPLATES ---
export const templatesConfig: ExplorerConfig<TemplateItem> = {
  dataKey: "templates",
  fileName: "TemplateInventory.json",
  idField: "id",
  icon: "templates",
  getItems: (d: DashboardData) => d.templates?.templates || [],
  sortBy: (item) => item.title || "",
  searchPlaceholder: "Search templates...",
  searchFields: ["id", "title", "templateTypeName", "solution", "category"],
  listTitle: (item) => item.title,
  listSubtitle: (item) => [item.category, item.solution].filter(Boolean).join(" | "),
  listPills: (item) => {
    const pills: PillDef[] = [];
    if (item.templateTypeName) pills.push({ text: item.templateTypeName, color: "var(--color-pill-info)" });
    return pills;
  },
  filters: [
    { id: "type", label: "All Types", field: "templateTypeName" },
    { id: "category", label: "All Categories", field: "category" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    ...topCounts(items, (t) => t.templateTypeName || "?", 10),
  ],
  detailConfig: templateDetailConfig,
};
