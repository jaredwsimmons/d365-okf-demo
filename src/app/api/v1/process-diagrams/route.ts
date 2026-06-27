import { db } from "@/lib/db";
import * as schema from "@/lib/db";

export async function GET() {
  const rows = await db.select().from(schema.processDiagrams);
  const map: Record<string, { url: string; title?: string }> = {};
  for (const r of rows) {
    map[r.code] = { url: r.url, ...(r.title ? { title: r.title } : {}) };
  }
  return Response.json(map);
}
