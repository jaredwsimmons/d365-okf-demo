// Data-driven authoring tool: turns a verified multi-module D365 "blueprint"
// (produced by the d365-complete-org-blueprint workflow) into the full set of
// synthetic Contoso inventory JSON the OKF standalone emitter reads. Unlike the
// hand-authored gen-contoso.mjs, this scales to a complete D365 org (all modules)
// and DERIVES the mechanical breadth — forms, views, dashboards, sitemaps, web
// resources, plugin steps, the relationship index, capability clusters, the
// process catalog, the solution dependency graph, governance findings, orphans —
// from the semantic core so everything stays cross-referentially coherent.
//
//   node gen-d365-complete.mjs <blueprint.json> <outDir>
//
// Everything is fictional: company "Contoso Ltd", publisher prefix `con_`. Real
// D365 out-of-box table/column names are used to mirror a genuine deployment.
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const [BP_PATH, OUT] = process.argv.slice(2);
if (!BP_PATH || !OUT) { console.error("usage: node gen-d365-complete.mjs <blueprint.json> <outDir>"); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const w = (f, o) => { writeFileSync(join(OUT, f), JSON.stringify(o, null, 2) + "\n"); console.log("  " + f); };

const NOW = "2026-06-26T00:00:00.000Z";
const blueprint = JSON.parse(readFileSync(BP_PATH, "utf-8"));
const MODULES = blueprint.modules || [];

// ── helpers ─────────────────────────────────────────────────────────────
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const camel = (s) => { const p = String(s).replace(/\([^)]*\)/g, "").split(/[^a-zA-Z0-9]+/).filter(Boolean); return p.map((x, i) => i === 0 ? x.toLowerCase() : x[0].toUpperCase() + x.slice(1).toLowerCase()).join(""); };
const titleize = (ln) => ln.replace(/^con_/, "").replace(/^msdyn(mkt|ci|hr|ce|crm)?_/, "").replace(/^ms(evtmgt|dyn)_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const plural = (s) => /s$/.test(s) ? s : /y$/.test(s) ? s.slice(0, -1) + "ies" : s + "s";
const uniqBy = (arr, key) => { const seen = new Set(); const out = []; for (const x of arr) { const k = key(x); if (seen.has(k)) continue; seen.add(k); out.push(x); } return out; };
const ENVIRONMENTS = ["Dev", "Test", "Prod"];

// solution names
const CORE = "ContosoCore";
const solManaged = (m) => m.solutionManaged || (m.module.replace(/[^a-zA-Z0-9]/g, "") + "Base");
const solCustom = (m) => m.solutionCustom || ("Contoso" + m.module.replace(/[^a-zA-Z0-9]/g, ""));

// ── 1. merge entities across modules (shared tables like account/contact) ──
const LAYER_RANK = { oob: 0, virtual: 1, oob_customized: 2, custom: 3 };
const entityMap = new Map();            // logicalName -> merged entity record
const entityModule = new Map();         // logicalName -> owning module (first seen / most custom)
for (const m of MODULES) {
  const l1 = m.processes?.l1 || { code: "PL.00", title: m.module };
  const l2list = m.processes?.l2 || [];
  const l3list = m.processes?.l3 || [];
  let entIdx = 0;
  for (const e of m.entities || []) {
    const ln = e.logicalName;
    if (!ln) continue;
    // assign ~half the entities down to an L3 (with its parent L2), the rest to an
    // L2 only — gives a realistic coverage mix and populates both L2 and L3 metrics.
    const l3 = (l3list.length && entIdx % 2 === 0) ? l3list[Math.floor(entIdx / 2) % l3list.length] : null;
    const l2 = l3 ? (l2list.find((x) => x.code === l3.parentL2) || (l2list.length ? l2list[entIdx % l2list.length] : null)) : (l2list.length ? l2list[entIdx % l2list.length] : null);
    entIdx++;
    const rec = entityMap.get(ln);
    if (!rec) {
      entityMap.set(ln, {
        logicalName: ln,
        displayName: e.displayName || titleize(ln),
        description: e.description || "",
        layer: e.layer || "oob",
        solution: (e.layer === "custom") ? solCustom(m) : (e.layer === "oob_customized") ? solCustom(m) : solManaged(m),
        columns: [...(e.columns || [])],
        relationships: [...(e.relationships || [])],
        module: m.module,
        processCatalogL1: `${l1.code} ${l1.title}`,
        processCatalogL2: l2 ? l2.code : "",
        processCatalogL3: l3 ? l3.code : "",
        vertical: m.vertical || m.module,
      });
      entityModule.set(ln, m);
    } else {
      // merge: union columns/relationships, escalate layer to the most-customized
      const colSeen = new Set(rec.columns.map((c) => c.logicalName));
      for (const c of e.columns || []) if (!colSeen.has(c.logicalName)) { rec.columns.push(c); colSeen.add(c.logicalName); }
      const relSeen = new Set(rec.relationships.map((r) => `${r.to}|${r.lookupField || ""}`));
      for (const r of e.relationships || []) if (!relSeen.has(`${r.to}|${r.lookupField || ""}`)) rec.relationships.push(r);
      if ((LAYER_RANK[e.layer] ?? 0) > (LAYER_RANK[rec.layer] ?? 0)) { rec.layer = e.layer; if (e.layer === "custom" || e.layer === "oob_customized") rec.solution = solCustom(m); }
    }
  }
}
const entities = [...entityMap.values()];
const entityByLn = (ln) => entityMap.get(ln);
// process-catalog tags for a component that belongs to an entity (the coverage
// endpoint scans forms/views/workflows/etc — not entities — so we stamp these).
const procTags = (ln) => { const e = entityMap.get(ln); return e ? { processCatalogL1: e.processCatalogL1 || "", processCatalogL2: e.processCatalogL2 || "", processCatalogL3: e.processCatalogL3 || "" } : {}; };
const isCustomizedStandard = (e) => e.layer === "oob_customized";
const allLn = entities.map((e) => e.logicalName);

// EntityInventory: group non-customized by module category, customized-standard into its own bucket
const byCategory = {};
const standardEntitiesCustomized = [];
const entOut = (e) => ({ logicalName: e.logicalName, displayName: e.displayName, description: e.description, solution: e.solution, tags: { d365Module: e.module, processCatalogL1: e.processCatalogL1, processCatalogL2: e.processCatalogL2 || "", processCatalogL3: e.processCatalogL3 || "", vertical: e.vertical, layer: e.layer } });
for (const e of entities) {
  if (isCustomizedStandard(e)) { standardEntitiesCustomized.push(entOut(e)); continue; }
  const cat = camel(e.module);
  (byCategory[cat] ||= []).push(entOut(e));
}
w("EntityInventory.json", { entities: byCategory, standardEntitiesCustomized });

// ── 2. columns ────────────────────────────────────────────────────────────
w("EntityColumnInventory.json", {
  entities: Object.fromEntries(entities.map((e) => [e.logicalName, {
    columns: (e.columns.length ? e.columns : [{ logicalName: "name", type: "string" }]).map((c) => ({ logicalName: c.logicalName, displayName: c.displayName || titleize(c.logicalName), type: c.type })),
  }])),
});

// ── 3. option sets (dedup by schemaName) ───────────────────────────────────
const optionSets = uniqBy(
  MODULES.flatMap((m) => (m.optionSets || []).map((o) => ({ schemaName: o.schemaName, displayName: o.displayName || titleize(o.schemaName), solution: (o.schemaName || "").startsWith("con_") ? solCustom(m) : solManaged(m), options: o.options || [], tags: {} }))),
  (o) => o.schemaName
);
w("OptionSetInventory.json", { optionSets: optionSets.map(({ options, ...rest }) => rest) });

// ── 4. forms (main per entity; quick-create for custom/customized) ─────────
const forms = [];
for (const e of entities) {
  forms.push({ formId: `frm-${slug(e.logicalName)}-main`, name: `${e.displayName}`, solution: e.solution, entity: e.logicalName, formType: "Main", tags: procTags(e.logicalName) });
  if (e.layer === "custom" || e.layer === "oob_customized") forms.push({ formId: `frm-${slug(e.logicalName)}-qc`, name: `${e.displayName} (Quick Create)`, solution: e.solution, entity: e.logicalName, formType: "QuickCreate", tags: procTags(e.logicalName) });
}
w("FormInventory.json", { forms });

// ── 5. views (Active + All + a business view per entity) ────────────────────
const views = [];
for (const e of entities) {
  const disp = plural(e.displayName);
  views.push({ viewId: `vw-${slug(e.logicalName)}-active`, name: `Active ${disp}`, solution: e.solution, entity: e.logicalName, tags: procTags(e.logicalName) });
  views.push({ viewId: `vw-${slug(e.logicalName)}-all`, name: `All ${disp}`, solution: e.solution, entity: e.logicalName, tags: procTags(e.logicalName) });
  if (e.layer === "custom" || e.layer === "oob_customized") views.push({ viewId: `vw-${slug(e.logicalName)}-mine`, name: `My ${disp}`, solution: e.solution, entity: e.logicalName, tags: procTags(e.logicalName) });
}
w("ViewInventory.json", { views });

// ── 6. workflows + power automate flows ─────────────────────────────────────
const CLOUD = new Set(["cloudflow"]);
const workflows = [];
const flows = [];
let wfN = 0;
for (const m of MODULES) {
  const l1 = m.processes?.l1 || { code: "PL.00", title: m.module };
  const wfL2 = m.processes?.l2 || [];
  let wfIdx = 0;
  for (const wf of m.workflows || []) {
    wfN++;
    const l2c = wfL2.length ? wfL2[wfIdx++ % wfL2.length].code : "";
    const cloud = CLOUD.has(wf.kind);
    const id = cloud ? `FLOW-${wfN}` : `wf-${wfN}-${slug(wf.name).slice(0, 24)}`;
    workflows.push({ id, name: wf.name, description: wf.description || "", primaryEntity: wf.primaryEntity, solution: solCustom(m), category: wf.kind || "async", tags: { processCatalogL1: `${l1.code} ${l1.title}`, processCatalogL2: l2c } });
    if (cloud) flows.push({ id, name: wf.name, trigger: wf.trigger || "Dataverse - When a row is added", connectors: wf.connectors && wf.connectors.length ? wf.connectors : ["Dataverse"], actionCount: 3 + (wfN % 8) });
  }
}
w("WorkflowInventory.json", { workflows });
w("PowerAutomateInventory.json", { flows });

// ── 7. plugins + steps ──────────────────────────────────────────────────────
const plugins = [];
const pluginSteps = [];
let stepN = 0;
for (const m of MODULES) {
  for (const p of m.plugins || []) {
    plugins.push({ id: `plg-${slug(p.name)}`, name: p.name, businessLogic: p.businessLogic || "", solution: solCustom(m), tags: {} });
    for (const s of p.steps || []) { stepN++; pluginSteps.push({ id: `step-${stepN}-${slug(p.name).slice(0, 18)}`, name: `${s.message} of ${s.entity} — ${p.name}`, solution: solCustom(m), tags: {} }); }
  }
}
w("PluginInventory.json", { plugins });
w("PluginStepInventory.json", { pluginSteps });

// ── 8. apps ─────────────────────────────────────────────────────────────────
const modelDrivenApps = [];
const canvasApps = [];
const appEntities = {};        // uniqueName -> [entity logicalNames]
for (const m of MODULES) {
  for (const a of m.apps || []) {
    const uniqueName = `con_${camel(a.name)}`;
    const rec = { uniqueName, displayName: a.name, solution: solCustom(m), tags: {} };
    appEntities[uniqueName] = (a.entities || []).filter((ln) => entityMap.has(ln));
    if (a.type === "canvas") canvasApps.push(rec); else modelDrivenApps.push(rec);
  }
}
w("AppInventory.json", { modelDrivenApps, canvasApps });

// ── 9. security roles ────────────────────────────────────────────────────────
const roles = [];
for (const m of MODULES) for (const r of m.securityRoles || []) roles.push({ id: `role-${slug(r.name)}`, name: r.name, solution: r.layer === "custom" ? solCustom(m) : solManaged(m), tags: { persona: r.persona || "" } });
w("SecurityRoleInventory.json", { roles: uniqBy(roles, (r) => r.id) });

// ── 10. web resources (form scripts for customized entities + shared assets) ──
const webResources = [];
for (const e of entities) if (e.layer === "custom" || e.layer === "oob_customized") webResources.push({ name: `con_/scripts/${slug(e.logicalName)}.js`, displayName: `${e.displayName} Form Scripts`, description: `Client-side logic on the ${e.displayName} form.`, solution: e.solution, tags: {} });
webResources.push({ name: "con_/html/welcome.html", displayName: "CoE Welcome", description: "Landing HTML embedded on the CoE dashboard.", solution: CORE, tags: {} });
webResources.push({ name: "con_/images/logo.png", displayName: "Contoso Logo", description: "Brand logo used across model-driven apps.", solution: CORE, tags: {} });
w("WebResourceInventory.json", { webResources });

// ── 11. dashboards, sitemaps, env vars, reports, templates ───────────────────
const dashboards = [];
for (const m of MODULES) dashboards.push({ id: `dash-${camel(m.module)}`, name: `${m.module} Overview`, solution: solCustom(m), tags: {} });
w("DashboardInventory.json", { dashboards });

const siteMaps = modelDrivenApps.map((a) => ({ name: `${a.displayName} Sitemap`, solution: a.solution, tags: {} }));
w("SiteMapInventory.json", { siteMaps });

const environmentVariables = [];
for (const m of MODULES) for (const az of (m.integrations?.azure || [])) if (az.kind === "externalIntegration" || az.kind === "logicApp") environmentVariables.push({ schemaName: `con_${camel(az.name)}Url`, displayName: `${az.name} URL`, description: `Endpoint for ${az.name}.`, solution: solCustom(m), tags: {} });
w("EnvironmentVariableInventory.json", { environmentVariables: uniqBy(environmentVariables, (v) => v.schemaName) });

const reports = [];
for (const m of MODULES) reports.push({ name: `${m.module} Summary`, solution: solCustom(m), tags: {} });
w("ReportInventory.json", { reports });

const templates = [];
for (const m of MODULES) for (const wf of (m.workflows || [])) if (/email|notify|remind|send/i.test(wf.name)) templates.push({ id: `tpl-${slug(wf.name).slice(0, 24)}`, title: `${wf.name} Email`, solution: solCustom(m), tags: {} });
w("TemplateInventory.json", { templates: uniqBy(templates, (t) => t.id).slice(0, 40) });

// ── 12. process catalog (L1/L2/L3 across all modules) ─────────────────────────
const l1Processes = [], l2Processes = [], l3Processes = [];
for (const m of MODULES) {
  const p = m.processes; if (!p?.l1) continue;
  l1Processes.push({ code: p.l1.code, title: p.l1.title, description: p.l1.description || "" });
  for (const l2 of p.l2 || []) l2Processes.push({ code: l2.code, title: l2.title, description: l2.description || "", parentL1Code: p.l1.code });
  for (const l3 of p.l3 || []) l3Processes.push({ code: l3.code, title: l3.title, description: l3.description || "", parentL2Code: l3.parentL2 });
}
w("ProcessCatalog.json", { l1Processes: uniqBy(l1Processes, (x) => x.code), l2Processes: uniqBy(l2Processes, (x) => x.code), l3Processes: uniqBy(l3Processes, (x) => x.code) });

// ── 13. capability clusters (one per module) ──────────────────────────────────
const wfByModule = {};
for (const m of MODULES) wfByModule[m.module] = (m.workflows || []).map((wf) => wf.name);
const capabilities = MODULES.map((m) => {
  const ents = entities.filter((e) => e.module === m.module);
  const l1 = m.processes?.l1 || { code: "PL.00", title: m.module };
  const comps = [...ents.slice(0, 8).map((e) => e.logicalName), ...(wfByModule[m.module] || []).slice(0, 4)];
  const subs = (m.processes?.l2 || []).slice(0, 4).map((l2, i) => ({
    name: l2.title, bpc_l3: l2.code, functionalArea: m.vertical || m.module,
    componentCount: Math.max(1, Math.round(ents.length / Math.max(1, (m.processes?.l2 || []).length))),
    componentsByType: { entities: Math.min(ents.length, 3) },
    entities: ents.slice(i * 2, i * 2 + 3).map((e) => e.logicalName),
    topKeywords: l2.title.toLowerCase().split(/\s+/).slice(0, 3),
    components: ents.slice(i * 2, i * 2 + 3).map((e) => e.logicalName),
    tertiarySubCapabilities: (m.processes?.l3 || []).filter((l3) => l3.parentL2 === l2.code).slice(0, 2).map((l3) => ({ name: l3.title, componentCount: 1, entities: ents.slice(0, 1).map((e) => e.logicalName), topKeywords: l3.title.toLowerCase().split(/\s+/).slice(0, 2), components: ents.slice(0, 1).map((e) => e.logicalName) })),
  }));
  const modForms = forms.filter((f) => entityByLn(f.entity)?.module === m.module).length;
  const modViews = views.filter((v) => entityByLn(v.entity)?.module === m.module).length;
  const modWf = (wfByModule[m.module] || []).length;
  const modPlugins = (m.plugins || []).length;
  const totalComp = ents.length + modWf + modForms + modViews + modPlugins;
  return { id: `cap-${camel(m.module)}`, name: `${m.module}`, description: l1.description || `${m.module} capability.`, componentCount: totalComp, componentsByType: { entities: ents.length, workflows: modWf, forms: modForms, views: modViews, plugins: modPlugins }, components: comps, subCapabilities: subs };
});
w("capability-clusters.json", { capabilities });

// ── 14. relationship index ────────────────────────────────────────────────────
const byEntity = {};
for (const e of entities) {
  const ln = e.logicalName;
  const ent = { forms: forms.filter((f) => f.entity === ln).map((f) => f.formId), views: views.filter((v) => v.entity === ln).map((v) => v.viewId) };
  const os = (entityByLn(ln)?.columns || []).filter((c) => c.type === "optionset").map((c) => c.logicalName);
  if (os.length) ent.optionSets = os;
  const steps = pluginSteps.filter((s) => new RegExp(`\\bof ${ln} `).test(s.name)).map((s) => s.id);
  if (steps.length) ent.pluginSteps = steps;
  const wfs = workflows.filter((wf) => wf.primaryEntity === ln).map((wf) => wf.name);
  if (wfs.length) ent.workflows = wfs;
  byEntity[ln] = ent;
}
const byApp = {};
for (const [uniqueName, ents] of Object.entries(appEntities)) {
  byApp[uniqueName] = { entities: ents, dashboards: [], webResources: [], siteMaps: [] };
}
// map dashboards/sitemaps to first app of each module
for (const m of MODULES) {
  const app = modelDrivenApps.find((a) => appEntities[a.uniqueName] && entities.some((e) => e.module === m.module && appEntities[a.uniqueName].includes(e.logicalName)));
  if (app) { byApp[app.uniqueName].dashboards.push(`dash-${camel(m.module)}`); const sm = `${app.displayName} Sitemap`; if (siteMaps.some((s) => s.name === sm)) byApp[app.uniqueName].siteMaps.push(sm); }
}
const byWorkflow = {};
for (const m of MODULES) for (const wf of (m.workflows || [])) { const ev = environmentVariables.filter((v) => v.solution === solCustom(m)).slice(0, 1).map((v) => v.schemaName); if (ev.length) byWorkflow[wf.name] = { envVars: ev }; }
// entity relationships (ManyToOne lookups) — only where both ends exist
const entityRelationships = [];
for (const e of entities) for (const r of e.relationships || []) {
  if (!entityMap.has(r.to)) continue;
  // A lookup (child e -> parent r.to) is a 1:N from the parent's side. Emit it
  // parent->child as OneToMany so the ERD draws a directional arrowhead; keep any
  // genuine ManyToMany as-is (violet dashed link).
  const mm = r.type === "ManyToMany";
  const from = mm ? e.logicalName : r.to;
  const to = mm ? r.to : e.logicalName;
  const type = mm ? "ManyToMany" : "OneToMany";
  entityRelationships.push({ id: `${from}_${to}_${type}`, name: `${from}_${to}`, type, from, to, lookupField: r.lookupField || `${e.logicalName}id`, cascadeDelete: type === "OneToMany" ? "Cascade" : "RemoveLink", description: null, solution: e.solution });
}
// genuine N:N associations between existing tables (junction relationships)
const NN_PAIRS = [["systemuser", "team"], ["team", "businessunit"], ["account", "list"], ["opportunity", "competitor"], ["knowledgearticle", "incident"], ["campaign", "list"], ["product", "pricelevel"], ["contact", "list"]];
for (const [a, b] of NN_PAIRS) if (entityMap.has(a) && entityMap.has(b)) entityRelationships.push({ id: `${a}_${b}_NN`, name: `${a}_${b}`, type: "ManyToMany", from: a, to: b, lookupField: null, cascadeDelete: "RemoveLink", description: null, solution: entityByLn(a).solution });
// plus one N:N among each module's own custom tables so N:N appears broadly
for (const m of MODULES) { const cust = entities.filter((e) => e.module === m.module && e.layer === "custom"); if (cust.length >= 2) entityRelationships.push({ id: `${cust[0].logicalName}_${cust[1].logicalName}_NN`, name: `${cust[0].logicalName}_${cust[1].logicalName}`, type: "ManyToMany", from: cust[0].logicalName, to: cust[1].logicalName, lookupField: null, cascadeDelete: "RemoveLink", description: null, solution: cust[0].solution }); }
w("RelationshipIndex.json", { byEntity, byApp, byWorkflow, entityRelationships: uniqBy(entityRelationships, (r) => r.id) });

// ── 15. solutions + dependency graph ──────────────────────────────────────────
const solutions = [];
const dependencies = [];
solutions.push({ uniqueName: CORE, displayName: "Contoso Core", version: "1.0.0.0", isManaged: false, publisher: "Contoso", publisherPrefix: "con", description: "Shared tables, option sets, and cross-cutting configuration.", dependsOn: [], dependencyCount: 0, missingDependencyCount: 0 });
const seenSol = new Set([CORE]);
for (const m of MODULES) {
  const mg = solManaged(m), cs = solCustom(m);
  if (!seenSol.has(mg)) { seenSol.add(mg); solutions.push({ uniqueName: mg, displayName: mg, version: "9.0.0.0", isManaged: true, publisher: "Microsoft Dynamics 365", publisherPrefix: "msdyn", description: `Managed base solution for ${m.module}.`, dependsOn: [], dependencyCount: 0, missingDependencyCount: 0 }); }
  if (!seenSol.has(cs)) {
    seenSol.add(cs);
    const deps = [CORE, mg];
    solutions.push({ uniqueName: cs, displayName: cs.replace(/([A-Z])/g, " $1").trim(), version: "1." + (MODULES.indexOf(m)) + ".0.0", isManaged: false, publisher: "Contoso", publisherPrefix: "con", description: `Contoso customizations layered over ${m.module}.`, dependsOn: deps, dependencyCount: deps.length, missingDependencyCount: 0 });
    const compCount = entities.filter((e) => e.solution === cs).length + (m.workflows || []).length + (m.plugins || []).length;
    dependencies.push({ from: cs, to: CORE, componentCount: Math.max(1, entities.filter((e) => e.solution === cs).length) });
    dependencies.push({ from: cs, to: mg, componentCount: Math.max(1, compCount) });
  }
}
const installOrder = [CORE, ...solutions.filter((s) => s.isManaged).map((s) => s.uniqueName), ...solutions.filter((s) => !s.isManaged && s.uniqueName !== CORE).map((s) => s.uniqueName)];
w("SolutionDependencies.json", {
  solutions, dependencies, missingDependencies: [], installOrder,
  metadata: { totalSolutions: solutions.length, unmanagedCount: solutions.filter((s) => !s.isManaged).length, managedCount: solutions.filter((s) => s.isManaged).length, totalDependencies: dependencies.length, withMissingDeps: 0, generated: NOW },
});

// ── 16. governance findings (from module notes + computed) ─────────────────────
const SEV_CAT = { high: "Risk", medium: "Solution Hygiene", warning: "Process Alignment", low: "Documentation" };
const findings = [];
let ruleN = 0;
for (const m of MODULES) for (const g of (m.governanceNotes || [])) {
  ruleN++;
  findings.push({ ruleId: `GOV_${ruleN}`, name: g.message.slice(0, 60), severity: g.severity, category: SEV_CAT[g.severity] || "Governance", count: (g.items || []).length || 1, componentType: g.componentType, message: g.message, recommendation: "Review and remediate per CoE standards.", status: "open", scope: solCustom(m), items: g.items || [] });
}
// computed: forms without description
const undocForms = forms.filter((_, i) => i % 5 === 0).slice(0, 12).map((f) => f.formId);
if (undocForms.length) findings.push({ ruleId: "FORMS_NO_DESC", name: "Forms without a description", severity: "medium", category: "Documentation", count: undocForms.length, componentType: "Form", message: `${undocForms.length} main forms have no description set.`, recommendation: "Add a short description to each main form.", status: "open", scope: "Org-wide", items: undocForms });
// The governance API computes score = 100 - high*10 - medium*5 - warning*2. Budget
// the penalizing tiers so the demo reads as a healthy-but-actionable CoE (~63/100),
// downgrading surplus findings to non-penalized "info" (they still show in the list).
const sevBudget = { high: 1, medium: 3, warning: 6 };
const sevUsed = { high: 0, medium: 0, warning: 0 };
for (const f of findings) {
  if (sevBudget[f.severity] !== undefined) {
    if (sevUsed[f.severity] < sevBudget[f.severity]) sevUsed[f.severity]++;
    else f.severity = "info";
  }
}
w("governance-findings.json", { metadata: { auditDate: NOW, totalFindings: findings.length }, findings });

// ── 17. orphaned components ────────────────────────────────────────────────────
const orphans = [];
const unusedOptSets = optionSets.filter((o) => !entities.some((e) => (e.columns || []).some((c) => c.logicalName === o.schemaName))).slice(0, 8);
for (const o of unusedOptSets) orphans.push({ type: "OptionSet", name: o.displayName, schemaName: o.schemaName, reason: "Not bound to any entity column.", severity: "medium", solution: o.solution });
orphans.push({ type: "WebResource", name: "Contoso Logo", schemaName: "con_/images/logo.png", reason: "Not referenced by any form or sitemap.", severity: "low", solution: CORE });
for (const r of reports.slice(6, 10)) orphans.push({ type: "Report", name: r.name, schemaName: r.name, reason: "Not linked to any model-driven app.", severity: "low", solution: r.solution });
w("OrphanedComponents.json", { metadata: { total: orphans.length, generated: NOW }, orphans });

// ── 18. azure components ───────────────────────────────────────────────────────
const logicApps = [], functions = [], externalIntegrations = [];
for (const m of MODULES) for (const az of (m.integrations?.azure || [])) {
  if (az.kind === "logicApp") logicApps.push({ name: az.name, description: az.description || "", trigger: "Event", direction: "Outbound", dataFlow: "Dataverse → External", relatedEntity: az.relatedEntity || "", status: "Active" });
  else if (az.kind === "function") functions.push({ name: az.name, description: az.description || "", trigger: "HTTP", runtime: "dotnet-isolated", calledBy: az.relatedEntity || "Plugin", purpose: "Compute", status: "Active" });
  else externalIntegrations.push({ name: az.name, type: "REST", direction: "Outbound", trigger: "Event", dataExchanged: az.description || "Records", connector: "HTTP" });
}
w("AzureComponentInventory.json", {
  metadata: { generated: NOW, totalLogicApps: logicApps.length, totalFunctions: functions.length, totalExternalIntegrations: externalIntegrations.length },
  logicApps, functions, externalIntegrations,
  summary: { totalAzureComponents: logicApps.length + functions.length + externalIntegrations.length, byType: { logicApp: logicApps.length, function: functions.length, externalIntegration: externalIntegrations.length }, byTrigger: {}, byDirection: {} },
});

// ── 19. PCF controls ───────────────────────────────────────────────────────────
const controls = [];
for (const m of MODULES) for (const p of (m.integrations?.pcf || [])) { const onEnt = p.entity && entityMap.has(p.entity); const boundCol = onEnt ? (entityByLn(p.entity)?.columns || []).find((c) => c.type === "optionset" || c.type === "string") : null; controls.push({ name: p.name.replace(/\s+/g, ""), namespace: "Contoso", version: "1.0.0", displayName: p.name, description: p.description || "", controlType: boundCol ? "field" : "dataset", technology: p.technology || "React", sourcePath: `controls/${p.name.replace(/\s+/g, "")}`, boundProperties: boundCol ? [boundCol.logicalName] : [], features: ["WebAPI"], externalIntegration: false, deployedTo: onEnt ? [p.entity] : [], deployedOn: onEnt ? [{ entity: p.entity, form: `frm-${slug(p.entity)}-main`, field: boundCol ? boundCol.logicalName : "" }] : [], solution: solCustom(m), tags: {} }); }
w("PCFControlInventory.json", { metadata: { generated: NOW, totalControls: controls.length, summary: { byTechnology: { React: controls.length } } }, controls });

// ── 20. AI components ────────────────────────────────────────────────────────────
const botComponents = [], customAPIs = [], aiSkillConfigs = [];
for (const m of MODULES) for (const ai of (m.integrations?.ai || [])) {
  if (ai.kind === "bot") botComponents.push({ schemaName: `con_${camel(ai.name)}`, name: ai.name, description: ai.description || "", componentType: "Bot", componentTypeCode: 0, parentBot: `con_${camel(ai.name)}`, stateCode: 0, statusCode: 1, isCustomizable: true, solution: solCustom(m), tags: {} });
  else if (ai.kind === "customAPI") customAPIs.push({ uniqueName: `con_${camel(ai.name)}`, name: `con_${camel(ai.name)}`, displayName: ai.name, description: ai.description || "", isFunction: true, isPrivate: false, isCustomizable: true, workflowEnabled: false, bindingType: "Global", parameterCount: 2, solution: solCustom(m), tags: {} });
  else aiSkillConfigs.push({ uniqueName: `con_${camel(ai.name)}`, skillType: "AI Builder", description: ai.description || "", entity: ai.entity && entityMap.has(ai.entity) ? ai.entity : "", attribute: "", scope: "Entity", stateCode: 0, statusCode: 1, isCustomizable: true, solution: solCustom(m), tags: {} });
}
w("AIComponentInventory.json", { metadata: { generated: NOW, summary: { botComponents: botComponents.length, customAPIs: customAPIs.length, aiSkillConfigs: aiSkillConfigs.length } }, botComponents, customAPIs, aiSkillConfigs });

// ── 21. app actions ────────────────────────────────────────────────────────────
const appActions = [];
let aaN = 0;
for (const a of modelDrivenApps) { const ents = appEntities[a.uniqueName] || []; if (!ents.length) continue; aaN++; appActions.push({ uniqueName: `con_action${aaN}`, name: `Open ${titleize(ents[0])}`, buttonLabel: "Open", appModule: a.uniqueName, contextEntity: ents[0], fontIcon: "OpenInNewWindow", location: "Form", sequence: 10, isHidden: false, isDisabled: false, isCustomizable: true, onClickType: "JavaScript", solution: a.solution, tags: {} }); }
w("AppActionInventory.json", { metadata: { generated: NOW, totalAppActions: appActions.length, summary: {} }, appActions });

// ── 22. mobile offline profiles ───────────────────────────────────────────────────
const profiles = [];
for (const m of MODULES) { const ents = entities.filter((e) => e.module === m.module).slice(0, 6).map((e) => e.logicalName); if (/field service|sales|customer service/i.test(m.module) && ents.length) profiles.push({ id: `mob-${camel(m.module)}`, name: `${m.module} Offline`, solution: solCustom(m), entityCount: ents.length, entities: ents, tags: {} }); }
w("MobileOfflineInventory.json", { metadata: { generated: NOW, totalProfiles: profiles.length, totalEntitiesEnabled: profiles.reduce((n, p) => n + p.entityCount, 0), summary: {} }, profiles });

// ═══ DEEP DETAIL + ENVIRONMENT DRIFT (so every feature lights up) ═══════════════
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ── 23. form details (tabs/sections/fields + JS handlers) ───────────────────────
const formDetails = forms.map((f) => {
  const cols = (entityByLn(f.entity)?.columns || []);
  const half = Math.max(1, Math.ceil(cols.length / 2));
  const mkCols = (cs) => cs.map((c) => ({ logicalName: c.logicalName, label: c.displayName || titleize(c.logicalName) }));
  const sections = [
    { name: "general", label: "General", columnCount: Math.min(cols.length, half), columns: mkCols(cols.slice(0, half)) },
    { name: "details", label: "Additional Details", columnCount: Math.max(0, cols.length - half), columns: mkCols(cols.slice(half)) },
  ];
  const customized = f.entity.startsWith("con_") || isCustomizedStandard(entityByLn(f.entity) || {});
  const jsHandlers = customized ? [
    { event: "onload", control: "form", functionName: `Contoso.${camel(f.entity)}.onLoad`, library: `con_/scripts/${slug(f.entity)}.js` },
    { event: "onchange", control: cols.find((c) => c.type === "optionset")?.logicalName || "statuscode", functionName: `Contoso.${camel(f.entity)}.onStatusChange`, library: `con_/scripts/${slug(f.entity)}.js` },
  ] : [];
  return { formId: f.formId, entity: f.entity, formType: f.formType || "Main", solution: f.solution, tabCount: 1, totalFields: cols.length, jsHandlerCount: jsHandlers.length, subgridCount: (entityByLn(f.entity)?.relationships || []).filter((r) => r.type === "OneToMany").length, tabs: [{ name: "tab_general", label: "General", fieldCount: cols.length, sections }], jsHandlers };
});
w("FormDetails.json", { forms: formDetails });

// ── 24. view details (columns/filters/sort/fetch) ────────────────────────────────
const viewDetails = views.map((v) => {
  const cols = (entityByLn(v.entity)?.columns || []);
  const shown = cols.slice(0, Math.min(cols.length, 6));
  const columns = shown.map((c, i) => ({ name: c.logicalName, width: [200, 150, 120, 100][i % 4] }));
  const active = /^Active /.test(v.name);
  const filters = active ? [{ attribute: "statecode", operator: "eq", value: "0" }] : [];
  const sortField = cols.find((c) => c.type === "datetime") || cols[0];
  return { viewId: v.viewId, entity: v.entity, name: v.name, solution: v.solution, queryType: /lookup/i.test(v.name) ? "LookupView" : "SavedQuery", isDefault: /^Active /.test(v.name), isQuickFind: false, columnCount: columns.length, filterCount: filters.length, linkedEntityCount: 0, columns, filters, linkedEntities: [], sortFields: sortField ? [{ attribute: sortField.logicalName, descending: true }] : [], fetchAttributes: shown.map((c) => c.logicalName) };
});
w("ViewDetails.json", { views: viewDetails });

// ── 25. flow complexity + flow-entity map ────────────────────────────────────────
const flowComplexity = [];
const byFlow = {};
for (const m of MODULES) {
  for (const wf of (m.workflows || [])) {
    const conns = wf.connectors && wf.connectors.length ? wf.connectors : ["Dataverse"];
    const hasHttp = conns.some((c) => /http|api|external/i.test(c)) || (m.integrations?.azure || []).length > 0;
    const total = 6 + (wf.name.length % 18);
    const flags = [];
    if (hasHttp) flags.push("Uses HTTP / external endpoint");
    if (wf.kind === "cloudflow" && !/error|scope/i.test(wf.description || "")) flags.push("No error handling (Scope/Try-Catch)");
    if (conns.length >= 4) flags.push("High connector fan-out");
    const complexity = total > 18 ? "High" : total > 11 ? "Medium" : "Low";
    flowComplexity.push({
      name: wf.name, solution: solCustom(m), triggerType: wf.trigger || "Automated", triggerEntity: wf.primaryEntity,
      totalActions: total, maxDepth: 2 + (total % 4), complexityScore: total * 3, complexity, hasErrorHandling: !flags.includes("No error handling (Scope/Try-Catch)"),
      metrics: { childFlows: 0, composeCount: total % 3, connectorActions: conns.length, foreachCount: total % 2, httpCount: hasHttp ? 1 + (total % 2) : 0, ifCount: total % 3, scopeCount: flags.includes("No error handling (Scope/Try-Catch)") ? 0 : 1, switchCount: 0, terminateCount: 0, variableCount: total % 4, waitCount: 0 },
      httpUrls: hasHttp ? [`https://api.contoso.com/${camel(m.module)}/v1`] : [], connectors: conns, governanceFlags: flags,
      governanceFindings: flags.map((d, i) => ({ ruleId: `FLOW_${i + 1}`, detail: d })),
    });
    // entity map: primary + related
    const prim = wf.primaryEntity;
    const related = (entityByLn(prim)?.relationships || []).map((r) => r.to).filter((t) => entityMap.has(t)).slice(0, 3);
    const ents = uniqBy([prim, ...related].filter((e) => entityMap.has(e)).map((e) => ({ entity: e, operations: e === prim ? ["Create", "Update"] : ["Read"], columnsReferenced: (entityByLn(e)?.columns || []).slice(0, 3).map((c) => c.logicalName) })), (x) => x.entity);
    if (ents.length) byFlow[wf.name] = { solution: solCustom(m), entityCount: ents.length, entities: ents };
  }
}
w("FlowComplexity.json", { flows: flowComplexity });
w("FlowEntityMap.json", { byFlow });

// ── 26. web resource code analysis (feeds governance: deprecated API usage) ───────
const wrFiles = webResources.filter((w) => w.name.endsWith(".js")).map((wr, i) => {
  const deprecated = i % 3 === 0 ? [{ pattern: "Xrm.Page", count: 2 + (i % 4) }] : [];
  const flags = [];
  if (deprecated.length) flags.push("Deprecated Xrm.Page API");
  if (i % 5 === 0) flags.push("Synchronous OData request");
  return {
    name: wr.name, solution: wr.solution, lineCount: 80 + (i * 17) % 400, isRulesEngine: false, isCustom: true,
    functionCount: 2 + (i % 5), functions: [`onLoad`, `onSave`, `validate`].slice(0, 2 + (i % 2)),
    apiCallCount: 1 + (i % 3), apiCalls: [{ operation: "retrieveMultipleRecords", entity: entities[i % entities.length].logicalName }],
    deprecatedCount: deprecated.reduce((n, d) => n + d.count, 0), deprecated,
    fieldRefCount: 3, fieldRefs: ["name", "statuscode", "ownerid"], externalUrls: [],
    governanceFlags: flags, governanceFindings: flags.map((d, k) => ({ ruleId: `WR_${k + 1}`, detail: d, evidence: [wr.name] })),
  };
});
w("WebResourceCodeAnalysis.json", { files: wrFiles });

// ── 27. plugin configs (rules-engine steps) ───────────────────────────────────────
const configs = pluginSteps.slice(0, Math.ceil(pluginSteps.length / 3)).map((s, i) => {
  const ent = (s.name.match(/ of (\S+) /) || [])[1] || entities[i % entities.length].logicalName;
  return { stepId: s.id, stepName: s.name, pluginType: s.name.split(" — ")[1] || "Plugin", entity: ent, solution: s.solution, ruleCount: 1 + (i % 4), isRulesEngine: i % 2 === 0, rules: Array.from({ length: 1 + (i % 3) }, (_, k) => ({ ruleId: `${s.id}-r${k}`, attribute: (entityByLn(ent)?.columns || [{ logicalName: "name" }])[k % Math.max(1, (entityByLn(ent)?.columns || []).length)].logicalName, dataType: "string", deployForm: true, deployPlugin: true, evalOnLoad: k === 0, isCustomField: true, priority: k })) };
});
w("PluginConfigs.json", { configs });

// ── 28. canvas app sources ──────────────────────────────────────────────────────────
const canvasSources = canvasApps.map((a) => { const ents = appEntities[a.uniqueName] || []; return { name: a.uniqueName, displayName: a.displayName, description: `Canvas app for ${a.displayName}.`, solution: a.solution, formFactor: /mobile|tech|field/i.test(a.displayName) ? "Phone" : "Tablet", entityCount: ents.length, connectorCount: 2, entities: ents, connectors: ["Dataverse", "Office 365 Users"] }; });
w("CanvasAppSources.json", { apps: canvasSources });

// ── 29. entity maps (records mapped between related tables) ────────────────────────
const maps = [];
for (const e of entities) for (const r of (e.relationships || [])) {
  if (!entityMap.has(r.to) || r.type !== "ManyToOne") continue;
  if (maps.length >= 40) break;
  const src = entityByLn(r.to), tgt = e;
  const common = (src?.columns || []).filter((c) => (tgt.columns || []).some((tc) => tc.logicalName === c.logicalName)).slice(0, 4);
  if (common.length < 2) continue;
  maps.push({ sourceEntity: r.to, targetEntity: e.logicalName, fieldCount: common.length, fieldMappings: common.map((c) => ({ sourceField: c.logicalName, targetField: c.logicalName })), solutions: [e.solution] });
}
w("EntityMaps.json", { maps: uniqBy(maps, (m) => `${m.sourceEntity}:${m.targetEntity}`).slice(0, 30) });

// ── 30. ribbon customizations (from app actions) ────────────────────────────────────
const ribbon = appActions.map((a) => ({ entity: a.contextEntity, type: "Form", id: a.uniqueName, location: a.location, solution: a.solution, jsActions: [{ library: `con_/scripts/${slug(a.contextEntity)}.js`, function: `Contoso.${camel(a.contextEntity)}.${camel(a.name)}` }] }));
w("RibbonCustomizations.json", { customizations: ribbon });

// ── 31. environment drift (4-tier ALM: devint → ort → uat → prod) ─────────────────
const ENVS4 = ["devint", "ort", "uat", "prod"];
const ENV_LABEL = { devint: "Dev Integration", ort: "ORT", uat: "UAT", prod: "Production" };
const driftEnv = (name) => ({ Dev: "devint", Test: "ort", UAT: "uat", Prod: "prod" }[name] || name.toLowerCase());
const customSols = solutions.filter((s) => !s.isManaged && s.uniqueName !== CORE);
// solution diffs: a subset of solutions carry version/component drift across envs
const mkDiff = (sol, i) => {
  const laggard = ENVS4[3 - (i % 2)]; // prod or uat lags
  const version = {}; const totalComponentCounts = {}; const presentIn = [...ENVS4];
  for (const env of ENVS4) { version[env] = env === "prod" || env === laggard ? `1.${i}.0.0` : `1.${i + 1}.0.0`; totalComponentCounts[env] = 20 + (i * 3) + (env === laggard ? -4 : 0); }
  const typeDiffs = [{ type: "entity", counts: Object.fromEntries(ENVS4.map((e) => [e, e === laggard ? 2 : 3])) }, { type: "workflow", counts: Object.fromEntries(ENVS4.map((e) => [e, e === laggard ? 1 : 2])) }];
  return { solution: sol.uniqueName, version, presentIn, totalComponentCounts, typeDiffs, totalDiffCount: 6 };
};
const coreSolutionDiffs = [{ uniqueName: CORE, isManaged: false }, ...customSols.slice(0, 2)].map((s, i) => mkDiff(s, i));
const nonCoreSolutionDiffs = customSols.slice(2, 10).map((s, i) => mkDiff(s, i + 2));
// presence gaps: newer Contoso solutions not yet promoted to prod/uat
const presenceGaps = customSols.slice(10, 16).map((s, i) => ({ solution: s.uniqueName, isCore: false, isManaged: false, presentIn: ENVS4.slice(0, 2 + (i % 2)), absentFrom: ENVS4.slice(2 + (i % 2)), componentCount: { entity: 3 + i, workflow: 1 } }));
w("environment-component-matrix.json", {
  metadata: { environments: ENVS4, generated: NOW, tierMap: { devint: "Development", ort: "Test", uat: "Pre-Prod", prod: "Production" } },
  summary: { coreDiffs: coreSolutionDiffs.length, nonCoreDiffs: nonCoreSolutionDiffs.length, presenceGaps: presenceGaps.length, solutionsWithDiffs: coreSolutionDiffs.length + nonCoreSolutionDiffs.length },
  coreSolutionDiffs, nonCoreSolutionDiffs, envLevelDiffs: [], presenceGaps,
});
// drift findings + remediation playbook
const driftFindings = [];
for (const m of MODULES) for (const d of (m.driftNotes || [])) {
  const envs = (d.presentIn || ["Dev", "Test"]).map(driftEnv).filter((e) => ENVS4.includes(e));
  driftFindings.push({ type: "Presence Drift", severity: envs.includes("prod") ? "medium" : "high", solution: solCustom(m), detail: `${d.component}: ${d.note || "differs across environments"}`, environments: envs.length ? envs : ["devint", "ort"] });
}
for (const s of presenceGaps) driftFindings.push({ type: "Unpromoted Solution", severity: "medium", solution: s.solution, detail: `${s.solution} exists in ${s.presentIn.map((e) => ENV_LABEL[e]).join("/")} but is absent from ${s.absentFrom.map((e) => ENV_LABEL[e]).join("/")}.`, environments: s.presentIn });
for (const d of nonCoreSolutionDiffs.slice(0, 5)) driftFindings.push({ type: "Version Drift", severity: "high", solution: d.solution, detail: `${d.solution} version differs across environments (${Object.values(d.version).join(", ")}).`, environments: ENVS4 });
const playbook = {};
for (const env of ENVS4) playbook[env] = [];
let phase = 1;
for (const f of driftFindings.slice(0, 24)) { const targetEnv = f.environments.includes("prod") ? "prod" : "uat"; playbook[targetEnv].push({ phase: (phase++ % 3) + 1, action: f.type === "Unpromoted Solution" ? `Promote ${f.solution}` : `Reconcile ${f.solution}`, solution: f.solution, reason: f.detail }); }
w("environment-drift-data.json", {
  metadata: { environmentsScanned: ENVS4, generated: NOW, duration: "—", skipComponents: false },
  summary: { environments: ENVS4.length, findings: driftFindings.length, highSeverity: driftFindings.filter((f) => f.severity === "high").length, totalSolutions: solutions.length, cleanupActions: Object.values(playbook).reduce((n, a) => n + a.length, 0) },
  findings: driftFindings,
  playbook,
  categories: { unmanagedDrift: customSols.slice(0, 4).map((s) => s.uniqueName), versionDrift: nonCoreSolutionDiffs.slice(0, 5).map((d) => d.solution), devOnly: presenceGaps.map((s) => s.solution), microsoft: solutions.filter((s) => s.isManaged).slice(0, 5).map((s) => s.uniqueName), thirdParty: [], cleanup: [], other: [], workItem: [] },
});

console.log(`\nWrote a complete D365 org: ${MODULES.length} modules, ${entities.length} entities, ${forms.length} forms, ${views.length} views, ${workflows.length + flows.length} automations, ${plugins.length} plugins, ${solutions.length} solutions to ${OUT}`);
console.log(`Deep detail: ${formDetails.length} form details, ${viewDetails.length} view details, ${flowComplexity.length} flow-complexity, ${Object.keys(byFlow).length} flow-entity maps, ${wrFiles.length} code-analyses, ${configs.length} plugin configs, ${maps.length} entity maps, ${ribbon.length} ribbons; env-drift: ${driftFindings.length} findings across ${ENVS4.length} environments`);
