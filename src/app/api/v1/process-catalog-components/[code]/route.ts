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
  { table: schema.entities,      type: "Entity",       nameCol: "display_name", idCol: "logical_name" },
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  // Determine level from code format: "95.00" = L1, "95.25" = L2, "95.25.100" = L3
  const parts = code.split(".");
  let tagField: string;
  if (parts.length >= 3) tagField = "processCatalogL3";
  else if (parts.length === 2 && parts[1] !== "00") tagField = "processCatalogL2";
  else tagField = "processCatalogL1";

  const components: { name: string; type: string; id: string; solution?: string; tags?: Record<string, unknown> }[] = [];

  for (const { table, type, nameCol, idCol } of TABLES) {
    const { rows } = await db.execute(
      sql`SELECT ${sql.identifier(nameCol)} as name, ${sql.identifier(idCol)} as id, solution, tags
          FROM ${table}
          WHERE tags->>'${sql.raw(tagField)}' LIKE ${code + "%"}`,
    );

    for (const row of rows as unknown as Array<{ name: string; id: string; solution: string; tags: Record<string, unknown> }>) {
      components.push({
        name: row.name || row.id,
        type,
        id: row.id,
        solution: row.solution,
        tags: row.tags,
      });
    }
  }

  components.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  return Response.json({ code, tagField, total: components.length, components });
}
