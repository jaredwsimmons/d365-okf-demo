import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { environmentSnapshots } from "@/lib/db/schema";

export async function GET() {
  const [row] = await db
    .select()
    .from(environmentSnapshots)
    .where(eq(environmentSnapshots.key, "matrix"))
    .limit(1);

  if (!row) {
    return Response.json({
      metadata: {},
      coreSolutionDiffs: [],
      nonCoreSolutionDiffs: [],
      presenceGaps: [],
    });
  }

  return Response.json(row.data);
}
