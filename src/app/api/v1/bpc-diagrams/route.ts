import { db } from "@/lib/db";
import { bpcDiagrams } from "@/lib/db/schema";

export async function GET() {
  const rows = await db.select().from(bpcDiagrams);
  const map: Record<string, Array<{ path: string; name: string }>> = {};
  for (const r of rows) {
    if (!map[r.code]) map[r.code] = [];
    map[r.code]!.push({ path: r.path, name: r.name });
  }
  return Response.json(map);
}
