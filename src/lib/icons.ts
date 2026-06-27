// Smart icon resolution — ported from old dashboard's pcIcon/pcEntityIcon/pcCompIcon

/** Master icon map: key → filename in /icons/ */
const iconMap: Record<string, string> = {
  // Component types that use product SVGs (types with Lucide icons are in typeLucideIcons instead)
  Entity: "Dataverse.svg",
  Workflow: "PowerAutomate.svg",
  App: "PowerApps.svg",
  Report: "PowerBI.svg",
  // D365 module icons (for entity detail resolution)
  "Field Service": "FieldService.svg",
  Sales: "Sales.svg",
  "Customer Service": "CustomerService.svg",
  "Project Operations": "ProjectOperations.svg",
  Finance: "Finance.svg",
  "Finance & Operations": "FinanceOperations.svg",
  "Supply Chain Management": "SupplyChain.svg",
  Commerce: "Commerce.svg",
  "Human Resources": "HumanResources.svg",
  "Business Central": "BusinessCentral.svg",
  "Customer Insights": "CustomerInsights.svg",
  "Contact Center": "ContactCenter.svg",
  URS: "FieldService.svg",
  "Universal Resource Scheduling": "FieldService.svg",
  // Power Platform
  "Power Automate": "PowerAutomate.svg",
  "Power Apps": "PowerApps.svg",
  Dataverse: "Dataverse.svg",
  "Power Pages": "PowerPages.svg",
  "Power Apps Portals": "PowerPages.svg",
  "Dataverse Platform": "Dataverse.svg",
  "Copilot Studio": "CopilotStudio.svg",
  "AI Builder": "AIBuilder.svg",
  // Azure
  "Logic Apps": "LogicApps.svg",
  Functions: "Functions.svg",
  // Fallbacks
  "Dynamics 365": "Dynamics365.svg",
  Custom: "Dynamics365.svg",
  // Code language icons
  JavaScript: "JavaScript.svg",
  TypeScript: "TypeScript.svg",
  "C#": "C# (CSharp).svg",
  XML: "XML.svg",
  HTML: "HTML5.svg",
  JSON: "JSON.svg",
  Image: "Image.svg",
};

/** Resolve icon key → URL path (or undefined) */
export function iconUrl(key: string): string | undefined {
  const file = iconMap[key];
  return file ? `/icons/${encodeURIComponent(file)}` : undefined;
}

/** Smart icon resolution for entities — checks module, integration, Custom pattern */
export function entityIconKey(tags?: Record<string, unknown> | null): string {
  if (!tags) return "Entity";
  const mod = (tags.d365Module as string) || "";
  // Exact module match
  if (iconMap[mod]) return mod;
  // "Custom (OrgName) - Field Service" pattern → extract base module
  const match = mod.match(/Custom \([^)]+\) - (.+)/);
  if (match && iconMap[match[1]!]) return match[1]!;
  // Any custom entity (unrecognized module)
  if (mod.includes("Custom")) return "Custom";
  return "Entity";
}

/** Smart icon resolution for any component — checks integration, type, BRE, PA format */
export function compIconKey(
  type: string,
  tags?: Record<string, unknown> | null,
  extra?: { isBRE?: boolean; isImage?: boolean; format?: string }
): string {
  // Entities use module-specific resolution
  if (type === "Entity") return entityIconKey(tags);
  // Image web resources (PNG, JPG, Vector/SVG)
  if (type === "WebResource" && extra?.isImage) return "Image";
  // PowerAutomate-format workflows → PA icon instead of generic Workflow
  if (type === "Workflow" && extra?.format === "PowerAutomate") return "Power Automate";
  // Default: component type
  return type;
}

/** Resolve a web resource type string → icon key, or undefined if no specific icon */
export function webResourceIconKey(type?: string): string | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase();
  if (t === "javascript" || t === "jscript") return "JavaScript";
  if (t === "typescript") return "TypeScript";
  if (t === "xml" || t === "xsl" || t === "resx") return "XML";
  if (t === "html" || t === "htm") return "HTML";
  if (t === "json") return "JSON";
  if (["png", "jpg", "jpeg", "gif", "ico", "svg", "vector", "image"].includes(t)) return "Image";
  return undefined;
}

/**
 * Right-side sub-type icon for component list rows.
 * Returns an icon key when the component has a specific code-language or
 * technology identity; returns undefined to fall back to plain sub text.
 */
export function subIconKey(type: string, sub?: string): string | undefined {
  if (type === "Plugin" || type === "PluginStep") return "C#";
  if (type === "WebResource") return webResourceIconKey(sub);
  if (type === "PCFControl") return webResourceIconKey(sub) ?? "TypeScript";
  return undefined;
}

/** Icon legend data — product family sections with [iconKey, displayLabel] pairs */
export const legendSections = [
  {
    section: "Customer Engagement",
    subtitle: "D365 CE",
    items: [
      ["Dynamics 365", "Dynamics 365 (Platform)"],
      ["Field Service", "Field Service"],
      ["Sales", "Sales"],
      ["Customer Service", "Customer Service"],
      ["Customer Insights", "Customer Insights"],
      ["Contact Center", "Contact Center"],
    ] as [string, string][],
  },
  {
    section: "Finance & Operations",
    subtitle: "D365 F&O",
    items: [
      ["Finance & Operations", "F&O (Platform)"],
      ["Finance", "Finance"],
      ["Supply Chain Management", "Supply Chain Mgmt"],
      ["Commerce", "Commerce"],
      ["Human Resources", "Human Resources"],
      ["Project Operations", "Project Operations"],
      ["Business Central", "Business Central"],
    ] as [string, string][],
  },
  {
    section: "Power Platform & Other",
    items: [
      ["Power Apps", "Power Apps"],
      ["Power Automate", "Power Automate"],
      ["Dataverse", "Dataverse"],
      ["Custom", "Custom Entities"],
    ] as [string, string][],
  },
];