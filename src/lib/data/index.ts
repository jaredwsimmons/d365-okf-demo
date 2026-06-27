// Data module — API-only save operations

import { saveOverride as saveOverrideApi } from "../api-client";

export async function saveOverride(
  dataKey: string,
  itemId: string,
  override: Record<string, unknown>,
): Promise<boolean> {
  try {
    await saveOverrideApi(dataKey, itemId, override);
    return true;
  } catch {
    return false;
  }
}
