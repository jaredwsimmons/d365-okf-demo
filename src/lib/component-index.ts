// Shared component-index types (IndexedComponent / ComponentIndex)
// consumed by the Process Catalog, Capability Map, and solution-index code.

import type { Tags } from "@/types/inventory";

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

