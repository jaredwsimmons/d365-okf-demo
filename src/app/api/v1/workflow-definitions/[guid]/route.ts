import { db } from "@/lib/db";
import { workflowDefinitions } from "@/lib/db/schema/derived";
import { eq } from "drizzle-orm";

// Returns the full workflow definition blob + its manifest metadata.
// Replaces public/data/definitions/{guid}.json.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guid: string }> },
) {
  const { guid } = await params;
  const normalized = guid.replace(/[{}]/g, "").toUpperCase();

  const [row] = await db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.guid, normalized));

  if (!row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    guid: row.guid,
    solution: row.solution,
    actionCount: row.actionCount,
    triggerCount: row.triggerCount,
    definition: row.definition,
  });
}
