// Builds a solution-centric index from all dashboard inventory data.
// Groups components by solution name and derives architectural layers from naming conventions.

import type { DashboardData } from "@/types/inventory";
import type { IndexedComponent } from "@/lib/component-index";
import { extractAllComponents } from "./component-descriptors";

export type SolutionLayer =
  | "Core"
  | "Vertical: Services"
  | "Vertical: Construction"
  | "Integrated"
  | "Company / Security"
  | "ISV / External";

export interface SolutionInfo {
  name: string;
  layer: SolutionLayer;
  bpcL1Code: string | null;
  components: IndexedComponent[];
  countsByType: Record<string, number>;
  totalCount: number;
}

export interface LayerInfo {
  layer: SolutionLayer;
  solutions: SolutionInfo[];
  totalCount: number;
  countsByType: Record<string, number>;
}

export interface SolutionIndex {
  bySolution: Map<string, SolutionInfo>;
  byLayer: Map<SolutionLayer, LayerInfo>;
  layerOrder: SolutionLayer[];
  allSolutions: SolutionInfo[];
  totalComponents: number;
}

/**
 * Derive the dominant BPC L1 code for a solution by majority vote
 * across the BPC tags of its components. Falls back to null when no
 * components have been tagged yet.
 */
function deriveBpcL1Code(components: IndexedComponent[]): string | null {
  const counts: Record<string, number> = {};
  for (const c of components) {
    const l1 = (c.tags as Record<string, unknown> | undefined)?.processCatalogL1 as string | undefined;
    if (l1) counts[l1] = (counts[l1] || 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0]![0];
}

export const LAYER_ORDER: SolutionLayer[] = [
  "Core",
  "Vertical: Services",
  "Vertical: Construction",
  "Integrated",
  "Company / Security",
  "ISV / External",
];

/**
 * Layer classification rules — each rule maps a solution name prefix to a layer.
 * Override this array in customer-specific builds if the solution naming convention differs.
 * Checked in order; the first match wins. The fallback is always "ISV / External".
 *
 * Example for a different customer whose solutions start with "Acme":
 *   { prefix: "AcmeCore", layer: "Core" }
 */
export const defaultLayerRules: Array<{ prefix: string; layer: SolutionLayer }> = [
  { prefix: "AcmeCore", layer: "Core" },
  { prefix: "AcmeService", layer: "Vertical: Services" },
  { prefix: "AcmeConstruction", layer: "Vertical: Construction" },
  { prefix: "AcmeIntegrated", layer: "Integrated" },
  { prefix: "AcmeExternal", layer: "Integrated" },
  { prefix: "AcmeCompany", layer: "Company / Security" },
];

function getSolutionLayer(
  name: string,
  rules: Array<{ prefix: string; layer: SolutionLayer }> = defaultLayerRules,
): SolutionLayer {
  for (const rule of rules) {
    if (name.startsWith(rule.prefix)) return rule.layer;
  }
  return "ISV / External";
}

export function getSolutionType(name: string): string {
  const suffixes: [string, string][] = [
    ["ExternalPowerAutomatePatch", "External PA (Patch)"],
    ["ExternalPowerAutomate", "External PA"],
    ["PowerAutomatePatch", "Power Automate (Patch)"],
    ["PowerAutomate", "Power Automate"],
    ["ConfigurationPatch", "Configuration (Patch)"],
    ["Configuration", "Configuration"],
    ["ProcessesPatch", "Processes (Patch)"],
    ["Processes", "Processes"],
    ["BusinessRules", "Business Rules"],
    ["CanvasApps", "Canvas Apps"],
    ["SecurityRoles", "Security Roles"],
    ["SecurityPatch", "Security (Patch)"],
    ["FieldSecurityProfiles", "Field Security"],
    ["ReportsPatch", "Reports (Patch)"],
    ["Reports", "Reports"],
    ["OfflineProfiles", "Offline Profiles"],
    ["CustomerInsights", "Customer Insights"],
    ["DualWritePatch", "Dual Write (Patch)"],
    ["Release", "Release"],
  ];
  for (const [suffix, label] of suffixes) {
    if (name.endsWith(suffix)) return label;
  }
  return "Other";
}

export function buildSolutionIndex(
  data: DashboardData,
  layerRules?: Array<{ prefix: string; layer: SolutionLayer }>,
): SolutionIndex {
  const bySolution = new Map<string, SolutionInfo>();

  function ensure(solutionName: string | undefined): SolutionInfo | null {
    if (!solutionName) return null;
    if (!bySolution.has(solutionName)) {
      bySolution.set(solutionName, {
        name: solutionName,
        layer: getSolutionLayer(solutionName, layerRules),
        bpcL1Code: null, // derived after all components are added
        components: [],
        countsByType: {},
        totalCount: 0,
      });
    }
    return bySolution.get(solutionName)!;
  }

  function add(solutionName: string | undefined, comp: IndexedComponent) {
    const sol = ensure(solutionName);
    if (!sol) return;
    sol.components.push(comp);
    sol.countsByType[comp.type] = (sol.countsByType[comp.type] || 0) + 1;
    sol.totalCount++;
  }

  for (const raw of extractAllComponents(data)) {
    add(raw.solution, raw);
  }

  // Derive BPC L1 codes from actual component tags (majority vote per solution)
  for (const sol of bySolution.values()) {
    sol.bpcL1Code = deriveBpcL1Code(sol.components);
  }

  // Group by layer
  const byLayer = new Map<SolutionLayer, LayerInfo>();
  for (const layer of LAYER_ORDER) {
    byLayer.set(layer, { layer, solutions: [], totalCount: 0, countsByType: {} });
  }

  let totalComponents = 0;
  const allSolutions = Array.from(bySolution.values()).sort((a, b) => a.name.localeCompare(b.name));

  for (const sol of allSolutions) {
    const layerInfo = byLayer.get(sol.layer)!;
    layerInfo.solutions.push(sol);
    layerInfo.totalCount += sol.totalCount;
    totalComponents += sol.totalCount;
    for (const [type, count] of Object.entries(sol.countsByType)) {
      layerInfo.countsByType[type] = (layerInfo.countsByType[type] || 0) + count;
    }
  }

  return { bySolution, byLayer, layerOrder: LAYER_ORDER, allSolutions, totalComponents };
}

/** Build a SolutionIndex from the API /solutions + /solution-components responses */
export function buildSolutionIndexFromApi(
  apiData: { solutions: Array<Record<string, unknown>>; dependencies: Array<Record<string, unknown>> },
  componentCounts?: { bySolution: Record<string, { total: number; byType: Record<string, number> }> } | null,
  layerRules?: Array<{ prefix: string; layer: SolutionLayer }>,
): SolutionIndex {
  const bySolution = new Map<string, SolutionInfo>();

  for (const sol of apiData.solutions || []) {
    const name = (sol.uniqueName || sol.displayName || "") as string;
    const counts = componentCounts?.bySolution?.[name];
    bySolution.set(name, {
      name,
      layer: getSolutionLayer(name, layerRules),
      bpcL1Code: null,
      components: [],
      countsByType: counts?.byType || {},
      totalCount: counts?.total || 0,
    });
  }

  const byLayer = new Map<SolutionLayer, LayerInfo>();
  for (const layer of LAYER_ORDER) {
    byLayer.set(layer, { layer, solutions: [], totalCount: 0, countsByType: {} });
  }

  let totalComponents = 0;
  const allSolutions = Array.from(bySolution.values()).sort((a, b) => a.name.localeCompare(b.name));
  for (const sol of allSolutions) {
    const layerInfo = byLayer.get(sol.layer)!;
    layerInfo.solutions.push(sol);
    layerInfo.totalCount += sol.totalCount;
    totalComponents += sol.totalCount;
    for (const [type, count] of Object.entries(sol.countsByType)) {
      layerInfo.countsByType[type] = (layerInfo.countsByType[type] || 0) + count;
    }
  }

  return { bySolution, byLayer, layerOrder: LAYER_ORDER, allSolutions, totalComponents };
}
