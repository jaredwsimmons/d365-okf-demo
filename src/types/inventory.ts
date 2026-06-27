// Core data types for the CoE Dashboard

export interface PluginItem {
  id: string;
  name: string;
  assembly?: string;
  entity?: string;
  primaryEntity?: string;
  message?: string;
  stage?: string;
  status?: string;
  solution?: string;
  businessLogic?: string;
  file?: string;
  tags?: Tags;
  [key: string]: unknown;
}

export interface EntityItem {
  logicalName: string;
  displayName?: string;
  solution?: string;
  primaryField?: string;
  fieldCount?: number;
  componentReferences?: Record<string, number>;
  description?: string;
  keyRelationships?: string[];
  tags?: Tags;
  // Enriched at runtime by enrichWithRelationships()
  _relFormCount?: number;
  _relViewCount?: number;
  _relOptionSetCount?: number;
  _relPluginStepCount?: number;
  _relWorkflowCount?: number;
  _relOptionSets?: string[];
  _relFormDetails?: { name: string; entity: string; formType?: string; formId?: string }[];
  _relViewDetails?: { name: string; entity: string; viewId?: string }[];
  _relPluginStepDetails?: { name: string; entity: string; message: string; id?: string }[];
  _relWorkflowNames?: string[];
  _relApps?: string[];
  _relSolutionFootprint?: string[];
  _relFlows?: { name: string; operations: string[] }[];
  // Enriched at runtime from EntityColumnInventory
  _colTotal?: number;
  _colCustom?: number;
  _colOOB?: number;
  _entitySettings?: Record<string, boolean | string | null>;
  _entityDescription?: string;
  // Enriched at runtime from deep extraction scripts
  _relCanvasApps?: { appName: string; displayName: string; friendlyName: string }[];
  _relEntityMapsFrom?: { target: string; fieldCount: number }[];
  _relEntityMapsTo?: { source: string; fieldCount: number }[];
  _relSubgrids?: { formId: string; targetEntity: string; label: string; tab: string }[];
  _relJsHandlers?: { formId: string; event: string; library: string; function: string }[];
  _relPluginRules?: { stepName: string; ruleCount: number; isRulesEngine: boolean; rules?: { attribute: string; dataType: string; deployForm: boolean; deployPlugin: boolean }[] }[];
  _relRibbon?: { type: string; id: string; solution: string }[];
  _columns?: Array<{ logicalName: string; displayName?: string; description?: string; type?: string; isCustom?: boolean; requiredLevel?: string; solution?: string }>;
  [key: string]: unknown;
}

export interface FormItem {
  formId: string;
  name: string;
  entity: string;
  entityDisplayName?: string;
  formType?: string;
  solution?: string;
  isActive?: boolean;
  version?: string;
  tabCount?: number;
  sectionCount?: number;
  controlCount?: number;
  subgridCount?: number;
  hasCanvasApp?: boolean;
  hasBPF?: boolean;
  tags?: Tags;
  [key: string]: unknown;
}

export interface ViewItem {
  viewId: string;
  name: string;
  entity: string;
  entityDisplayName?: string;
  queryType?: string;
  solution?: string;
  columnCount?: number;
  filterCount?: number;
  isDefault?: boolean;
  isQuickFind?: boolean;
  hasJoins?: boolean;
  hasFilters?: boolean;
  columns?: Record<string, unknown>;
  relatedEntities?: Record<string, unknown>;
  tags?: Tags;
  _viewDetails?: ViewDetailEntry;
  [key: string]: unknown;
}

export interface WorkflowItem {
  id?: string;
  name: string;
  entity?: string;
  primaryEntity?: string;
  category?: string;
  type?: string;
  solution?: string;
  state?: string;
  mode?: string;
  format?: string;
  fileName?: string;
  description?: string;
  onCreate?: boolean;
  onUpdate?: boolean;
  onDelete?: boolean;
  onStatusChange?: boolean;
  tags?: Tags;
  // Enriched at runtime by enrichWithRelationships()
  _relEnvVars?: string[];
  _relFlowEntities?: { entity: string; operations: string[] }[];
  _paTriggerType?: string;
  _paTriggerEntity?: string;
  _paConnectors?: string[];
  _paCategory?: string;
  // Enriched from FlowComplexity
  _complexity?: string;
  _complexityScore?: number;
  _totalActions?: number;
  _maxDepth?: number;
  _hasErrorHandling?: boolean;
  _governanceFlags?: string[];
  _governanceFindings?: EnrichedGovernanceFinding[];
  _httpUrls?: string[];
  _metrics?: { ifCount: number; foreachCount: number; switchCount: number; scopeCount: number; httpCount: number; childFlows: number; connectorActions: number };
  [key: string]: unknown;
}

export interface WebResourceItem {
  name: string;
  displayName?: string;
  description?: string;
  webResourceType?: string;
  type?: string;
  solution?: string;
  relatedEntity?: string;
  prefix?: string;
  isManaged?: boolean;
  isCustomizable?: boolean;
  inferredPurpose?: string;
  logicalPath?: string;
  tags?: Tags;
  _relApps?: string[];
  // Enriched from WebResourceCodeAnalysis
  _codeLineCount?: number;
  _codeFunctionCount?: number;
  _codeFunctions?: string[];
  _codeApiCalls?: { operation: string; entity: string }[];
  _codeDeprecatedCount?: number;
  _codeDeprecated?: { pattern: string; count: number }[];
  _codeFieldRefs?: string[];
  _codeGovernanceFlags?: string[];
  _governanceFindings?: EnrichedGovernanceFinding[];
  _isRulesEngine?: boolean;
  _relPluginStepCount?: number;
  _relPluginStepDetails?: {
    id: string;
    name: string;
    entity: string;
    message: string;
    ruleCount?: number;
    isRulesEngine?: boolean;
    rules?: Array<{
      attribute: string;
      dataType: string;
      deployForm: boolean;
      deployPlugin: boolean;
      priority?: number;
      when?: string;
      setValue?: string;
      ruleId?: string;
      evalOnLoad?: boolean;
      isCustomField?: boolean;
    }>;
  }[];
  [key: string]: unknown;
}

export interface FlowItem {
  id?: string;
  name: string;
  solution?: string;
  triggerType?: string;
  triggerEntity?: string;
  category?: string;
  connectors?: string[];
  filePath?: string;
  tags?: Tags;
  [key: string]: unknown;
}

export interface AppItem {
  name: string;
  uniqueName?: string;
  displayName?: string;
  appType?: string;
  solution?: string;
  status?: string;
  entityCount?: number;
  entityDependencies?: string[];
  connections?: string[];
  tags?: Tags;
  // Enriched at runtime by enrichWithRelationships()
  _relDashboards?: string[];
  _relWebResources?: string[];
  _relSiteMaps?: string[];
  _relDashboardDetails?: { name: string; subtitle: string; searchName: string; itemId?: string }[];
  _relSiteMapDetails?: { name: string; subtitle: string; searchName: string }[];
  _relWebResourceDetails?: { name: string; subtitle: string; searchName: string }[];
  _relEntityDetails?: { logicalName: string; displayName: string; iconKey: string; searchName: string }[];
  [key: string]: unknown;
}

export interface ReportItem {
  id?: string;
  name: string;
  fileName?: string;
  entity?: string;
  reportType?: string;
  solution?: string;
  version?: string;
  isCustomizable?: boolean;
  relatedEntities?: string[];
  categories?: string[];
  visibilities?: string[];
  tags?: Tags;
  [key: string]: unknown;
}

export interface SecurityRoleItem {
  id: string;
  name: string;
  solution?: string;
  category?: string;
  isCustomizable?: boolean;
  totalPrivileges?: number;
  entityAccessCount?: number;
  privilegeCounts?: Record<string, number>;
  levelCounts?: Record<string, number>;
  entityPermissions?: EntityPermission[];
  tags?: Tags;
  [key: string]: unknown;
}

export interface EntityPermission {
  entity: string;
  create: string;
  read: string;
  write: string;
  delete: string;
}

export interface Tags {
  processCatalogL1?: string;
  processCatalogL2?: string;
  processCatalogL3?: string;
  processCatalogL4?: string;
  processCatalogL5?: string;
  processCatalogL6?: string;
  vertical?: string;
  capability?: string;
  d365Module?: string;
  category?: string;
  integration?: string;
  okr?: string;
  sprint?: string;
  featureEpic?: string;
  userFacing?: boolean;
  needsReview?: boolean;
  hasPlugins?: boolean;
  pluginCount?: number;
  isOOB?: boolean;
  complexity?: string;
  purpose?: string;
  functionalArea?: string;
  // Override-sourced fields (AppInventory overrides)
  userRole?: string;
  primaryModule?: string;
  processCatalogL1Secondary?: string[];
  // CDM (Common Data Model) enrichment
  cdmGroup?: string;
  cdmEntity?: string;
  cdmDescription?: string;
  cdmStandard?: boolean;
  [key: string]: string | boolean | number | string[] | undefined;
}

// Process Catalog types
export interface ProcessCatalog {
  metadata: {
    source: string;
    enrichedDate: string;
    levels: Record<string, { name: string; count: number }>;
    totalProcesses: number;
  };
  l1Processes: L1Process[];
  l2Processes: L2Process[];
  l3Processes: L3Process[];
  l4Processes?: L4Process[];
  l5Processes?: L5Process[];
  l6Processes?: L6Process[];
  lookup: {
    l1: Record<string, string>;
    l2: Record<string, string>;
    l3: Record<string, string>;
  };
}

interface L1Process {
  sequenceId: string;
  code: string;
  title: string;
  description?: string;
  microsoftReferences?: string[];
  catalogStatus?: string;
  apqc?: { id: string; description: string };
  applicationFamily?: string;
  products?: string;
  microsoftId?: string;
}

interface L2Process extends L1Process {
  parentL1: string;
  parentL1Code: string;
}

interface L3Process extends L2Process {
  parentL2: string;
  parentL2Code: string;
}

export interface L4Process extends L3Process {
  parentL3: string;
  parentL3Code: string;
}

export interface L5Process extends L4Process {
  parentL4?: string;
  parentL4Code?: string;
}

interface L6Process extends L5Process {
  parentL5?: string;
  parentL5Code?: string;
}

// Option Set types
export interface OptionSetItem {
  schemaName: string;
  displayName?: string;
  optionSetType?: string;
  isGlobal?: boolean;
  isCustomizable?: boolean;
  version?: string;
  solution?: string;
  prefix?: string;
  optionCount?: number;
  options?: { label: string; value: number; isHidden: boolean }[];
  entities?: string[];
  category?: string;
  tags?: Tags;
  [key: string]: unknown;
}

// Environment Variable types
export interface EnvironmentVariableItem {
  schemaName: string;
  displayName?: string;
  description?: string;
  dataType?: string;
  isSecret?: boolean;
  isRequired?: boolean;
  defaultValue?: string;
  hasDefaultValue?: boolean;
  solution?: string;
  category?: string;
  version?: string;
  tags?: Tags;
  _relWorkflows?: string[];
  [key: string]: unknown;
}

// Site Map types
export interface SiteMapItem {
  name: string;
  solution?: string;
  areaCount?: number;
  totalGroups?: number;
  totalSubAreas?: number;
  totalEntities?: number;
  areas?: SiteMapArea[];
  tags?: Tags;
  _relApps?: string[];
  [key: string]: unknown;
}

interface SiteMapArea {
  id: string;
  title: string;
  groupCount: number;
  groups: SiteMapGroup[];
}

interface SiteMapGroup {
  id: string;
  title: string;
  subAreaCount: number;
  entityCount: number | null;
  subAreas: SiteMapSubArea[];
}

interface SiteMapSubArea {
  id: string;
  title: string;
  type: string;
  entity?: string;
  url?: string | null;
}

// Template types
export interface TemplateItem {
  id: string;
  title: string;
  description?: string | null;
  templateTypeName?: string;
  isCustomizable?: boolean;
  version?: string;
  solution?: string;
  category?: string;
  tags?: Tags;
  [key: string]: unknown;
}

// Dashboard types
export interface DashboardItem {
  id: string;
  name: string;
  solution?: string;
  isCustomizable?: boolean;
  isDefault?: boolean;
  isTabletEnabled?: boolean;
  version?: string;
  entityCount?: number;
  category?: string;
  tags?: Tags;
  _relApps?: string[];
  [key: string]: unknown;
}

// Mobile Offline types
export interface MobileOfflineItem {
  name: string;
  solution?: string;
  entityCount?: number;
  entities?: { name: string; entitySchemaName: string; syncInterval: number; hasFilter: boolean }[];
  tags?: Tags;
  [key: string]: unknown;
}

// AI Component types (bot components, custom APIs, AI skills combined)
export interface AIComponentItem {
  name: string;
  uniqueName?: string;
  displayName?: string;
  description?: string | null;
  componentType?: string;
  parentBot?: string;
  entity?: string;
  skillType?: string;
  isCustomizable?: boolean;
  solution?: string;
  tags?: Tags;
  [key: string]: unknown;
}

// Plugin Step types
export interface PluginStepItem {
  id: string;
  name: string;
  description?: string;
  className?: string;
  shortClassName?: string;
  assembly?: string;
  entity?: string | null;
  message?: string;
  stage?: string;
  mode?: string;
  rank?: number;
  filteringAttributeCount?: number;
  isCustomizable?: boolean;
  version?: string;
  solution?: string;
  tags?: Tags;
  // Enriched from PluginConfigs
  _businessRules?: { attribute: string; dataType: string; deployForm: boolean; deployPlugin: boolean; isCustomField?: boolean; when?: string; setValue?: string }[];
  [key: string]: unknown;
}

// App Action types
export interface AppActionItem {
  uniqueName?: string;
  name: string;
  buttonLabel?: string;
  appModule?: string;
  contextEntity?: string;
  fontIcon?: string;
  location?: number;
  sequence?: string;
  isHidden?: boolean;
  isDisabled?: boolean;
  isCustomizable?: boolean;
  onClickType?: number;
  commandLibrary?: string;
  stateCode?: number;
  statusCode?: number;
  solution?: string;
  category?: string;
  tags?: Tags;
  [key: string]: unknown;
}

// Azure types
export interface AzureData {
  logicApps: AzureLogicApp[];
  functions: AzureFunction[];
  externalIntegrations: AzureIntegration[];
  summary: {
    byType?: Record<string, number>;
    byTrigger?: Record<string, number>;
    byDirection?: Record<string, number>;
  };
}

export interface AzureLogicApp {
  name: string;
  trigger: string;
  direction: string;
  description?: string;
  relatedEntity?: string;
  tags?: Tags;
  _hasOverride?: boolean;
  [key: string]: unknown;
}

export interface AzureFunction {
  name: string;
  trigger: string;
  runtime?: string;
  purpose?: string;
  description?: string;
  calledBy?: string;
  tags?: Tags;
  _hasOverride?: boolean;
  [key: string]: unknown;
}

export interface AzureIntegration {
  name: string;
  type?: string;
  direction?: string;
  trigger?: string;
  connector?: string;
  tags?: Tags;
  _hasOverride?: boolean;
  [key: string]: unknown;
}

// Entity Column Inventory types (matches EntityColumnInventory.json)
export interface EntityColumnInfo {
  displayName: string;
  description?: string;
  totalColumns: number;
  customColumns: number;
  oobColumns: number;
  settings?: Record<string, boolean | string | null>;
  solutions?: string[];
  columns?: { logicalName: string; displayName: string; description?: string; type: string; isCustom: boolean; requiredLevel?: string; format?: string; maxLength?: number }[];
}

// Inventory wrapper types (match JSON file shapes)
interface FormInventory {
  metadata?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  forms: FormItem[];
}

interface ViewInventory {
  metadata?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  views: ViewItem[];
}

// Flow-Entity map types (matches FlowEntityMap.json)
export interface FlowEntityInteraction {
  type: string;       // "trigger" | "action"
  operation: string;  // "get" | "list" | "update" | "create" | "createorupdate" | "delete" etc.
  columns?: string[];
}

export interface FlowEntityByEntityFlow {
  name: string;
  solution: string;
  interactions: FlowEntityInteraction[];
}

export interface FlowEntityByFlowEntity {
  entity: string;
  operations: string[];       // e.g. ["action:get", "trigger:update"]
  columnsReferenced: string[];
}

export interface FlowEntityMap {
  metadata: {
    generatedDate: string;
    generatorScript: string;
    totalFlows: number;
    flowsWithEntityRefs: number;
    uniqueEntities: number;
    totalInteractions: number;
    parseErrors: number;
  };
  byEntity: Record<string, {
    flowCount: number;
    flows: FlowEntityByEntityFlow[];
  }>;
  byFlow: Record<string, {
    solution: string;
    entityCount: number;
    entities: FlowEntityByFlowEntity[];
  }>;
  summary?: unknown;
}

// Relationship index types (matches RelationshipIndex.json)
interface EntityRelationships {
  forms: string[];
  views: string[];
  optionSets: string[];
  pluginSteps: string[];
  workflows: string[];
}

interface AppRelationships {
  displayName: string;
  entities: string[];
  dashboards: string[];
  webResources: string[];
  siteMaps: string[];
}

export interface RelationshipIndex {
  metadata: {
    generated: string;
    description: string;
    stats: {
      totalRelationships: number;
      entities: number;
      apps: number;
      workflowsWithEnvVars: number;
      envVarsWithWorkflows: number;
      byType: Record<string, number>;
    };
  };
  byEntity: Record<string, EntityRelationships>;
  byApp: Record<string, AppRelationships>;
  byWorkflow: Record<string, { envVars: string[] }>;
  byEnvVar: Record<string, { workflows: string[] }>;
  byDashboard: Record<string, { apps: string[] }>;
  bySiteMap: Record<string, { apps: string[] }>;
  byWebResource: Record<string, { apps: string[] }>;
  /** Map of form GUID (normalized, no braces) → JS libraries referenced on that form */
  byFormJS?: Record<string, { libraries?: string[] }>;
  entityRelationships?: Array<{
    name: string;
    type: string;
    from: string;
    to: string;
    lookupField?: string;
    cascadeDelete?: string;
    description?: string;
    solution?: string;
  }>;
}

// Capability Map types
export interface TertiarySubCapability {
  name: string;
  componentCount: number;
  componentsByType: Record<string, number>;
  entities: string[];
  topKeywords: string[];
  components: string[];
}

export interface SubCapability {
  name: string;
  bpc_l3: string;
  functionalArea: string;
  componentCount: number;
  componentsByType: Record<string, number>;
  entities: string[];
  topKeywords: string[];
  components: string[];
  tertiarySubCapabilities?: TertiarySubCapability[];
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  componentCount: number;
  componentsByType: Record<string, number>;
  subCapabilities: SubCapability[];
  components: string[];
}

export interface CapabilityMap {
  generatedAt: string;
  totalClusters: number;
  totalComponentsClustered: number;
  totalSubCapabilities: number;
  totalTertiarySubCapabilities?: number;
  capabilities: Capability[];
  [key: string]: unknown;
}

// Data store shape
export interface DashboardData {
  plugins: { plugins: PluginItem[] } | null;
  entities: { entities: Record<string, EntityItem[]>; standardEntitiesCustomized?: EntityItem[] } | null;
  forms: FormInventory | null;
  views: ViewInventory | null;
  workflows: { workflows: WorkflowItem[] } | null;
  webresources: { webResources: WebResourceItem[] } | null;
  powerAutomate: { flows: FlowItem[] } | null;
  apps: { modelDrivenApps: AppItem[]; canvasApps: AppItem[] } | null;
  reports: { reports: ReportItem[] } | null;
  securityRoles: { roles: SecurityRoleItem[] } | null;
  processCatalog: ProcessCatalog | null;
  capabilityMap: CapabilityMap | null;
  azure: AzureData | null;
  optionSets: { optionSets: OptionSetItem[] } | null;
  envVars: { environmentVariables: EnvironmentVariableItem[] } | null;
  siteMaps: { siteMaps: SiteMapItem[] } | null;
  templates: { templates: TemplateItem[] } | null;
  dashboards: { dashboards: DashboardItem[] } | null;
  mobileOffline: { profiles: MobileOfflineItem[] } | null;
  aiComponents: { botComponents: AIComponentItem[]; customAPIs: AIComponentItem[]; aiSkillConfigs: AIComponentItem[] } | null;
  pluginSteps: { pluginSteps: PluginStepItem[] } | null;
  pcf: { controls: Record<string, unknown>[] } | null;
  appActions: { appActions: AppActionItem[] } | null;
  relationships: RelationshipIndex | null;
  flowEntityMap: FlowEntityMap | null;
  entityColumns: { metadata: Record<string, unknown>; entities: Record<string, EntityColumnInfo> } | null;
  entityDescriptions: { entities: Record<string, { displayName?: string; description?: string; schemaName?: string }> } | null;
  canvasAppSources: CanvasAppSources | null;
  entityMaps: EntityMaps | null;
  formDetails: FormDetailsData | null;
  viewDetails: ViewDetailsData | null;
  pluginConfigs: PluginConfigsData | null;
  ribbonCustomizations: RibbonCustomizationsData | null;
  flowComplexity: FlowComplexityData | null;
  solutionDependencies: SolutionDependenciesData | null;
  webResourceCodeAnalysis: WebResourceCodeAnalysisData | null;
  orphanedComponents: OrphanedComponentsData | null;
  governanceFindings: GovernanceFindingsData | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  environmentDrift: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  environmentComponentMatrix: any | null;
}

export interface GovernanceFinding {
  ruleId: string;
  name: string;
  severity: "high" | "medium" | "warning" | "info";
  category: string;
  count: number;
  message: string;
  items: string[];
  recommendation: string;
  status: string;
  /** "system" for aggregate checks, "component" for per-item checks */
  scope?: "system" | "component";
  /** Component type this rule applies to (e.g., "flow", "webresource") */
  componentType?: string;
  /** Per-item detail for component-scoped findings */
  itemDetails?: Record<string, { detail: string }>;
}

export interface GovernanceFindingsData {
  metadata: { auditDate: string; rulesVersion: string };
  summary: {
    totalFindings: number;
    bySeverity: Record<string, number>;
    score: number;
  };
  findings: GovernanceFinding[];
}

/** Reference to a governance rule on a per-component item (from analysis scripts) */
export interface GovernanceFindingRef {
  ruleId: string;
  detail?: string;
  evidence?: string[];
}

/** Enriched governance finding resolved onto an individual item at runtime */
export interface EnrichedGovernanceFinding {
  ruleId: string;
  name: string;
  severity: "high" | "medium" | "warning" | "info";
  detail?: string;
  evidence?: string[];
  recommendation: string;
}

// --- Round 2 deep extraction types ---

export interface FlowComplexityEntry {
  name: string;
  solution: string;
  triggerType: string;
  triggerEntity: string;
  totalActions: number;
  maxDepth: number;
  complexityScore: number;
  complexity: string;
  metrics: { ifCount: number; foreachCount: number; switchCount: number; scopeCount: number; httpCount: number; childFlows: number; connectorActions: number };
  httpUrls: string[];
  connectors: string[];
  governanceFlags: string[];
  governanceFindings?: GovernanceFindingRef[];
  hasErrorHandling: boolean;
}

export interface FlowComplexityData {
  metadata: Record<string, unknown>;
  complexityDistribution: Record<string, number>;
  flows: FlowComplexityEntry[];
  externalEndpoints: { host: string; urls: string[]; flows: string[] }[];
  connectorUsage: Record<string, number>;
}

export interface SolutionDependencyEntry {
  uniqueName: string;
  displayName: string;
  version: string;
  isManaged: boolean;
  publisher: string;
  publisherPrefix: string;
  description: string;
  dependsOn: string[];
  dependencyCount: number;
  missingDependencyCount: number;
}

export interface SolutionDependenciesData {
  metadata: Record<string, unknown>;
  solutions: SolutionDependencyEntry[];
  dependencies: { from: string; to: string; componentCount: number }[];
  missingDependencies: { solution: string; missing: Record<string, unknown>[]; count: number }[];
  installOrder: string[];
}

export interface WebResourceCodeEntry {
  name: string;
  solution: string;
  lineCount: number;
  isRulesEngine: boolean;
  isCustom: boolean;
  functionCount: number;
  functions: string[];
  apiCallCount: number;
  apiCalls: { operation: string; entity: string }[];
  deprecatedCount: number;
  deprecated: { pattern: string; count: number }[];
  fieldRefCount: number;
  fieldRefs: string[];
  externalUrls: string[];
  governanceFlags: string[];
  governanceFindings?: GovernanceFindingRef[];
}

export interface WebResourceCodeAnalysisData {
  metadata: Record<string, unknown>;
  files: WebResourceCodeEntry[];
  apiCalls: { file: string; operation: string; entity: string }[];
  deprecated: { file: string; pattern: string; count: number }[];
  byEntity: Record<string, { file: string; operation: string }[]>;
}

export interface OrphanedComponentsData {
  metadata: Record<string, unknown>;
  orphans: { type: string; name: string; schemaName: string; reason: string; severity: string; solution?: string }[];
}

// --- New deep extraction types ---

export interface CanvasAppSource {
  name: string;
  displayName: string;
  description?: string;
  status?: string;
  version?: string;
  solution?: string;
  formFactor?: string;
  entities: { friendlyName: string; logicalName: string; entitySetName?: string }[];
  entityCount: number;
  connectors: { id?: string; displayName?: string; tier?: string }[];
  connectorCount: number;
}

export interface CanvasAppSources {
  metadata: Record<string, unknown>;
  apps: CanvasAppSource[];
  byEntity: Record<string, { appName: string; displayName: string; friendlyName: string }[]>;
}

export interface EntityMapEntry {
  sourceEntity: string;
  targetEntity: string;
  fieldMappings: { sourceField: string; targetField: string }[];
  fieldCount: number;
  solutions: string[];
}

export interface EntityMaps {
  metadata: Record<string, unknown>;
  maps: EntityMapEntry[];
  bySource: Record<string, { target: string; fieldCount: number }[]>;
  byTarget: Record<string, { source: string; fieldCount: number }[]>;
}

export interface FormDetailEntry {
  formId: string;
  entity: string;
  formType: string;
  solution: string;
  tabCount: number;
  totalFields: number;
  tabs: { label: string; sections: { label: string; fields: { controlId: string; type: string; field?: string; label: string; disabled?: boolean; targetEntity?: string }[]; fieldCount: number }[]; fieldCount: number }[];
  jsHandlers: { event: string; attribute?: string; library: string; function: string; enabled: boolean }[];
  jsHandlerCount: number;
  subgridCount: number;
}

export interface FormDetailsData {
  metadata: Record<string, unknown>;
  forms: FormDetailEntry[];
  subgrids: { formId: string; entity: string; targetEntity: string; controlId: string; label: string; tab: string; section: string; solution: string }[];
  jsHandlers: { formId: string; entity: string; event: string; attribute?: string; library: string; function: string; solution: string }[];
  byEntity: Record<string, { formId: string; formType: string; tabCount: number; totalFields: number; jsHandlerCount: number; subgridCount: number }[]>;
  byLibrary: Record<string, { formId: string; entity: string; event: string; function: string }[]>;
}

export interface ViewDetailEntry {
  viewId: string;
  entity: string;
  name: string;
  solution: string;
  queryType: string;
  isDefault: boolean;
  isQuickFind: boolean;
  columns: { name: string; width: number }[];
  columnCount: number;
  filters: { field: string; operator: string; value?: string }[];
  filterCount: number;
  linkedEntities: { entity: string; from: string; to: string; linkType?: string; alias?: string }[];
  linkedEntityCount: number;
  sortFields: { field: string; descending: boolean }[];
}

export interface ViewDetailsData {
  metadata: Record<string, unknown>;
  views: ViewDetailEntry[];
  byEntity: Record<string, { viewId: string; name: string; queryType: string; columnCount: number; filterCount: number }[]>;
  columnUsage: Record<string, number>;
}

export interface PluginConfigEntry {
  stepId: string;
  stepName: string;
  pluginType: string;
  entity: string;
  solution: string;
  ruleCount: number;
  rules: { attribute: string; dataType: string; deployForm: boolean; deployPlugin: boolean; priority?: number; isCustomField: boolean; when?: string; setValue?: string }[];
  isRulesEngine: boolean;
}

export interface PluginConfigsData {
  metadata: Record<string, unknown>;
  configs: PluginConfigEntry[];
  fieldRules: { entity: string; attribute: string; stepName: string; dataType: string; deployForm: boolean; deployPlugin: boolean; solution: string }[];
  byEntity: Record<string, { stepName: string; ruleCount: number; isRulesEngine: boolean }[]>;
  byAttribute: Record<string, { stepName: string; dataType: string; deployForm: boolean; deployPlugin: boolean }[]>;
}

export interface RibbonCustomizationsData {
  metadata: Record<string, unknown>;
  customizations: { type: string; entity: string; id: string; location?: string; solution: string; jsActions?: { library: string; function: string }[] }[];
  byEntity: Record<string, { type: string; id: string; location?: string; solution: string }[]>;
}

// Cross-reference types for entity impact analysis
/** A single item in a cross-reference section */
export interface CrossReferenceItem {
  name: string;
  subtitle?: string;    // e.g., form type, message type
  tabId?: string;       // Target tab for navigation (omit for display-only items)
  searchName?: string;  // Search term for cross-tab nav
  itemId?: string;      // Target's config.idField value for direct selection
  children?: { name: string; subtitle?: string }[];  // Nested sub-items (e.g., field rules under a plugin step)
}

/** A group of cross-referenced components */
export interface CrossReferenceSection {
  title: string;        // e.g., "Forms", "Views"
  icon: string;         // Icon key (matches tabLucideIcons)
  items: CrossReferenceItem[];
}

// Detail config type for dynamic detail rendering
export interface DetailConfig<T = Record<string, unknown>> {
  getHeader: (item: T) => { title: string; subtitle?: string };
  getDescription?: (item: T) => string | undefined;
  getGridRows: (item: T) => Array<{ label: string; value?: string | undefined; mono?: boolean; html?: React.ReactNode }>;
  getPillSections: (item: T) => Array<{ title: string; items: string[] }>;
  getCrossReferences?: (item: T) => CrossReferenceSection[];
  renderExtra?: (item: T) => React.ReactNode;
}

// Field configuration for dynamic forms
export interface FieldConfig {
  key: string; // Field name (e.g., 'displayName')
  label: string; // Display label
  type: "text" | "textarea" | "number" | "checkbox" | "select";
  readOnly?: boolean; // Default: false
  options?: string[]; // For select dropdowns
  placeholder?: string;
  required?: boolean;
  section?: "basic" | "tags"; // Which section to show in (default: basic)
}

// Explorer config type
export interface ExplorerConfig<T = Record<string, unknown>> {
  dataKey: keyof DashboardData;
  fileName: string;
  idField: string;
  icon?: string; // Icon filename in /icons/
  getItems: (data: DashboardData) => T[];
  sortBy: (item: T) => string;
  searchPlaceholder: string;
  searchFields: string[];
  listTitle: (item: T) => string;
  listSubtitle: (item: T) => string;
  listPills?: (item: T) => PillDef[];
  filters: FilterDef[];
  stats: (items: T[]) => StatDef[];
  renderDetail?: (item: T, onNavigate: (tabId: string, searchName: string) => void) => React.ReactNode; // For special cases (app-detail, security-detail)
  detailConfig?: DetailConfig<T>; // For standard detail rendering
  editableFields?: FieldConfig[]; // Fields to show in edit panel
}

export interface PillDef {
  text: string;
  color?: string;
  iconKey?: string;
}

export interface FilterDef {
  id: string;
  label: string;
  field: string;
}

export interface StatDef {
  num: number | string;
  label: string;
}
