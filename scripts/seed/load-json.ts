// ETL Loader — reads JSON files from public/data/ and inserts into PostgreSQL
// Usage: npm run db:seed -- --data-dir ../../public/data

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../../src/lib/db/schema";

/**
 * Coerce a possibly-unwrapped single-element array back to an array. null/undefined
 * stay undefined so nullable columns remain null in the DB. Guards against the
 * PowerShell/JSON single-element-array unwrap (a 1-element array written as a bare scalar).
 */
function toArr<T = unknown>(v: unknown): T[] | undefined {
  if (v === null || v === undefined) return undefined;
  return (Array.isArray(v) ? v : [v]) as T[];
}

// ─── Config ────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

const dataDir = process.argv.includes("--data-dir")
  ? resolve(process.argv[process.argv.indexOf("--data-dir") + 1]!)
  : resolve(__dirname, "../../public/data");

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/coe_dashboard";

const client = new Pool({ connectionString });
const db = drizzle(client, { schema });

// ─── Helpers ───────────────────────────────────────────────────────

function readJson(fileName: string): unknown | null {
  const filePath = join(dataDir, fileName);
  if (!existsSync(filePath)) {
    console.log(`  [skip] ${fileName} — file not found`);
    return null;
  }
  const raw = readFileSync(filePath, "utf-8").replace(/^\uFEFF/, ""); // strip BOM
  return JSON.parse(raw);
}

function asArray(val: unknown): Record<string, unknown>[] {
  if (Array.isArray(val)) return val as Record<string, unknown>[];
  return [];
}

let totalInserted = 0;

async function truncateAndInsert<T extends Record<string, unknown>>(
  tableName: string,
  table: Parameters<typeof db.insert>[0],
  rows: T[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await db.execute(sql.raw(`TRUNCATE TABLE "${tableName}" CASCADE`));
  // Insert in batches of 500 to avoid parameter limit
  // Use onConflictDoNothing to handle cross-solution duplicates (same component, different solution)
  const batchSize = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const result = (await db.insert(table).values(batch as never).onConflictDoNothing()) as { rowCount?: number };
    inserted += result.rowCount ?? batch.length;
  }
  totalInserted += inserted;
  return inserted;
}

function log(label: string, count: number, expected?: number) {
  const match = expected != null ? (count === expected ? " ✓" : ` ⚠ expected ${expected}`) : "";
  console.log(`  [${count.toString().padStart(5)}] ${label}${match}`);
}

// ─── Core Inventory Loaders ────────────────────────────────────────

async function loadPlugins() {
  const data = readJson("PluginInventory.json") as { metadata?: { totalPlugins?: number }; plugins?: unknown[] } | null;
  if (!data?.plugins) return;
  const rows = asArray(data.plugins).map((p) => ({
    id: (p.id || p.friendlyName || p.name) as string,
    name: p.name as string,
    fullTypeName: p.fullTypeName as string | undefined,
    assembly: p.assembly as string | undefined,
    namespace: p.namespace as string | undefined,
    entity: p.entity as string | undefined,
    primaryEntity: (p.tags as Record<string, unknown>)?.primaryEntity as string | undefined,
    message: p.message as string | undefined,
    stage: p.stage as string | undefined,
    status: (p.tags as Record<string, unknown>)?.status as string | undefined,
    solution: p.solution as string | undefined,
    businessLogic: p.businessLogic as string | undefined,
    tags: p.tags as Record<string, unknown> | undefined,
    rawData: p,
  }));
  const count = await truncateAndInsert("plugins", schema.plugins, rows);
  log("plugins", count, data.metadata?.totalPlugins);
}

async function loadEntities() {
  const data = readJson("EntityInventory.json") as {
    metadata?: { totalEntities?: number };
    entities?: Record<string, unknown[]>;
    standardEntitiesCustomized?: unknown[];
  } | null;
  if (!data?.entities) return;

  // Deduplicate + merge. An entity may appear twice — once in `entities.outOfBox`
  // (CDM-rich: cdmAttributes, cdmExtendsEntity, etc.) and once in
  // `standardEntitiesCustomized` (customization-rich: solution, processCatalogL1,
  // hasPlugins, etc.). Previously we took only one and silently dropped the other's
  // tags. Now we merge tag bags — customized takes precedence for conflicting keys,
  // outOfBox fills in anything not overridden (notably the CDM metadata).
  const byLogicalName = new Map<string, { entry: Record<string, unknown>; category: string }>();

  // First pass: seed map with non-customized category entries (CDM data lives here)
  for (const [category, items] of Object.entries(data.entities)) {
    for (const e of asArray(items)) {
      const ln = (e as Record<string, unknown>).logicalName as string;
      if (ln && !byLogicalName.has(ln)) {
        byLogicalName.set(ln, { entry: e as Record<string, unknown>, category });
      }
    }
  }

  // Second pass: merge in standardEntitiesCustomized (customization takes precedence)
  for (const e of asArray(data.standardEntitiesCustomized)) {
    const ln = e.logicalName as string;
    if (!ln) continue;
    const existing = byLogicalName.get(ln);
    if (existing) {
      // Merge: start with outOfBox, overlay customized fields + tags
      const mergedTags = {
        ...((existing.entry.tags as Record<string, unknown>) || {}),
        ...((e.tags as Record<string, unknown>) || {}),
      };
      byLogicalName.set(ln, {
        entry: { ...existing.entry, ...e, tags: mergedTags },
        category: "standardEntitiesCustomized",
      });
    } else {
      byLogicalName.set(ln, { entry: e, category: "standardEntitiesCustomized" });
    }
  }

  const rows: Record<string, unknown>[] = [];
  for (const { entry, category } of byLogicalName.values()) {
    rows.push({ ...entry, _category: category });
  }

  const mapped = rows.map((e) => ({
    logicalName: e.logicalName as string,
    displayName: e.displayName as string | undefined,
    description: e.description as string | undefined,
    solution: e.solution as string | undefined,
    primaryField: e.primaryField as string | undefined,
    fieldCount: e.fieldCount as number | undefined,
    category: e._category as string,
    tags: e.tags as Record<string, unknown> | undefined,
    rawData: e,
  }));
  const count = await truncateAndInsert("entities", schema.entities, mapped);
  log("entities", count);
}

async function loadForms() {
  const data = readJson("FormInventory.json") as { metadata?: { totalForms?: number }; forms?: unknown[] } | null;
  if (!data?.forms) return;
  const rows = asArray(data.forms).map((f) => ({
    formId: f.formId as string,
    name: f.name as string,
    entity: f.entity as string,
    entityDisplayName: f.entityDisplayName as string | undefined,
    formType: f.formType as string | undefined,
    solution: f.solution as string | undefined,
    isActive: f.isActive as boolean | undefined,
    version: f.version as string | undefined,
    tabCount: f.tabCount as number | undefined,
    sectionCount: f.sectionCount as number | undefined,
    controlCount: f.controlCount as number | undefined,
    subgridCount: f.subgridCount as number | undefined,
    hasCanvasApp: f.hasCanvasApp as boolean | undefined,
    hasBPF: f.hasBPF as boolean | undefined,
    tags: f.tags as Record<string, unknown> | undefined,
    rawData: f,
  }));
  const count = await truncateAndInsert("forms", schema.forms, rows);
  log("forms", count, data.metadata?.totalForms);
}

async function loadViews() {
  const data = readJson("ViewInventory.json") as { metadata?: { totalViews?: number }; views?: unknown[] } | null;
  if (!data?.views) return;
  const rows = asArray(data.views).map((v) => ({
    viewId: v.viewId as string,
    name: v.name as string,
    entity: v.entity as string,
    entityDisplayName: v.entityDisplayName as string | undefined,
    queryType: v.queryType as string | undefined,
    solution: v.solution as string | undefined,
    columnCount: v.columnCount as number | undefined,
    filterCount: v.filterCount as number | undefined,
    isDefault: v.isDefault as boolean | undefined,
    isQuickFind: v.isQuickFind as boolean | undefined,
    tags: v.tags as Record<string, unknown> | undefined,
    rawData: v,
  }));
  const count = await truncateAndInsert("views", schema.views, rows);
  log("views", count, data.metadata?.totalViews);
}

async function loadWorkflows() {
  const data = readJson("WorkflowInventory.json") as { metadata?: { totalWorkflows?: number }; workflows?: unknown[] } | null;
  if (!data?.workflows) return;

  // Fold Power Automate enrichment (formerly its own `flows` table) onto the
  // matching workflow row. The two inventories key the same flow by GUID but
  // format it differently ({lower} vs UPPER), so match on a normalized GUID.
  const normGuid = (v: unknown) => String(v ?? "").replace(/[{}]/g, "").toUpperCase();
  const paData = readJson("PowerAutomateInventory.json") as { flows?: unknown[] } | null;
  const paByGuid = new Map<string, Record<string, unknown>>();
  for (const f of asArray(paData?.flows ?? [])) {
    const key = normGuid(f.id || f.name);
    if (key) paByGuid.set(key, f as Record<string, unknown>);
  }

  const rows = asArray(data.workflows).map((w) => {
    const pa = paByGuid.get(normGuid(w.id || w.name));
    return {
      id: (w.id || w.name) as string,
      name: w.name as string,
      entity: w.primaryEntity as string | undefined,
      primaryEntity: w.primaryEntity as string | undefined,
      category: w.category as string | undefined,
      type: w.type as string | undefined,
      solution: w.solution as string | undefined,
      state: w.state as string | undefined,
      mode: w.mode as string | undefined,
      format: w.format as string | undefined,
      description: w.description as string | undefined,
      onCreate: w.triggerOnCreate as boolean | undefined,
      onUpdate: w.triggerOnUpdate as boolean | undefined,
      onDelete: w.triggerOnDelete as boolean | undefined,
      triggerType: pa?.triggerType as string | undefined,
      triggerEntity: pa?.triggerEntity as string | undefined,
      connectors: toArr(pa?.connectors) as string[] | undefined,
      tags: w.tags as Record<string, unknown> | undefined,
      // Preserve the entire Power Automate record so nothing from the retired
      // flows table is lost (its tags/rawData/etc. live under _powerAutomate).
      rawData: pa ? { ...(w as Record<string, unknown>), _powerAutomate: pa } : w,
    };
  });
  const count = await truncateAndInsert("workflows", schema.workflows, rows);
  const merged = rows.filter((r) => r.connectors !== undefined || r.triggerType !== undefined).length;
  log("workflows", count, data.metadata?.totalWorkflows);
  log("  └ PA enrichment merged", merged, paByGuid.size);
}

async function loadWebResources() {
  const data = readJson("WebResourceInventory.json") as { metadata?: Record<string, unknown>; webResources?: unknown[] } | null;
  if (!data?.webResources) return;
  const rows = asArray(data.webResources).map((w) => ({
    name: w.name as string,
    displayName: w.displayName as string | undefined,
    description: w.description as string | undefined,
    webResourceType: w.type as string | undefined,
    type: w.type as string | undefined,
    solution: w.solution as string | undefined,
    relatedEntity: w.relatedEntity as string | undefined,
    prefix: w.prefix as string | undefined,
    isManaged: w.isManaged as boolean | undefined,
    inferredPurpose: w.inferredPurpose as string | undefined,
    tags: w.tags as Record<string, unknown> | undefined,
    rawData: w,
  }));
  const count = await truncateAndInsert("web_resources", schema.webResources, rows);
  log("webResources", count);
}

async function loadApps() {
  const data = readJson("AppInventory.json") as { modelDrivenApps?: unknown[]; canvasApps?: unknown[] } | null;
  if (!data) return;
  const all: Record<string, unknown>[] = [
    ...asArray(data.modelDrivenApps).map((a) => ({ ...a, _appType: "ModelDriven" })),
    ...asArray(data.canvasApps).map((a) => ({ ...a, _appType: "Canvas" })),
  ];
  const rows = all.map((a) => ({
    uniqueName: (a.uniqueName || a.name || a.displayName) as string,
    name: (a.name || a.displayName || a.uniqueName) as string,
    displayName: a.displayName as string | undefined,
    appType: a._appType as string,
    solution: a.solution as string | undefined,
    status: a.isActive ? "Active" : undefined,
    entityCount: a.entityCount as number | undefined,
    tags: a.tags as Record<string, unknown> | undefined,
    rawData: a,
  }));
  const count = await truncateAndInsert("apps", schema.apps, rows);
  log("apps", count);
}

async function loadReports() {
  const data = readJson("ReportInventory.json") as { reports?: unknown[] } | null;
  if (!data?.reports) return;
  const rows = asArray(data.reports).map((r) => ({
    name: (r.name || r.fileName) as string,
    id: r.id as string | undefined,
    fileName: r.fileName as string | undefined,
    entity: r.entity as string | undefined,
    reportType: r.reportType as string | undefined,
    solution: r.solution as string | undefined,
    tags: r.tags as Record<string, unknown> | undefined,
    rawData: r,
  }));
  const count = await truncateAndInsert("reports", schema.reports, rows);
  log("reports", count);
}

async function loadSecurityRoles() {
  const data = readJson("SecurityRoleInventory.json") as { metadata?: { totalRoles?: number }; roles?: unknown[] } | null;
  if (!data?.roles) return;
  const rows = asArray(data.roles).map((r) => ({
    id: (r.id || r.name) as string,
    name: r.name as string,
    solution: r.solution as string | undefined,
    category: r.category as string | undefined,
    isCustomizable: r.isCustomizable as boolean | undefined,
    totalPrivileges: r.totalPrivileges as number | undefined,
    entityAccessCount: r.entityAccessCount as number | undefined,
    tags: r.tags as Record<string, unknown> | undefined,
    rawData: r,
  }));
  const count = await truncateAndInsert("security_roles", schema.securityRoles, rows);
  log("securityRoles", count, data.metadata?.totalRoles);
}

async function loadOptionSets() {
  const data = readJson("OptionSetInventory.json") as { optionSets?: unknown[] } | null;
  if (!data?.optionSets) return;
  const rows = asArray(data.optionSets).map((o) => ({
    schemaName: o.schemaName as string,
    displayName: o.displayName as string | undefined,
    optionSetType: o.optionSetType as string | undefined,
    isGlobal: o.isGlobal as boolean | undefined,
    solution: o.solution as string | undefined,
    optionCount: o.optionCount as number | undefined,
    options: toArr(o.options) as { label: string; value: number; isHidden: boolean }[] | undefined,
    entities: toArr(o.entities) as string[] | undefined,
    tags: o.tags as Record<string, unknown> | undefined,
    rawData: o,
  }));
  const count = await truncateAndInsert("option_sets", schema.optionSets, rows);
  log("optionSets", count);
}

async function loadEnvVars() {
  const data = readJson("EnvironmentVariableInventory.json") as { environmentVariables?: unknown[] } | null;
  if (!data?.environmentVariables) return;
  const rows = asArray(data.environmentVariables).map((e) => ({
    schemaName: e.schemaName as string,
    displayName: e.displayName as string | undefined,
    description: e.description as string | undefined,
    dataType: e.dataType as string | undefined,
    isSecret: e.isSecret as boolean | undefined,
    solution: e.solution as string | undefined,
    tags: e.tags as Record<string, unknown> | undefined,
    rawData: e,
  }));
  const count = await truncateAndInsert("env_vars", schema.envVars, rows);
  log("envVars", count);
}

async function loadSimpleInventory(
  fileName: string,
  tableName: string,
  table: Parameters<typeof db.insert>[0],
  itemsKey: string,
  mapFn: (item: Record<string, unknown>) => Record<string, unknown>,
) {
  const data = readJson(fileName) as Record<string, unknown> | null;
  if (!data) return;
  const items = asArray(data[itemsKey]);
  const rows = items.map(mapFn);
  const count = await truncateAndInsert(tableName, table, rows);
  log(tableName, count);
}

// ─── Relationship Loaders ──────────────────────────────────────────

async function loadRelationships() {
  const data = readJson("RelationshipIndex.json") as {
    byEntity?: Record<string, { forms?: string[]; views?: string[]; optionSets?: string[]; pluginSteps?: string[]; workflows?: string[] }>;
    byApp?: Record<string, { entities?: string[]; dashboards?: string[]; webResources?: string[]; siteMaps?: string[] }>;
    byWorkflow?: Record<string, { envVars?: string[] }>;
    byFormJS?: Record<string, { libraries?: string[] }>;
    entityRelationships?: Array<Record<string, unknown>>;
  } | null;
  if (!data) return;

  console.log("\n  Loading relationships...");

  // Entity ↔ Form/View/OptionSet/PluginStep/Workflow
  if (data.byEntity) {
    const efRows: { entityName: string; formId: string }[] = [];
    const evRows: { entityName: string; viewId: string }[] = [];
    const eoRows: { entityName: string; optionSetSchema: string }[] = [];
    const epRows: { entityName: string; pluginStepId: string }[] = [];
    const ewRows: { entityName: string; workflowName: string }[] = [];

    for (const [entity, rels] of Object.entries(data.byEntity)) {
      for (const id of rels.forms || []) efRows.push({ entityName: entity, formId: id });
      for (const id of rels.views || []) evRows.push({ entityName: entity, viewId: id });
      for (const id of rels.optionSets || []) eoRows.push({ entityName: entity, optionSetSchema: id });
      for (const id of rels.pluginSteps || []) epRows.push({ entityName: entity, pluginStepId: id });
      for (const id of rels.workflows || []) ewRows.push({ entityName: entity, workflowName: id });
    }

    await truncateAndInsert("rel_entity_form", schema.relEntityForm, efRows);
    log("rel_entity_form", efRows.length);
    await truncateAndInsert("rel_entity_view", schema.relEntityView, evRows);
    log("rel_entity_view", evRows.length);
    await truncateAndInsert("rel_entity_option_set", schema.relEntityOptionSet, eoRows);
    log("rel_entity_option_set", eoRows.length);
    await truncateAndInsert("rel_entity_plugin_step", schema.relEntityPluginStep, epRows);
    log("rel_entity_plugin_step", epRows.length);
    await truncateAndInsert("rel_entity_workflow", schema.relEntityWorkflow, ewRows);
    log("rel_entity_workflow", ewRows.length);
  }

  // App ↔ Entity/Dashboard/WebResource/SiteMap
  if (data.byApp) {
    const aeRows: { appUniqueName: string; entityName: string }[] = [];
    const adRows: { appUniqueName: string; dashboardId: string; dashboardName: string | null }[] = [];
    const awrRows: { appUniqueName: string; webResourceName: string }[] = [];
    const asmRows: { appUniqueName: string; siteMapName: string }[] = [];

    for (const [app, rels] of Object.entries(data.byApp)) {
      for (const e of rels.entities || []) aeRows.push({ appUniqueName: app, entityName: e });
      for (const d of rels.dashboards || []) adRows.push({ appUniqueName: app, dashboardId: d, dashboardName: d });
      for (const w of rels.webResources || []) awrRows.push({ appUniqueName: app, webResourceName: w });
      for (const s of rels.siteMaps || []) asmRows.push({ appUniqueName: app, siteMapName: s });
    }

    await truncateAndInsert("rel_app_entity", schema.relAppEntity, aeRows);
    log("rel_app_entity", aeRows.length);
    await truncateAndInsert("rel_app_dashboard", schema.relAppDashboard, adRows);
    log("rel_app_dashboard", adRows.length);
    await truncateAndInsert("rel_app_web_resource", schema.relAppWebResource, awrRows);
    log("rel_app_web_resource", awrRows.length);
    await truncateAndInsert("rel_app_site_map", schema.relAppSiteMap, asmRows);
    log("rel_app_site_map", asmRows.length);
  }

  // Workflow ↔ EnvVar
  if (data.byWorkflow) {
    const rows: { workflowName: string; envVarSchema: string }[] = [];
    for (const [wf, rels] of Object.entries(data.byWorkflow)) {
      for (const ev of rels.envVars || []) rows.push({ workflowName: wf, envVarSchema: ev });
    }
    await truncateAndInsert("rel_workflow_env_var", schema.relWorkflowEnvVar, rows);
    log("rel_workflow_env_var", rows.length);
  }

  // Form ↔ JS Library
  if (data.byFormJS) {
    const rows: { formId: string; libraryName: string }[] = [];
    for (const [formId, rels] of Object.entries(data.byFormJS)) {
      for (const lib of rels.libraries || []) rows.push({ formId, libraryName: lib });
    }
    await truncateAndInsert("rel_form_js_library", schema.relFormJsLibrary, rows);
    log("rel_form_js_library", rows.length);
  }

  // Entity ↔ Entity relationships
  if (data.entityRelationships) {
    const rows = data.entityRelationships.map((r) => ({
      id: r.name as string,
      name: r.name as string,
      type: r.type as string,
      fromEntity: r.from as string,
      toEntity: r.to as string,
      lookupField: r.lookupField as string | undefined,
      cascadeDelete: r.cascadeDelete as string | undefined,
      description: r.description as string | undefined,
      solution: r.solution as string | undefined,
    }));
    await truncateAndInsert("rel_entity_entity", schema.relEntityEntity, rows);
    log("rel_entity_entity", rows.length);
  }
}

// ─── Derived Data Loaders ──────────────────────────────────────────

async function loadGovernance() {
  const data = readJson("governance-findings.json") as {
    metadata?: { auditDate?: string };
    findings?: Array<Record<string, unknown>>;
  } | null;
  if (!data?.findings) return;
  const rows = data.findings.map((f) => ({
    ruleId: f.ruleId as string,
    name: f.name as string,
    severity: f.severity as string,
    category: f.category as string | undefined,
    count: f.count as number | undefined,
    message: f.message as string | undefined,
    recommendation: f.recommendation as string | undefined,
    status: f.status as string | undefined,
    scope: f.scope as string | undefined,
    componentType: f.componentType as string | undefined,
    items: toArr(f.items) as string[] | undefined,
    itemDetails: f.itemDetails as Record<string, { detail: string }> | undefined,
    auditDate: data.metadata?.auditDate ? new Date(data.metadata.auditDate) : undefined,
  }));
  const count = await truncateAndInsert("governance_findings", schema.governanceFindings, rows);
  log("governance_findings", count);
}

async function loadProcessCatalog() {
  const data = readJson("ProcessCatalog.json") as {
    l1Processes?: unknown[]; l2Processes?: unknown[]; l3Processes?: unknown[];
    l4Processes?: unknown[]; l5Processes?: unknown[]; l6Processes?: unknown[];
  } | null;
  if (!data) return;

  const rows: {
    code: string; title: string; level: number; parentCode: string | null;
    sequenceId: string | undefined; description: string | undefined;
    catalogStatus: string | undefined; applicationFamily: string | undefined;
    products: string | undefined; microsoftId: string | undefined;
    apqc: { id: string; description: string } | undefined;
    microsoftReferences: string[] | undefined;
    rawData: Record<string, unknown>;
  }[] = [];

  const addLevel = (items: unknown[], level: number, parentField?: string) => {
    for (const item of asArray(items)) {
      rows.push({
        code: item.code as string,
        title: item.title as string,
        level,
        parentCode: parentField ? (item as Record<string, unknown>)[parentField] as string : null,
        sequenceId: item.sequenceId as string | undefined,
        description: item.description as string | undefined,
        catalogStatus: item.catalogStatus as string | undefined,
        applicationFamily: item.applicationFamily as string | undefined,
        products: item.products as string | undefined,
        microsoftId: item.microsoftId as string | undefined,
        apqc: item.apqc as { id: string; description: string } | undefined,
        microsoftReferences: toArr(item.microsoftReferences) as string[] | undefined,
        rawData: item,
      });
    }
  };

  addLevel(data.l1Processes || [], 1);
  addLevel(data.l2Processes || [], 2, "parentL1Code");
  addLevel(data.l3Processes || [], 3, "parentL2Code");
  addLevel(data.l4Processes || [], 4, "parentL3Code");
  addLevel(data.l5Processes || [], 5, "parentL4Code");
  addLevel(data.l6Processes || [], 6, "parentL5Code");

  const count = await truncateAndInsert("process_catalog", schema.processCatalog, rows);
  log("process_catalog", count);
}

async function loadEntityColumns() {
  const data = readJson("EntityColumnInventory.json") as {
    entities?: Record<string, Record<string, unknown>>;
  } | null;
  if (!data?.entities) return;
  const rows = Object.entries(data.entities).map(([entityName, info]) => ({
    entityName,
    displayName: info.displayName as string | undefined,
    description: info.description as string | undefined,
    totalColumns: info.totalColumns as number | undefined,
    customColumns: info.customColumns as number | undefined,
    oobColumns: info.oobColumns as number | undefined,
    settings: info.settings as Record<string, boolean | string | null> | undefined,
    solutions: toArr(info.solutions) as string[] | undefined,
    columns: toArr(info.columns) as unknown[] | undefined,
  }));
  const count = await truncateAndInsert("entity_columns", schema.entityColumns, rows);
  log("entity_columns", count);
}

async function loadSolutions() {
  const data = readJson("SolutionDependencies.json") as {
    solutions?: Array<Record<string, unknown>>;
    dependencies?: Array<Record<string, unknown>>;
  } | null;
  if (!data) return;

  if (data.solutions) {
    const rows = asArray(data.solutions).map((s) => ({
      uniqueName: s.uniqueName as string,
      displayName: s.displayName as string | undefined,
      version: s.version as string | undefined,
      isManaged: s.isManaged as boolean | undefined,
      publisher: s.publisher as string | undefined,
      publisherPrefix: s.publisherPrefix as string | undefined,
      description: s.description as string | undefined,
      dependencyCount: s.dependencyCount as number | undefined,
      missingDependencyCount: s.missingDependencyCount as number | undefined,
      dependsOn: toArr(s.dependsOn) as string[] | undefined,
    }));
    const count = await truncateAndInsert("solutions", schema.solutions, rows);
    log("solutions", count);
  }

  if (data.dependencies) {
    const rows = data.dependencies.map((d) => ({
      id: `${d.from}:${d.to}`,
      fromSolution: d.from as string,
      toSolution: d.to as string,
      componentCount: d.componentCount as number | undefined,
    }));
    const count = await truncateAndInsert("solution_dependencies", schema.solutionDependencies, rows);
    log("solution_dependencies", count);
  }
}

// ─── Derived Data Loaders ──────────────────────────────────────────

async function loadFormDetails() {
  const data = readJson("FormDetails.json") as { forms?: Array<Record<string, unknown>> } | null;
  if (!data?.forms) return;
  const rows = data.forms.map((f) => ({
    formId: f.formId as string,
    entity: f.entity as string,
    formType: f.formType as string | undefined,
    solution: f.solution as string | undefined,
    tabCount: f.tabCount as number | undefined,
    totalFields: f.totalFields as number | undefined,
    jsHandlerCount: f.jsHandlerCount as number | undefined,
    subgridCount: f.subgridCount as number | undefined,
    tabs: toArr(f.tabs) as unknown[] | undefined,
    jsHandlers: toArr(f.jsHandlers) as unknown[] | undefined,
  }));
  const count = await truncateAndInsert("form_details", schema.formDetails, rows);
  log("form_details", count);
}

async function loadViewDetails() {
  const data = readJson("ViewDetails.json") as { views?: Array<Record<string, unknown>> } | null;
  if (!data?.views) return;
  const rows = data.views.map((v) => ({
    viewId: v.viewId as string,
    entity: v.entity as string,
    name: v.name as string | undefined,
    solution: v.solution as string | undefined,
    queryType: v.queryType as string | undefined,
    isDefault: v.isDefault as boolean | undefined,
    isQuickFind: v.isQuickFind as boolean | undefined,
    columnCount: v.columnCount as number | undefined,
    filterCount: v.filterCount as number | undefined,
    linkedEntityCount: v.linkedEntityCount as number | undefined,
    columns: toArr(v.columns) as unknown[] | undefined,
    filters: toArr(v.filters) as unknown[] | undefined,
    linkedEntities: toArr(v.linkedEntities) as unknown[] | undefined,
    sortFields: toArr(v.sortFields) as unknown[] | undefined,
  }));
  const count = await truncateAndInsert("view_details", schema.viewDetails, rows);
  log("view_details", count);
}

async function loadPluginConfigs() {
  const data = readJson("PluginConfigs.json") as { configs?: Array<Record<string, unknown>> } | null;
  if (!data?.configs) return;
  const rows = data.configs.map((c) => ({
    stepId: c.stepId as string,
    stepName: c.stepName as string,
    pluginType: c.pluginType as string | undefined,
    entity: c.entity as string | undefined,
    solution: c.solution as string | undefined,
    ruleCount: c.ruleCount as number | undefined,
    isRulesEngine: c.isRulesEngine as boolean | undefined,
    rules: toArr(c.rules) as unknown[] | undefined,
  }));
  const count = await truncateAndInsert("plugin_configs", schema.pluginConfigs, rows);
  log("plugin_configs", count);
}

async function loadFlowComplexity() {
  const data = readJson("FlowComplexity.json") as { flows?: Array<Record<string, unknown>> } | null;
  if (!data?.flows) return;
  const rows = asArray(data.flows).map((f) => ({
    name: f.name as string,
    solution: f.solution as string | undefined,
    triggerType: f.triggerType as string | undefined,
    triggerEntity: f.triggerEntity as string | undefined,
    totalActions: f.totalActions as number | undefined,
    maxDepth: f.maxDepth as number | undefined,
    complexityScore: f.complexityScore as number | undefined,
    complexity: f.complexity as string | undefined,
    hasErrorHandling: f.hasErrorHandling as boolean | undefined,
    metrics: f.metrics as Record<string, number> | undefined,
    httpUrls: toArr(f.httpUrls) as string[] | undefined,
    connectors: toArr(f.connectors) as string[] | undefined,
    governanceFlags: toArr(f.governanceFlags) as string[] | undefined,
  }));
  const count = await truncateAndInsert("flow_complexity", schema.flowComplexity, rows);
  log("flow_complexity", count);
}

async function loadFlowEntityInteractions() {
  const data = readJson("FlowEntityMap.json") as {
    byFlow?: Record<string, { solution: string; entities: Array<{ entity: string; operations: string[]; columnsReferenced: string[] }> }>;
  } | null;
  if (!data?.byFlow) return;
  const rows: { id: string; flowName: string; flowSolution: string | undefined; entityName: string; operations: string[] | undefined; columnsReferenced: string[] | undefined }[] = [];
  for (const [flowName, info] of Object.entries(data.byFlow)) {
    for (const ent of info.entities || []) {
      rows.push({
        id: `${flowName}:${ent.entity}`,
        flowName,
        flowSolution: info.solution,
        entityName: ent.entity,
        operations: toArr<string>(ent.operations),
        columnsReferenced: toArr<string>(ent.columnsReferenced),
      });
    }
  }
  const count = await truncateAndInsert("flow_entity_interactions", schema.flowEntityInteractions, rows);
  log("flow_entity_interactions", count);
}

async function loadCanvasAppSources() {
  const data = readJson("CanvasAppSources.json") as { apps?: Array<Record<string, unknown>> } | null;
  if (!data?.apps) return;
  const rows = data.apps.map((a) => ({
    name: a.name as string,
    displayName: a.displayName as string | undefined,
    description: a.description as string | undefined,
    solution: a.solution as string | undefined,
    formFactor: a.formFactor as string | undefined,
    entityCount: a.entityCount as number | undefined,
    connectorCount: a.connectorCount as number | undefined,
    entities: toArr(a.entities) as unknown[] | undefined,
    connectors: toArr(a.connectors) as unknown[] | undefined,
  }));
  const count = await truncateAndInsert("canvas_app_sources", schema.canvasAppSources, rows);
  log("canvas_app_sources", count);
}

async function loadEntityMaps() {
  const data = readJson("EntityMaps.json") as { maps?: Array<Record<string, unknown>> } | null;
  if (!data?.maps) return;
  const rows = data.maps.map((m) => ({
    id: `${m.sourceEntity}:${m.targetEntity}`,
    sourceEntity: m.sourceEntity as string,
    targetEntity: m.targetEntity as string,
    fieldCount: m.fieldCount as number | undefined,
    fieldMappings: toArr(m.fieldMappings) as unknown[] | undefined,
    solutions: toArr(m.solutions) as string[] | undefined,
  }));
  const count = await truncateAndInsert("entity_maps", schema.entityMaps, rows);
  log("entity_maps", count);
}

async function loadRibbonCustomizations() {
  const data = readJson("RibbonCustomizations.json") as { customizations?: Array<Record<string, unknown>> } | null;
  if (!data?.customizations) return;
  const rows = data.customizations.map((r) => ({
    id: `${r.entity}:${r.type}:${r.id}`,
    entity: r.entity as string,
    type: r.type as string,
    ribbonId: r.id as string,
    location: r.location as string | undefined,
    solution: r.solution as string | undefined,
    jsActions: toArr(r.jsActions) as { library: string; function: string }[] | undefined,
  }));
  const count = await truncateAndInsert("ribbon_customizations", schema.ribbonCustomizations, rows);
  log("ribbon_customizations", count);
}

async function loadWebResourceCodeAnalysis() {
  const data = readJson("WebResourceCodeAnalysis.json") as { files?: Array<Record<string, unknown>> } | null;
  if (!data?.files) return;
  const rows = asArray(data.files).map((w) => ({
    name: w.name as string,
    solution: w.solution as string | undefined,
    lineCount: w.lineCount as number | undefined,
    isRulesEngine: w.isRulesEngine as boolean | undefined,
    isCustom: w.isCustom as boolean | undefined,
    functionCount: w.functionCount as number | undefined,
    functions: toArr(w.functions) as string[] | undefined,
    apiCallCount: w.apiCallCount as number | undefined,
    apiCalls: toArr(w.apiCalls) as { operation: string; entity: string }[] | undefined,
    deprecatedCount: w.deprecatedCount as number | undefined,
    deprecated: toArr(w.deprecated) as { pattern: string; count: number }[] | undefined,
    fieldRefCount: w.fieldRefCount as number | undefined,
    fieldRefs: toArr(w.fieldRefs) as string[] | undefined,
    governanceFlags: toArr(w.governanceFlags) as string[] | undefined,
  }));
  const count = await truncateAndInsert("web_resource_code_analysis", schema.webResourceCodeAnalysis, rows);
  log("web_resource_code_analysis", count);
}

async function loadOrphanedComponents() {
  const data = readJson("OrphanedComponents.json") as { orphans?: Array<Record<string, unknown>> } | null;
  if (!data?.orphans) return;
  const rows = data.orphans.map((o) => ({
    id: `${o.type}:${o.schemaName}`,
    type: o.type as string,
    name: o.name as string,
    schemaName: o.schemaName as string,
    reason: o.reason as string | undefined,
    severity: o.severity as string | undefined,
    solution: o.solution as string | undefined,
  }));
  const count = await truncateAndInsert("orphaned_components", schema.orphanedComponents, rows);
  log("orphaned_components", count);
}

async function loadCapabilities() {
  const data = readJson("capability-clusters.json") as {
    capabilities?: Array<Record<string, unknown>>;
  } | null;
  if (!data?.capabilities) return;

  const capRows = data.capabilities.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    description: c.description as string | undefined,
    componentCount: c.componentCount as number | undefined,
    componentsByType: c.componentsByType as Record<string, number> | undefined,
    components: toArr(c.components) as string[] | undefined,
  }));
  const count = await truncateAndInsert("capabilities", schema.capabilities, capRows);
  log("capabilities", count);

  // Sub-capabilities
  const subRows: Record<string, unknown>[] = [];
  const tertRows: Record<string, unknown>[] = [];
  for (const cap of data.capabilities) {
    for (const sub of (cap.subCapabilities as Array<Record<string, unknown>>) || []) {
      subRows.push({
        id: `${cap.id}:${sub.name}`,
        capabilityId: cap.id as string,
        name: sub.name as string,
        bpcL3: sub.bpc_l3 as string | undefined,
        functionalArea: sub.functionalArea as string | undefined,
        componentCount: sub.componentCount as number | undefined,
        componentsByType: sub.componentsByType as Record<string, number> | undefined,
        entities: toArr(sub.entities) as string[] | undefined,
        topKeywords: toArr(sub.topKeywords) as string[] | undefined,
        components: toArr(sub.components) as string[] | undefined,
      });
      for (const tert of (sub.tertiarySubCapabilities as Array<Record<string, unknown>>) || []) {
        tertRows.push({
          id: `${cap.id}:${sub.name}:${tert.name}`,
          capabilityId: cap.id as string,
          subCapabilityName: sub.name as string,
          name: tert.name as string,
          componentCount: tert.componentCount as number | undefined,
          componentsByType: tert.componentsByType as Record<string, number> | undefined,
          entities: toArr(tert.entities) as string[] | undefined,
          topKeywords: toArr(tert.topKeywords) as string[] | undefined,
          components: toArr(tert.components) as string[] | undefined,
        });
      }
    }
  }
  if (subRows.length > 0) {
    await truncateAndInsert("sub_capabilities", schema.subCapabilities, subRows);
    log("sub_capabilities", subRows.length);
  }
  if (tertRows.length > 0) {
    await truncateAndInsert("tertiary_sub_capabilities", schema.tertiarySubCapabilities, tertRows);
    log("tertiary_sub_capabilities", tertRows.length);
  }
}

async function loadWorkflowDefinitions() {
  interface ManifestEntry {
    file: string;
    solution: string;
    actionCount: number;
    triggerCount: number;
  }
  interface Manifest {
    definitions: Record<string, ManifestEntry>;
  }
  const manifest = readJson("WorkflowDefinitionManifest.json") as Manifest | null;
  if (!manifest || !manifest.definitions) return;

  const definitionsDir = join(dataDir, "definitions");
  if (!existsSync(definitionsDir)) {
    console.log("  [skip] definitions/ directory not found");
    return;
  }
  const availableFiles = new Set(readdirSync(definitionsDir));

  const rows: {
    guid: string;
    solution: string | null;
    actionCount: number | null;
    triggerCount: number | null;
    definition: Record<string, unknown> | null;
  }[] = [];

  for (const [guid, entry] of Object.entries(manifest.definitions)) {
    if (!availableFiles.has(entry.file)) continue;
    const defPath = join(definitionsDir, entry.file);
    let definition: Record<string, unknown> | null = null;
    try {
      const raw = readFileSync(defPath, "utf-8").replace(/^﻿/, "");
      definition = JSON.parse(raw);
    } catch {
      console.log(`  [warn] could not parse ${entry.file}`);
      continue;
    }
    rows.push({
      guid: guid.toUpperCase(),
      solution: entry.solution || null,
      actionCount: entry.actionCount ?? null,
      triggerCount: entry.triggerCount ?? null,
      definition,
    });
  }
  if (rows.length === 0) return;

  // Insert in batches — 347 rows × ~50-200KB jsonb each is big; batch to avoid
  // oversized single statements.
  const BATCH_SIZE = 25;
  await db.execute(sql`TRUNCATE TABLE workflow_definitions CASCADE`);
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(schema.workflowDefinitions).values(rows.slice(i, i + BATCH_SIZE));
  }
  totalInserted += rows.length;
  log("workflow_definitions", rows.length);
}

async function loadBpcDiagrams() {
  const data = readJson("bpc-diagram-manifest.json") as
    | Record<string, Array<{ path: string; name: string }>>
    | null;
  if (!data) return;
  const rows: { code: string; path: string; name: string }[] = [];
  for (const [code, entries] of Object.entries(data)) {
    for (const entry of entries) {
      rows.push({ code, path: entry.path, name: entry.name });
    }
  }
  if (rows.length === 0) return;
  const count = await truncateAndInsert("bpc_diagrams", schema.bpcDiagrams, rows);
  log("bpc_diagrams", count);
}

async function loadEnvironmentSnapshots() {
  const rows: { key: string; data: Record<string, unknown>; generatedAt: Date | null }[] = [];

  const matrix = readJson("environment-component-matrix.json") as
    | { metadata?: { generated?: string } }
    | null;
  if (matrix) {
    rows.push({
      key: "matrix",
      data: matrix as Record<string, unknown>,
      generatedAt: matrix.metadata?.generated ? new Date(matrix.metadata.generated) : null,
    });
  }

  const drift = readJson("environment-drift-data.json") as
    | { metadata?: { generated?: string } }
    | null;
  if (drift) {
    rows.push({
      key: "drift",
      data: drift as Record<string, unknown>,
      generatedAt: drift.metadata?.generated ? new Date(drift.metadata.generated) : null,
    });
  }

  if (rows.length === 0) return;
  const count = await truncateAndInsert("environment_snapshots", schema.environmentSnapshots, rows);
  log("environment_snapshots", count);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log(`\nCoE Dashboard ETL Loader`);
  console.log(`Data directory: ${dataDir}\n`);

  if (!existsSync(dataDir)) {
    console.error(`ERROR: Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  const start = Date.now();

  // Core inventory
  console.log("── Core Inventory ──");
  await loadPlugins();
  await loadEntities();
  await loadForms();
  await loadViews();
  await loadWorkflows();
  await loadWebResources();
  await loadApps();
  await loadReports();
  await loadSecurityRoles();
  await loadOptionSets();
  await loadEnvVars();

  // Simple inventory tables
  await loadSimpleInventory("SiteMapInventory.json", "site_maps", schema.siteMaps, "siteMaps", (s) => ({
    name: s.name as string, solution: s.solution as string | undefined,
    areaCount: s.areaCount as number | undefined, totalGroups: s.totalGroups as number | undefined,
    totalSubAreas: s.totalSubAreas as number | undefined, totalEntities: s.totalEntities as number | undefined,
    areas: toArr(s.areas) as unknown[] | undefined, tags: s.tags as Record<string, unknown> | undefined, rawData: s,
  }));
  await loadSimpleInventory("TemplateInventory.json", "templates", schema.templates, "templates", (t) => ({
    id: (t.id || t.title) as string, title: t.title as string,
    description: t.description as string | undefined, templateTypeName: t.templateTypeName as string | undefined,
    solution: t.solution as string | undefined, tags: t.tags as Record<string, unknown> | undefined, rawData: t,
  }));
  await loadSimpleInventory("DashboardInventory.json", "dashboards", schema.dashboards, "dashboards", (d) => ({
    id: (d.id || d.name) as string, name: d.name as string, solution: d.solution as string | undefined,
    isDefault: d.isDefault as boolean | undefined, isTabletEnabled: d.isTabletEnabled as boolean | undefined,
    entityCount: d.entityCount as number | undefined, tags: d.tags as Record<string, unknown> | undefined, rawData: d,
  }));
  await loadSimpleInventory("MobileOfflineInventory.json", "mobile_offline", schema.mobileOffline, "profiles", (m) => ({
    name: (Array.isArray(m.name) ? m.name[0] : m.name) as string,
    solution: m.solution as string | undefined, entityCount: m.entityCount as number | undefined,
    entities: toArr(m.entities) as unknown[] | undefined, tags: m.tags as Record<string, unknown> | undefined, rawData: m,
  }));
  await loadSimpleInventory("PluginStepInventory.json", "plugin_steps", schema.pluginSteps, "pluginSteps", (p) => ({
    id: p.id as string, name: p.name as string, description: p.description as string | undefined,
    className: p.className as string | undefined, shortClassName: p.shortClassName as string | undefined,
    assembly: p.assembly as string | undefined, entity: p.entity as string | undefined,
    message: p.message as string | undefined, stage: p.stage as string | undefined,
    mode: p.mode as string | undefined, rank: p.rank as number | undefined,
    filteringAttributeCount: p.filteringAttributeCount as number | undefined,
    isCustomizable: p.isCustomizable as boolean | undefined, solution: p.solution as string | undefined,
    tags: p.tags as Record<string, unknown> | undefined, rawData: p,
  }));
  await loadSimpleInventory("AppActionInventory.json", "app_actions", schema.appActions, "appActions", (a) => ({
    uniqueName: (a.uniqueName || a.name) as string, name: a.name as string,
    buttonLabel: a.buttonLabel as string | undefined, appModule: a.appModule as string | undefined,
    contextEntity: a.contextEntity as string | undefined, solution: a.solution as string | undefined,
    tags: a.tags as Record<string, unknown> | undefined, rawData: a,
  }));
  await loadSimpleInventory("PCFControlInventory.json", "pcf_controls", schema.pcfControls, "controls", (c) => ({
    name: (c.name || c.displayName) as string, displayName: c.displayName as string | undefined,
    solution: c.solution as string | undefined, tags: c.tags as Record<string, unknown> | undefined, rawData: c,
  }));

  // AI Components (combines three arrays, dedup by id)
  const aiData = readJson("AIComponentInventory.json") as {
    botComponents?: unknown[]; customAPIs?: unknown[]; aiSkillConfigs?: unknown[];
  } | null;
  if (aiData) {
    const all: Record<string, unknown>[] = [
      ...asArray(aiData.botComponents).map((c) => ({ ...c, _componentType: "botComponent" })),
      ...asArray(aiData.customAPIs).map((c) => ({ ...c, _componentType: "customAPI" })),
      ...asArray(aiData.aiSkillConfigs).map((c) => ({ ...c, _componentType: "aiSkillConfig" })),
    ];
    const seen = new Set<string>();
    const rows = all
      .map((c) => ({
        id: (c.schemaName || c.uniqueName || c.name) as string,
        name: (c.name || c.displayName || c.uniqueName || c.schemaName || "unknown") as string,
        uniqueName: c.uniqueName as string | undefined,
        displayName: c.displayName as string | undefined,
        componentType: c._componentType as string,
        parentBot: c.parentBot as string | undefined,
        entity: c.entity as string | undefined,
        solution: c.solution as string | undefined,
        tags: c.tags as Record<string, unknown> | undefined,
        rawData: c,
      }))
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    await truncateAndInsert("ai_components", schema.aiComponents, rows);
    log("ai_components", rows.length);
  }

  // Azure Components (combines three arrays)
  const azData = readJson("AzureComponentInventory.json") as {
    logicApps?: unknown[]; functions?: unknown[]; externalIntegrations?: unknown[];
  } | null;
  if (azData) {
    const all: Record<string, unknown>[] = [
      ...asArray(azData.logicApps).map((c) => ({ ...c, _type: "logicApp" })),
      ...asArray(azData.functions).map((c) => ({ ...c, _type: "function" })),
      ...asArray(azData.externalIntegrations).map((c) => ({ ...c, _type: "externalIntegration" })),
    ];
    const rows = all.map((c) => ({
      name: c.name as string, type: c._type as string,
      trigger: c.trigger as string | undefined, direction: c.direction as string | undefined,
      description: c.description as string | undefined,
      relatedEntity: c.relatedEntity as string | undefined,
      solution: c.solution as string | undefined,
      tags: c.tags as Record<string, unknown> | undefined, rawData: c,
    }));
    await truncateAndInsert("azure_components", schema.azureComponents, rows);
    log("azure_components", rows.length);
  }

  // Relationships
  console.log("\n── Relationships ──");
  await loadRelationships();

  // Derived data
  console.log("\n── Derived Data ──");
  await loadGovernance();
  await loadProcessCatalog();
  await loadEntityColumns();
  await loadSolutions();
  await loadFormDetails();
  await loadViewDetails();
  await loadPluginConfigs();
  await loadFlowComplexity();
  await loadFlowEntityInteractions();
  await loadCanvasAppSources();
  await loadEntityMaps();
  await loadRibbonCustomizations();
  await loadWebResourceCodeAnalysis();
  await loadOrphanedComponents();
  await loadCapabilities();
  await loadEnvironmentSnapshots();
  await loadBpcDiagrams();
  await loadWorkflowDefinitions();

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n── Complete ──`);
  console.log(`  Total rows inserted: ${totalInserted.toLocaleString()}`);
  console.log(`  Duration: ${duration}s\n`);

  await client.end();
}

main().catch((err) => {
  console.error("ETL loader failed:", err);
  process.exit(1);
});
