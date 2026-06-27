import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema/inventory";

// Normalized GUID -> display name. Used by the flow-diagram renderer to
// resolve cross-references between workflow definitions.
export async function GET() {
  const rows = await db
    .select({ id: workflows.id, name: workflows.name })
    .from(workflows);

  const map: Record<string, string> = {};
  for (const r of rows) {
    if (!r.id) continue;
    const normalized = r.id.replace(/[{}]/g, "").toUpperCase();
    map[normalized] = r.name;
  }
  return Response.json(map);
}
