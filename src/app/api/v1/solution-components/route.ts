import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db";

const TABLES = [
  { table: schema.plugins,       type: "Plugin" },
  { table: schema.pluginSteps,   type: "PluginStep" },
  { table: schema.forms,         type: "Form" },
  { table: schema.views,         type: "View" },
  { table: schema.workflows,     type: "Workflow" },
  { table: schema.webResources,  type: "WebResource" },
  { table: schema.apps,          type: "App" },
  { table: schema.securityRoles, type: "SecurityRole" },
  { table: schema.optionSets,    type: "OptionSet" },
  { table: schema.reports,       type: "Report" },
  { table: schema.envVars,       type: "EnvVar" },
  { table: schema.dashboards,    type: "Dashboard" },
  { table: schema.templates,     type: "Template" },
  { table: schema.aiComponents,  type: "AIComponent" },
];

export async function GET() {
  const counts: { solution: string; type: string; count: number }[] = [];

  for (const { table, type } of TABLES) {
    const rows = await db
      .select({ solution: table.solution, count: sql<number>`count(*)` })
      .from(table)
      .where(sql`solution IS NOT NULL`)
      .groupBy(table.solution);

    for (const row of rows) {
      if (row.solution) {
        counts.push({ solution: row.solution, type, count: Number(row.count) });
      }
    }
  }

  const bySolution: Record<string, { total: number; byType: Record<string, number> }> = {};
  for (const { solution, type, count } of counts) {
    if (!bySolution[solution]) bySolution[solution] = { total: 0, byType: {} };
    bySolution[solution].total += count;
    bySolution[solution].byType[type] = count;
  }

  return Response.json({ bySolution, totalSolutions: Object.keys(bySolution).length });
}
