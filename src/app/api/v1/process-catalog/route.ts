import { db } from "@/lib/db";
import * as schema from "@/lib/db";

export async function GET() {
  const all = await db.select().from(schema.processCatalog);

  const byLevel: Record<number, Record<string, unknown>[]> = {};
  for (const p of all) {
    if (!byLevel[p.level]) byLevel[p.level] = [];
    const item = { code: p.code, title: p.title, ...(p.rawData as Record<string, unknown> || {}) };
    byLevel[p.level]!.push(item);
  }

  const l1Lookup: Record<string, string> = {};
  const l2Lookup: Record<string, string> = {};
  const l3Lookup: Record<string, string> = {};
  for (const p of byLevel[1] || []) l1Lookup[p.code as string] = p.title as string;
  for (const p of byLevel[2] || []) l2Lookup[p.code as string] = p.title as string;
  for (const p of byLevel[3] || []) l3Lookup[p.code as string] = p.title as string;

  return Response.json({
    metadata: {
      totalProcesses: all.length,
      levels: Object.fromEntries(
        Object.entries(byLevel).map(([level, items]) => [
          `L${level}`,
          { name: `Level ${level}`, count: items.length },
        ]),
      ),
    },
    lookup: { l1: l1Lookup, l2: l2Lookup, l3: l3Lookup },
    l1Processes: byLevel[1] || [],
    l2Processes: byLevel[2] || [],
    l3Processes: byLevel[3] || [],
    l4Processes: byLevel[4] || [],
    l5Processes: byLevel[5] || [],
    l6Processes: byLevel[6] || [],
  });
}
