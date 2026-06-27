import { db } from "@/lib/db";
import * as schema from "@/lib/db";

export async function GET() {
  const orphans = await db.select().from(schema.orphanedComponents);

  const byType: Record<string, Array<Record<string, unknown>>> = {};
  const bySeverity: Record<string, number> = {};
  for (const o of orphans) {
    if (!byType[o.type]) byType[o.type] = [];
    byType[o.type]!.push(o);
    if (o.severity) bySeverity[o.severity] = (bySeverity[o.severity] || 0) + 1;
  }

  return Response.json({
    metadata: {
      total: orphans.length,
      byType: Object.fromEntries(
        Object.entries(byType).map(([type, items]) => [type, items.length]),
      ),
      bySeverity,
    },
    orphans,
    byType,
  });
}
