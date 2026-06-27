// Component configs for AI / bot / app action types — explorer + detail configs co-located
import type {
  DashboardData,
  ExplorerConfig,
  PillDef,
  DetailConfig,
  AIComponentItem,
  AppActionItem,
} from "@/types/inventory";
import { topCounts, boolToYes } from "./shared";

// ============================================================
// DETAIL CONFIGS
// ============================================================

// ========== AI COMPONENT DETAIL CONFIG ==========
export const aiComponentDetailConfig: DetailConfig<AIComponentItem> = {
  getHeader: (item) => ({
    title: item.displayName || item.name,
    subtitle: item.componentType || item.skillType || item.tags?.category,
  }),

  getDescription: (item) => item.description ?? undefined,

  getGridRows: (item) => {
    const t = item.tags || {};
    return [
      { label: "Component Type", value: item.componentType || item.skillType },
      { label: "Parent Bot", value: item.parentBot },
      { label: "Entity", value: item.entity },
      { label: "Solution", value: item.solution },
      { label: "Category", value: t.category },
      { label: "Vertical", value: t.vertical },
      { label: "Customizable", value: boolToYes(item.isCustomizable) },
    ].filter((row) => row.value != null);
  },

  getPillSections: () => [],
};

// ========== APP ACTION DETAIL CONFIG ==========
export const appActionDetailConfig: DetailConfig<AppActionItem> = {
  getHeader: (item) => ({
    title: item.buttonLabel || item.name,
    subtitle: item.appModule,
  }),

  getGridRows: (item) => {
    const onClickLabels: Record<number, string> = { 1: "Command Library", 2: "JavaScript Action" };
    return [
      { label: "Internal Name", value: item.name, mono: true },
      { label: "Context Entity", value: item.contextEntity },
      { label: "App Module", value: item.appModule },
      { label: "Solution", value: item.solution },
      { label: "Category", value: item.category },
      { label: "On Click Type", value: item.onClickType != null ? (onClickLabels[item.onClickType] ?? String(item.onClickType)) : undefined },
      { label: "Command Library", value: item.commandLibrary || undefined },
      { label: "Font Icon", value: item.fontIcon },
      { label: "Hidden", value: boolToYes(item.isHidden) },
      { label: "Disabled", value: boolToYes(item.isDisabled) },
      { label: "Customizable", value: boolToYes(item.isCustomizable) },
    ].filter((row) => row.value != null);
  },

  getPillSections: () => [],
};

// ============================================================
// EXPLORER CONFIGS
// ============================================================

// --- AI COMPONENTS ---
export const aiComponentsConfig: ExplorerConfig<AIComponentItem> = {
  dataKey: "aiComponents",
  fileName: "AIComponentInventory.json",
  idField: "id",
  icon: "aicomponents",
  getItems: (d: DashboardData) => {
    const src = d.aiComponents;
    if (!src) return [];
    const bots = (src.botComponents || []).map((b) => ({ ...b, name: b.name }));
    const apis = (src.customAPIs || []).map((a) => ({ ...a, name: a.displayName || a.name }));
    const skills = (src.aiSkillConfigs || []).map((s) => ({ ...s, name: s.name || s.uniqueName || "" }));
    return [...bots, ...apis, ...skills];
  },
  sortBy: (item) => item.name || "",
  searchPlaceholder: "Search AI components...",
  searchFields: ["name", "displayName", "description", "componentType", "parentBot", "solution", "tags.category"],
  listTitle: (item) => item.displayName || item.name,
  listSubtitle: (item) => (item.tags?.category as string) || "",
  listPills: (item) => {
    const pills: PillDef[] = [];
    const type = item.componentType || item.skillType;
    if (type) pills.push({ text: type as string, color: "var(--color-pill-info)" });
    return pills;
  },
  filters: [
    { id: "category", label: "All Categories", field: "tags.category" },
    { id: "type", label: "All Types", field: "componentType" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    ...topCounts(items, (i) => (i.tags?.category as string) || "?", 10),
  ],
  detailConfig: aiComponentDetailConfig,
};

// --- APP ACTIONS ---
export const appActionsConfig: ExplorerConfig<AppActionItem> = {
  dataKey: "appActions",
  fileName: "AppActionInventory.json",
  idField: "uniqueName",
  icon: "appactions",
  getItems: (d: DashboardData) => d.appActions?.appActions || [],
  sortBy: (item) => item.buttonLabel || item.name || "",
  searchPlaceholder: "Search app actions...",
  searchFields: ["buttonLabel", "name", "contextEntity", "appModule", "solution", "category", "tags.vertical"],
  listTitle: (item) => item.buttonLabel || item.name,
  listSubtitle: (item) => [item.contextEntity, item.appModule].filter(Boolean).join(" | "),
  listPills: (item) => {
    const pills: PillDef[] = [];
    if (item.tags?.category) pills.push({ text: item.tags.category as string, color: "var(--color-pill-alt)" });
    return pills;
  },
  filters: [
    { id: "appModule", label: "All App Modules", field: "appModule" },
    { id: "entity", label: "All Entities", field: "contextEntity" },
    { id: "category", label: "All Categories", field: "category" },
  ],
  stats: (items) => [
    { num: items.length, label: "Total" },
    ...topCounts(items, (a) => a.appModule || "?"),
  ],
  detailConfig: appActionDetailConfig,
  editableFields: [
    { key: "buttonLabel", label: "Button Label", type: "text", placeholder: "Button label..." },
    { key: "category", label: "Category", type: "text", placeholder: "Category..." },
    { key: "solution", label: "Solution", type: "text", placeholder: "Solution name..." },
  ],
};
