// Inventory service — queries PostgreSQL and returns enriched items
// Replaces the client-side enrichment.ts pattern with server-side SQL JOINs

import { db } from "@/lib/db";
import { sql, eq, like, or, count, inArray } from "drizzle-orm";
import * as schema from "@/lib/db";
import { INVENTORY_TYPES } from "@/lib/inventory-types";
import { toArray } from "@/lib/utils";

// ─── Table Registry ────────────────────────────────────────────────
// Maps inventory type names to their Drizzle table references + config.
// The keys here must match INVENTORY_TYPES apiKey values — enforced at
// runtime below.

interface TableConfig {
  idField: string;
  nameField: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drizzleTable: any;
}

const TABLE_MAP: Record<string, TableConfig> = {
  plugins:       { drizzleTable: schema.plugins,        idField: "id",          nameField: "name" },
  entities:      { drizzleTable: schema.entities,       idField: "logical_name", nameField: "display_name" },
  forms:         { drizzleTable: schema.forms,          idField: "form_id",     nameField: "name" },
  views:         { drizzleTable: schema.views,          idField: "view_id",     nameField: "name" },
  workflows:     { drizzleTable: schema.workflows,      idField: "id",          nameField: "name" },
  webresources:  { drizzleTable: schema.webResources,   idField: "name",        nameField: "display_name" },
  apps:          { drizzleTable: schema.apps,           idField: "unique_name", nameField: "display_name" },
  reports:       { drizzleTable: schema.reports,        idField: "name",        nameField: "name" },
  securityRoles: { drizzleTable: schema.securityRoles,  idField: "id",          nameField: "name" },
  optionSets:    { drizzleTable: schema.optionSets,     idField: "schema_name", nameField: "display_name" },
  envVars:       { drizzleTable: schema.envVars,        idField: "schema_name", nameField: "display_name" },
  siteMaps:      { drizzleTable: schema.siteMaps,       idField: "name",        nameField: "name" },
  templates:     { drizzleTable: schema.templates,      idField: "id",          nameField: "title" },
  dashboards:    { drizzleTable: schema.dashboards,     idField: "id",          nameField: "name" },
  mobileOffline: { drizzleTable: schema.mobileOffline,  idField: "name",        nameField: "name" },
  aiComponents:  { drizzleTable: schema.aiComponents,   idField: "id",          nameField: "name" },
  pluginSteps:   { drizzleTable: schema.pluginSteps,    idField: "id",          nameField: "name" },
  pcf:           { drizzleTable: schema.pcfControls,    idField: "name",        nameField: "display_name" },
  appActions:    { drizzleTable: schema.appActions,     idField: "unique_name", nameField: "name" },
  azure:         { drizzleTable: schema.azureComponents, idField: "name",       nameField: "name" },
};

// Startup drift check — surfaces mismatches between the frontend registry
// and the backend Drizzle registry at first import rather than at request
// time. Logs a warning and lists diffs; does not throw (tests may stub).
{
  const registryKeys = new Set(INVENTORY_TYPES.map((t) => t.apiKey));
  const tableKeys = new Set(Object.keys(TABLE_MAP));
  const missingInTable = [...registryKeys].filter((k) => !tableKeys.has(k));
  const missingInRegistry = [...tableKeys].filter((k) => !registryKeys.has(k));
  if (missingInTable.length || missingInRegistry.length) {
    console.warn(
      "[inventory-service] INVENTORY_TYPES / TABLE_MAP drift detected. " +
        `Missing in TABLE_MAP: [${missingInTable.join(", ")}]. ` +
        `Missing in INVENTORY_TYPES: [${missingInRegistry.join(", ")}].`,
    );
  }
}

// ─── Query Options ─────────────────────────────────────────────────

export interface ListOptions {
  page?: number;
  limit?: number;
  solution?: string;
  search?: string;
  entity?: string;
}

// ─── List Items ────────────────────────────────────────────────────

export async function listItems(type: string, options: ListOptions = {}) {
  const config = TABLE_MAP[type];
  if (!config) throw new Error(`Unknown inventory type: ${type}`);

  const { page = 1, limit, solution, search, entity } = options;
  const t = config.drizzleTable;

  // Build dynamic where conditions
  const conditions = [];
  if (solution && "solution" in t) {
    conditions.push(eq(t.solution, solution));
  }
  if (entity && "entity" in t) {
    conditions.push(eq(t.entity, entity));
  }
  if (search) {
    const pattern = `%${search}%`;
    const searchConditions = [];
    if (config.nameField in t) searchConditions.push(like(t[config.nameField], pattern));
    if ("name" in t && config.nameField !== "name") searchConditions.push(like(t.name, pattern));
    if ("solution" in t) searchConditions.push(like(t.solution, pattern));
    if (searchConditions.length > 0) conditions.push(or(...searchConditions));
  }

  // Execute query
  const whereClause = conditions.length > 0
    ? sql.join(conditions.map((c) => sql`${c}`), sql` AND `)
    : undefined;

  // No limit → return all matching rows (bounded by table size) so the
  // client-side explorer can filter/search/sort the full set.
  const items = limit != null
    ? await db.select().from(t).where(whereClause).limit(limit).offset((page - 1) * limit)
    : await db.select().from(t).where(whereClause);

  // Get total count for pagination
  const [totalRow] = await db
    .select({ total: count() })
    .from(t)
    .where(whereClause);
  const total = totalRow!.total;

  // Fetch overrides for this page in one query. The overrides table's PK is
  // the composite `${dataKey}:${itemId}` (see saveOverride), so we look up by
  // that synthetic id rather than joining on (data_key, item_id).
  const overrideIds: string[] = [];
  for (const row of items) {
    const id = readId(row as Record<string, unknown>, config.idField);
    if (id) overrideIds.push(`${type}:${id}`);
  }
  const overrideRows = overrideIds.length > 0
    ? await db
        .select()
        .from(schema.overrides)
        .where(inArray(schema.overrides.id, overrideIds))
    : [];
  const overridesByItemId = new Map<string, OverrideRow>(
    overrideRows.map((o) => [
      o.itemId,
      { tags: o.tags ?? null, fields: o.fields ?? null },
    ]),
  );

  return {
    items: items.map((row) => {
      const id = readId(row as Record<string, unknown>, config.idField);
      const ov = id ? overridesByItemId.get(id) : undefined;
      return rowToItem(row as Record<string, unknown>, ov);
    }),
    metadata: {
      type,
      total: Number(total),
      page,
      limit: limit ?? Number(total),
      hasMore: limit != null ? (page - 1) * limit + items.length < Number(total) : false,
    },
  };
}

// ─── Get Single Item ───────────────────────────────────────────────

export async function getItem(type: string, id: string) {
  const config = TABLE_MAP[type];
  if (!config) throw new Error(`Unknown inventory type: ${type}`);

  const t = config.drizzleTable;

  // Use sql template to reference the id column by name
  const [row] = await db
    .select()
    .from(t)
    .where(sql`${sql.identifier(config.idField)} = ${id}`)
    .limit(1);

  if (!row) return null;

  // Fetch this item's override (if any). Override id is `${dataKey}:${itemId}`.
  const [overrideRow] = await db
    .select()
    .from(schema.overrides)
    .where(eq(schema.overrides.id, `${type}:${id}`))
    .limit(1);

  const item = rowToItem(
    row,
    overrideRow
      ? { tags: overrideRow.tags ?? null, fields: overrideRow.fields ?? null }
      : undefined,
  );

  // Enrich with relationships based on type
  if (type === "entities") {
    await enrichEntity(item, id);
  } else if (type === "apps") {
    await enrichApp(item, id);
  } else if (type === "workflows") {
    await enrichWorkflow(item);
  } else if (type === "webresources") {
    await enrichWebResource(item, id);
  } else if (type === "envVars") {
    await enrichEnvVar(item, id);
  } else if (type === "siteMaps") {
    await enrichSiteMap(item, id);
  } else if (type === "dashboards") {
    await enrichDashboard(item, id);
  } else if (type === "forms") {
    await enrichForm(item, id);
  } else if (type === "views") {
    await enrichView(item, id);
  } else if (type === "pluginSteps") {
    await enrichPluginStep(item, id);
  }

  return { item, metadata: { type, id } };
}

// ─── Summary ───────────────────────────────────────────────────────

export async function getSummary() {
  // Per-table counts — parallelized (was 20 sequential round-trips).
  const countEntries = await Promise.all(
    Object.entries(TABLE_MAP).map(async ([type, config]) => {
      const [totalRow] = await db.select({ total: count() }).from(config.drizzleTable);
      return [type, Number(totalRow!.total)] as const;
    }),
  );
  const counts: Record<string, number> = Object.fromEntries(countEntries);

  // Governance score — aggregate severities in SQL instead of scanning the table.
  const severityRows = await db
    .select({ severity: schema.governanceFindings.severity, n: count() })
    .from(schema.governanceFindings)
    .groupBy(schema.governanceFindings.severity);
  const bySeverity: Record<string, number> = {};
  let totalFindings = 0;
  for (const r of severityRows) {
    const n = Number(r.n);
    bySeverity[r.severity] = n;
    totalFindings += n;
  }

  // Last refresh
  const [lastRefresh] = await db
    .select()
    .from(schema.refreshLogs)
    .orderBy(sql`timestamp DESC`)
    .limit(1);

  return {
    counts,
    governance: {
      score: totalFindings > 0 ? Math.max(0, 100 - (bySeverity["high"] || 0) * 10 - (bySeverity["medium"] || 0) * 5 - (bySeverity["warning"] || 0) * 2) : 100,
      totalFindings,
      bySeverity,
    },
    lastRefresh: lastRefresh?.timestamp?.toISOString() || null,
  };
}

// ─── Entity Enrichment (replaces enrichment.ts entity cross-refs) ──

async function enrichEntity(item: Record<string, unknown>, logicalName: string) {
  // Form count + details
  const entityForms = await db
    .select({ formId: schema.forms.formId, name: schema.forms.name, entity: schema.forms.entity, formType: schema.forms.formType })
    .from(schema.forms)
    .innerJoin(schema.relEntityForm, eq(schema.relEntityForm.formId, schema.forms.formId))
    .where(eq(schema.relEntityForm.entityName, logicalName));

  item._relFormCount = entityForms.length;
  item._relFormDetails = entityForms.map((f) => ({
    name: f.name, entity: f.entity, formType: f.formType, formId: f.formId,
  }));

  // View count + details
  const entityViews = await db
    .select({ viewId: schema.views.viewId, name: schema.views.name, entity: schema.views.entity })
    .from(schema.views)
    .innerJoin(schema.relEntityView, eq(schema.relEntityView.viewId, schema.views.viewId))
    .where(eq(schema.relEntityView.entityName, logicalName));

  item._relViewCount = entityViews.length;
  item._relViewDetails = entityViews.map((v) => ({
    name: v.name, entity: v.entity, viewId: v.viewId,
  }));

  // Option set count
  const [osCountRow] = await db
    .select({ osCount: count() })
    .from(schema.relEntityOptionSet)
    .where(eq(schema.relEntityOptionSet.entityName, logicalName));
  item._relOptionSetCount = Number(osCountRow!.osCount);

  // Plugin step count + details
  const entitySteps = await db
    .select({ id: schema.pluginSteps.id, name: schema.pluginSteps.name, entity: schema.pluginSteps.entity, message: schema.pluginSteps.message })
    .from(schema.pluginSteps)
    .innerJoin(schema.relEntityPluginStep, eq(schema.relEntityPluginStep.pluginStepId, schema.pluginSteps.id))
    .where(eq(schema.relEntityPluginStep.entityName, logicalName));

  item._relPluginStepCount = entitySteps.length;
  item._relPluginStepDetails = entitySteps.map((s) => ({
    name: s.name, entity: s.entity || "", message: s.message || "", id: s.id,
  }));

  // Apps that reference this entity
  const entityApps = await db
    .select({ uniqueName: schema.apps.uniqueName, displayName: schema.apps.displayName })
    .from(schema.apps)
    .innerJoin(schema.relAppEntity, eq(schema.relAppEntity.appUniqueName, schema.apps.uniqueName))
    .where(eq(schema.relAppEntity.entityName, logicalName));

  item._relApps = entityApps.map((a) => a.displayName || a.uniqueName);

  // Entity columns
  const [colInfo] = await db
    .select()
    .from(schema.entityColumns)
    .where(eq(schema.entityColumns.entityName, logicalName))
    .limit(1);

  if (colInfo) {
    item._colTotal = colInfo.totalColumns;
    item._colCustom = colInfo.customColumns;
    item._colOOB = colInfo.oobColumns;
    item._columns = toArray(colInfo.columns);
    item._entitySettings = colInfo.settings;
  }

  // Flow interactions
  const flowInteractions = await db
    .select()
    .from(schema.flowEntityInteractions)
    .where(eq(schema.flowEntityInteractions.entityName, logicalName));

  if (flowInteractions.length > 0) {
    item._relFlows = flowInteractions.map((f) => ({
      name: f.flowName,
      operations: toArray<string>(f.operations),
    }));
  }

  // Entity-to-entity structural relationships (1:N, N:N, lookup fields)
  const entityRels = await db
    .select()
    .from(schema.relEntityEntity)
    .where(or(
      eq(schema.relEntityEntity.fromEntity, logicalName),
      eq(schema.relEntityEntity.toEntity, logicalName),
    ));

  if (entityRels.length > 0) {
    item._relEntityRels = entityRels.map((r) => ({
      name: r.name,
      type: r.type,
      fromEntity: r.fromEntity,
      toEntity: r.toEntity,
      lookupField: r.lookupField,
      cascadeDelete: r.cascadeDelete,
    }));
  }

  // Entity map field mappings (data mapping between entities)
  const [entityMapsFrom, entityMapsTo] = await Promise.all([
    db.select().from(schema.entityMaps).where(eq(schema.entityMaps.sourceEntity, logicalName)),
    db.select().from(schema.entityMaps).where(eq(schema.entityMaps.targetEntity, logicalName)),
  ]);

  if (entityMapsFrom.length > 0) {
    item._relEntityMapsFrom = entityMapsFrom.map((m) => ({
      target: m.targetEntity,
      fieldCount: m.fieldCount || 0,
      fieldMappings: m.fieldMappings,
    }));
  }
  if (entityMapsTo.length > 0) {
    item._relEntityMapsTo = entityMapsTo.map((m) => ({
      source: m.sourceEntity,
      fieldCount: m.fieldCount || 0,
      fieldMappings: m.fieldMappings,
    }));
  }

  // Canvas apps referencing this entity — project only the columns used below.
  const canvasApps = await db
    .select({
      name: schema.canvasAppSources.name,
      displayName: schema.canvasAppSources.displayName,
      entities: schema.canvasAppSources.entities,
    })
    .from(schema.canvasAppSources);
  const relevantCanvas = canvasApps.filter((ca) => {
    const entities = (ca.entities as Array<Record<string, unknown>>) || [];
    return entities.some((e) => (e.logicalName as string)?.toLowerCase() === logicalName.toLowerCase());
  });
  if (relevantCanvas.length > 0) {
    item._relCanvasApps = relevantCanvas.map((ca) => ({
      appName: ca.name,
      displayName: ca.displayName || ca.name,
      friendlyName: ca.displayName || ca.name,
    }));
  }

  // Subgrids referencing this entity as a target — scan tabs across all forms,
  // projecting only formId + tabs (avoids loading every form's jsHandlers blob).
  const formTabs = await db
    .select({ formId: schema.formDetails.formId, tabs: schema.formDetails.tabs })
    .from(schema.formDetails);
  const subgrids: { formId: string; targetEntity: string; label: string; tab: string }[] = [];
  for (const fd of formTabs) {
    const tabs = (fd.tabs as Array<Record<string, unknown>>) || [];
    for (const tab of tabs) {
      const sections = (tab.sections as Array<Record<string, unknown>>) || [];
      for (const section of sections) {
        const fields = (section.fields as Array<Record<string, unknown>>) || [];
        for (const field of fields) {
          if ((field.type as string) === "subgrid" && (field.targetEntity as string)?.toLowerCase() === logicalName.toLowerCase()) {
            subgrids.push({
              formId: fd.formId,
              targetEntity: field.targetEntity as string,
              label: (field.label as string) || "",
              tab: (tab.label as string) || "",
            });
          }
        }
      }
    }
  }
  if (subgrids.length > 0) item._relSubgrids = subgrids;

  // JS handlers on this entity's forms — scope the form_details read to them
  // instead of re-scanning every form.
  const entityFormIds = await db.select({ formId: schema.forms.formId })
    .from(schema.forms)
    .where(eq(schema.forms.entity, logicalName));
  const formIds = entityFormIds.map((f) => f.formId);
  const jsHandlers: { formId: string; event: string; library: string; function: string }[] = [];
  if (formIds.length > 0) {
    const handlerForms = await db
      .select({ formId: schema.formDetails.formId, jsHandlers: schema.formDetails.jsHandlers })
      .from(schema.formDetails)
      .where(inArray(schema.formDetails.formId, formIds));
    for (const fd of handlerForms) {
      const handlers = (fd.jsHandlers as Array<Record<string, unknown>>) || [];
      for (const h of handlers) {
        jsHandlers.push({
          formId: fd.formId,
          event: h.event as string,
          library: h.library as string,
          function: h.function as string,
        });
      }
    }
  }
  if (jsHandlers.length > 0) item._relJsHandlers = jsHandlers;

  // Plugin rules (rules engine) tied to plugin steps on this entity
  const entityStepIds = await db
    .select({ pluginStepId: schema.relEntityPluginStep.pluginStepId })
    .from(schema.relEntityPluginStep)
    .where(eq(schema.relEntityPluginStep.entityName, logicalName));
  const stepIdSet = new Set(entityStepIds.map((s) => s.pluginStepId));
  if (stepIdSet.size > 0) {
    const relevantConfigs = await db
      .select()
      .from(schema.pluginConfigs)
      .where(inArray(schema.pluginConfigs.stepId, [...stepIdSet]));
    if (relevantConfigs.length > 0) {
      item._relPluginRules = relevantConfigs.map((c) => ({
        stepName: c.stepName,
        ruleCount: c.ruleCount || 0,
        isRulesEngine: c.isRulesEngine || false,
        rules: c.rules as Array<{ attribute: string; dataType: string; deployForm: boolean; deployPlugin: boolean }> | undefined,
      }));
    }
  }

  // Ribbon customizations for this entity
  const ribbons = await db
    .select()
    .from(schema.ribbonCustomizations)
    .where(eq(schema.ribbonCustomizations.entity, logicalName));
  if (ribbons.length > 0) {
    item._relRibbon = ribbons.map((r) => ({
      type: r.type,
      id: r.ribbonId,
      solution: r.solution || "",
    }));
  }

  // Solution footprint — which solutions reference this entity via any component
  const solutionSet = new Set<string>();
  const [formSols, viewSols, stepSols] = await Promise.all([
    db.select({ solution: schema.forms.solution }).from(schema.forms).where(eq(schema.forms.entity, logicalName)),
    db.select({ solution: schema.views.solution }).from(schema.views).where(eq(schema.views.entity, logicalName)),
    db.select({ solution: schema.pluginSteps.solution }).from(schema.pluginSteps).where(eq(schema.pluginSteps.entity, logicalName)),
  ]);
  for (const r of [...formSols, ...viewSols, ...stepSols]) if (r.solution) solutionSet.add(r.solution);
  if (solutionSet.size > 0) item._relSolutionFootprint = Array.from(solutionSet).sort();

  // Option sets — names of option sets where this entity is referenced
  const entityOptionSets = await db
    .select({ schemaName: schema.optionSets.schemaName, displayName: schema.optionSets.displayName })
    .from(schema.optionSets)
    .innerJoin(schema.relEntityOptionSet, eq(schema.relEntityOptionSet.optionSetSchema, schema.optionSets.schemaName))
    .where(eq(schema.relEntityOptionSet.entityName, logicalName));
  if (entityOptionSets.length > 0) {
    item._relOptionSets = entityOptionSets.map((o) => o.displayName || o.schemaName);
  }

  // Workflow names — classic workflows link to their entity via workflows.entity
  // directly. The rel_entity_workflow junction exists but is unpopulated because
  // the PS enrichment doesn't emit byEntity.workflows in RelationshipIndex.json.
  // workflows.entity may be stored with mixed case ("Account" vs "account"),
  // so compare case-insensitively.
  const entityWorkflows = await db
    .select({ name: schema.workflows.name })
    .from(schema.workflows)
    .where(sql`LOWER(${schema.workflows.entity}) = LOWER(${logicalName})`);
  if (entityWorkflows.length > 0) {
    item._relWorkflowNames = entityWorkflows.map((w) => w.name);
  }
}

// ─── App Enrichment ────────────────────────────────────────────────

async function enrichApp(item: Record<string, unknown>, uniqueName: string) {
  // Entities
  const appEntities = await db
    .select({ logicalName: schema.entities.logicalName, displayName: schema.entities.displayName })
    .from(schema.entities)
    .innerJoin(schema.relAppEntity, eq(schema.relAppEntity.entityName, schema.entities.logicalName))
    .where(eq(schema.relAppEntity.appUniqueName, uniqueName));

  item._relEntityDetails = appEntities.map((e) => ({
    logicalName: e.logicalName,
    displayName: e.displayName || e.logicalName,
    iconKey: "entity",
    searchName: e.logicalName,
  }));

  // Dashboards
  const appDashboards = await db
    .select()
    .from(schema.relAppDashboard)
    .where(eq(schema.relAppDashboard.appUniqueName, uniqueName));

  item._relDashboards = appDashboards.map((d) => d.dashboardName || d.dashboardId);
  item._relDashboardDetails = appDashboards.map((d) => ({
    name: d.dashboardName || d.dashboardId,
    subtitle: "Dashboard",
    searchName: d.dashboardName || d.dashboardId,
    itemId: d.dashboardId,
  }));

  // Web Resources
  const appWr = await db
    .select()
    .from(schema.relAppWebResource)
    .where(eq(schema.relAppWebResource.appUniqueName, uniqueName));

  item._relWebResources = appWr.map((w) => w.webResourceName);
  item._relWebResourceDetails = appWr.map((w) => ({
    name: w.webResourceName,
    subtitle: "Web Resource",
    searchName: w.webResourceName,
  }));

  // Site Maps
  const appSm = await db
    .select()
    .from(schema.relAppSiteMap)
    .where(eq(schema.relAppSiteMap.appUniqueName, uniqueName));

  item._relSiteMaps = appSm.map((s) => s.siteMapName);
}

// ─── Workflow Enrichment ───────────────────────────────────────────

async function enrichWorkflow(item: Record<string, unknown>) {
  // The rel_workflow_env_var table uses cleaned workflow names (no spaces/punctuation)
  // not GUIDs. Match against both raw name and a normalized version.
  const name = (item.name as string) || "";
  const normalizedName = name.replace(/[\s|_-]+/g, "");

  // Environment variables — match by normalized name, pushed to SQL so it hits
  // idx_rel_wf_ev_workflow instead of scanning the whole junction table.
  // Escape LIKE metachars in the prefix so it behaves like startsWith().
  const evPrefix = normalizedName.substring(0, 50).replace(/[\\%_]/g, (c) => `\\${c}`);
  const wfEnvVars = await db
    .select()
    .from(schema.relWorkflowEnvVar)
    .where(or(
      eq(schema.relWorkflowEnvVar.workflowName, name),
      eq(schema.relWorkflowEnvVar.workflowName, normalizedName),
      like(schema.relWorkflowEnvVar.workflowName, `${evPrefix}%`),
    ));
  if (wfEnvVars.length > 0) {
    item._relEnvVars = wfEnvVars.map((e) => e.envVarSchema);
  }

  // Flow complexity
  const [complexity] = await db
    .select()
    .from(schema.flowComplexity)
    .where(eq(schema.flowComplexity.name, name))
    .limit(1);

  if (complexity) {
    item._complexity = complexity.complexity;
    item._complexityScore = complexity.complexityScore;
    item._totalActions = complexity.totalActions;
    item._maxDepth = complexity.maxDepth;
    item._hasErrorHandling = complexity.hasErrorHandling;
    item._metrics = complexity.metrics;
    item._httpUrls = complexity.httpUrls;
  }

  // Entities this flow/workflow touches
  const flowEntities = await db
    .select()
    .from(schema.flowEntityInteractions)
    .where(eq(schema.flowEntityInteractions.flowName, name));
  if (flowEntities.length > 0) {
    item._relFlowEntities = flowEntities.map((fe) => ({
      entity: fe.entityName,
      operations: toArray<string>(fe.operations),
    }));
  }
}

// ─── Web Resource Enrichment ───────────────────────────────────────

async function enrichWebResource(item: Record<string, unknown>, name: string) {
  // Apps that reference this web resource
  const apps = await db
    .select({ uniqueName: schema.apps.uniqueName, displayName: schema.apps.displayName })
    .from(schema.apps)
    .innerJoin(schema.relAppWebResource, eq(schema.relAppWebResource.appUniqueName, schema.apps.uniqueName))
    .where(eq(schema.relAppWebResource.webResourceName, name));
  if (apps.length > 0) {
    item._relApps = apps.map((a) => a.displayName || a.uniqueName);
  }

  // Code analysis (line count, functions, API calls, etc.)
  const [code] = await db
    .select()
    .from(schema.webResourceCodeAnalysis)
    .where(eq(schema.webResourceCodeAnalysis.name, name))
    .limit(1);
  if (code) {
    item._codeLineCount = code.lineCount;
    item._codeFunctionCount = code.functionCount;
    item._codeFunctions = toArray(code.functions);
    item._codeApiCalls = toArray(code.apiCalls);
    item._codeDeprecatedCount = code.deprecatedCount;
    item._codeDeprecated = toArray(code.deprecated);
    item._codeFieldRefs = toArray(code.fieldRefs);
    item._codeGovernanceFlags = toArray(code.governanceFlags);
    item._isRulesEngine = code.isRulesEngine;
  }

  // Rules-engine linkage: `.hslrules` web resources are consumed by
  // plugin steps named `RulesEngine Action for {Message} of {entity} (Namespace={ns})`.
  // Parse entity + namespace from the file path and match against plugin_configs + plugin_steps.
  // Pattern: `<prefix>/entityrules/{namespace}/{entity}.hslrules` (also `.hslrules.data.xml`
  // and companion `_{GUID}.js` wrappers live in the same folder).
  const rulesMatch = /entityrules\/([^/]+)\/([^/]+?)(?:\.hslrules(?:\.data\.xml)?|_[a-f0-9]{32}\.js|_[a-f0-9-]{36}\.js)$/i.exec(name);
  if (rulesMatch) {
    const namespace = rulesMatch[1]!;
    const entity = rulesMatch[2]!;

    // Plugin configs on this entity whose step name references the matching namespace
    const candidateConfigs = await db
      .select()
      .from(schema.pluginConfigs)
      .where(eq(schema.pluginConfigs.entity, entity));
    const nsMarker = `Namespace=${namespace}`;
    const matchedConfigs = candidateConfigs.filter(
      (c) => c.isRulesEngine && (c.stepName || "").includes(nsMarker),
    );

    if (matchedConfigs.length > 0) {
      const stepIds = matchedConfigs.map((c) => c.stepId);
      const steps = await db
        .select({
          id: schema.pluginSteps.id,
          name: schema.pluginSteps.name,
          entity: schema.pluginSteps.entity,
          message: schema.pluginSteps.message,
        })
        .from(schema.pluginSteps)
        .where(inArray(schema.pluginSteps.id, stepIds));

      const stepMap = new Map(steps.map((s) => [s.id, s]));
      item._relPluginStepDetails = matchedConfigs.map((c) => {
        const s = stepMap.get(c.stepId);
        return {
          id: c.stepId,
          name: s?.name || c.stepName,
          entity: s?.entity || c.entity || "",
          message: s?.message || "",
          ruleCount: c.ruleCount || 0,
          isRulesEngine: true,
          rules: toArray(c.rules),
        };
      });
      item._relPluginStepCount = matchedConfigs.length;
    }
  }
}

// ─── Env Var Enrichment ────────────────────────────────────────────

async function enrichEnvVar(item: Record<string, unknown>, schemaName: string) {
  const wfRows = await db
    .select({ workflowName: schema.relWorkflowEnvVar.workflowName })
    .from(schema.relWorkflowEnvVar)
    .where(eq(schema.relWorkflowEnvVar.envVarSchema, schemaName));
  if (wfRows.length > 0) {
    item._relWorkflows = wfRows.map((r) => r.workflowName);
  }
}

// ─── Site Map Enrichment ───────────────────────────────────────────

async function enrichSiteMap(item: Record<string, unknown>, name: string) {
  const apps = await db
    .select({ uniqueName: schema.apps.uniqueName, displayName: schema.apps.displayName })
    .from(schema.apps)
    .innerJoin(schema.relAppSiteMap, eq(schema.relAppSiteMap.appUniqueName, schema.apps.uniqueName))
    .where(eq(schema.relAppSiteMap.siteMapName, name));
  if (apps.length > 0) {
    item._relApps = apps.map((a) => a.displayName || a.uniqueName);
  }
}

// ─── Dashboard Enrichment ──────────────────────────────────────────

async function enrichDashboard(item: Record<string, unknown>, id: string) {
  const apps = await db
    .select({ uniqueName: schema.apps.uniqueName, displayName: schema.apps.displayName })
    .from(schema.apps)
    .innerJoin(schema.relAppDashboard, eq(schema.relAppDashboard.appUniqueName, schema.apps.uniqueName))
    .where(eq(schema.relAppDashboard.dashboardId, id));
  if (apps.length > 0) {
    item._relApps = apps.map((a) => a.displayName || a.uniqueName);
  }
}

// ─── Form Enrichment ───────────────────────────────────────────────

async function enrichForm(item: Record<string, unknown>, formId: string) {
  // Form detail (tabs, sections, fields, subgrids, JS handlers)
  const [fd] = await db
    .select()
    .from(schema.formDetails)
    .where(eq(schema.formDetails.formId, formId))
    .limit(1);
  if (fd) {
    item._tabCount = fd.tabCount;
    item._totalFields = fd.totalFields;
    item._jsHandlerCount = fd.jsHandlerCount;
    item._subgridCount = fd.subgridCount;
    item._tabs = toArray(fd.tabs);
    item._jsHandlers = toArray(fd.jsHandlers);
  }

  // JS library web resources attached to this form
  const libs = await db
    .select({ libraryName: schema.relFormJsLibrary.libraryName })
    .from(schema.relFormJsLibrary)
    .where(eq(schema.relFormJsLibrary.formId, formId));
  if (libs.length > 0) {
    item._relJsLibraries = libs.map((l) => l.libraryName);
  }
}

// ─── View Enrichment ───────────────────────────────────────────────

async function enrichView(item: Record<string, unknown>, viewId: string) {
  const [vd] = await db
    .select()
    .from(schema.viewDetails)
    .where(eq(schema.viewDetails.viewId, viewId))
    .limit(1);
  if (vd) {
    // UI reads these nested under _viewDetails (not as flat _linkedEntities, etc).
    item._viewDetails = {
      queryType: vd.queryType,
      isDefault: vd.isDefault,
      isQuickFind: vd.isQuickFind,
      columnCount: vd.columnCount,
      filterCount: vd.filterCount,
      linkedEntityCount: vd.linkedEntityCount,
      columns: toArray(vd.columns),
      filters: toArray(vd.filters),
      linkedEntities: toArray(vd.linkedEntities),
      sortFields: toArray(vd.sortFields),
    };
  }
}

async function enrichPluginStep(item: Record<string, unknown>, stepId: string) {
  // Rules-engine plugin steps attach per-attribute rules via plugin_configs.
  // The UI renders these as "Field Rules (N)" in the step detail view.
  const [cfg] = await db
    .select()
    .from(schema.pluginConfigs)
    .where(eq(schema.pluginConfigs.stepId, stepId))
    .limit(1);
  if (cfg?.rules && Array.isArray(cfg.rules) && cfg.rules.length > 0) {
    item._businessRules = cfg.rules;
    item._isRulesEngine = cfg.isRulesEngine;
  }
}

// ─── Row Mapper ────────────────────────────────────────────────────

type OverrideRow = {
  tags: Record<string, unknown> | null;
  fields: Record<string, unknown> | null;
};

function rowToItem(
  row: Record<string, unknown>,
  override?: OverrideRow,
): Record<string, unknown> {
  // Merge rawData blob with typed columns, typed columns take precedence for tags
  const rawData = (row.raw_data || row.rawData || {}) as Record<string, unknown>;
  const baseTags = row.tags || rawData.tags;

  // Build the item from rawData (full fidelity) with typed column overrides
  const item = { ...rawData };

  // Spread override.fields (user-saved businessLogic, notes, etc.) on top.
  // Override wins over both rawData and typed columns.
  if (override?.fields) Object.assign(item, override.fields);

  // Tags precedence: override.tags > row.tags > rawData.tags
  const tags = override?.tags ?? baseTags;
  if (tags) item.tags = tags;

  return item;
}

// idField in TABLE_MAP is the DB column (snake_case); drizzle returns rows
// keyed by the JS property name (camelCase). Try camelCase first, fall back to
// the snake form for safety.
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function readId(row: Record<string, unknown>, idField: string): string | null {
  const camel = snakeToCamel(idField);
  const v = row[camel] ?? row[idField];
  return v == null ? null : String(v);
}

// ─── Exports ───────────────────────────────────────────────────────

