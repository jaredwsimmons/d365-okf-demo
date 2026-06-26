// Shared OKF render core. Pure function: given the normalized inventory state
// (component rows + relationship maps + columns + curation + logs), it writes
// the full OKF bundle (markdown + YAML frontmatter + cross-links) to `OUT`.
//
// It has NO knowledge of where the state came from — Postgres (emit-bundle.ts)
// or raw JSON extracts (emit-bundle-standalone.ts) both build a `RenderSrc` and
// call renderBundle(). This is the single source of truth for bundle layout, so
// the two front-ends can never drift.

import { mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

export type Row = Record<string, unknown>;

// ─── concept registry ──────────────────────────────────────────────
export interface Def { key: string; table: string; id: string; name: string; desc?: string; folder: string; type: string; schema?: boolean; resource?: (r: Row, DV: string) => string | undefined; }
export const REGISTRY: Def[] = [
  { key: "entities", table: "entities", id: "logical_name", name: "display_name", desc: "description", folder: "entities", type: "Dataverse Table", schema: true, resource: (r, DV) => (DV ? `${DV}/main.aspx?etn=${str(r.logical_name)}` : undefined) },
  { key: "workflows", table: "workflows", id: "id", name: "name", desc: "description", folder: "automations", type: "Automation" },
  { key: "plugins", table: "plugins", id: "id", name: "name", desc: "business_logic", folder: "plugins", type: "Plugin" },
  { key: "pluginSteps", table: "plugin_steps", id: "id", name: "name", folder: "pluginsteps", type: "Plugin Step" },
  { key: "forms", table: "forms", id: "form_id", name: "name", folder: "forms", type: "Form" },
  { key: "views", table: "views", id: "view_id", name: "name", folder: "views", type: "View" },
  { key: "webResources", table: "web_resources", id: "name", name: "display_name", desc: "description", folder: "webresources", type: "Web Resource" },
  { key: "apps", table: "apps", id: "unique_name", name: "display_name", folder: "apps", type: "Model-Driven App" },
  { key: "securityRoles", table: "security_roles", id: "id", name: "name", folder: "security", type: "Security Role" },
  { key: "optionSets", table: "option_sets", id: "schema_name", name: "display_name", folder: "optionsets", type: "Option Set" },
  { key: "reports", table: "reports", id: "name", name: "name", folder: "reports", type: "Report" },
  { key: "dashboards", table: "dashboards", id: "id", name: "name", folder: "dashboards", type: "Dashboard" },
  { key: "siteMaps", table: "site_maps", id: "name", name: "name", folder: "sitemaps", type: "Site Map" },
  { key: "templates", table: "templates", id: "id", name: "title", folder: "templates", type: "Template" },
  { key: "envVars", table: "env_vars", id: "schema_name", name: "display_name", folder: "envvars", type: "Environment Variable" },
  { key: "mobileOffline", table: "mobile_offline", id: "name", name: "name", folder: "mobileoffline", type: "Mobile Offline Profile" },
  { key: "aiComponents", table: "ai_components", id: "id", name: "name", folder: "aicomponents", type: "AI Component" },
  { key: "appActions", table: "app_actions", id: "unique_name", name: "button_label", folder: "appactions", type: "App Action" },
  { key: "pcf", table: "pcf_controls", id: "name", name: "display_name", folder: "pcf", type: "PCF Control" },
  { key: "azure", table: "azure_components", id: "name", name: "name", folder: "azure", type: "Azure Component" },
];

// folder -> the dataKey the UI/overrides use (apiKey). Used to match human edits.
export const APIKEY: Record<string, string> = {
  entities: "entities", automations: "workflows", plugins: "plugins", pluginsteps: "pluginSteps",
  forms: "forms", views: "views", webresources: "webresources", apps: "apps", security: "securityRoles",
  optionsets: "optionSets", reports: "reports", dashboards: "dashboards", sitemaps: "siteMaps",
  templates: "templates", envvars: "envVars", mobileoffline: "mobileOffline", aicomponents: "aiComponents",
  appactions: "appActions", pcf: "pcf", azure: "azure",
};

// ─── helpers ───────────────────────────────────────────────────────
export const str = (v: unknown): string => (v == null ? "" : String(v));
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled";
const oneLine = (s: string): string => s.replace(/\s+/g, " ").trim();
function yv(v: string): string {
  if (v === "") return '""';
  if (/[:#[\]{}",&*!|>%@`]/.test(v) || /^[\s>-]/.test(v) || /\s$/.test(v) || /^(true|false|null|~)$/i.test(v) || /^[\d.+-]/.test(v)) {
    return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
  }
  return v;
}
type FmVal = string | string[] | Record<string, string> | undefined;
function frontmatter(obj: Record<string, FmVal>): string {
  const lines = ["---"];
  for (const [k, val] of Object.entries(obj)) {
    if (val == null) continue;
    if (Array.isArray(val)) { if (val.length) lines.push(`${k}: [${val.map((x) => yv(x)).join(", ")}]`); }
    else if (typeof val === "object") {
      const ents = Object.entries(val).filter(([, v]) => v !== "" && v != null);
      if (ents.length) { lines.push(`${k}:`); for (const [kk, vv] of ents) lines.push(`  ${kk}: ${yv(vv)}`); }
    } else lines.push(`${k}: ${yv(val)}`);
  }
  lines.push("---");
  return lines.join("\n");
}
// Deterministic JSON (recursively sorted keys) for the full functional record
// (rawData) embedded in each concept — this is exactly what the app serves.
function stableJson(v: unknown): string {
  return JSON.stringify(
    v,
    (_k, val) =>
      val && typeof val === "object" && !Array.isArray(val)
        ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
        : val,
    2,
  );
}
type PInfo = { path: string; title: string };
function pathMap(rows: Row[], idF: string, nameF: string, folder: string, stableStem = false): Map<string, PInfo> {
  const sorted = [...rows].sort((a, b) => str(a[idF]).localeCompare(str(b[idF])));
  const used = new Set<string>(); const map = new Map<string, PInfo>();
  for (const r of sorted) {
    const id = str(r[idF]); if (!id) continue;
    const title = str(r[nameF]) || id;
    let s = stableStem ? id : slug(title);
    if (used.has(s)) { let n = 2; while (used.has(`${s}-${n}`)) n++; s = `${s}-${n}`; }
    used.add(s); map.set(id, { path: `${folder}/${s}`, title });
  }
  return map;
}
const lk = (m: Map<string, PInfo>, key: string): string | null => { const h = m.get(key); return h ? `[${h.title}](/${h.path}.md)` : null; };
const sortUniq = (a: string[]): string[] => [...new Set(a)].sort();

// ─── the normalized state the renderer consumes ────────────────────
export interface RenderSrc {
  // 20 component types keyed by REGISTRY.key. Rows carry the id/name/desc
  // columns named in REGISTRY (snake_case) plus `solution`, `tags`, `raw_data`,
  // and (workflows) `entity`.
  rowsByKey: Map<string, Row[]>;
  // process_catalog rows (L1–L3, deduped by code): {code,title,level,description,parent_code}
  procRows: Row[];
  // capabilities: {id,name,description}
  capRows: Row[];
  // entity -> {columns:[{logicalName/name/schemaName/displayName,type}, …]}
  colsByEntity: Map<string, Row>;
  // human edits keyed "dataKey:itemId" -> {modified_by,modified_at,tags,fields}
  overrideMap: Map<string, Row>;
  // relationship adjacency (all Map<key, id[]>)
  rel: {
    form: Map<string, string[]>; view: Map<string, string[]>; wf: Map<string, string[]>;
    ps: Map<string, string[]>; os: Map<string, string[]>; eeFrom: Map<string, string[]>;
    appEnt: Map<string, string[]>; appDash: Map<string, string[]>; appSm: Map<string, string[]>;
    appWr: Map<string, string[]>; wfEv: Map<string, string[]>;
  };
  // optional refresh history for log.md: {timestamp,mode}
  logs: Row[];
}

export interface RenderResult { concepts: number; emitted: number; typed: number; ok: boolean; total: number; }

export function renderBundle(OUT: string, NOW: string, DV: string, src: RenderSrc): RenderResult {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  // ── path index ──
  const pmByKey = new Map<string, Map<string, PInfo>>();
  for (const d of REGISTRY) pmByKey.set(d.key, pathMap(src.rowsByKey.get(d.key) ?? [], d.id, d.name, d.folder, d.key === "entities"));
  const pm = (k: string) => pmByKey.get(k)!;
  const wfByName = new Map<string, PInfo>();
  for (const r of src.rowsByKey.get("workflows") ?? []) { const h = pm("workflows").get(str(r.id)); if (h) wfByName.set(str(r.name), h); }
  const procPath = new Map<string, PInfo>();
  for (const r of src.procRows) procPath.set(str(r.code), { path: `processes/${slug(str(r.code))}`, title: str(r.title) });
  const capPath = pathMap(src.capRows, "id", "name", "capabilities");

  // reverse: component -> owning entity
  const rev = (g: Map<string, string[]>): Map<string, string> => { const m = new Map<string, string>(); for (const [ent, ids] of g) for (const id of ids) if (!m.has(id)) m.set(id, ent); return m; };
  const formToEnt = rev(src.rel.form), viewToEnt = rev(src.rel.view), psToEnt = rev(src.rel.ps), osToEnt = rev(src.rel.os);

  const linksFrom = (keys: string[] | undefined, m: Map<string, PInfo>): string[] =>
    sortUniq((keys ?? []).map((k) => lk(m, k)).filter((x): x is string => !!x));
  const procLink = (tags: Row): string | null => {
    const l1 = str(tags.processCatalogL1); if (!l1) return null;
    const code = l1.split(" ")[0]!; const h = procPath.get(code);
    return h ? `[${l1}](/${h.path}.md)` : `[${l1}](/processes/${slug(code)}.md)`;
  };

  function relationships(key: string, r: Row): string[] {
    const out: string[] = [];
    const tags = (r.tags as Row) || {};
    const add = (label: string, links: string[]) => { if (links.length) out.push(`- **${label}:** ${links.join(", ")}`); };
    if (key === "entities") {
      const ln = str(r.logical_name);
      add("Forms", linksFrom(src.rel.form.get(ln), pm("forms")));
      add("Views", linksFrom(src.rel.view.get(ln), pm("views")));
      add("Automations", sortUniq((src.rel.wf.get(ln) ?? []).map((n) => { const h = wfByName.get(n); return h ? `[${h.title}](/${h.path}.md)` : null; }).filter((x): x is string => !!x)));
      add("Plugin steps", linksFrom(src.rel.ps.get(ln), pm("pluginSteps")));
      add("Option sets", linksFrom(src.rel.os.get(ln), pm("optionSets")));
      add("Related tables", sortUniq((src.rel.eeFrom.get(ln) ?? []).filter((t) => t !== ln).map((t) => lk(pm("entities"), t)).filter((x): x is string => !!x)));
    } else if (key === "apps") {
      const a = str(r.unique_name);
      add("Tables", linksFrom(src.rel.appEnt.get(a), pm("entities")));
      add("Dashboards", linksFrom(src.rel.appDash.get(a), pm("dashboards")));
      add("Site maps", linksFrom(src.rel.appSm.get(a), pm("siteMaps")));
      add("Web resources", linksFrom(src.rel.appWr.get(a), pm("webResources")));
    } else if (key === "workflows") {
      add("Environment variables", linksFrom(src.rel.wfEv.get(str(r.name)), pm("envVars")));
      if (r.entity) { const h = lk(pm("entities"), str(r.entity)); if (h) add("Primary table", [h]); }
    } else if (key === "forms") { const e = formToEnt.get(str(r.form_id)); if (e) add("Table", [lk(pm("entities"), e)].filter((x): x is string => !!x)); }
    else if (key === "views") { const e = viewToEnt.get(str(r.view_id)); if (e) add("Table", [lk(pm("entities"), e)].filter((x): x is string => !!x)); }
    else if (key === "pluginSteps") { const e = psToEnt.get(str(r.id)); if (e) add("Table", [lk(pm("entities"), e)].filter((x): x is string => !!x)); }
    else if (key === "optionSets") { const e = osToEnt.get(str(r.schema_name)); if (e) add("Table", [lk(pm("entities"), e)].filter((x): x is string => !!x)); }
    const pl = procLink(tags); if (pl) out.push(`- **Process:** ${pl}`);
    return out;
  }

  // ── emit component concepts ──
  let emitted = 0;
  const folderConcepts = new Map<string, { path: string; title: string; desc: string }[]>();
  for (const d of REGISTRY) {
    mkdirSync(join(OUT, d.folder), { recursive: true });
    for (const r of src.rowsByKey.get(d.key) ?? []) {
      const info = pm(d.key).get(str(r[d.id]))!;
      const ov = src.overrideMap.get(`${APIKEY[d.folder]}:${str(r[d.id])}`);
      const tags = (r.tags as Row) || {};
      const tagList: string[] = [];
      if (r.solution) tagList.push(`solution:${str(r.solution)}`);
      if (tags.processCatalogL1) tagList.push(`bpc:${str(tags.processCatalogL1).split(" ")[0]}`);
      if (tags.d365Module) tagList.push(`module:${str(tags.d365Module)}`);
      if (tags.vertical) tagList.push(`vertical:${str(tags.vertical)}`);
      const descVal = d.desc && r[d.desc] ? oneLine(str(r[d.desc])) : undefined;
      const fm = frontmatter({ type: d.type, title: info.title, description: descVal, resource: d.resource?.(r, DV), tags: tagList, timestamp: NOW, source: ov ? "curated" : "extracted" });
      const body: string[] = [];
      if (d.schema) {
        const cr = src.colsByEntity.get(str(r[d.id]));
        const arr = Array.isArray(cr?.columns) ? (cr!.columns as Row[]) : [];
        if (arr.length) {
          body.push(`\n# Schema (${arr.length} columns)\n`, "| Column | Type |", "|--------|------|");
          for (const c of arr.slice(0, 40)) body.push(`| ${str(c.logicalName || c.name || c.schemaName || c.displayName) || "—"} | ${str(c.type) || "—"} |`);
          if (arr.length > 40) body.push(`\n_+${arr.length - 40} more columns_`);
        }
      }
      const rel = relationships(d.key, r);
      if (rel.length) body.push("\n# Relationships\n", ...rel);
      if (ov) body.push("\n# Curation\n", "```json", stableJson({
        by: ov.modified_by ?? null,
        at: ov.modified_at ? new Date(ov.modified_at as string).toISOString() : null,
        tags: ov.tags ?? null,
        fields: ov.fields ?? null,
      }), "```");
      body.push("\n# Record\n", "```json", stableJson((r.raw_data as Row) ?? {}), "```");
      writeFileSync(join(OUT, `${info.path}.md`), `${fm}\n${body.join("\n")}\n`);
      (folderConcepts.get(d.folder) ?? folderConcepts.set(d.folder, []).get(d.folder)!).push({ path: info.path, title: info.title, desc: descVal ?? "" });
      emitted++;
    }
  }

  // ── process concepts (L1–L3) ──
  mkdirSync(join(OUT, "processes"), { recursive: true });
  for (const r of src.procRows) {
    const info = procPath.get(str(r.code))!;
    const parent = r.parent_code ? procPath.get(str(r.parent_code)) : undefined;
    const fm = frontmatter({ type: "Business Process", title: info.title, description: r.description ? oneLine(str(r.description)) : undefined, tags: [`bpc:${str(r.code)}`, `level:L${str(r.level)}`], timestamp: NOW, source: "extracted" });
    const body = [`\n# Details\n`, `- Code: ${str(r.code)}`, `- Level: L${str(r.level)}`];
    if (parent) body.push(`- Parent: [${parent.title}](/${parent.path}.md)`);
    writeFileSync(join(OUT, `${info.path}.md`), `${fm}\n${body.join("\n")}\n`);
    (folderConcepts.get("processes") ?? folderConcepts.set("processes", []).get("processes")!).push({ path: info.path, title: info.title, desc: str(r.description) });
    emitted++;
  }

  // ── capability concepts ──
  mkdirSync(join(OUT, "capabilities"), { recursive: true });
  for (const r of src.capRows) {
    const info = capPath.get(str(r.id))!;
    const fm = frontmatter({ type: "Capability", title: info.title, description: r.description ? oneLine(str(r.description)) : undefined, timestamp: NOW, source: "extracted" });
    writeFileSync(join(OUT, `${info.path}.md`), `${fm}\n\n# Capability\n\n${r.description ? oneLine(str(r.description)) : ""}\n`);
    (folderConcepts.get("capabilities") ?? folderConcepts.set("capabilities", []).get("capabilities")!).push({ path: info.path, title: info.title, desc: str(r.description) });
    emitted++;
  }

  // ── index.md per folder ──
  for (const [folder, concepts] of folderConcepts) {
    const lines = [`# ${folder}\n`];
    for (const c of [...concepts].sort((a, b) => a.title.localeCompare(b.title) || a.path.localeCompare(b.path))) lines.push(`* [${c.title}](/${c.path}.md)${c.desc ? " - " + oneLine(c.desc).slice(0, 100) : ""}`);
    writeFileSync(join(OUT, folder, "index.md"), lines.join("\n") + "\n");
  }

  // ── log.md ──
  if (src.logs.length) {
    const lines = ["# Update History\n"];
    for (const r of src.logs) { const date = str(r.timestamp).slice(0, 10) || "unknown"; lines.push(`## ${date}`, `- **Refresh** (${str(r.mode)})`, ""); }
    writeFileSync(join(OUT, "log.md"), lines.join("\n"));
  }

  // ── root index ──
  const sections = [...folderConcepts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([f, c]) => `* [${f}](/${f}/index.md) (${c.length})`);
  writeFileSync(join(OUT, "index.md"), frontmatter({ type: "Bundle", title: "D365 Knowledge Bundle", okf_version: "0.1" }) + `\n# D365 Knowledge Bundle\n\n${sections.join("\n")}\n`);

  // ── conformance gate ──
  const allMd: string[] = [];
  const walk = (dir: string) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".md")) allMd.push(p); } };
  walk(OUT);
  const base = (p: string): string => p.split(/[\\/]/).pop() ?? "";
  const concepts = allMd.filter((p) => base(p) !== "index.md" && base(p) !== "log.md");
  let typed = 0;
  for (const p of concepts) { const fm = readFileSync(p, "utf-8").split("---")[1] ?? ""; if (/(^|\n)type:\s*\S/.test(fm)) typed++; }
  const ok = concepts.length === emitted && typed === concepts.length;
  return { concepts: concepts.length, emitted, typed, ok, total: allMd.length };
}
