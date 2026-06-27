// Assembles all explorer configs — consumers import { explorerConfigs } from "@/lib/explorer-configs"
import type { ExplorerConfig } from "@/types/inventory";
import { pluginsConfig, entitiesConfig, formsConfig, viewsConfig, securityConfig, optionSetsConfig, pluginStepsConfig } from "../component-configs/d365ce";
import { workflowsConfig, webresourcesConfig, appsConfig, reportsConfig } from "../component-configs/power-platform";
import { envVarsConfig, siteMapsConfig, dashboardsConfig, mobileOfflineConfig, templatesConfig } from "../component-configs/infrastructure";
import { aiComponentsConfig, appActionsConfig } from "../component-configs/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asAnyConfig = (c: ExplorerConfig<any>): ExplorerConfig<Record<string, unknown>> => c;

export const explorerConfigs: Record<string, ExplorerConfig<Record<string, unknown>>> = {
  // D365 CE
  plugins:     asAnyConfig(pluginsConfig),
  entities:    asAnyConfig(entitiesConfig),
  forms:       asAnyConfig(formsConfig),
  views:       asAnyConfig(viewsConfig),
  security:    asAnyConfig(securityConfig),
  optionsets:  asAnyConfig(optionSetsConfig),
  pluginsteps: asAnyConfig(pluginStepsConfig),
  // Power Platform
  workflows:    asAnyConfig(workflowsConfig),
  webresources: asAnyConfig(webresourcesConfig),
  apps:         asAnyConfig(appsConfig),
  appactions:   asAnyConfig(appActionsConfig),
  reports:      asAnyConfig(reportsConfig),
  // Infrastructure
  envvars:       asAnyConfig(envVarsConfig),
  sitemaps:      asAnyConfig(siteMapsConfig),
  dashboards:    asAnyConfig(dashboardsConfig),
  mobileoffline: asAnyConfig(mobileOfflineConfig),
  templates:     asAnyConfig(templatesConfig),
  // AI
  aicomponents: asAnyConfig(aiComponentsConfig),
};
