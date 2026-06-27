import { db } from "@/lib/db";
import * as schema from "@/lib/db";

export async function GET() {
  const rels = await db.select().from(schema.relEntityEntity);
  return Response.json({
    entityRelationships: rels.map((r) => ({
      name: r.name,
      type: r.type,
      from: r.fromEntity,
      to: r.toEntity,
      lookupField: r.lookupField,
      cascadeDelete: r.cascadeDelete,
      description: r.description,
      solution: r.solution,
    })),
  });
}
