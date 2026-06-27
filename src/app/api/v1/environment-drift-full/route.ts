import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { environmentSnapshots } from "@/lib/db/schema";

export async function GET() {
  const [row] = await db
    .select()
    .from(environmentSnapshots)
    .where(eq(environmentSnapshots.key, "drift"))
    .limit(1);

  if (!row) {
    return Response.json({
      metadata: {},
      summary: { environments: 0, findings: 0 },
      findings: [],
      playbook: {},
      categories: {},
    });
  }

  return Response.json(row.data);
}
