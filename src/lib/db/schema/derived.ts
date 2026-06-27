// Derived data tables — replaces the deep-extraction JSON files
// These are computed by the extraction pipeline, not entered manually

import { pgTable, text, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";

// ─── Form Details (from FormDetails.json) ──────────────────────────
export const formDetails = pgTable("form_details", {
  formId: text("form_id").primaryKey(),
  entity: text("entity").notNull(),
  formType: text("form_type"),
  solution: text("solution"),
  tabCount: integer("tab_count"),
  totalFields: integer("total_fields"),
  jsHandlerCount: integer("js_handler_count"),
  subgridCount: integer("subgrid_count"),
  tabs: jsonb("tabs").$type<unknown[]>(),
  jsHandlers: jsonb("js_handlers").$type<unknown[]>(),
}, (t) => [
  index("idx_form_details_entity").on(t.entity),
]);

// ─── View Details (from ViewDetails.json) ──────────────────────────
export const viewDetails = pgTable("view_details", {
  viewId: text("view_id").primaryKey(),
  entity: text("entity").notNull(),
  name: text("name"),
  solution: text("solution"),
  queryType: text("query_type"),
  isDefault: boolean("is_default"),
  isQuickFind: boolean("is_quick_find"),
  columnCount: integer("column_count"),
  filterCount: integer("filter_count"),
  linkedEntityCount: integer("linked_entity_count"),
  columns: jsonb("columns").$type<unknown[]>(),
  filters: jsonb("filters").$type<unknown[]>(),
  linkedEntities: jsonb("linked_entities").$type<unknown[]>(),
  sortFields: jsonb("sort_fields").$type<unknown[]>(),
}, (t) => [
  index("idx_view_details_entity").on(t.entity),
]);

// ─── Plugin Configs (from PluginConfigs.json) ──────────────────────
export const pluginConfigs = pgTable("plugin_configs", {
  stepId: text("step_id").primaryKey(),
  stepName: text("step_name").notNull(),
  pluginType: text("plugin_type"),
  entity: text("entity"),
  solution: text("solution"),
  ruleCount: integer("rule_count"),
  isRulesEngine: boolean("is_rules_engine"),
  rules: jsonb("rules").$type<unknown[]>(),
}, (t) => [
  index("idx_plugin_configs_entity").on(t.entity),
]);

// ─── Flow Complexity (from FlowComplexity.json) ────────────────────
export const flowComplexity = pgTable("flow_complexity", {
  name: text("name").primaryKey(),
  solution: text("solution"),
  triggerType: text("trigger_type"),
  triggerEntity: text("trigger_entity"),
  totalActions: integer("total_actions"),
  maxDepth: integer("max_depth"),
  complexityScore: integer("complexity_score"),
  complexity: text("complexity"), // Low, Medium, High, Very High
  hasErrorHandling: boolean("has_error_handling"),
  metrics: jsonb("metrics").$type<Record<string, number>>(),
  httpUrls: jsonb("http_urls").$type<string[]>(),
  connectors: jsonb("connectors").$type<string[]>(),
  governanceFlags: jsonb("governance_flags").$type<string[]>(),
}, (t) => [
  index("idx_flow_complexity_solution").on(t.solution),
  index("idx_flow_complexity_score").on(t.complexity),
]);

// ─── Flow ↔ Entity Interactions (from FlowEntityMap.json) ──────────
export const flowEntityInteractions = pgTable("flow_entity_interactions", {
  id: text("id").primaryKey(), // generated: flowName:entityName
  flowName: text("flow_name").notNull(),
  flowSolution: text("flow_solution"),
  entityName: text("entity_name").notNull(),
  operations: jsonb("operations").$type<string[]>(), // ["action:get", "trigger:update"]
  columnsReferenced: jsonb("columns_referenced").$type<string[]>(),
}, (t) => [
  index("idx_fei_flow").on(t.flowName),
  index("idx_fei_entity").on(t.entityName),
]);

// ─── Canvas App Sources (from CanvasAppSources.json) ───────────────
export const canvasAppSources = pgTable("canvas_app_sources", {
  name: text("name").primaryKey(),
  displayName: text("display_name"),
  description: text("description"),
  solution: text("solution"),
  formFactor: text("form_factor"),
  entityCount: integer("entity_count"),
  connectorCount: integer("connector_count"),
  entities: jsonb("entities").$type<unknown[]>(),
  connectors: jsonb("connectors").$type<unknown[]>(),
});

// ─── Entity Maps (from EntityMaps.json) ────────────────────────────
export const entityMaps = pgTable("entity_maps", {
  id: text("id").primaryKey(), // generated: sourceEntity:targetEntity
  sourceEntity: text("source_entity").notNull(),
  targetEntity: text("target_entity").notNull(),
  fieldCount: integer("field_count"),
  fieldMappings: jsonb("field_mappings").$type<unknown[]>(),
  solutions: jsonb("solutions").$type<string[]>(),
}, (t) => [
  index("idx_entity_maps_source").on(t.sourceEntity),
  index("idx_entity_maps_target").on(t.targetEntity),
]);

// ─── Entity Columns (from EntityColumnInventory.json) ──────────────
export const entityColumns = pgTable("entity_columns", {
  entityName: text("entity_name").primaryKey(),
  displayName: text("display_name"),
  description: text("description"),
  totalColumns: integer("total_columns"),
  customColumns: integer("custom_columns"),
  oobColumns: integer("oob_columns"),
  settings: jsonb("settings").$type<Record<string, boolean | string | null>>(),
  solutions: jsonb("solutions").$type<string[]>(),
  columns: jsonb("columns").$type<unknown[]>(),
}, (t) => [
  index("idx_entity_columns_name").on(t.entityName),
]);

// ─── Ribbon Customizations (from RibbonCustomizations.json) ────────
export const ribbonCustomizations = pgTable("ribbon_customizations", {
  id: text("id").primaryKey(), // generated: entity:type:ribbonId
  entity: text("entity").notNull(),
  type: text("type").notNull(),
  ribbonId: text("ribbon_id").notNull(),
  location: text("location"),
  solution: text("solution"),
  jsActions: jsonb("js_actions").$type<{ library: string; function: string }[]>(),
}, (t) => [
  index("idx_ribbon_entity").on(t.entity),
]);

// ─── Web Resource Code Analysis (from WebResourceCodeAnalysis.json)
export const webResourceCodeAnalysis = pgTable("web_resource_code_analysis", {
  name: text("name").primaryKey(),
  solution: text("solution"),
  lineCount: integer("line_count"),
  isRulesEngine: boolean("is_rules_engine"),
  isCustom: boolean("is_custom"),
  functionCount: integer("function_count"),
  functions: jsonb("functions").$type<string[]>(),
  apiCallCount: integer("api_call_count"),
  apiCalls: jsonb("api_calls").$type<{ operation: string; entity: string }[]>(),
  deprecatedCount: integer("deprecated_count"),
  deprecated: jsonb("deprecated").$type<{ pattern: string; count: number }[]>(),
  fieldRefCount: integer("field_ref_count"),
  fieldRefs: jsonb("field_refs").$type<string[]>(),
  governanceFlags: jsonb("governance_flags").$type<string[]>(),
});

// ─── Orphaned Components (from OrphanedComponents.json) ────────────
export const orphanedComponents = pgTable("orphaned_components", {
  id: text("id").primaryKey(), // generated: type:schemaName
  type: text("type").notNull(),
  name: text("name").notNull(),
  schemaName: text("schema_name").notNull(),
  reason: text("reason"),
  severity: text("severity"),
  solution: text("solution"),
});

// ─── Solution Dependencies (from SolutionDependencies.json) ────────
export const solutions = pgTable("solutions", {
  uniqueName: text("unique_name").primaryKey(),
  displayName: text("display_name"),
  version: text("version"),
  isManaged: boolean("is_managed"),
  publisher: text("publisher"),
  publisherPrefix: text("publisher_prefix"),
  description: text("description"),
  dependencyCount: integer("dependency_count"),
  missingDependencyCount: integer("missing_dependency_count"),
  dependsOn: jsonb("depends_on").$type<string[]>(),
});

// ─── Workflow Definitions (from public/data/definitions/*.json) ────
// Replaces client-side fetches of WorkflowDefinitionManifest.json +
// definitions/{guid}.json. Keyed by normalized GUID (uppercase, no braces).
export const workflowDefinitions = pgTable("workflow_definitions", {
  guid: text("guid").primaryKey(),
  solution: text("solution"),
  actionCount: integer("action_count"),
  triggerCount: integer("trigger_count"),
  definition: jsonb("definition").$type<Record<string, unknown>>(),
}, (t) => [
  index("idx_workflow_definitions_solution").on(t.solution),
]);

export const solutionDependencies = pgTable("solution_dependencies", {
  id: text("id").primaryKey(), // generated: from:to
  fromSolution: text("from_solution").notNull(),
  toSolution: text("to_solution").notNull(),
  componentCount: integer("component_count"),
}, (t) => [
  index("idx_sol_dep_from").on(t.fromSolution),
  index("idx_sol_dep_to").on(t.toSolution),
]);
