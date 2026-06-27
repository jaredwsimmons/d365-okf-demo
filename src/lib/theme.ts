// CoE Dashboard theme constants
// Brand colors are defined as CSS variables in globals.css (@theme inline)

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  BookMarked,
  Map,
  List,
  Columns3,
  Crown,
  View,
  Plug,
  Cable,
  Workflow,
  TextCursorInput,
  FileCode,
  ChartNoAxesGantt,
  LayoutDashboard,
  Mail,
  FileTerminal,
  Shield,
  Variable,
  Smartphone,
  Image,
  Database,
  AppWindow,
  CloudCog,
  BrainCircuit,
  ChartColumnIncreasing,
  Waypoints,
  Zap,
  MousePointerClick,
  ListTodo,
  CornerDownLeft,
  CornerDownRight,
  EthernetPort,
  Gavel,
  Code,
  Braces,
  Layers,
  Activity,
  PackageSearch,
  MonitorCheck,
} from "lucide-react";

// Tab definitions
interface TabDef {
  id: string;
  name: string;
}

export interface TabGroup {
  label: string;
  tabs: TabDef[];
}

export const tabGroups: TabGroup[] = [
  { label: "Governance", tabs: [
    { id: "governance", name: "Health Check" },
    { id: "solutionhealth", name: "Solution Explorer" },
    { id: "untaggedqueue", name: "Untagged Queue" },
  ]},
  { label: "Process", tabs: [
    { id: "capabilitymap", name: "Capability Map" },
    { id: "processcatalog", name: "Process Catalog" },
  ]},
  { label: "Data Model", tabs: [
    { id: "entities", name: "Entities" },
    { id: "entitydiagram", name: "Entity Relationships" },
    { id: "optionsets", name: "Option Sets" },
    { id: "views", name: "Views" },
  ]},
  { label: "Logic", tabs: [
    { id: "pluginsteps", name: "Plugin Steps" },
    { id: "plugins", name: "Plugins" },
    { id: "workflows", name: "Workflows" },
  ]},
  { label: "UI & Apps", tabs: [
    { id: "apps", name: "Apps" },
    { id: "appactions", name: "App Actions" },
    { id: "dashboards", name: "Dashboards" },
    { id: "forms", name: "Forms" },
    { id: "pcf", name: "PCF Controls" },
    { id: "sitemaps", name: "Site Maps" },
    { id: "templates", name: "Templates" },
    { id: "webresources", name: "Web Resources" },
  ]},
  { label: "Security", tabs: [
    { id: "security", name: "Security Roles" },
  ]},
  { label: "Integration", tabs: [
    { id: "aicomponents", name: "AI Components" },
    { id: "azure", name: "Azure" },
    { id: "envvars", name: "Env Variables" },
    { id: "mobileoffline", name: "Mobile Offline" },
  ]},
  { label: "Reporting", tabs: [
    { id: "reports", name: "Reports" },
  ]},
];

// Lucide icons for all tabs
export const tabLucideIcons: Record<string, LucideIcon> = {
  processcatalog: BookOpen,
  capabilitymap: Map,
  entities: Database,
  optionsets: List,
  views: View,
  plugins: Plug,
  pluginsteps: Cable,
  workflows: Workflow,
  forms: TextCursorInput,
  webresources: FileCode,
  apps: AppWindow,
  appactions: MousePointerClick,
  sitemaps: ChartNoAxesGantt,
  dashboards: LayoutDashboard,
  templates: Mail,
  pcf: FileTerminal,
  security: Shield,
  azure: CloudCog,
  aicomponents: BrainCircuit,
  envvars: Variable,
  mobileoffline: Smartphone,
  reports: ChartColumnIncreasing,
  entitydiagram: Waypoints,
  untaggedqueue: ListTodo,
  solutionarchitecture: Layers,
  governance: Activity,
  solutionhealth: PackageSearch,
  environmenthygiene: MonitorCheck,
  // Cross-reference accordion icons
  entitycolumns: Columns3,
  cdmattributes: BookMarked,
  parententity: Crown,
  "arrow-left": CornerDownLeft,
  "arrow-right": CornerDownRight,
  "ethernet-port": EthernetPort,
  "gavel": Gavel,
  "code": Code,
  "braces": Braces,
};

// Lucide icons for component types — matched to nav tab icons where applicable
export const typeLucideIcons: Record<string, LucideIcon> = {
  Plugin: Plug,
  PluginStep: Cable,
  View: View,
  WebResource: FileCode,
  Image: Image,
  Form: TextCursorInput,
  Dashboard: LayoutDashboard,
  SecurityRole: Shield,
  SiteMap: ChartNoAxesGantt,
  EnvVar: Variable,
  AIComponent: BrainCircuit,
  PowerAutomate: Zap,
  PCFControl: FileTerminal,
  OptionSet: List,
  Template: Mail,
  MobileOffline: Smartphone,
  AppAction: MousePointerClick,
  AzureComponent: CloudCog,
  parententity: Crown,
  entitycolumns: Columns3,
  cdmattributes: BookMarked,
  "arrow-left": CornerDownLeft,
  "arrow-right": CornerDownRight,
  "ethernet-port": EthernetPort,
  "gavel": Gavel,
  "code": Code,
  "braces": Braces,
};

// Product SVG icons — fallback for component types not covered by typeLucideIcons
export const componentTypeIcons: Record<string, string> = {
  Entity: "Dataverse.svg",
  Workflow: "PowerAutomate.svg",
  BRE: "Hitachi_Symbol.svg",
  App: "PowerApps.svg",
  Report: "PowerBI.svg",
  PowerAutomate: "PowerAutomate.svg",
};

