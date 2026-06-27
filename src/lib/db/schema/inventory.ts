// Core inventory tables — one per D365 component type
// Each table has typed columns for filterable/joinable fields + jsonb for the full blob

import { pgTable, text, integer, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";

// ─── Entities ──────────────────────────────────────────────────────
export const entities = pgTable("entities", {
  logicalName: text("logical_name").primaryKey(),
  displayName: text("display_name"),
  description: text("description"),
  solution: text("solution"),
  primaryField: text("primary_field"),
  fieldCount: integer("field_count"),
  category: text("category"), // fieldService, construction, outOfBox, etc.
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_entities_solution").on(t.solution),
  index("idx_entities_category").on(t.category),
]);

// ─── Plugins ───────────────────────────────────────────────────────
export const plugins = pgTable("plugins", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fullTypeName: text("full_type_name"),
  assembly: text("assembly"),
  namespace: text("namespace"),
  entity: text("entity"),
  primaryEntity: text("primary_entity"),
  message: text("message"),
  stage: text("stage"),
  status: text("status"),
  solution: text("solution"),
  businessLogic: text("business_logic"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_plugins_solution").on(t.solution),
  index("idx_plugins_entity").on(t.entity),
  index("idx_plugins_assembly").on(t.assembly),
]);

// ─── Plugin Steps ──────────────────────────────────────────────────
export const pluginSteps = pgTable("plugin_steps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  className: text("class_name"),
  shortClassName: text("short_class_name"),
  assembly: text("assembly"),
  entity: text("entity"),
  message: text("message"),
  stage: text("stage"),
  mode: text("mode"),
  rank: integer("rank"),
  filteringAttributeCount: integer("filtering_attribute_count"),
  isCustomizable: boolean("is_customizable"),
  solution: text("solution"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_plugin_steps_solution").on(t.solution),
  index("idx_plugin_steps_entity").on(t.entity),
  index("idx_plugin_steps_message").on(t.message),
]);

// ─── Forms ─────────────────────────────────────────────────────────
export const forms = pgTable("forms", {
  formId: text("form_id").primaryKey(),
  name: text("name").notNull(),
  entity: text("entity").notNull(),
  entityDisplayName: text("entity_display_name"),
  formType: text("form_type"),
  solution: text("solution"),
  isActive: boolean("is_active"),
  version: text("version"),
  tabCount: integer("tab_count"),
  sectionCount: integer("section_count"),
  controlCount: integer("control_count"),
  subgridCount: integer("subgrid_count"),
  hasCanvasApp: boolean("has_canvas_app"),
  hasBPF: boolean("has_bpf"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_forms_entity").on(t.entity),
  index("idx_forms_solution").on(t.solution),
  index("idx_forms_type").on(t.formType),
]);

// ─── Views ─────────────────────────────────────────────────────────
export const views = pgTable("views", {
  viewId: text("view_id").primaryKey(),
  name: text("name").notNull(),
  entity: text("entity").notNull(),
  entityDisplayName: text("entity_display_name"),
  queryType: text("query_type"),
  solution: text("solution"),
  columnCount: integer("column_count"),
  filterCount: integer("filter_count"),
  isDefault: boolean("is_default"),
  isQuickFind: boolean("is_quick_find"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_views_entity").on(t.entity),
  index("idx_views_solution").on(t.solution),
]);

// ─── Workflows ─────────────────────────────────────────────────────
export const workflows = pgTable("workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  entity: text("entity"),
  primaryEntity: text("primary_entity"),
  category: text("category"),
  type: text("type"), // PowerAutomate, BusinessRule, Action, BPF
  solution: text("solution"),
  state: text("state"), // Activated, Draft
  mode: text("mode"),
  format: text("format"),
  description: text("description"),
  onCreate: boolean("on_create"),
  onUpdate: boolean("on_update"),
  onDelete: boolean("on_delete"),
  // Power Automate-specific fields, merged in from the (retired) flows table.
  triggerType: text("trigger_type"),
  triggerEntity: text("trigger_entity"),
  connectors: jsonb("connectors").$type<string[]>(),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_workflows_solution").on(t.solution),
  index("idx_workflows_entity").on(t.entity),
  index("idx_workflows_type").on(t.type),
  index("idx_workflows_state").on(t.state),
  index("idx_workflows_trigger_entity").on(t.triggerEntity),
]);

// ─── Web Resources ─────────────────────────────────────────────────
export const webResources = pgTable("web_resources", {
  name: text("name").primaryKey(),
  displayName: text("display_name"),
  description: text("description"),
  webResourceType: text("web_resource_type"),
  type: text("type"),
  solution: text("solution"),
  relatedEntity: text("related_entity"),
  prefix: text("prefix"),
  isManaged: boolean("is_managed"),
  inferredPurpose: text("inferred_purpose"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_webresources_solution").on(t.solution),
  index("idx_webresources_entity").on(t.relatedEntity),
  index("idx_webresources_type").on(t.type),
]);

// ─── Apps ──────────────────────────────────────────────────────────
export const apps = pgTable("apps", {
  uniqueName: text("unique_name").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name"),
  appType: text("app_type"), // ModelDriven, Canvas
  solution: text("solution"),
  status: text("status"),
  entityCount: integer("entity_count"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_apps_solution").on(t.solution),
  index("idx_apps_type").on(t.appType),
]);

// ─── Reports ───────────────────────────────────────────────────────
export const reports = pgTable("reports", {
  name: text("name").primaryKey(),
  id: text("id"),
  fileName: text("file_name"),
  entity: text("entity"),
  reportType: text("report_type"),
  solution: text("solution"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_reports_solution").on(t.solution),
]);

// ─── Security Roles ────────────────────────────────────────────────
export const securityRoles = pgTable("security_roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  solution: text("solution"),
  category: text("category"),
  isCustomizable: boolean("is_customizable"),
  totalPrivileges: integer("total_privileges"),
  entityAccessCount: integer("entity_access_count"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_security_roles_solution").on(t.solution),
  index("idx_security_roles_category").on(t.category),
]);

// ─── Option Sets ───────────────────────────────────────────────────
export const optionSets = pgTable("option_sets", {
  schemaName: text("schema_name").primaryKey(),
  displayName: text("display_name"),
  optionSetType: text("option_set_type"),
  isGlobal: boolean("is_global"),
  solution: text("solution"),
  optionCount: integer("option_count"),
  options: jsonb("options").$type<{ label: string; value: number; isHidden: boolean }[]>(),
  entities: jsonb("entities").$type<string[]>(),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_option_sets_solution").on(t.solution),
]);

// ─── Environment Variables ─────────────────────────────────────────
export const envVars = pgTable("env_vars", {
  schemaName: text("schema_name").primaryKey(),
  displayName: text("display_name"),
  description: text("description"),
  dataType: text("data_type"),
  isSecret: boolean("is_secret"),
  solution: text("solution"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  index("idx_env_vars_solution").on(t.solution),
]);

// ─── Site Maps ─────────────────────────────────────────────────────
export const siteMaps = pgTable("site_maps", {
  name: text("name").primaryKey(),
  solution: text("solution"),
  areaCount: integer("area_count"),
  totalGroups: integer("total_groups"),
  totalSubAreas: integer("total_sub_areas"),
  totalEntities: integer("total_entities"),
  areas: jsonb("areas").$type<unknown[]>(),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Templates ─────────────────────────────────────────────────────
export const templates = pgTable("templates", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  templateTypeName: text("template_type_name"),
  solution: text("solution"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Dashboards ────────────────────────────────────────────────────
export const dashboards = pgTable("dashboards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  solution: text("solution"),
  isDefault: boolean("is_default"),
  isTabletEnabled: boolean("is_tablet_enabled"),
  entityCount: integer("entity_count"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Mobile Offline ────────────────────────────────────────────────
export const mobileOffline = pgTable("mobile_offline", {
  name: text("name").primaryKey(),
  solution: text("solution"),
  entityCount: integer("entity_count"),
  entities: jsonb("entities").$type<unknown[]>(),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── AI Components ─────────────────────────────────────────────────
export const aiComponents = pgTable("ai_components", {
  id: text("id").primaryKey(), // uniqueName or name
  name: text("name").notNull(),
  uniqueName: text("unique_name"),
  displayName: text("display_name"),
  componentType: text("component_type"),
  parentBot: text("parent_bot"),
  entity: text("entity"),
  solution: text("solution"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── PCF Controls ──────────────────────────────────────────────────
export const pcfControls = pgTable("pcf_controls", {
  name: text("name").primaryKey(),
  displayName: text("display_name"),
  solution: text("solution"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── App Actions ───────────────────────────────────────────────────
export const appActions = pgTable("app_actions", {
  uniqueName: text("unique_name").primaryKey(),
  name: text("name").notNull(),
  buttonLabel: text("button_label"),
  appModule: text("app_module"),
  contextEntity: text("context_entity"),
  solution: text("solution"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Azure Components ──────────────────────────────────────────────
export const azureComponents = pgTable("azure_components", {
  name: text("name").primaryKey(),
  type: text("type"), // logicApp, function, externalIntegration
  trigger: text("trigger"),
  direction: text("direction"),
  description: text("description"),
  relatedEntity: text("related_entity"),
  solution: text("solution"),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
