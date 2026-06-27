import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db";

const TAGGABLE_TABLES = [
  { table: schema.plugins,       type: "Plugin",       nameCol: "name",         idCol: "id" },
  { table: schema.pluginSteps,   type: "PluginStep",   nameCol: "name",         idCol: "id" },
  { table: schema.forms,         type: "Form",         nameCol: "name",         idCol: "form_id" },
  { table: schema.views,         type: "View",         nameCol: "name",         idCol: "view_id" },
  { table: schema.workflows,     type: "Workflow",     nameCol: "name",         idCol: "id" },
  { table: schema.webResources,  type: "WebResource",  nameCol: "name",         idCol: "name" },
  { table: schema.apps,          type: "App",          nameCol: "display_name", idCol: "unique_name" },
  { table: schema.securityRoles, type: "SecurityRole", nameCol: "name",         idCol: "id" },
  { table: schema.entities,      type: "Entity",       nameCol: "display_name", idCol: "logical_name" },
];

export async function GET() {
  const results: { name: string; type: string; id: string; solution: string | null }[] = [];

  for (const { table, type, nameCol, idCol } of TAGGABLE_TABLES) {
    const { rows } = await db.execute(
      sql`SELECT ${sql.identifier(nameCol)} as name, ${sql.identifier(idCol)} as id, solution FROM ${table} WHERE tags IS NULL OR tags->>'processCatalogL1' IS NULL OR tags->>'processCatalogL1' = ''`,
    );
    for (const row of rows as unknown as Array<{ name: string; id: string; solution: string }>) {
      results.push({ name: row.name || row.id, type, id: row.id, solution: row.solution });
    }
  }

  return Response.json({
    total: results.length,
    byType: results.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    items: results,
  });
}
