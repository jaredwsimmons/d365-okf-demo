import { db } from "@/lib/db";
import * as schema from "@/lib/db";

export async function GET() {
  const allFindings = await db.select().from(schema.governanceFindings);

  // Filter placeholder rules that haven't produced any findings
  const findings = allFindings.filter(
    (f) => (f.count ?? 0) > 0 || f.status !== "placeholder",
  );

  const bySeverity: Record<string, number> = { high: 0, medium: 0, warning: 0, info: 0 };
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  }

  const score = Math.max(
    0,
    100 -
      (bySeverity["high"] || 0) * 10 -
      (bySeverity["medium"] || 0) * 5 -
      (bySeverity["warning"] || 0) * 2,
  );

  return Response.json({
    summary: { totalFindings: findings.length, score, bySeverity },
    findings,
  });
}
