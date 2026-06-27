// One-shot authoring tool: emits a coherent, fully-fictional "Contoso" D365 org
// as the synthetic JSON seeds the OKF standalone emitter reads. Run once:
//   node gen-contoso.mjs <outDir>
// Everything here is invented (publisher prefix `con_`, company "Contoso").
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT = process.argv[2];
if (!OUT) { console.error("usage: node gen-contoso.mjs <outDir>"); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const w = (f, o) => { writeFileSync(join(OUT, f), JSON.stringify(o, null, 2) + "\n"); console.log("  " + f); };

const NOW = "2026-06-26T00:00:00.000Z"; // fixed timestamp for deterministic output
const SOL = { core: "ContosoCore", fs: "ContosoFieldService", sales: "ContosoSales" };

// ── entities ──────────────────────────────────────────────────────────
const E = (logicalName, displayName, description, solution, mod, l1, vertical) =>
  ({ logicalName, displayName, description, solution, tags: { d365Module: mod, processCatalogL1: l1, vertical } });

const fieldService = [
  E("con_workorder", "Work Order", "A unit of field work scheduled, dispatched, and billed.", SOL.fs, "Field Service", "FS.00 Service Delivery", "Field Service"),
  E("con_servicevisit", "Service Visit", "A technician's on-site visit fulfilling a work order.", SOL.fs, "Field Service", "FS.00 Service Delivery", "Field Service"),
  E("con_agreement", "Service Agreement", "A recurring maintenance contract that generates work orders.", SOL.fs, "Field Service", "FS.00 Service Delivery", "Field Service"),
  E("con_asset", "Customer Asset", "A serviceable piece of equipment installed at a customer site.", SOL.fs, "Field Service", "FS.00 Service Delivery", "Field Service"),
  E("con_technician", "Technician", "A field resource who performs service visits.", SOL.fs, "Field Service", "FS.00 Service Delivery", "Field Service"),
  E("con_part", "Part", "An inventory item consumed while completing a work order.", SOL.fs, "Field Service", "FS.00 Service Delivery", "Field Service"),
  E("con_inspection", "Inspection", "A checklist outcome captured during a service visit.", SOL.fs, "Field Service", "FS.00 Service Delivery", "Field Service"),
];
const sales = [
  E("con_quote", "Quote", "A priced proposal sent to a prospective customer.", SOL.sales, "Sales", "SA.00 Sales to Order", "Field Service"),
  E("con_project", "Installation Project", "A multi-visit installation engagement won from a quote.", SOL.sales, "Sales", "SA.00 Sales to Order", "Field Service"),
];
const core = [
  E("con_invoice", "Invoice", "A billing document raised when a work order completes.", SOL.core, "Finance", "FS.00 Service Delivery", "Field Service"),
];
const standardEntitiesCustomized = [
  E("account", "Account", "Customer organization (standard table, customized for field service).", SOL.core, "Sales", "SA.00 Sales to Order", "Field Service"),
  E("contact", "Contact", "Individual at a customer site (standard table, customized).", SOL.core, "Sales", "SA.00 Sales to Order", "Field Service"),
];
const allEntities = [...fieldService, ...sales, ...core, ...standardEntitiesCustomized];
const allLn = allEntities.map(e => e.logicalName);

w("EntityInventory.json", { entities: { fieldService, sales, core }, standardEntitiesCustomized });

// ── columns ───────────────────────────────────────────────────────────
const C = (logicalName, type) => ({ logicalName, type });
const cols = {
  con_workorder: [C("con_name", "string"), C("con_status", "optionset"), C("con_priority", "optionset"), C("con_account", "lookup"), C("con_technician", "lookup"), C("con_asset", "lookup"), C("con_scheduledstart", "datetime"), C("con_totalamount", "money")],
  con_servicevisit: [C("con_name", "string"), C("con_workorder", "lookup"), C("con_technician", "lookup"), C("con_outcome", "optionset"), C("con_arrivaltime", "datetime"), C("con_departuretime", "datetime")],
  con_agreement: [C("con_name", "string"), C("con_account", "lookup"), C("con_type", "optionset"), C("con_startdate", "datetime"), C("con_renewaldate", "datetime"), C("con_active", "boolean")],
  con_asset: [C("con_name", "string"), C("con_serialnumber", "string"), C("con_type", "optionset"), C("con_account", "lookup"), C("con_installdate", "datetime")],
  con_technician: [C("con_name", "string"), C("con_skilllevel", "string"), C("con_region", "string"), C("con_active", "boolean")],
  con_part: [C("con_name", "string"), C("con_sku", "string"), C("con_unitcost", "money"), C("con_onhand", "integer")],
  con_inspection: [C("con_name", "string"), C("con_servicevisit", "lookup"), C("con_result", "optionset"), C("con_notes", "memo")],
  con_quote: [C("con_name", "string"), C("con_account", "lookup"), C("con_totalamount", "money"), C("con_status", "optionset")],
  con_project: [C("con_name", "string"), C("con_account", "lookup"), C("con_quote", "lookup"), C("con_targetdate", "datetime")],
  con_invoice: [C("con_name", "string"), C("con_workorder", "lookup"), C("con_amount", "money"), C("con_duedate", "datetime"), C("con_paid", "boolean")],
};
w("EntityColumnInventory.json", { entities: Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, { columns: v }])) });

// ── option sets ───────────────────────────────────────────────────────
const OS = (schemaName, displayName, solution) => ({ schemaName, displayName, solution, tags: {} });
const optionSets = [
  OS("con_workorderstatus", "Work Order Status", SOL.fs),
  OS("con_priority", "Priority", SOL.fs),
  OS("con_assettype", "Asset Type", SOL.fs),
  OS("con_visitoutcome", "Visit Outcome", SOL.fs),
  OS("con_agreementtype", "Agreement Type", SOL.fs),
  OS("con_inspectionresult", "Inspection Result", SOL.fs),
  OS("con_quotestatus", "Quote Status", SOL.sales),
];
w("OptionSetInventory.json", { optionSets });

// ── forms ─────────────────────────────────────────────────────────────
const FRM = (formId, name, solution, entity) => ({ formId, name, solution, entity, tags: {} });
const forms = [
  FRM("frm-workorder-main", "Work Order", SOL.fs, "con_workorder"),
  FRM("frm-servicevisit-main", "Service Visit", SOL.fs, "con_servicevisit"),
  FRM("frm-agreement-main", "Service Agreement", SOL.fs, "con_agreement"),
  FRM("frm-asset-main", "Customer Asset", SOL.fs, "con_asset"),
  FRM("frm-technician-main", "Technician", SOL.fs, "con_technician"),
  FRM("frm-inspection-main", "Inspection", SOL.fs, "con_inspection"),
  FRM("frm-quote-main", "Quote", SOL.sales, "con_quote"),
  FRM("frm-project-main", "Installation Project", SOL.sales, "con_project"),
  FRM("frm-invoice-main", "Invoice", SOL.core, "con_invoice"),
  FRM("frm-account-fs", "Account (Field Service)", SOL.core, "account"),
];
w("FormInventory.json", { forms });

// ── views ─────────────────────────────────────────────────────────────
const VW = (viewId, name, solution, entity) => ({ viewId, name, solution, entity, tags: {} });
const views = [
  VW("vw-workorder-active", "Active Work Orders", SOL.fs, "con_workorder"),
  VW("vw-workorder-overdue", "Overdue Work Orders", SOL.fs, "con_workorder"),
  VW("vw-servicevisit-today", "Today's Service Visits", SOL.fs, "con_servicevisit"),
  VW("vw-agreement-renewals", "Agreements Due for Renewal", SOL.fs, "con_agreement"),
  VW("vw-asset-byaccount", "Assets by Account", SOL.fs, "con_asset"),
  VW("vw-technician-active", "Active Technicians", SOL.fs, "con_technician"),
  VW("vw-inspection-failed", "Failed Inspections", SOL.fs, "con_inspection"),
  VW("vw-quote-open", "Open Quotes", SOL.sales, "con_quote"),
  VW("vw-project-inflight", "In-Flight Projects", SOL.sales, "con_project"),
  VW("vw-invoice-unpaid", "Unpaid Invoices", SOL.core, "con_invoice"),
];
w("ViewInventory.json", { views });

// ── workflows + power automate ────────────────────────────────────────
const WF = (id, name, description, primaryEntity, solution, l1) =>
  ({ id, name, description, primaryEntity, solution, tags: { processCatalogL1: l1 } });
const workflows = [
  WF("wf-assign-wo", "Assign Work Order to Technician", "Routes a new work order to the nearest available technician.", "con_workorder", SOL.fs, "FS.00 Service Delivery"),
  WF("wf-escalate-wo", "Escalate Overdue Work Order", "Notifies the dispatcher when a work order passes its SLA.", "con_workorder", SOL.fs, "FS.00 Service Delivery"),
  WF("wf-generate-invoice", "Generate Invoice on Completion", "Creates an invoice when a work order is marked complete.", "con_workorder", SOL.core, "FS.00 Service Delivery"),
  WF("wf-notify-visit", "Notify Technician of Visit", "Sends the technician an itinerary for the day's visits.", "con_servicevisit", SOL.fs, "FS.00 Service Delivery"),
  WF("wf-sync-asset", "Sync Asset to Field Service", "Keeps customer assets in step with installed equipment.", "con_asset", SOL.fs, "FS.00 Service Delivery"),
  // these two are cloud flows (folded via PowerAutomateInventory by matching id)
  WF("FLOW-RENEWAL", "Send Agreement Renewal Reminder", "Cloud flow emailing customers before an agreement lapses.", "con_agreement", SOL.fs, "FS.00 Service Delivery"),
  WF("FLOW-QUOTE-FOLLOWUP", "Quote Follow-up Reminder", "Cloud flow nudging the sales rep on stale open quotes.", "con_quote", SOL.sales, "SA.00 Sales to Order"),
];
w("WorkflowInventory.json", { workflows });
w("PowerAutomateInventory.json", { flows: [
  { id: "FLOW-RENEWAL", name: "Send Agreement Renewal Reminder", trigger: "Scheduled - daily", connectors: ["Office 365 Outlook", "Dataverse"], actionCount: 6 },
  { id: "FLOW-QUOTE-FOLLOWUP", name: "Quote Follow-up Reminder", trigger: "Dataverse - When a row is modified", connectors: ["Dataverse", "Office 365 Outlook"], actionCount: 4 },
] });

// ── plugins + steps ───────────────────────────────────────────────────
const plugins = [
  { id: "plg-wo-pricing", name: "WorkOrderPricingPlugin", businessLogic: "Calculates work-order totals from labor, parts, and agreement discounts.", solution: SOL.fs, tags: {} },
  { id: "plg-agreement-renew", name: "AgreementRenewalPlugin", businessLogic: "Rolls a service agreement's renewal date forward on confirmation.", solution: SOL.fs, tags: {} },
  { id: "plg-asset-validate", name: "AssetValidationPlugin", businessLogic: "Blocks duplicate serial numbers when registering a customer asset.", solution: SOL.fs, tags: {} },
  { id: "plg-invoice-number", name: "InvoiceNumberPlugin", businessLogic: "Stamps a sequential, prefixed invoice number on create.", solution: SOL.core, tags: {} },
];
w("PluginInventory.json", { plugins });
const pluginSteps = [
  { id: "step-wo-create", name: "Create of con_workorder — WorkOrderPricingPlugin", solution: SOL.fs, tags: {} },
  { id: "step-wo-update", name: "Update of con_workorder — WorkOrderPricingPlugin", solution: SOL.fs, tags: {} },
  { id: "step-agreement-update", name: "Update of con_agreement — AgreementRenewalPlugin", solution: SOL.fs, tags: {} },
  { id: "step-asset-create", name: "Create of con_asset — AssetValidationPlugin", solution: SOL.fs, tags: {} },
  { id: "step-invoice-create", name: "Create of con_invoice — InvoiceNumberPlugin", solution: SOL.core, tags: {} },
];
w("PluginStepInventory.json", { pluginSteps });

// ── apps ──────────────────────────────────────────────────────────────
w("AppInventory.json", {
  modelDrivenApps: [
    { uniqueName: "con_FieldServiceApp", displayName: "Contoso Field Service", solution: SOL.fs, tags: {} },
    { uniqueName: "con_SalesApp", displayName: "Contoso Sales", solution: SOL.sales, tags: {} },
  ],
  canvasApps: [
    { uniqueName: "con_TechnicianMobile", displayName: "Contoso Technician Mobile", solution: SOL.fs, tags: {} },
  ],
});

// ── security roles, web resources, dashboards, sitemaps, env vars, reports, templates ──
w("SecurityRoleInventory.json", { roles: [
  { id: "role-technician", name: "Contoso Field Technician", solution: SOL.fs, tags: {} },
  { id: "role-dispatcher", name: "Contoso Dispatcher", solution: SOL.fs, tags: {} },
  { id: "role-servicemgr", name: "Contoso Service Manager", solution: SOL.fs, tags: {} },
  { id: "role-salesrep", name: "Contoso Sales Rep", solution: SOL.sales, tags: {} },
] });
w("WebResourceInventory.json", { webResources: [
  { name: "con_/scripts/workorder.js", displayName: "Work Order Form Scripts", description: "Client-side validation and pricing preview on the work order form.", solution: SOL.fs, tags: {} },
  { name: "con_/scripts/agreement.js", displayName: "Agreement Form Scripts", description: "Renewal-date guards on the service agreement form.", solution: SOL.fs, tags: {} },
  { name: "con_/html/fswelcome.html", displayName: "Field Service Welcome", description: "Landing HTML embedded on the Field Service dashboard.", solution: SOL.fs, tags: {} },
  { name: "con_/images/logo.png", displayName: "Contoso Logo", description: "Brand logo used across model-driven apps.", solution: SOL.core, tags: {} },
] });
w("DashboardInventory.json", { dashboards: [
  { id: "dash-fs-overview", name: "Field Service Overview", solution: SOL.fs, tags: {} },
  { id: "dash-sales-pipeline", name: "Sales Pipeline", solution: SOL.sales, tags: {} },
] });
w("SiteMapInventory.json", { siteMaps: [
  { name: "Contoso Field Service Sitemap", solution: SOL.fs, tags: {} },
  { name: "Contoso Sales Sitemap", solution: SOL.sales, tags: {} },
] });
w("EnvironmentVariableInventory.json", { environmentVariables: [
  { schemaName: "con_FieldServiceApiUrl", displayName: "Field Service API URL", description: "Base URL of the dispatch scheduling API.", solution: SOL.fs, tags: {} },
  { schemaName: "con_DefaultRegion", displayName: "Default Region", description: "Region used when a technician has none set.", solution: SOL.fs, tags: {} },
  { schemaName: "con_InvoicePrefix", displayName: "Invoice Prefix", description: "Prefix stamped onto generated invoice numbers.", solution: SOL.core, tags: {} },
] });
w("ReportInventory.json", { reports: [
  { name: "Work Order Summary", solution: SOL.fs, tags: {} },
  { name: "Technician Utilization", solution: SOL.fs, tags: {} },
] });
w("TemplateInventory.json", { templates: [
  { id: "tpl-wo-confirm", title: "Work Order Confirmation Email", solution: SOL.fs, tags: {} },
  { id: "tpl-agreement-renewal", title: "Agreement Renewal Email", solution: SOL.fs, tags: {} },
] });

// ── process catalog (generic, fictional) ──────────────────────────────
w("ProcessCatalog.json", {
  l1Processes: [
    { code: "FS.00", title: "Service Delivery", description: "End-to-end delivery of field service work." },
    { code: "SA.00", title: "Sales to Order", description: "Turning prospects into booked installation work." },
  ],
  l2Processes: [
    { code: "FS.10", title: "Schedule & Dispatch", description: "Plan and route work orders to technicians.", parentL1Code: "FS.00" },
    { code: "FS.20", title: "Execute Work Order", description: "Perform the on-site service visit.", parentL1Code: "FS.00" },
    { code: "FS.30", title: "Invoice & Close", description: "Bill the customer and close out the job.", parentL1Code: "FS.00" },
    { code: "SA.10", title: "Lead to Quote", description: "Qualify a lead and produce a priced quote.", parentL1Code: "SA.00" },
    { code: "SA.20", title: "Quote to Order", description: "Convert an accepted quote into an installation project.", parentL1Code: "SA.00" },
  ],
  l3Processes: [
    { code: "FS.21", title: "Perform Inspection", description: "Capture checklist outcomes during the visit.", parentL2Code: "FS.20" },
    { code: "FS.22", title: "Record Parts Used", description: "Log inventory consumed against the work order.", parentL2Code: "FS.20" },
  ],
});

// ── capabilities (with sub- and tertiary sub-capabilities) ──────────────
w("capability-clusters.json", { capabilities: [
  {
    id: "cap-field-service", name: "Field Service Management",
    description: "Scheduling, dispatch, and execution of on-site work.",
    componentCount: 6, componentsByType: { entities: 3, workflows: 2, forms: 1 },
    components: ["con_workorder", "con_servicevisit", "con_technician", "Assign Work Order to Technician", "Notify Technician of Visit", "frm-workorder-main"],
    subCapabilities: [
      { name: "Scheduling & Dispatch", bpc_l3: "FS.10", functionalArea: "Operations", componentCount: 3, componentsByType: { entities: 2, workflows: 1 }, entities: ["con_workorder", "con_technician"], topKeywords: ["schedule", "dispatch", "route"], components: ["con_workorder", "con_technician", "Assign Work Order to Technician"],
        tertiarySubCapabilities: [ { name: "Auto-routing", componentCount: 1, entities: ["con_workorder"], topKeywords: ["route", "nearest"], components: ["Assign Work Order to Technician"] } ] },
      { name: "Visit Execution", bpc_l3: "FS.20", functionalArea: "Operations", componentCount: 2, componentsByType: { entities: 2 }, entities: ["con_servicevisit", "con_inspection"], topKeywords: ["visit", "inspection"], components: ["con_servicevisit", "con_inspection"], tertiarySubCapabilities: [] },
    ],
  },
  {
    id: "cap-asset-lifecycle", name: "Asset Lifecycle",
    description: "Tracking customer equipment from install through inspection.",
    componentCount: 3, componentsByType: { entities: 2, optionSets: 1 },
    components: ["con_asset", "con_inspection", "con_assettype"],
    subCapabilities: [
      { name: "Asset Registry", functionalArea: "Operations", componentCount: 2, entities: ["con_asset"], topKeywords: ["serial", "install"], components: ["con_asset", "AssetValidationPlugin"], tertiarySubCapabilities: [] },
    ],
  },
  {
    id: "cap-agreements", name: "Service Agreements",
    description: "Recurring maintenance contracts and their renewals.",
    componentCount: 3, componentsByType: { entities: 1, workflows: 1, plugins: 1 },
    components: ["con_agreement", "Send Agreement Renewal Reminder", "AgreementRenewalPlugin"],
    subCapabilities: [
      { name: "Renewals", functionalArea: "Service", componentCount: 2, entities: ["con_agreement"], topKeywords: ["renew", "reminder", "expire"], components: ["Send Agreement Renewal Reminder", "AgreementRenewalPlugin"], tertiarySubCapabilities: [] },
    ],
  },
  {
    id: "cap-quote-order", name: "Quote to Order",
    description: "Pricing proposals and converting them to installation projects.",
    componentCount: 3, componentsByType: { entities: 2, workflows: 1 },
    components: ["con_quote", "con_project", "Quote Follow-up Reminder"],
    subCapabilities: [
      { name: "Quoting", bpc_l3: "SA.10", functionalArea: "Sales", componentCount: 2, entities: ["con_quote"], topKeywords: ["quote", "price", "proposal"], components: ["con_quote", "Quote Follow-up Reminder"], tertiarySubCapabilities: [] },
    ],
  },
] });

// ── relationship index ────────────────────────────────────────────────
const byEntity = {
  con_workorder: { forms: ["frm-workorder-main"], views: ["vw-workorder-active", "vw-workorder-overdue"], optionSets: ["con_workorderstatus", "con_priority"], pluginSteps: ["step-wo-create", "step-wo-update"], workflows: ["Assign Work Order to Technician", "Escalate Overdue Work Order", "Generate Invoice on Completion"] },
  con_servicevisit: { forms: ["frm-servicevisit-main"], views: ["vw-servicevisit-today"], optionSets: ["con_visitoutcome"], workflows: ["Notify Technician of Visit"] },
  con_agreement: { forms: ["frm-agreement-main"], views: ["vw-agreement-renewals"], optionSets: ["con_agreementtype"], pluginSteps: ["step-agreement-update"], workflows: ["Send Agreement Renewal Reminder"] },
  con_asset: { forms: ["frm-asset-main"], views: ["vw-asset-byaccount"], optionSets: ["con_assettype"], pluginSteps: ["step-asset-create"], workflows: ["Sync Asset to Field Service"] },
  con_technician: { forms: ["frm-technician-main"], views: ["vw-technician-active"] },
  con_inspection: { forms: ["frm-inspection-main"], views: ["vw-inspection-failed"], optionSets: ["con_inspectionresult"] },
  con_quote: { forms: ["frm-quote-main"], views: ["vw-quote-open"], optionSets: ["con_quotestatus"], workflows: ["Quote Follow-up Reminder"] },
  con_project: { forms: ["frm-project-main"], views: ["vw-project-inflight"] },
  con_invoice: { forms: ["frm-invoice-main"], views: ["vw-invoice-unpaid"], pluginSteps: ["step-invoice-create"], workflows: ["Generate Invoice on Completion"] },
  account: { forms: ["frm-account-fs"] },
};
const byApp = {
  con_FieldServiceApp: {
    entities: ["con_workorder", "con_servicevisit", "con_agreement", "con_asset", "con_technician", "con_part", "con_inspection", "con_invoice", "account", "contact"],
    dashboards: ["dash-fs-overview"], webResources: ["con_/scripts/workorder.js", "con_/scripts/agreement.js", "con_/html/fswelcome.html"], siteMaps: ["Contoso Field Service Sitemap"],
  },
  con_SalesApp: {
    entities: ["con_quote", "con_project", "account", "contact"],
    dashboards: ["dash-sales-pipeline"], webResources: ["con_/images/logo.png"], siteMaps: ["Contoso Sales Sitemap"],
  },
};
const byWorkflow = {
  "Assign Work Order to Technician": { envVars: ["con_FieldServiceApiUrl", "con_DefaultRegion"] },
  "Generate Invoice on Completion": { envVars: ["con_InvoicePrefix"] },
};
// Dataverse entity relationship: a from->to lookup carries a schema name + cardinality.
const ER = (from, to, lookupField) => ({
  id: `${from}_${to}`, name: `${from}_${to}`, type: "ManyToOne",
  from, to, lookupField: lookupField ?? `${to.replace(/^con_/, "con_")}`, cascadeDelete: "RemoveLink",
  description: null, solution: SOL.fs,
});
const entityRelationships = [
  ER("con_workorder", "account", "con_account"), ER("con_workorder", "con_technician", "con_technician"), ER("con_workorder", "con_asset", "con_asset"),
  ER("con_servicevisit", "con_workorder", "con_workorder"), ER("con_servicevisit", "con_technician", "con_technician"),
  ER("con_agreement", "account", "con_account"), ER("con_agreement", "con_asset", "con_asset"),
  ER("con_asset", "account", "con_account"),
  ER("con_inspection", "con_servicevisit", "con_servicevisit"),
  ER("con_part", "con_workorder", "con_workorder"),
  ER("con_invoice", "con_workorder", "con_workorder"), ER("con_invoice", "account", "con_account"),
  ER("con_quote", "account", "con_account"), ER("con_quote", "contact", "con_contact"),
  ER("con_project", "account", "con_account"), ER("con_project", "con_quote", "con_quote"),
  ER("contact", "account", "parentcustomerid"),
];
w("RelationshipIndex.json", { byEntity, byApp, byWorkflow, entityRelationships });

// ── solutions + dependencies ────────────────────────────────────────────
const SOLN = (uniqueName, displayName, version, description, dependsOn) =>
  ({ uniqueName, displayName, version, isManaged: false, publisher: "Contoso", publisherPrefix: "con", description, dependsOn, dependencyCount: dependsOn.length, missingDependencyCount: 0 });
w("SolutionDependencies.json", {
  solutions: [
    SOLN("ContosoCore", "Contoso Core", "1.0.0.0", "Core tables, option sets, and shared configuration.", []),
    SOLN("ContosoFieldService", "Contoso Field Service", "1.2.0.0", "Work orders, agreements, assets, technicians, inspections.", ["ContosoCore"]),
    SOLN("ContosoSales", "Contoso Sales", "1.1.0.0", "Quotes and installation projects.", ["ContosoCore"]),
  ],
  dependencies: [
    { from: "ContosoFieldService", to: "ContosoCore", componentCount: 9 },
    { from: "ContosoSales", to: "ContosoCore", componentCount: 5 },
  ],
  missingDependencies: [],
  installOrder: ["ContosoCore", "ContosoFieldService", "ContosoSales"],
  metadata: { totalSolutions: 3, unmanagedCount: 3, managedCount: 0, totalDependencies: 2, withMissingDeps: 0, generated: NOW },
});

// ── governance findings (score = 100 - high*10 - med*5 - warn*2) ─────────
w("governance-findings.json", {
  metadata: { auditDate: NOW, totalFindings: 5 },
  findings: [
    { ruleId: "FORMS_NO_DESC", name: "Forms without a description", severity: "medium", category: "Documentation", count: 4, componentType: "Form", message: "4 forms have no description set.", recommendation: "Add a short description to each main form.", status: "open", scope: "ContosoFieldService", items: ["frm-asset-main", "frm-technician-main", "frm-inspection-main", "frm-invoice-main"] },
    { ruleId: "WF_UNTAGGED", name: "Automations missing a process tag", severity: "warning", category: "Process Alignment", count: 1, componentType: "Workflow", message: "1 automation is not mapped to a business process.", recommendation: "Tag automations with their BPC process code.", status: "open", scope: "ContosoSales", items: ["Quote Follow-up Reminder"] },
    { ruleId: "WR_NO_SOLUTION", name: "Web resource flagged for review", severity: "warning", category: "Solution Hygiene", count: 1, componentType: "WebResource", message: "1 web resource may be unused.", recommendation: "Confirm the resource is referenced by a form or remove it.", status: "open", scope: "ContosoCore", items: ["con_/images/logo.png"] },
    { ruleId: "PLUGIN_NO_DESC", name: "Plugin with sparse business-logic notes", severity: "high", category: "Documentation", count: 1, componentType: "Plugin", message: "1 plugin lacks documented business logic.", recommendation: "Document the plugin's purpose and trigger.", status: "open", scope: "ContosoCore", items: ["InvoiceNumberPlugin"] },
    { ruleId: "OPTSET_UNUSED", name: "Option set not bound to a column", severity: "medium", category: "Solution Hygiene", count: 1, componentType: "OptionSet", message: "1 global option set is not used by any column.", recommendation: "Bind it to a column or remove it.", status: "open", scope: "ContosoFieldService", items: ["con_inspectionresult"] },
  ],
});

// ── orphaned components ──────────────────────────────────────────────────
w("OrphanedComponents.json", {
  metadata: { total: 3, generated: NOW },
  orphans: [
    { type: "WebResource", name: "Contoso Logo", schemaName: "con_/images/logo.png", reason: "Not referenced by any form or sitemap.", severity: "low", solution: "ContosoCore" },
    { type: "OptionSet", name: "Inspection Result", schemaName: "con_inspectionresult", reason: "Not bound to any entity column.", severity: "medium", solution: "ContosoFieldService" },
    { type: "Report", name: "Technician Utilization", schemaName: "Technician Utilization", reason: "Not linked to any model-driven app.", severity: "low", solution: "ContosoFieldService" },
  ],
});

// ── Azure components ─────────────────────────────────────────────────────
w("AzureComponentInventory.json", {
  metadata: { generated: NOW, totalLogicApps: 2, totalFunctions: 2, totalExternalIntegrations: 2 },
  logicApps: [
    { name: "WorkOrderSyncLogicApp", description: "Pushes completed work orders to the billing system.", trigger: "Work order completed", direction: "Outbound", dataFlow: "Dataverse → Billing API", relatedEntity: "con_workorder", status: "Active" },
    { name: "AgreementRenewalLogicApp", description: "Generates renewal tasks for expiring agreements.", trigger: "Recurrence — daily", direction: "Internal", dataFlow: "Dataverse → Dataverse", relatedEntity: "con_agreement", status: "Active" },
  ],
  functions: [
    { name: "PricingCalcFunction", description: "Computes work-order pricing from labor and parts.", trigger: "HTTP", runtime: "dotnet-isolated", calledBy: "WorkOrderPricingPlugin", purpose: "Pricing", status: "Active" },
    { name: "InvoicePdfFunction", description: "Renders an invoice PDF on demand.", trigger: "HTTP", runtime: "dotnet-isolated", calledBy: "Contoso Field Service", purpose: "Document generation", status: "Active" },
  ],
  externalIntegrations: [
    { name: "Billing API", type: "REST", direction: "Outbound", trigger: "Work order completion", dataExchanged: "Invoices", connector: "HTTP" },
    { name: "Mapping Service", type: "REST", direction: "Outbound", trigger: "Dispatch", dataExchanged: "Routes & ETAs", connector: "Custom Connector" },
  ],
  summary: { totalAzureComponents: 6, byType: { logicApp: 2, function: 2, externalIntegration: 2 }, byTrigger: { HTTP: 2, scheduled: 1, event: 3 }, byDirection: { Outbound: 4, Internal: 2 } },
});

// ── PCF controls ─────────────────────────────────────────────────────────
w("PCFControlInventory.json", {
  metadata: { generated: NOW, totalControls: 2, summary: { byTechnology: { React: 2 } } },
  controls: [
    { name: "WorkOrderTimeline", namespace: "Contoso", version: "1.0.0", displayName: "Work Order Timeline", description: "Visual timeline of service visits on a work order.", controlType: "field", technology: "React", sourcePath: "controls/WorkOrderTimeline", boundProperties: ["con_status"], features: ["WebAPI"], externalIntegration: false, deployedTo: ["con_workorder"], solution: "ContosoFieldService", tags: {} },
    { name: "AssetMap", namespace: "Contoso", version: "1.1.0", displayName: "Asset Map", description: "Map of customer assets by site location.", controlType: "dataset", technology: "React", sourcePath: "controls/AssetMap", boundProperties: [], features: ["WebAPI", "Device"], externalIntegration: true, deployedTo: ["con_asset"], solution: "ContosoFieldService", tags: {} },
  ],
});

// ── AI components ────────────────────────────────────────────────────────
w("AIComponentInventory.json", {
  metadata: { generated: NOW, summary: { botComponents: 2, customAPIs: 2, aiSkillConfigs: 1 } },
  botComponents: [
    { schemaName: "con_fieldservicecopilot", name: "Field Service Copilot", description: "Answers technician questions about work orders and assets.", componentType: "Bot", componentTypeCode: 0, parentBot: "con_fieldservicecopilot", stateCode: 0, statusCode: 1, isCustomizable: true, solution: "ContosoFieldService", tags: {} },
    { schemaName: "con_fieldservicecopilot_topic_status", name: "Topic: Work Order Status", description: "Copilot topic that reports a work order's status.", componentType: "BotComponent", componentTypeCode: 1, parentBot: "con_fieldservicecopilot", stateCode: 0, statusCode: 1, isCustomizable: true, solution: "ContosoFieldService", tags: {} },
  ],
  customAPIs: [
    { uniqueName: "con_CalculatePricing", name: "con_CalculatePricing", displayName: "Calculate Pricing", description: "Returns a priced quote for a work order.", isFunction: true, isPrivate: false, isCustomizable: true, workflowEnabled: false, bindingType: "Global", parameterCount: 3, solution: "ContosoFieldService", tags: {} },
    { uniqueName: "con_GenerateInvoice", name: "con_GenerateInvoice", displayName: "Generate Invoice", description: "Creates an invoice for a completed work order.", isFunction: false, isPrivate: false, isCustomizable: true, workflowEnabled: true, bindingType: "Entity", parameterCount: 1, solution: "ContosoCore", tags: {} },
  ],
  aiSkillConfigs: [
    { uniqueName: "con_AssetImageRecognition", skillType: "AI Builder", description: "Recognizes equipment from a photo on the asset form.", entity: "con_asset", attribute: "con_serialnumber", scope: "Entity", stateCode: 0, statusCode: 1, isCustomizable: true, solution: "ContosoFieldService", tags: {} },
  ],
});

// ── app actions ──────────────────────────────────────────────────────────
w("AppActionInventory.json", {
  metadata: { generated: NOW, totalAppActions: 2, summary: {} },
  appActions: [
    { uniqueName: "con_CompleteWorkOrder", name: "Complete Work Order", buttonLabel: "Complete", appModule: "con_FieldServiceApp", contextEntity: "con_workorder", fontIcon: "CheckMark", location: "Form", sequence: 10, isHidden: false, isDisabled: false, isCustomizable: true, onClickType: "JavaScript", solution: "ContosoFieldService", tags: {} },
    { uniqueName: "con_GenerateInvoiceAction", name: "Generate Invoice", buttonLabel: "Invoice", appModule: "con_FieldServiceApp", contextEntity: "con_workorder", fontIcon: "Money", location: "Form", sequence: 20, isHidden: false, isDisabled: false, isCustomizable: true, onClickType: "CustomAPI", solution: "ContosoCore", tags: {} },
  ],
});

// ── mobile offline profiles ──────────────────────────────────────────────
w("MobileOfflineInventory.json", {
  metadata: { generated: NOW, totalProfiles: 1, totalEntitiesEnabled: 4, summary: {} },
  profiles: [
    { id: "mob-technician", name: "Field Technician Offline", solution: "ContosoFieldService", entityCount: 4, entities: ["con_workorder", "con_servicevisit", "con_asset", "con_inspection"], tags: {} },
  ],
});

console.log(`\nWrote synthetic Contoso seeds for ${allLn.length} entities to ${OUT}`);
