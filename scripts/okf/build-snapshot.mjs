// API snapshot generator. Crawls the running app (DB mode) and writes every GET
// response to public/api-snapshot/v1/<path>.json. The static OKF build serves
// these instead of live route handlers (fetchApi static mode reads them). Run:
//
//   DATABASE_URL=...coe_contoso  npx next dev -p 3100   (in another shell)
//   SNAPSHOT_BASE=http://localhost:3100  node scripts/okf/build-snapshot.mjs
//
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.SNAPSHOT_BASE || "http://localhost:3100";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "public", "api-snapshot", "v1");

// Per-type config: id field (for /inventory/[type]/[id]) + search-index fields.
// tabId/typeLabel mirror src/app/api/v1/search/route.ts; nameField is the
// display column (camelCase of the search "name" column).
const TYPES = {
  entities:      { id: "logicalName", name: "displayName", tab: "entities",      label: "Entity",         sub: "solution" },
  plugins:       { id: "id",          name: "name",        tab: "plugins",       label: "Plugin",         sub: "solution" },
  pluginSteps:   { id: "id",          name: "name",        tab: "pluginsteps",   label: "PluginStep",     sub: "solution" },
  workflows:     { id: "id",          name: "name",        tab: "workflows",     label: "Workflow",       sub: "primaryEntity" },
  forms:         { id: "formId",      name: "name",        tab: "forms",         label: "Form",           sub: "entity" },
  views:         { id: "viewId",      name: "name",        tab: "views",         label: "View",           sub: "entity" },
  webresources:  { id: "name",        name: "displayName", tab: "webresources",  label: "WebResource",    sub: "solution" },
  apps:          { id: "uniqueName",  name: "displayName", tab: "apps",          label: "App",            sub: "solution" },
  reports:       { id: "name",        name: "name",        tab: "reports",       label: "Report",         sub: "solution" },
  securityRoles: { id: "id",          name: "name",        tab: "security",      label: "SecurityRole",   sub: "solution" },
  optionSets:    { id: "schemaName",  name: "displayName", tab: "optionsets",    label: "OptionSet",      sub: "solution" },
  envVars:       { id: "schemaName",  name: "displayName", tab: "envvars",       label: "EnvVar",         sub: "solution" },
  siteMaps:      { id: "name",        name: "name",        tab: "sitemaps",      label: "SiteMap",        sub: "solution" },
  templates:     { id: "id",          name: "title",       tab: "templates",     label: "Template",       sub: "solution" },
  dashboards:    { id: "id",          name: "name",        tab: "dashboards",    label: "Dashboard",      sub: "solution" },
  mobileOffline: { id: "name",        name: "name",        tab: "mobileoffline", label: "MobileOffline",  sub: "solution" },
  aiComponents:  { id: "id",          name: "name",        tab: "aicomponents",  label: "AIComponent",    sub: "solution" },
  appActions:    { id: "uniqueName",  name: "buttonLabel", tab: "appactions",    label: "AppAction",      sub: "solution" },
  pcf:           { id: "name",        name: "displayName", tab: "pcf",           label: "PcfControl",     sub: "solution" },
  azure:         { id: "name",        name: "name",        tab: "azure",         label: "AzureComponent", sub: "solution" },
};

// Static (no-param) GET endpoints — slug == file path under api-snapshot/v1.
const STATIC = [
  "summary", "governance", "process-catalog", "solutions", "solution-components",
  "process-catalog-components", "entity-relationships", "environment-component-matrix",
  "environment-drift-full", "capability-map", "untagged", "orphaned-components",
  "process-diagrams", "workflow-definitions", "workflow-name-map", "bpc-diagrams",
];

// Filesystem-safe filename slug for an id. MUST match fileSlug() in
// src/lib/api-client.ts so the static fetch layer resolves the same file.
const fileSlug = (s) => String(s).replace(/[^a-zA-Z0-9._-]/g, "_");

let ok = 0, fail = 0;
const fails = [];
async function getJson(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}
function save(rel, data) {
  const p = join(OUT, `${rel}.json`);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
  ok++;
}
async function snap(rel, path) {
  try { save(rel, await getJson(path)); }
  catch (e) { fail++; fails.push(String(e.message || e)); }
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  // 1) static endpoints
  for (const e of STATIC) await snap(e, `/api/v1/${e}`);

  // 2) inventory lists + per-item details, and accumulate the search index
  const searchIndex = [];
  for (const [type, cfg] of Object.entries(TYPES)) {
    let list;
    try { list = await getJson(`/api/v1/inventory/${type}?limit=100000`); }
    catch (e) { fail++; fails.push(String(e.message || e)); continue; }
    save(`inventory/${type}`, list);
    for (const item of list.items ?? []) {
      const id = item[cfg.id];
      if (id == null || id === "") continue;
      const enc = encodeURIComponent(String(id));
      await snap(`inventory/${type}/${fileSlug(id)}`, `/api/v1/inventory/${type}/${enc}`);
      searchIndex.push({
        name: String(item[cfg.name] ?? id),
        type: cfg.label, tabId: cfg.tab, searchName: String(id), itemId: String(id),
        sub: item[cfg.sub] != null ? String(item[cfg.sub]) : undefined,
      });
    }
  }
  save("search-index", { results: searchIndex, total: searchIndex.length });

  // 3) parameterized: solutions/[name], solution-components/[name]
  try {
    const sols = await getJson(`/api/v1/solutions`);
    const names = new Set();
    for (const s of sols.solutions ?? []) { const n = s.uniqueName ?? s.name; if (n) names.add(String(n)); }
    for (const n of names) {
      const enc = encodeURIComponent(n);
      await snap(`solutions/${fileSlug(n)}`, `/api/v1/solutions/${enc}`);
      await snap(`solution-components/${fileSlug(n)}`, `/api/v1/solution-components/${enc}`);
    }
  } catch (e) { fails.push(String(e.message || e)); }

  // 4) process-catalog-components/[code]
  try {
    const pc = await getJson(`/api/v1/process-catalog`);
    const codes = new Set();
    for (const lvl of ["l1Processes", "l2Processes", "l3Processes", "l4Processes", "l5Processes", "l6Processes"])
      for (const p of pc[lvl] ?? []) if (p.code) codes.add(String(p.code));
    for (const c of codes) await snap(`process-catalog-components/${fileSlug(c)}`, `/api/v1/process-catalog-components/${encodeURIComponent(c)}`);
  } catch (e) { fails.push(String(e.message || e)); }

  // 5) workflow-definitions/[guid]
  try {
    const wd = await getJson(`/api/v1/workflow-definitions`);
    for (const guid of Object.keys(wd ?? {})) await snap(`workflow-definitions/${fileSlug(guid)}`, `/api/v1/workflow-definitions/${encodeURIComponent(guid)}`);
  } catch (e) { fails.push(String(e.message || e)); }

  console.log(`\nsnapshots → ${OUT}`);
  console.log(`  written : ${ok}`);
  console.log(`  failed  : ${fail}`);
  if (fails.length) console.log("  failures:\n   - " + [...new Set(fails)].slice(0, 30).join("\n   - "));
}
main();
