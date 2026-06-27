// Builds a component index mapping BPC L1/L2/L3 codes to component arrays
// Shared by Process Catalog and Capability Map tabs

import type { DashboardData, Tags } from "@/types/inventory";
import { extractAllComponents } from "./component-descriptors";

export interface IndexedComponent {
  name: string;
  searchName: string;
  type: string;
  tabId: string;
  /** dataKey for override saves (matches ID_FIELD_MAP keys in data.ts) */
  dataKey: string;
  /** Item ID for override saves (matches the ID field for this dataKey) */
  itemId: string;
  /** GUID or secondary identifier — searched by command palette */
  altId?: string;
  sub?: string;
  tags?: Tags;
}

export interface ComponentIndex {
  byL1: Record<string, IndexedComponent[]>;
  byL2: Record<string, IndexedComponent[]>;
  byL3: Record<string, IndexedComponent[]>;
  all: IndexedComponent[];
}

export function buildComponentIndex(data: DashboardData): ComponentIndex {
  const byL1: Record<string, IndexedComponent[]> = {};
  const byL2: Record<string, IndexedComponent[]> = {};
  const byL3: Record<string, IndexedComponent[]> = {};
  const all: IndexedComponent[] = [];

  for (const raw of extractAllComponents(data)) {
    const comp: IndexedComponent = raw;
    all.push(comp);

    const t = comp.tags;
    if (!t) continue;

    const l1 = extractCode(t.processCatalogL1);
    const l2 = extractCode(t.processCatalogL2);
    const l3 = extractCode(t.processCatalogL3);

    if (l1) {
      if (!byL1[l1]) byL1[l1] = [];
      byL1[l1].push(comp);
    }
    if (l2) {
      if (!byL2[l2]) byL2[l2] = [];
      byL2[l2].push(comp);
    }
    if (l3) {
      if (!byL3[l3]) byL3[l3] = [];
      byL3[l3].push(comp);
    }
  }

  return { byL1, byL2, byL3, all };
}

function extractCode(val?: string): string {
  if (!val) return "";
  const space = val.indexOf(" ");
  return space > 0 ? val.slice(0, space) : val;
}
