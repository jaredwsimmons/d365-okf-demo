import { db } from "@/lib/db";
import { workflowDefinitions } from "@/lib/db/schema/derived";

// Lightweight manifest: lists every workflow GUID with action/trigger counts
// but NOT the full definition blob. Replaces public/data/WorkflowDefinitionManifest.json.
export async function GET() {
  const rows = await db
    .select({
      guid: workflowDefinitions.guid,
      solution: workflowDefinitions.solution,
      actionCount: workflowDefinitions.actionCount,
      triggerCount: workflowDefinitions.triggerCount,
    })
    .from(workflowDefinitions);

  const manifest: Record<
    string,
    { solution: string | null; actionCount: number | null; triggerCount: number | null }
  > = {};
  for (const r of rows) {
    manifest[r.guid] = {
      solution: r.solution,
      actionCount: r.actionCount,
      triggerCount: r.triggerCount,
    };
  }
  return Response.json(manifest);
}
