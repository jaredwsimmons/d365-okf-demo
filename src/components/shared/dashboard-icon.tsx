/* eslint-disable @next/next/no-img-element */

/**
 * Unified icon component — resolves an icon key to either a Lucide component
 * or a product SVG <img>, so consumers don't need to know the difference.
 *
 * Usage:
 *   <DashboardIcon iconKey="Plugin" className="w-4 h-4" />       // → Lucide Puzzle
 *   <DashboardIcon iconKey="Entity" className="w-4 h-4" />       // → Dataverse.svg
 *   <DashboardIcon iconKey="Field Service" className="w-4 h-4" /> // → FieldService.svg
 *   <DashboardIcon tabId="plugins" className="w-4 h-4" />        // → Lucide Puzzle (tab icon)
 *   <DashboardIcon tabId="entities" className="w-4 h-4" />       // → Dataverse.svg (tab icon)
 */

import { typeLucideIcons, tabLucideIcons, componentTypeIcons } from "@/lib/theme";
import { iconUrl } from "@/lib/icons";

interface DashboardIconProps {
  /** Icon key — resolves through iconUrl (product SVGs) then typeLucideIcons (generic types) */
  iconKey?: string;
  /** Tab ID — resolves through tabLucideIcons */
  tabId?: string;
  /** Fallback type for component type resolution (used when iconKey doesn't match anything) */
  fallbackType?: string;
  className?: string;
}

export function DashboardIcon({ iconKey, tabId, fallbackType, className }: DashboardIconProps) {
  // Tab icon resolution
  if (tabId) {
    const LucideTab = tabLucideIcons[tabId];
    if (LucideTab) return <LucideTab className={className} />;
    return null;
  }

  // Icon key resolution: product SVG first, then Lucide, then component type SVG fallback
  if (iconKey) {
    const url = iconUrl(iconKey);
    if (url) return <img src={url} alt="" className={className} />;

    const LucideType = typeLucideIcons[iconKey];
    if (LucideType) return <LucideType className={className} />;

    // Fallback to component type SVG (e.g. Entity → Dataverse.svg)
    const ft = fallbackType || iconKey;
    const svgFallback = componentTypeIcons[ft];
    if (svgFallback) return <img src={`/icons/${svgFallback}`} alt="" className={className} />;
  }

  return null;
}
