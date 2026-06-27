import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db";

interface SearchResult {
  name: string;
  type: string;
  tabId: string;
  searchName: string;
  sub?: string;
  itemId?: string;
}

const SEARCH_TABLES = [
  { table: schema.entities,        nameCol: "display_name", idCol: "logical_name", type: "Entity",         tabId: "entities",      subCol: "solution" },
  { table: schema.plugins,         nameCol: "name",         idCol: "id",           type: "Plugin",         tabId: "plugins",       subCol: "solution" },
  { table: schema.pluginSteps,     nameCol: "name",         idCol: "id",           type: "PluginStep",     tabId: "pluginsteps",   subCol: "solution" },
  { table: schema.forms,           nameCol: "name",         idCol: "form_id",      type: "Form",           tabId: "forms",         subCol: "entity" },
  { table: schema.views,           nameCol: "name",         idCol: "view_id",      type: "View",           tabId: "views",         subCol: "entity" },
  { table: schema.workflows,       nameCol: "name",         idCol: "id",           type: "Workflow",       tabId: "workflows",     subCol: "solution" },
  { table: schema.webResources,    nameCol: "name",         idCol: "name",         type: "WebResource",    tabId: "webresources",  subCol: "solution" },
  { table: schema.apps,            nameCol: "display_name", idCol: "unique_name",  type: "App",            tabId: "apps",          subCol: "app_type" },
  { table: schema.securityRoles,   nameCol: "name",         idCol: "id",           type: "SecurityRole",   tabId: "security",      subCol: "category" },
  { table: schema.optionSets,      nameCol: "display_name", idCol: "schema_name",  type: "OptionSet",      tabId: "optionsets",    subCol: "solution" },
  { table: schema.envVars,         nameCol: "display_name", idCol: "schema_name",  type: "EnvVar",         tabId: "envvars",       subCol: "solution" },
  { table: schema.reports,         nameCol: "name",         idCol: "name",         type: "Report",         tabId: "reports",       subCol: "solution" },
  { table: schema.aiComponents,    nameCol: "name",         idCol: "id",           type: "AIComponent",    tabId: "aicomponents",  subCol: "component_type" },
  { table: schema.dashboards,      nameCol: "name",         idCol: "id",           type: "Dashboard",      tabId: "dashboards",    subCol: "solution" },
  { table: schema.templates,       nameCol: "title",        idCol: "id",           type: "Template",       tabId: "templates",     subCol: "solution" },
  { table: schema.siteMaps,        nameCol: "name",         idCol: "name",         type: "SiteMap",        tabId: "sitemaps",      subCol: "solution" },
  { table: schema.mobileOffline,   nameCol: "name",         idCol: "name",         type: "MobileOffline",  tabId: "mobileoffline", subCol: "solution" },
  { table: schema.pcfControls,     nameCol: "display_name", idCol: "name",         type: "PcfControl",     tabId: "pcf",           subCol: "solution" },
  { table: schema.appActions,      nameCol: "button_label", idCol: "unique_name",  type: "AppAction",      tabId: "appactions",    subCol: "app_module" },
  { table: schema.azureComponents, nameCol: "name",         idCol: "name",         type: "AzureComponent", tabId: "azure",         subCol: "type" },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  if (!q) {
    let total = 0;
    for (const { table } of SEARCH_TABLES) {
      const [row] = await db.select({ count: sql<number>`count(*)` }).from(table);
      total += Number(row!.count);
    }
    return Response.json({ results: [], total });
  }

  const pattern = `%${q}%`;
  const results: SearchResult[] = [];

  for (const { table, nameCol, idCol, type, tabId, subCol } of SEARCH_TABLES) {
    if (results.length >= limit) break;

    const remaining = limit - results.length;
    const { rows } = await db.execute(
      sql`SELECT ${sql.identifier(nameCol)} as name, ${sql.identifier(idCol)} as id, ${sql.identifier(subCol)} as sub FROM ${table} WHERE ${sql.identifier(nameCol)} ILIKE ${pattern} OR ${sql.identifier(idCol)} ILIKE ${pattern} LIMIT ${remaining}`,
    );

    for (const row of rows as unknown as Array<{ name: string; id: string; sub: string }>) {
      results.push({
        name: row.name || row.id,
        type,
        tabId,
        searchName: row.id,
        itemId: row.id,
        sub: row.sub || undefined,
      });
    }
  }

  return Response.json({ results, total: results.length });
}
