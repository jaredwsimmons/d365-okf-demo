/** Strip braces and lowercase a D365 GUID for consistent key lookups. */
export function normalizeGuid(id: string): string {
  return id.replace(/[{}]/g, "").toLowerCase();
}
