// Dot-notation field access utility (e.g., "tags.processCatalogL1")

export function getField(item: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((obj, key) => {
    if (obj && typeof obj === "object") {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, item);
}
