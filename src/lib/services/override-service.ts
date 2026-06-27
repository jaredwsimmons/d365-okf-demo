// Override service — persist tag overrides

import { db } from "@/lib/db";
import * as schema from "@/lib/db";

export async function saveOverride(
  dataKey: string,
  itemId: string,
  override: { tags?: Record<string, unknown>; [key: string]: unknown },
  modifiedBy?: string,
) {
  const id = `${dataKey}:${itemId}`;
  const { tags, ...fields } = override;

  await db
    .insert(schema.overrides)
    .values({
      id,
      dataKey,
      itemId,
      tags: tags || null,
      fields: Object.keys(fields).length > 0 ? fields : null,
      modifiedAt: new Date(),
      modifiedBy: modifiedBy || null,
    })
    .onConflictDoUpdate({
      target: schema.overrides.id,
      set: {
        tags: tags || null,
        fields: Object.keys(fields).length > 0 ? fields : null,
        modifiedAt: new Date(),
        modifiedBy: modifiedBy || null,
      },
    });

  return { success: true, dataKey, itemId };
}
