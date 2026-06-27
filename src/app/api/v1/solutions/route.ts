import { db } from "@/lib/db";
import * as schema from "@/lib/db";

export async function GET() {
  const allSolutions = await db.select().from(schema.solutions);
  const allDeps = await db.select().from(schema.solutionDependencies);

  // Rename fromSolution/toSolution → from/to to match SolutionDependenciesData shape.
  const dependencies = allDeps.map((d) => ({
    from: d.fromSolution,
    to: d.toSolution,
    componentCount: d.componentCount ?? 0,
  }));

  // Derive missingDependencies per solution (where dependency_count > 0 but
  // the target solution isn't in our solutions list — i.e. an external dep).
  const knownNames = new Set(allSolutions.map((s) => s.uniqueName));
  const missingDependencies: {
    solution: string;
    missing: Record<string, unknown>[];
    count: number;
  }[] = [];
  for (const sol of allSolutions) {
    if (!sol.missingDependencyCount) continue;
    const missing = (sol.dependsOn || [])
      .filter((d) => typeof d === "string" && !knownNames.has(d))
      .map((d) => ({ name: d as string }));
    missingDependencies.push({
      solution: sol.uniqueName,
      missing,
      count: sol.missingDependencyCount,
    });
  }

  return Response.json({
    metadata: { totalSolutions: allSolutions.length, totalDependencies: allDeps.length },
    solutions: allSolutions,
    dependencies,
    missingDependencies,
    installOrder: allSolutions
      .slice()
      .sort((a, b) => (a.dependencyCount || 0) - (b.dependencyCount || 0))
      .map((s) => s.uniqueName),
  });
}
