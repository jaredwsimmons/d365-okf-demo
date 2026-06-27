import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db";

const TABLES = [
  { table: schema.plugins,       type: "Plugin",       nameCol: "name",         idCol: "id" },
  { table: schema.pluginSteps,   type: "PluginStep",   nameCol: "name",         idCol: "id" },
  { table: schema.forms,         type: "Form",         nameCol: "name",         idCol: "form_id" },
  { table: schema.views,         type: "View",         nameCol: "name",         idCol: "view_id" },
  { table: schema.workflows,     type: "Workflow",     nameCol: "name",         idCol: "id" },
  { table: schema.webResources,  type: "WebResource",  nameCol: "name",         idCol: "name" },
  { table: schema.apps,          type: "App",          nameCol: "display_name", idCol: "unique_name" },
  { table: schema.securityRoles, type: "SecurityRole", nameCol: "name",         idCol: "id" },
  { table: schema.optionSets,    type: "OptionSet",    nameCol: "display_name", idCol: "schema_name" },
  { table: schema.reports,       type: "Report",       nameCol: "name",         idCol: "name" },
  { table: schema.envVars,       type: "EnvVar",       nameCol: "display_name", idCol: "schema_name" },
  { table: schema.dashboards,    type: "Dashboard",    nameCol: "name",         idCol: "id" },
  { table: schema.templates,     type: "Template",     nameCol: "title",        idCol: "id" },
  { table: schema.aiComponents,  type: "AIComponent",  nameCol: "name",         idCol: "id" },
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ solutionName: string }> },
) {
  const { solutionName } = await params;

  const components: { name: string; type: string; id: string; tags?: Record<string, unknown> }[] = [];

  for (const { table, type, nameCol, idCol } of TABLES) {
    const { rows } = await db.execute(
      sql`SELECT ${sql.identifier(nameCol)} as name, ${sql.identifier(idCol)} as id, tags FROM ${table} WHERE solution = ${solutionName}`,
    );

    for (const row of rows as unknown as Array<{ name: string; id: string; tags: Record<string, unknown> }>) {
      components.push({
        name: row.name || row.id,
        type,
        id: row.id,
        tags: row.tags || undefined,
      });
    }
  }

  components.sort((a, b) => a.name.localeCompare(b.name));

  return Response.json({ solution: solutionName, total: components.length, components });
}
