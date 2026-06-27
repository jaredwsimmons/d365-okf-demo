import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db";

const TABLES = [
  schema.plugins, schema.pluginSteps, schema.forms, schema.views,
  schema.workflows, schema.webResources, schema.apps,
  schema.securityRoles, schema.optionSets, schema.reports,
  schema.envVars, schema.aiComponents,
];

export async function GET() {
  const byL1: Record<string, number> = {};
  const byL2: Record<string, number> = {};
  const byL3: Record<string, number> = {};

  for (const table of TABLES) {
    const { rows } = await db.execute(
      sql`SELECT
        tags->>'processCatalogL1' as l1,
        tags->>'processCatalogL2' as l2,
        tags->>'processCatalogL3' as l3,
        COUNT(*) as cnt
      FROM ${table}
      WHERE tags->>'processCatalogL1' IS NOT NULL AND tags->>'processCatalogL1' != ''
      GROUP BY tags->>'processCatalogL1', tags->>'processCatalogL2', tags->>'processCatalogL3'`,
    );

    for (const row of rows as unknown as Array<{ l1: string; l2: string; l3: string; cnt: string }>) {
      if (row.l1) byL1[row.l1] = (byL1[row.l1] || 0) + Number(row.cnt);
      if (row.l2) byL2[row.l2] = (byL2[row.l2] || 0) + Number(row.cnt);
      if (row.l3) byL3[row.l3] = (byL3[row.l3] || 0) + Number(row.cnt);
    }
  }

  return Response.json({
    byL1, byL2, byL3,
    totalTagged: Object.values(byL1).reduce((s, n) => s + n, 0),
  });
}
