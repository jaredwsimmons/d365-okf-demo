// Builds a solution-centric index from all dashboard inventory data.
// Groups components by solution name and derives architectural layers from naming conventions.

import type { IndexedComponent } from "@/lib/component-index";

export type SolutionLayer =
  | "Core"
  | "Microsoft (Managed)"
  | "Line of Business"
  | "Integration"
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

export const LAYER_ORDER: SolutionLayer[] = [
  "Core",
  "Microsoft (Managed)",
  "Line of Business",
  "Integration",
  "Company / Security",
  "ISV / External",
];

/**
 * Optional per-deployment name-prefix rules. When a rule's prefix matches, its
 * layer wins; otherwise the layer is inferred generically from solution metadata
 * (isManaged / publisher / name), which works for any org without configuration.
 */
export const defaultLayerRules: Array<{ prefix: string; layer: SolutionLayer }> = [];

/**
 * Classify a solution into an architectural layer. Prefers explicit prefix rules,
 * then infers generically: Microsoft-managed base solutions, the customization
 * layer (unmanaged line-of-business), core/platform, integration, and security.
 */
function getSolutionLayer(
  name: string,
  sol?: Record<string, unknown> | null,
  rules: Array<{ prefix: string; layer: SolutionLayer }> = defaultLayerRules,
): SolutionLayer {
  for (const rule of rules) {
    if (name.startsWith(rule.prefix)) return rule.layer;
  }
  const nl = String(name || "").toLowerCase();
  const managed = sol?.isManaged === true;
  const pub = String(sol?.publisher ?? sol?.publisherPrefix ?? "").toLowerCase();
  const microsoft =
    /microsoft|dynamics/.test(pub) ||
    /^(msdyn|msdynce|msdynmkt|msdynci|mscrm|msevtmgt)/.test(nl) ||
    (managed && /^ms/.test(nl));
  if (/(security|fieldsecurity|\brole)/.test(nl)) return "Company / Security";
  if (/(integration|dualwrite|dual write|external|azure|connector)/.test(nl)) return "Integration";
  if (microsoft) return "Microsoft (Managed)";
  if (/((^|[^a-z])core([^a-z]|$)|platform|governance|\bcommon\b|foundation|^system|^default)/.test(nl)) return "Core";
  if (!managed) return "Line of Business";
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
      layer: getSolutionLayer(name, sol, layerRules),
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
