// OKF bundle emitter (Postgres-free front-end). Builds the same RenderSrc the
// DB emitter does, but straight from the raw extract JSON in public/data/ — no
// database, no SQL, no Docker. Hands off to the shared render core so the output
// is identical to emit-bundle.ts. This is the emitter the GitHub Pages workflow
// runs: `tsx scripts/okf/emit-bundle-standalone.ts`.
//
//   env: DATA_DIR (default public/data), NEXT_PUBLIC_DATAVERSE_URL,
//        BUNDLE_TIMESTAMP (deterministic re-emit),
//        OKF_OVERRIDES (optional path to a curation JSON; see README)

import { readFileSync, existsSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import { renderBundle, str, type Row, type RenderSrc } from "./bundle-render";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../okf-bundle");
const DATA = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : resolve(__dirname, "../../public/data");
const DV = process.env.NEXT_PUBLIC_DATAVERSE_URL || process.env.DATAVERSE_URL || "";
const NOW = process.env.BUNDLE_TIMESTAMP || new Date().toISOString();

// ─── json helpers ──────────────────────────────────────────────────
function readJson(file: string): unknown {
  const p = join(DATA, file);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8").replace(/^﻿/, ""));
}
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
// Dedup by id column keeping first occurrence — mirrors the seed's
// INSERT … ON CONFLICT DO NOTHING (first inserted row wins) and drops rows with
// no id (no primary key would have been inserted).
function dedup(rows: Row[], idCol: string): Row[] {
  const seen = new Set<string>(); const out: Row[] = [];
  for (const r of rows) { const id = str(r[idCol]); if (!id || seen.has(id)) continue; seen.add(id); out.push(r); }
  return out;
}

// ─── component rows (mirror scripts/seed/load-json.ts per-type loaders) ──
function buildRows(): Map<string, Row[]> {
  const m = new Map<string, Row[]>();
  const put = (k: string, idCol: string, rows: Row[]) => m.set(k, dedup(rows, idCol));

  // entities — merge outOfBox (CDM) + standardEntitiesCustomized (customization wins)
  const ent = readJson("EntityInventory.json") as { entities?: Record<string, unknown[]>; standardEntitiesCustomized?: unknown[] } | null;
  if (ent?.entities) {
    const byLn = new Map<string, { entry: Row; category: string }>();
    for (const [category, items] of Object.entries(ent.entities))
      for (const e of arr(items)) { const ln = str((e as Row).logicalName); if (ln && !byLn.has(ln)) byLn.set(ln, { entry: e as Row, category }); }
    for (const e of arr(ent.standardEntitiesCustomized)) {
      const ln = str(e.logicalName); if (!ln) continue;
      const ex = byLn.get(ln);
      if (ex) byLn.set(ln, { entry: { ...ex.entry, ...e, tags: { ...((ex.entry.tags as Row) || {}), ...((e.tags as Row) || {}) } }, category: "standardEntitiesCustomized" });
      else byLn.set(ln, { entry: e, category: "standardEntitiesCustomized" });
    }
    const rows = [...byLn.values()].map(({ entry, category }) => {
      const e: Row = { ...entry, _category: category };
      return { logical_name: e.logicalName, display_name: e.displayName, description: e.description, solution: e.solution, tags: e.tags, raw_data: e };
    });
    put("entities", "logical_name", rows);
  }

  // workflows — fold Power Automate enrichment onto matching rows (by normalized GUID)
  const wfData = readJson("WorkflowInventory.json") as { workflows?: unknown[] } | null;
  if (wfData?.workflows) {
    const normGuid = (v: unknown) => str(v).replace(/[{}]/g, "").toUpperCase();
    const pa = readJson("PowerAutomateInventory.json") as { flows?: unknown[] } | null;
    const paByGuid = new Map<string, Row>();
    for (const f of arr(pa?.flows)) { const k = normGuid(f.id || f.name); if (k) paByGuid.set(k, f); }
    const rows = arr(wfData.workflows).map((w) => {
      const p = paByGuid.get(normGuid(w.id || w.name));
      return { id: w.id || w.name, name: w.name, description: w.description, entity: w.primaryEntity, solution: w.solution, tags: w.tags, raw_data: p ? { ...w, _powerAutomate: p } : w };
    });
    put("workflows", "id", rows);
  }

  const plug = readJson("PluginInventory.json") as { plugins?: unknown[] } | null;
  if (plug?.plugins) put("plugins", "id", arr(plug.plugins).map((p) => ({ id: p.id || p.friendlyName || p.name, name: p.name, business_logic: p.businessLogic, solution: p.solution, tags: p.tags, raw_data: p })));

  const ps = readJson("PluginStepInventory.json") as { pluginSteps?: unknown[] } | null;
  if (ps?.pluginSteps) put("pluginSteps", "id", arr(ps.pluginSteps).map((p) => ({ id: p.id, name: p.name, solution: p.solution, tags: p.tags, raw_data: p })));

  const forms = readJson("FormInventory.json") as { forms?: unknown[] } | null;
  if (forms?.forms) put("forms", "form_id", arr(forms.forms).map((f) => ({ form_id: f.formId, name: f.name, solution: f.solution, tags: f.tags, raw_data: f })));

  const views = readJson("ViewInventory.json") as { views?: unknown[] } | null;
  if (views?.views) put("views", "view_id", arr(views.views).map((v) => ({ view_id: v.viewId, name: v.name, solution: v.solution, tags: v.tags, raw_data: v })));

  const wr = readJson("WebResourceInventory.json") as { webResources?: unknown[] } | null;
  if (wr?.webResources) put("webResources", "name", arr(wr.webResources).map((w) => ({ name: w.name, display_name: w.displayName, description: w.description, solution: w.solution, tags: w.tags, raw_data: w })));

  const apps = readJson("AppInventory.json") as { modelDrivenApps?: unknown[]; canvasApps?: unknown[] } | null;
  if (apps) {
    const all: Row[] = [...arr(apps.modelDrivenApps).map((a) => ({ ...a, _appType: "ModelDriven" })), ...arr(apps.canvasApps).map((a) => ({ ...a, _appType: "Canvas" }))];
    put("apps", "unique_name", all.map((a) => ({ unique_name: a.uniqueName || a.name || a.displayName, display_name: a.displayName, solution: a.solution, tags: a.tags, raw_data: a })));
  }

  const roles = readJson("SecurityRoleInventory.json") as { roles?: unknown[] } | null;
  if (roles?.roles) put("securityRoles", "id", arr(roles.roles).map((r) => ({ id: r.id || r.name, name: r.name, solution: r.solution, tags: r.tags, raw_data: r })));

  const os = readJson("OptionSetInventory.json") as { optionSets?: unknown[] } | null;
  if (os?.optionSets) put("optionSets", "schema_name", arr(os.optionSets).map((o) => ({ schema_name: o.schemaName, display_name: o.displayName, solution: o.solution, tags: o.tags, raw_data: o })));

  const reports = readJson("ReportInventory.json") as { reports?: unknown[] } | null;
  if (reports?.reports) put("reports", "name", arr(reports.reports).map((r) => ({ name: r.name || r.fileName, solution: r.solution, tags: r.tags, raw_data: r })));

  const dash = readJson("DashboardInventory.json") as { dashboards?: unknown[] } | null;
  if (dash?.dashboards) put("dashboards", "id", arr(dash.dashboards).map((d) => ({ id: d.id || d.name, name: d.name, solution: d.solution, tags: d.tags, raw_data: d })));

  const sm = readJson("SiteMapInventory.json") as { siteMaps?: unknown[] } | null;
  if (sm?.siteMaps) put("siteMaps", "name", arr(sm.siteMaps).map((s) => ({ name: s.name, solution: s.solution, tags: s.tags, raw_data: s })));

  const tpl = readJson("TemplateInventory.json") as { templates?: unknown[] } | null;
  if (tpl?.templates) put("templates", "id", arr(tpl.templates).map((t) => ({ id: t.id || t.title, title: t.title, solution: t.solution, tags: t.tags, raw_data: t })));

  const ev = readJson("EnvironmentVariableInventory.json") as { environmentVariables?: unknown[] } | null;
  if (ev?.environmentVariables) put("envVars", "schema_name", arr(ev.environmentVariables).map((e) => ({ schema_name: e.schemaName, display_name: e.displayName, description: e.description, solution: e.solution, tags: e.tags, raw_data: e })));

  const mob = readJson("MobileOfflineInventory.json") as { profiles?: unknown[] } | null;
  if (mob?.profiles) put("mobileOffline", "name", arr(mob.profiles).map((m) => ({ name: Array.isArray(m.name) ? m.name[0] : m.name, solution: m.solution, tags: m.tags, raw_data: m })));

  const ai = readJson("AIComponentInventory.json") as { botComponents?: unknown[]; customAPIs?: unknown[]; aiSkillConfigs?: unknown[] } | null;
  if (ai) {
    const all: Row[] = [...arr(ai.botComponents).map((c) => ({ ...c, _componentType: "botComponent" })), ...arr(ai.customAPIs).map((c) => ({ ...c, _componentType: "customAPI" })), ...arr(ai.aiSkillConfigs).map((c) => ({ ...c, _componentType: "aiSkillConfig" }))];
    put("aiComponents", "id", all.map((c) => ({ id: c.schemaName || c.uniqueName || c.name, name: c.name || c.displayName || c.uniqueName || c.schemaName || "unknown", solution: c.solution, tags: c.tags, raw_data: c })));
  }

  const aa = readJson("AppActionInventory.json") as { appActions?: unknown[] } | null;
  if (aa?.appActions) put("appActions", "unique_name", arr(aa.appActions).map((a) => ({ unique_name: a.uniqueName || a.name, button_label: a.buttonLabel, solution: a.solution, tags: a.tags, raw_data: a })));

  const pcf = readJson("PCFControlInventory.json") as { controls?: unknown[] } | null;
  if (pcf?.controls) put("pcf", "name", arr(pcf.controls).map((c) => ({ name: c.name || c.displayName, display_name: c.displayName, solution: c.solution, tags: c.tags, raw_data: c })));

  const az = readJson("AzureComponentInventory.json") as { logicApps?: unknown[]; functions?: unknown[]; externalIntegrations?: unknown[] } | null;
  if (az) {
    const all: Row[] = [...arr(az.logicApps).map((c) => ({ ...c, _type: "logicApp" })), ...arr(az.functions).map((c) => ({ ...c, _type: "function" })), ...arr(az.externalIntegrations).map((c) => ({ ...c, _type: "externalIntegration" }))];
    put("azure", "name", all.map((c) => ({ name: c.name, solution: c.solution, tags: c.tags, raw_data: c })));
  }

  return m;
}

function buildRel(): RenderSrc["rel"] {
  const ri = readJson("RelationshipIndex.json") as {
    byEntity?: Record<string, { forms?: string[]; views?: string[]; optionSets?: string[]; pluginSteps?: string[]; workflows?: string[] }>;
    byApp?: Record<string, { entities?: string[]; dashboards?: string[]; webResources?: string[]; siteMaps?: string[] }>;
    byWorkflow?: Record<string, { envVars?: string[] }>;
    entityRelationships?: Array<{ from?: string; to?: string }>;
  } | null;
  const form = new Map<string, string[]>(), view = new Map<string, string[]>(), wf = new Map<string, string[]>(),
    psm = new Map<string, string[]>(), osm = new Map<string, string[]>(), eeFrom = new Map<string, string[]>(),
    appEnt = new Map<string, string[]>(), appDash = new Map<string, string[]>(), appSm = new Map<string, string[]>(),
    appWr = new Map<string, string[]>(), wfEv = new Map<string, string[]>();
  for (const [e, r] of Object.entries(ri?.byEntity ?? {})) {
    if (r.forms?.length) form.set(e, r.forms);
    if (r.views?.length) view.set(e, r.views);
    if (r.optionSets?.length) osm.set(e, r.optionSets);
    if (r.pluginSteps?.length) psm.set(e, r.pluginSteps);
    if (r.workflows?.length) wf.set(e, r.workflows);
  }
  for (const [a, r] of Object.entries(ri?.byApp ?? {})) {
    if (r.entities?.length) appEnt.set(a, r.entities);
    if (r.dashboards?.length) appDash.set(a, r.dashboards);
    if (r.webResources?.length) appWr.set(a, r.webResources);
    if (r.siteMaps?.length) appSm.set(a, r.siteMaps);
  }
  for (const [w, r] of Object.entries(ri?.byWorkflow ?? {})) if (r.envVars?.length) wfEv.set(w, r.envVars);
  for (const r of ri?.entityRelationships ?? []) {
    const f = str(r.from); if (!f) continue;
    (eeFrom.get(f) ?? eeFrom.set(f, []).get(f)!).push(str(r.to));
  }
  return { form, view, wf, ps: psm, os: osm, eeFrom, appEnt, appDash, appSm, appWr, wfEv };
}

function buildProc(): Row[] {
  const pc = readJson("ProcessCatalog.json") as { l1Processes?: unknown[]; l2Processes?: unknown[]; l3Processes?: unknown[] } | null;
  const rows: Row[] = []; const seen = new Set<string>();
  const add = (items: unknown, level: number, parentField?: string) => {
    for (const it of arr(items)) {
      const code = str(it.code); if (!code || seen.has(code)) continue; seen.add(code);
      rows.push({ code, title: it.title, level, description: it.description, parent_code: parentField ? it[parentField] ?? null : null });
    }
  };
  add(pc?.l1Processes, 1); add(pc?.l2Processes, 2, "parentL1Code"); add(pc?.l3Processes, 3, "parentL2Code");
  return rows;
}

function buildCaps(): Row[] {
  const cc = readJson("capability-clusters.json") as { capabilities?: Array<Row> } | null;
  return arr(cc?.capabilities).map((c) => ({ id: c.id, name: c.name, description: c.description }));
}

function buildCols(): Map<string, Row> {
  const ec = readJson("EntityColumnInventory.json") as { entities?: Record<string, Row> } | null;
  const m = new Map<string, Row>();
  for (const [name, info] of Object.entries(ec?.entities ?? {})) m.set(name, { columns: info.columns });
  return m;
}

// Optional curation: a JSON array of {dataKey,itemId,tags,fields,modifiedBy,modifiedAt}.
// In the Postgres-free flow this file is the durable write store (the app appends
// to it, or it is hand-authored); default is no curation.
function buildOverrides(): Map<string, Row> {
  const m = new Map<string, Row>();
  const p = process.env.OKF_OVERRIDES ? resolve(process.env.OKF_OVERRIDES) : join(DATA, "okf-overrides.json");
  if (!existsSync(p)) return m;
  const list = JSON.parse(readFileSync(p, "utf-8").replace(/^﻿/, "")) as Array<Row>;
  for (const o of arr(list)) {
    m.set(`${str(o.dataKey)}:${str(o.itemId)}`, { tags: o.tags ?? null, fields: o.fields ?? null, modified_by: o.modifiedBy ?? null, modified_at: o.modifiedAt ?? null });
  }
  return m;
}

function main() {
  const src: RenderSrc = {
    rowsByKey: buildRows(),
    procRows: buildProc(),
    capRows: buildCaps(),
    colsByEntity: buildCols(),
    overrideMap: buildOverrides(),
    rel: buildRel(),
    logs: [], // refresh history is a runtime/CI artifact, not part of the extract
  };
  const r = renderBundle(OUT, NOW, DV, src);
  console.log(`\nOKF bundle → ${OUT}  (from public/data JSON, no database)`);
  console.log(`  concept files     : ${r.concepts}`);
  console.log(`  emitted (records) : ${r.emitted}`);
  console.log(`  with 'type'       : ${r.typed}/${r.concepts}`);
  console.log(`  total .md (w/ index): ${r.total}`);
  console.log(`  GATE: ${r.ok ? "PASS ✓" : "FAIL ✗"}`);
  if (!r.ok) process.exit(1);
}
main();
