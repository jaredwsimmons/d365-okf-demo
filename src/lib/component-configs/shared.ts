// Shared helpers for all component configs (explorer + detail)
import type { PillDef, StatDef } from "@/types/inventory";

// ========== EXPLORER HELPERS ==========

const VERTICAL_COLORS: Record<string, string> = {
  Core: "var(--color-pill-core)",
  Service: "var(--color-pill-service)",
  Construction: "var(--color-pill-construction)",
  General: "var(--color-pill-general)",
};

// Ordered palette cycled for verticals not in VERTICAL_COLORS.
// Using the same 4 CSS vars keeps colors theme-aware; the hash makes
// each unknown vertical stable and distinct from its neighbors.
const PILL_PALETTE = [
  "var(--color-pill-core)",
  "var(--color-pill-service)",
  "var(--color-pill-construction)",
  "var(--color-pill-general)",
];

function hashVerticalIndex(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i);
  return Math.abs(h) % PILL_PALETTE.length;
}

export function verticalColor(mod?: string): string {
  if (!mod) return "var(--color-pill-general)";
  return VERTICAL_COLORS[mod] ?? PILL_PALETTE[hashVerticalIndex(mod)]!;
}

export function verticalPill(tags?: Record<string, unknown> | null): PillDef | null {
  const mod = tags?.vertical as string | undefined;
  return mod ? { text: mod, color: verticalColor(mod) } : null;
}

/**
 * Count items by a key function, returning top-N entries sorted by count desc.
 * Used to build the breakdown portion of a stats bar.
 */
export function topCounts<T>(
  items: T[],
  getKey: (item: T) => string,
  limit = 4,
): StatDef[] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = getKey(item);
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k, v]) => ({ num: v, label: k }));
}

// ========== DETAIL HELPERS ==========

/** Convert boolean to "Yes" or undefined (omits the row when false) */
export const boolToYes = (val: unknown) => (val ? "Yes" : undefined);

/** Normalize an unknown field to a string array, filtering falsy values */
export const filterItems = (items: unknown): string[] | undefined => {
  if (!items) return undefined;
  if (Array.isArray(items)) {
    const filtered = items.filter(Boolean) as string[];
    return filtered.length > 0 ? filtered : undefined;
  }
  return undefined;
};
