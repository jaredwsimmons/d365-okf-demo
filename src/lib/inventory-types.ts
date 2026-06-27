/**
 * Single source of truth for inventory type metadata.
 *
 * Every inventory type needs three identifiers that MUST stay in sync:
 *   - apiKey:   URL slug used by API routes and TanStack Query keys
 *               (e.g. /api/v1/inventory/plugins → "plugins")
 *   - typeName: identifier emitted by the component-index + search service
 *               (e.g. "Plugin" on a search hit's `.type` field)
 *   - label:    human-readable plural label used in UI groupings
 *   - tabId:    navigable tab id (see tabGroups in theme.ts). Usually the
 *               lowercased apiKey, but NOT always (securityRoles → "security",
 *               powerAutomate has no dedicated tab → "workflows"), so it cannot
 *               be derived by lowercasing.
 *
 * The backend `TABLE_MAP` in inventory-service.ts uses the apiKey as its own
 * key (camelCase), so keys here match 1:1 with the Drizzle table registry.
 */

export interface InventoryTypeDef {
  apiKey: string;
  typeName: string;
  label: string;
  tabId: string;
}

export const INVENTORY_TYPES: InventoryTypeDef[] = [
  { apiKey: "entities",      typeName: "Entity",         label: "Entities",         tabId: "entities" },
  { apiKey: "plugins",       typeName: "Plugin",         label: "Plugins",          tabId: "plugins" },
  { apiKey: "pluginSteps",   typeName: "PluginStep",     label: "Plugin Steps",     tabId: "pluginsteps" },
  { apiKey: "workflows",     typeName: "Workflow",       label: "Workflows",        tabId: "workflows" },
  { apiKey: "forms",         typeName: "Form",           label: "Forms",            tabId: "forms" },
  { apiKey: "views",         typeName: "View",           label: "Views",            tabId: "views" },
  { apiKey: "webresources",  typeName: "WebResource",    label: "Web Resources",    tabId: "webresources" },
  { apiKey: "apps",          typeName: "App",            label: "Apps",             tabId: "apps" },
  { apiKey: "securityRoles", typeName: "SecurityRole",   label: "Security Roles",   tabId: "security" },
  { apiKey: "optionSets",    typeName: "OptionSet",      label: "Option Sets",      tabId: "optionsets" },
  { apiKey: "dashboards",    typeName: "Dashboard",      label: "Dashboards",       tabId: "dashboards" },
  { apiKey: "templates",     typeName: "Template",       label: "Templates",        tabId: "templates" },
  { apiKey: "siteMaps",      typeName: "SiteMap",        label: "Site Maps",        tabId: "sitemaps" },
  { apiKey: "reports",       typeName: "Report",         label: "Reports",          tabId: "reports" },
  { apiKey: "envVars",       typeName: "EnvVar",         label: "Env Variables",    tabId: "envvars" },
  { apiKey: "mobileOffline", typeName: "MobileOffline",  label: "Mobile Offline",   tabId: "mobileoffline" },
  { apiKey: "aiComponents",  typeName: "AIComponent",    label: "AI Components",    tabId: "aicomponents" },
  { apiKey: "appActions",    typeName: "AppAction",      label: "App Actions",      tabId: "appactions" },
  { apiKey: "pcf",           typeName: "PcfControl",     label: "PCF Controls",     tabId: "pcf" },
  { apiKey: "azure",         typeName: "AzureComponent", label: "Azure Components", tabId: "azure" },
  // Power Automate flows have no dedicated tab; surface them on the Workflows tab.
  { apiKey: "powerAutomate", typeName: "PowerAutomate",  label: "Power Automate",   tabId: "workflows" },
];

export const TYPE_ORDER: string[] = INVENTORY_TYPES.map((t) => t.typeName);

export const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  INVENTORY_TYPES.map((t) => [t.typeName, t.label]),
);

export const API_KEY_BY_TYPE_NAME: Record<string, string> = Object.fromEntries(
  INVENTORY_TYPES.map((t) => [t.typeName, t.apiKey]),
);

export const TAB_ID_BY_TYPE_NAME: Record<string, string> = Object.fromEntries(
  INVENTORY_TYPES.map((t) => [t.typeName, t.tabId]),
);
