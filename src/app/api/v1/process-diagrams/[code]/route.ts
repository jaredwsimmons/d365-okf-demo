import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db";
import { getUserEmail } from "@/lib/api-utils";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await request.json();
  const { url, title } = body ?? {};

  if (!url || typeof url !== "string") {
    return Response.json(
      { error: "BadRequest", message: "url is required" },
      { status: 400 },
    );
  }

  const modifiedBy = getUserEmail(request);

  await db
    .insert(schema.processDiagrams)
    .values({
      code,
      url,
      title: title || null,
      modifiedAt: new Date(),
      modifiedBy,
    })
    .onConflictDoUpdate({
      target: schema.processDiagrams.code,
      set: {
        url,
        title: title || null,
        modifiedAt: new Date(),
        modifiedBy,
      },
    });

  return Response.json({ success: true, code });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  await db.delete(schema.processDiagrams).where(eq(schema.processDiagrams.code, code));
  return Response.json({ success: true, code });
}
