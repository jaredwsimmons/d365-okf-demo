import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  const [solution] = await db
    .select()
    .from(schema.solutions)
    .where(eq(schema.solutions.uniqueName, name))
    .limit(1);

  if (!solution) {
    return Response.json(
      { error: "NotFound", message: `Solution '${name}' not found` },
      { status: 404 },
    );
  }

  const dependsOn = await db
    .select()
    .from(schema.solutionDependencies)
    .where(eq(schema.solutionDependencies.fromSolution, name));

  const dependedOnBy = await db
    .select()
    .from(schema.solutionDependencies)
    .where(eq(schema.solutionDependencies.toSolution, name));

  return Response.json({ solution, dependsOn, dependedOnBy });
}
