// Governance, overrides, process catalog, capability map, and refresh tracking

import { pgTable, text, integer, jsonb, timestamp, index, serial } from "drizzle-orm/pg-core";

// ─── Overrides (replaces both Dataverse and local JSON override paths) ──────
export const overrides = pgTable("overrides", {
  id: text("id").primaryKey(), // generated: dataKey:itemId
  dataKey: text("data_key").notNull(),
  itemId: text("item_id").notNull(),
  tags: jsonb("tags").$type<Record<string, unknown>>(),
  fields: jsonb("fields").$type<Record<string, unknown>>(), // businessLogic, notes, etc.
  modifiedAt: timestamp("modified_at").defaultNow(),
  modifiedBy: text("modified_by"),
}, (t) => [
  index("idx_overrides_data_key").on(t.dataKey),
  index("idx_overrides_lookup").on(t.dataKey, t.itemId),
]);

// ─── Governance Findings ───────────────────────────────────────────
export const governanceFindings = pgTable("governance_findings", {
  ruleId: text("rule_id").primaryKey(),
  name: text("name").notNull(),
  severity: text("severity").notNull(), // high, medium, warning, info
  category: text("category"),
  count: integer("count"),
  message: text("message"),
  recommendation: text("recommendation"),
  status: text("status"), // evaluated, placeholder, skipped
  scope: text("scope"), // system, component
  componentType: text("component_type"),
  items: jsonb("items").$type<string[]>(),
  itemDetails: jsonb("item_details").$type<Record<string, { detail: string }>>(),
  auditDate: timestamp("audit_date"),
}, (t) => [
  index("idx_gov_severity").on(t.severity),
  index("idx_gov_category").on(t.category),
]);

// ─── Process Catalog (L1-L6 hierarchy) ─────────────────────────────
export const processCatalog = pgTable("process_catalog", {
  code: text("code").primaryKey(),
  title: text("title").notNull(),
  level: integer("level").notNull(), // 1-6
  parentCode: text("parent_code"),
  sequenceId: text("sequence_id"),
  description: text("description"),
  catalogStatus: text("catalog_status"),
  applicationFamily: text("application_family"),
  products: text("products"),
  microsoftId: text("microsoft_id"),
  apqc: jsonb("apqc").$type<{ id: string; description: string }>(),
  microsoftReferences: jsonb("microsoft_references").$type<string[]>(),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
}, (t) => [
  index("idx_process_catalog_level").on(t.level),
  index("idx_process_catalog_parent").on(t.parentCode),
]);

// ─── Capability Map ────────────────────────────────────────────────
export const capabilities = pgTable("capabilities", {
  id: text("id").primaryKey(), // e.g., "CAP-001"
  name: text("name").notNull(),
  description: text("description"),
  componentCount: integer("component_count"),
  componentsByType: jsonb("components_by_type").$type<Record<string, number>>(),
  components: jsonb("components").$type<string[]>(),
});

export const subCapabilities = pgTable("sub_capabilities", {
  id: text("id").primaryKey(), // generated: capabilityId:name
  capabilityId: text("capability_id").notNull(),
  name: text("name").notNull(),
  bpcL3: text("bpc_l3"),
  functionalArea: text("functional_area"),
  componentCount: integer("component_count"),
  componentsByType: jsonb("components_by_type").$type<Record<string, number>>(),
  entities: jsonb("entities").$type<string[]>(),
  topKeywords: jsonb("top_keywords").$type<string[]>(),
  components: jsonb("components").$type<string[]>(),
}, (t) => [
  index("idx_sub_cap_parent").on(t.capabilityId),
]);

export const tertiarySubCapabilities = pgTable("tertiary_sub_capabilities", {
  id: text("id").primaryKey(), // generated: capabilityId:subName:name
  capabilityId: text("capability_id").notNull(),
  subCapabilityName: text("sub_capability_name").notNull(),
  name: text("name").notNull(),
  componentCount: integer("component_count"),
  componentsByType: jsonb("components_by_type").$type<Record<string, number>>(),
  entities: jsonb("entities").$type<string[]>(),
  topKeywords: jsonb("top_keywords").$type<string[]>(),
  components: jsonb("components").$type<string[]>(),
}, (t) => [
  index("idx_tert_cap_parent").on(t.capabilityId, t.subCapabilityName),
]);

// ─── Process Diagrams (user-added custom diagrams, one per process code) ─
export const processDiagrams = pgTable("process_diagrams", {
  code: text("code").primaryKey(), // process code, e.g. "95.00"
  url: text("url").notNull(),
  title: text("title"),
  modifiedAt: timestamp("modified_at").defaultNow(),
  modifiedBy: text("modified_by"),
});

// ─── BPC Diagrams (built-in diagrams from bpc-diagram-manifest.json) ─
// Multiple diagrams can be attached to the same process code (e.g. flow + scenario
// board pair for each L1). Seeded on every refresh from the manifest. Read-only
// from the API's perspective (UI has no "edit built-in" flow).
export const bpcDiagrams = pgTable("bpc_diagrams", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(), // process code, e.g. "10.00"
  path: text("path").notNull(), // e.g. "bpc-diagrams/10-acquire-to-dispose/acquire-to-dispose-flow.svg"
  name: text("name").notNull(), // human-readable title, e.g. "Acquire to Dispose Flow"
}, (t) => [
  index("idx_bpc_diagrams_code").on(t.code),
]);

// ─── Refresh Logs (audit trail for ingestion runs) ─────────────────
export const refreshLogs = pgTable("refresh_logs", {
  id: text("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  duration: text("duration"),
  mode: text("mode"), // FULL REFRESH, ENRICH + PUBLISH, etc.
  source: text("source"), // powershell, github-action, api
  components: jsonb("components").$type<Record<string, { status: string; count: number }>>(),
  results: jsonb("results").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Environment Snapshots (pre-aggregated matrix + drift payloads) ─
// Stores the two large environment JSONs as opaque blobs, keyed by name.
// Populated by the ETL loader from public/data/environment-*.json.
// The matrix/drift route handlers stream .data back to the UI.
export const environmentSnapshots = pgTable("environment_snapshots", {
  key: text("key").primaryKey(), // "matrix" | "drift"
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  generatedAt: timestamp("generated_at"),
  loadedAt: timestamp("loaded_at").defaultNow(),
});
