// Relationship junction tables — replaces RelationshipIndex.json
// These enable SQL JOINs instead of client-side enrichment lookups

import { pgTable, text, primaryKey, index } from "drizzle-orm/pg-core";

// ─── Entity ↔ Component relationships ──────────────────────────────

export const relEntityForm = pgTable("rel_entity_form", {
  entityName: text("entity_name").notNull(),
  formId: text("form_id").notNull(),
}, (t) => [
  primaryKey({ columns: [t.entityName, t.formId] }),
  index("idx_rel_entity_form_entity").on(t.entityName),
]);

export const relEntityView = pgTable("rel_entity_view", {
  entityName: text("entity_name").notNull(),
  viewId: text("view_id").notNull(),
}, (t) => [
  primaryKey({ columns: [t.entityName, t.viewId] }),
  index("idx_rel_entity_view_entity").on(t.entityName),
]);

export const relEntityOptionSet = pgTable("rel_entity_option_set", {
  entityName: text("entity_name").notNull(),
  optionSetSchema: text("option_set_schema").notNull(),
}, (t) => [
  primaryKey({ columns: [t.entityName, t.optionSetSchema] }),
  index("idx_rel_entity_os_entity").on(t.entityName),
]);

export const relEntityPluginStep = pgTable("rel_entity_plugin_step", {
  entityName: text("entity_name").notNull(),
  pluginStepId: text("plugin_step_id").notNull(),
}, (t) => [
  primaryKey({ columns: [t.entityName, t.pluginStepId] }),
  index("idx_rel_entity_ps_entity").on(t.entityName),
]);

export const relEntityWorkflow = pgTable("rel_entity_workflow", {
  entityName: text("entity_name").notNull(),
  workflowName: text("workflow_name").notNull(),
}, (t) => [
  primaryKey({ columns: [t.entityName, t.workflowName] }),
  index("idx_rel_entity_wf_entity").on(t.entityName),
]);

// ─── App ↔ Component relationships ─────────────────────────────────

export const relAppEntity = pgTable("rel_app_entity", {
  appUniqueName: text("app_unique_name").notNull(),
  entityName: text("entity_name").notNull(),
}, (t) => [
  primaryKey({ columns: [t.appUniqueName, t.entityName] }),
  index("idx_rel_app_entity_app").on(t.appUniqueName),
  index("idx_rel_app_entity_entity").on(t.entityName),
]);

export const relAppDashboard = pgTable("rel_app_dashboard", {
  appUniqueName: text("app_unique_name").notNull(),
  dashboardId: text("dashboard_id").notNull(),
  dashboardName: text("dashboard_name"),
}, (t) => [
  primaryKey({ columns: [t.appUniqueName, t.dashboardId] }),
  index("idx_rel_app_dashboard_app").on(t.appUniqueName),
]);

export const relAppSiteMap = pgTable("rel_app_site_map", {
  appUniqueName: text("app_unique_name").notNull(),
  siteMapName: text("site_map_name").notNull(),
}, (t) => [
  primaryKey({ columns: [t.appUniqueName, t.siteMapName] }),
]);

export const relAppWebResource = pgTable("rel_app_web_resource", {
  appUniqueName: text("app_unique_name").notNull(),
  webResourceName: text("web_resource_name").notNull(),
}, (t) => [
  primaryKey({ columns: [t.appUniqueName, t.webResourceName] }),
  index("idx_rel_app_wr_app").on(t.appUniqueName),
]);

// ─── Workflow ↔ Environment Variable ────────────────────────────────

export const relWorkflowEnvVar = pgTable("rel_workflow_env_var", {
  workflowName: text("workflow_name").notNull(),
  envVarSchema: text("env_var_schema").notNull(),
}, (t) => [
  primaryKey({ columns: [t.workflowName, t.envVarSchema] }),
  index("idx_rel_wf_ev_workflow").on(t.workflowName),
  index("idx_rel_wf_ev_envvar").on(t.envVarSchema),
]);

// ─── Form ↔ JS Library ─────────────────────────────────────────────

export const relFormJsLibrary = pgTable("rel_form_js_library", {
  formId: text("form_id").notNull(),
  libraryName: text("library_name").notNull(),
}, (t) => [
  primaryKey({ columns: [t.formId, t.libraryName] }),
  index("idx_rel_form_js_form").on(t.formId),
]);

// ─── Entity ↔ Entity (1:N and N:N relationships) ───────────────────

export const relEntityEntity = pgTable("rel_entity_entity", {
  id: text("id").primaryKey(), // relationship name
  name: text("name").notNull(),
  type: text("type").notNull(), // OneToMany, ManyToMany
  fromEntity: text("from_entity").notNull(),
  toEntity: text("to_entity").notNull(),
  lookupField: text("lookup_field"),
  cascadeDelete: text("cascade_delete"),
  description: text("description"),
  solution: text("solution"),
}, (t) => [
  index("idx_rel_ee_from").on(t.fromEntity),
  index("idx_rel_ee_to").on(t.toEntity),
]);
