// Shared component extraction from DashboardData.
// Used by both component-index (BPC indexing) and solution-index (solution grouping).

import type { DashboardData, Tags } from "@/types/inventory";

export interface RawComponent {
  name: string;
  searchName: string;
  type: string;
  tabId: string;
  dataKey: string;
  itemId: string;
  altId?: string;
  sub?: string;
  tags?: Tags;
  solution?: string;
}

export function extractAllComponents(data: DashboardData): RawComponent[] {
  const all: RawComponent[] = [];

  // Entities
  if (data.entities?.entities) {
    Object.values(data.entities.entities).flat().forEach(e => {
      all.push({
        name: e.displayName || e.logicalName,
        searchName: e.logicalName || e.displayName || "",
        type: "Entity", tabId: "entities", dataKey: "entities",
        itemId: e.logicalName || "", sub: e.logicalName,
        tags: e.tags, solution: e.solution,
      });
    });
  }

  // Plugins
  if (data.plugins?.plugins) {
    data.plugins.plugins.forEach(p => {
      all.push({
        name: p.name, searchName: p.name,
        type: "Plugin", tabId: "plugins", dataKey: "plugins",
        itemId: p.id || p.name, altId: p.id,
        sub: (p.assembly || "").replace("Plugins.", ""),
        tags: p.tags,
      });
    });
  }

  // Web Resources
  if (data.webresources?.webResources) {
    data.webresources.webResources.forEach(w => {
      all.push({
        name: w.displayName || w.name || "", searchName: w.name || "",
        type: "WebResource", tabId: "webresources", dataKey: "webresources",
        itemId: w.name || "",
        sub: (w as Record<string, unknown>).type as string || "",
        tags: w.tags, solution: w.solution,
      });
    });
  }

  // Workflows
  if (data.workflows?.workflows) {
    data.workflows.workflows.forEach(w => {
      all.push({
        name: w.name, searchName: w.name,
        type: "Workflow", tabId: "workflows", dataKey: "workflows",
        itemId: w.id || w.name, altId: w.id,
        sub: w.type || w.category || "",
        tags: w.tags, solution: w.solution,
      });
    });
  }

  // Forms
  if (data.forms?.forms) {
    data.forms.forms.forEach(f => {
      all.push({
        name: f.name, searchName: f.name,
        type: "Form", tabId: "forms", dataKey: "forms",
        itemId: f.formId || f.name, sub: f.entity,
        tags: f.tags, solution: f.solution,
      });
    });
  }

  // Views
  if (data.views?.views) {
    data.views.views.forEach(v => {
      all.push({
        name: v.name, searchName: v.name,
        type: "View", tabId: "views", dataKey: "views",
        itemId: v.viewId || v.name, sub: v.entity,
        tags: v.tags, solution: v.solution,
      });
    });
  }

  // Apps
  if (data.apps) {
    [...(data.apps.modelDrivenApps || []), ...(data.apps.canvasApps || [])].forEach(a => {
      const appName = a.displayName || a.name || a.uniqueName || "";
      const appKey = (a.uniqueName || a.name || appName) as string; // stable: uniqueName (MDA) or name (canvas)
      all.push({
        name: appName, searchName: appName,
        type: "App", tabId: "apps", dataKey: "apps",
        itemId: appKey, sub: a.appType || "",
        tags: a.tags, solution: a.solution,
      });
    });
  }

  // Reports
  if (data.reports?.reports) {
    data.reports.reports.forEach(r => {
      all.push({
        name: r.name, searchName: r.name,
        type: "Report", tabId: "reports", dataKey: "reports",
        itemId: r.name, altId: r.id,
        sub: r.reportType || "",
        tags: r.tags, solution: r.solution,
      });
    });
  }

  // Plugin Steps
  if (data.pluginSteps?.pluginSteps) {
    data.pluginSteps.pluginSteps.forEach(s => {
      all.push({
        name: s.shortClassName || s.name, searchName: s.shortClassName || s.name,
        type: "PluginStep", tabId: "pluginsteps", dataKey: "pluginSteps",
        itemId: s.id || s.name, altId: s.id,
        sub: [s.entity, s.message].filter(Boolean).join(" | "),
        tags: s.tags, solution: s.solution,
      });
    });
  }

  // Security Roles
  if (data.securityRoles?.roles) {
    data.securityRoles.roles.forEach(r => {
      all.push({
        name: r.name, searchName: r.name,
        type: "SecurityRole", tabId: "security", dataKey: "securityRoles",
        itemId: r.name, altId: r.id,
        sub: r.category || "",
        tags: r.tags, solution: r.solution,
      });
    });
  }

  // Option Sets
  if (data.optionSets?.optionSets) {
    data.optionSets.optionSets.forEach(o => {
      all.push({
        name: o.displayName || o.schemaName,
        searchName: o.schemaName || o.displayName || "",
        type: "OptionSet", tabId: "optionsets", dataKey: "optionSets",
        itemId: o.schemaName || "",
        sub: o.entities?.length
          ? o.entities.slice(0, 3).join(", ") + (o.entities.length > 3 ? ` +${o.entities.length - 3}` : "")
          : o.optionSetType || "",
        tags: o.tags, solution: o.solution,
      });
    });
  }

  // Environment Variables
  if (data.envVars?.environmentVariables) {
    data.envVars.environmentVariables.forEach(v => {
      all.push({
        name: v.displayName || v.schemaName,
        searchName: v.schemaName || v.displayName || "",
        type: "EnvVar", tabId: "envvars", dataKey: "envVars",
        itemId: v.schemaName || "", sub: v.dataType || "",
        tags: v.tags, solution: v.solution,
      });
    });
  }

  // Site Maps
  if (data.siteMaps?.siteMaps) {
    data.siteMaps.siteMaps.forEach(s => {
      all.push({
        name: s.name, searchName: s.name,
        type: "SiteMap", tabId: "sitemaps", dataKey: "siteMaps",
        itemId: s.name, sub: s.solution || "",
        tags: s.tags, solution: s.solution,
      });
    });
  }

  // Templates
  if (data.templates?.templates) {
    data.templates.templates.forEach(t => {
      all.push({
        name: t.title, searchName: t.title,
        type: "Template", tabId: "templates", dataKey: "templates",
        itemId: t.id || t.title, altId: t.id,
        sub: t.templateTypeName || "",
        tags: t.tags, solution: t.solution,
      });
    });
  }

  // Dashboards
  if (data.dashboards?.dashboards) {
    data.dashboards.dashboards.forEach(d => {
      all.push({
        name: d.name, searchName: d.name,
        type: "Dashboard", tabId: "dashboards", dataKey: "dashboards",
        itemId: d.id || d.name, altId: d.id,
        sub: d.category || "",
        tags: d.tags, solution: d.solution,
      });
    });
  }

  // Mobile Offline
  if (data.mobileOffline?.profiles) {
    data.mobileOffline.profiles.forEach(p => {
      const name = Array.isArray(p.name) ? (p.name as unknown as string[])[0]! : p.name;
      all.push({
        name, searchName: name,
        type: "MobileOffline", tabId: "mobileoffline", dataKey: "mobileOffline",
        itemId: name, tags: p.tags,
      });
    });
  }

  // AI Components
  if (data.aiComponents) {
    const ai = data.aiComponents;
    [...(ai.botComponents || []), ...(ai.customAPIs || []), ...(ai.aiSkillConfigs || [])].forEach(c => {
      const schemaName = (c as Record<string, unknown>).schemaName as string || "";
      if (!schemaName) return; // skip invalid records with no stable ID
      const name = c.displayName || c.name || schemaName;
      all.push({
        name, searchName: name,
        type: "AIComponent", tabId: "aicomponents", dataKey: "aiComponents",
        itemId: schemaName, sub: c.componentType || "",
        tags: c.tags,
      });
    });
  }

  // PCF Controls
  if (data.pcf?.controls) {
    (data.pcf.controls as Record<string, unknown>[]).forEach(c => {
      all.push({
        name: (c.displayName || c.name) as string, searchName: c.name as string,
        type: "PCFControl", tabId: "pcf", dataKey: "pcf",
        itemId: c.name as string, sub: (c.technology || "") as string,
        tags: c.tags as Tags,
      });
    });
  }

  // App Actions
  if (data.appActions?.appActions) {
    (data.appActions.appActions as Record<string, unknown>[]).forEach(a => {
      all.push({
        name: (a.buttonLabel || a.name) as string, searchName: a.name as string,
        type: "AppAction", tabId: "appactions", dataKey: "appActions",
        itemId: (a as Record<string, unknown>).uniqueName as string || a.name as string, sub: (a.contextEntity || "") as string,
        tags: a.tags as Tags,
      });
    });
  }

  // Azure Components
  if (data.azure) {
    const az = data.azure as unknown as Record<string, unknown>;
    [
      ...((az.logicApps as Record<string, unknown>[]) || []),
      ...((az.azureFunctions as Record<string, unknown>[]) || []),
      ...((az.externalIntegrations as Record<string, unknown>[]) || []),
    ].forEach(c => {
      all.push({
        name: c.name as string, searchName: c.name as string,
        type: "AzureComponent", tabId: "azure", dataKey: "azure",
        itemId: c.name as string,
        sub: (c.direction || c.integrationType || "") as string,
        tags: c.tags as Tags,
      });
    });
  }

  return all;
}
