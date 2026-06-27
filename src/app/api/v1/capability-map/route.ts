import { db } from "@/lib/db";
import * as schema from "@/lib/db";

export async function GET() {
  const caps = await db.select().from(schema.capabilities);
  const subs = await db.select().from(schema.subCapabilities);
  const terts = await db.select().from(schema.tertiarySubCapabilities);

  const capabilities = caps.map((cap) => ({
    ...cap,
    subCapabilities: subs
      .filter((s) => s.capabilityId === cap.id)
      .map((sub) => ({
        ...sub,
        tertiarySubCapabilities: terts.filter(
          (t) => t.capabilityId === cap.id && t.subCapabilityName === sub.name,
        ),
      })),
  }));

  return Response.json({
    generatedAt: new Date().toISOString(),
    totalClusters: caps.length,
    totalComponentsClustered: caps.reduce((sum, c) => sum + (c.componentCount || 0), 0),
    totalSubCapabilities: subs.length,
    totalTertiarySubCapabilities: terts.length,
    capabilities,
  });
}
