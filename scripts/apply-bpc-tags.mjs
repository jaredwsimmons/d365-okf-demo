// apply-bpc-tags.mjs — Real Microsoft Business Process Catalog classification pass.
//
//   node scripts/apply-bpc-tags.mjs [dataDir=data]
//
// Mirrors the product's Apply-ProcessTags.ps1 enrichment step. Reads the real
// DEC 2025.1 BPC taxonomy (bpc-catalog.json) and the real rule set
// (bpc-classification.json + demo extension bpc-classification-ext.json), then
// stamps processCatalogL1/L2/L3 tags ("<code> <title>") on every component in
// data/*.json by RULE — entity→process map, entity-name patterns, module, and
// keyword scoring — exactly how the dashboard classifies a live org. Finally it
// writes data/ProcessCatalog.json = the real 15/94/672/3423 catalog.
//
// Every emitted code is validated against the catalog: no dangling references.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, process.argv[2] || "data");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, ""));

// ── Load real catalog + rules ───────────────────────────────────────
const catalog = readJson(join(ROOT, "scripts/bpc-catalog.json"));
const base = readJson(join(ROOT, "scripts/bpc-classification.json"));
const ext = readJson(join(ROOT, "scripts/bpc-classification-ext.json"));

// Catalog lookups (code → title) + parent groupings + valid-code guard.
const title1 = {}, title2 = {}, title3 = {};
const l2byl1 = {}, l3byl2 = {};
for (const p of catalog.l1Processes || []) title1[p.code] = p.title;
for (const p of catalog.l2Processes || []) { title2[p.code] = p.title; (l2byl1[p.parentL1Code] ||= []).push(p.code); }
for (const p of catalog.l3Processes || []) { title3[p.code] = p.title; (l3byl2[p.parentL2Code] ||= []).push(p.code); }
const validCode = (c) => c && (title1[c] || title2[c] || title3[c]);

// ── Merge rule structures ───────────────────────────────────────────
// Flat entity → {l1,l2,l3}. Base groups are keyed by pseudo-module; flatten them,
// then let the demo extension override / add.
const entityToProcess = {};
for (const [group, entries] of Object.entries(base.entityToProcess || {})) {
  if (group === "_description" || !entries || typeof entries !== "object") continue;
  for (const [ent, m] of Object.entries(entries)) {
    if (m && m.l1) entityToProcess[ent.toLowerCase()] = { l1: m.l1, l2: m.l2 || "", l3: m.l3 || "" };
  }
}
for (const [ent, m] of Object.entries(ext.entityToProcess || {})) {
  entityToProcess[ent.toLowerCase()] = { l1: m.l1, l2: m.l2 || "", l3: m.l3 || "" };
}

// Per-L1 rules for all 15 processes: entity patterns + L1 keywords + curated L2/L3.
const L1_CODES = (catalog.l1Processes || []).map((p) => p.code);
const perL1 = {};
for (const code of L1_CODES) {
  const bp = base.processes?.[code];
  perL1[code] = {
    patterns: [...(bp?.entityPatterns || []), ...((ext.entityPatterns || {})[code] || [])].map((s) => s.toLowerCase()),
    keywords: [...(bp?.keywords || []), ...((ext.entityKeywords || {})[code] || [])].map((s) => s.toLowerCase()),
    curatedL2: bp?.l2 || null,
  };
}
// Flattened (pattern → l1), longest-first so specific patterns win over generic ones.
const patternList = [];
for (const code of L1_CODES) for (const pat of perL1[code].patterns) patternList.push({ code, pat });
patternList.sort((a, b) => b.pat.length - a.pat.length);

// Name/entity keyword → L1 (from the product's web-resource entity keyword map).
const nameKeywordL1 = Object.entries(base.webResourcePatterns?.entityKeywords || {}).map(
  ([kw, code]) => ({ kw: kw.toLowerCase(), code }),
).sort((a, b) => b.kw.length - a.kw.length);

const moduleToL1 = ext.moduleToL1 || {};

// ── L2 / L3 scoring rules, derived from the real catalog subtree ─────
// A node's keyword set = curated keywords (where the product elaborates them)
// UNION meaningful tokens from its real catalog title. Guarantees we only ever
// assign codes that exist in the catalog.
const STOP = new Set(["and","the","for","with","from","into","onto","a","an","of","to","on","in","by","or","manage","develop","define","conduct","perform","plan","process","record","monitor","analyze","track","create","run","review","establish","identify","maintain","update","new"]);
const tokens = (s) => String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t));
const l2l3Cache = {};
function rulesFor(l1) {
  if (l2l3Cache[l1]) return l2l3Cache[l1];
  const curated = perL1[l1]?.curatedL2 || {};
  const l2 = (l2byl1[l1] || []).map((code) => ({
    code,
    kw: [...new Set([...(curated[code]?.keywords || []).map((s) => s.toLowerCase()), ...tokens(title2[code])])],
    l3: (l3byl2[code] || []).map((c3) => ({
      code: c3,
      kw: [...new Set([...((curated[code]?.l3?.[c3]?.keywords) || []).map((s) => s.toLowerCase()), ...tokens(title3[c3])])],
    })),
  }));
  return (l2l3Cache[l1] = l2);
}
function bestByKeywords(candidates, text) {
  let best = null, bestScore = 0;
  for (const c of candidates) {
    let score = 0;
    for (const k of c.kw) if (k && text.includes(k)) score++;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 1 ? best : null;
}
// Given an L1 + search text, resolve the best real L2 and L3 beneath it.
function resolveL2L3(l1, text) {
  const l2rules = rulesFor(l1);
  const l2 = bestByKeywords(l2rules, text);
  if (!l2) return { l2: "", l3: "" };
  const l3 = bestByKeywords(l2.l3, text);
  return { l2: l2.code, l3: l3 ? l3.code : "" };
}

// ── L1 resolution ───────────────────────────────────────────────────
function l1FromPatterns(entityLower) {
  if (!entityLower) return null;
  for (const { code, pat } of patternList) if (entityLower.includes(pat)) return code;
  return null;
}
function l1FromNameKeywords(text) {
  for (const { kw, code } of nameKeywordL1) if (text.includes(kw)) return code;
  return null;
}
function l1FromKeywords(text) {
  let best = null, bestScore = 0;
  for (const code of L1_CODES) {
    let score = 0;
    for (const k of perL1[code].keywords) if (k && text.includes(k)) score++;
    if (score > bestScore) { bestScore = score; best = code; }
  }
  return bestScore >= 2 ? best : null;
}

// Module / domain display-name → L1 (ordered: specific phrases before broad ones).
// Used for components with no entity whose NAME names a module or domain
// (security roles, per-module reports / dashboards / sitemaps, etc.).
const MODULE_NAME_L1 = [
  ["field service", "95.00"], ["customer service", "20.00"], ["contact center", "20.00"], ["case management", "20.00"], ["service management", "20.00"], ["escalation", "20.00"], ["deflection", "20.00"],
  ["project operations", "80.00"], ["project", "80.00"],
  ["human resources", "55.00"], ["payroll", "55.00"], ["onboarding", "55.00"], ["worker", "55.00"], ["talent", "55.00"], ["disciplinary", "55.00"],
  ["accounts payable", "75.00"], ["accounts receivable", "65.00"],
  ["record to report", "90.00"], ["general ledger", "90.00"], ["finance", "90.00"], ["budget", "90.00"], ["ledger", "90.00"],
  ["supply chain", "60.00"], ["warehouse", "60.00"], ["inventory", "60.00"], ["shipment", "60.00"],
  ["procurement", "75.00"], ["purchasing", "75.00"], ["purchase", "75.00"], ["vendor", "75.00"], ["supplier", "75.00"],
  ["production", "70.00"], ["manufacturing", "70.00"],
  ["fixed asset", "10.00"], ["asset management", "10.00"],
  ["forecast", "50.00"], ["demand plan", "50.00"], ["operations planning", "50.00"],
  ["commerce", "65.00"], ["retail", "65.00"], ["point of sale", "65.00"], ["order to cash", "65.00"], ["loyalty", "65.00"], ["gift card", "65.00"],
  ["marketing", "30.00"], ["campaign", "30.00"], ["event", "30.00"],
  ["customer insights", "99.00"], ["data platform", "99.00"], ["consent", "99.00"], ["profile", "99.00"],
  ["deal desk", "85.00"], ["sales", "85.00"], ["opportunity", "85.00"], ["prospect", "85.00"], ["quote", "85.00"],
  ["platform", "99.00"], ["governance", "99.00"], ["compliance", "99.00"], ["security", "99.00"], ["admin", "99.00"], ["environment", "99.00"],
];
function l1FromModuleName(text) {
  for (const [kw, code] of MODULE_NAME_L1) if (text.includes(kw)) return code;
  return null;
}

// Resolve the entity a component references from its name, when there's no
// entity field: plugin-step names ("Update of con_x — …") and web-resource
// script paths ("con_/scripts/con-x.js" → con_x).
function entityFromStepName(name) {
  const m = String(name || "").match(/\b(?:of|for|on)\s+([a-z][a-z0-9]*_?[a-z0-9_]+)/i);
  return m ? m[1].toLowerCase() : "";
}
function entityFromWebResourceName(name) {
  const seg = String(name || "").split("/").pop() || "";
  const cand = seg.replace(/\.(js|html?|css|xml|png|svg|gif|json|resx)$/i, "").replace(/-/g, "_").toLowerCase();
  if (entityClass[cand] || entityToProcess[cand]) return cand;
  const noprefix = cand.replace(/^(con|msdyn|msdynmkt|msdynci|msdynhr|mshr|mserp|cdm)_/, "");
  for (const k of Object.keys(entityClass)) if (k.endsWith(noprefix) && noprefix.length >= 5) return k;
  return "";
}

// ── Tag formatting (validated) ──────────────────────────────────────
const fmt = { l1: (c) => (validCode(c) ? `${c} ${title1[c]}` : ""), l2: (c) => (validCode(c) ? `${c} ${title2[c]}` : ""), l3: (c) => (validCode(c) ? `${c} ${title3[c]}` : "") };
function toTags(l1, l2, l3) {
  // drop any level whose code isn't real; drop child if parent dropped
  const L1 = validCode(l1) ? l1 : "";
  const L2 = L1 && validCode(l2) ? l2 : "";
  const L3 = L2 && validCode(l3) ? l3 : "";
  return { processCatalogL1: fmt.l1(L1), processCatalogL2: fmt.l2(L2), processCatalogL3: fmt.l3(L3) };
}

// ── Classify an ENTITY (authoritative; forms/views/etc. inherit this) ─
const entityClass = {}; // logicalNameLower → { l1, l2, l3 }
function classifyEntity(logicalName, displayName, description, module) {
  const key = String(logicalName || "").toLowerCase();
  const text = `${displayName || ""} ${logicalName || ""} ${description || ""}`.toLowerCase();
  const exact = entityToProcess[key];
  if (exact) return { l1: exact.l1, l2: exact.l2, l3: exact.l3 };
  let l1 = l1FromPatterns(key);
  if (!l1 && module && moduleToL1[module]) l1 = moduleToL1[module]; // module tag is authoritative for entities
  if (!l1) l1 = l1FromKeywords(text);
  if (!l1) return { l1: "", l2: "", l3: "" };
  return { l1, ...resolveL2L3(l1, text) };
}

// ── Classify any COMPONENT ──────────────────────────────────────────
function classifyComponent({ name, entity, description, module, category }) {
  const ent = String(entity || "").toLowerCase();
  const text = `${name || ""} ${entity || ""} ${description || ""} ${category || ""}`.toLowerCase();
  // 1) inherit from parent entity when it resolves to a known entity
  if (ent && entityClass[ent] && entityClass[ent].l1) return entityClass[ent];
  // 2) entity → process (exact) / patterns
  if (ent && entityToProcess[ent]) { const e = entityToProcess[ent]; return { l1: e.l1, l2: e.l2, l3: e.l3 }; }
  let l1 = ent ? l1FromPatterns(ent) : null;
  // 3) name/entity keyword → L1
  if (!l1) l1 = l1FromNameKeywords(text);
  // 4) ≥2 process keywords
  if (!l1) l1 = l1FromKeywords(text);
  // 5) module / domain display-name in the component name
  if (!l1) l1 = l1FromModuleName(text);
  // 6) module fallback
  if (!l1 && module && moduleToL1[module]) l1 = moduleToL1[module];
  if (!l1) return { l1: "", l2: "", l3: "" };
  return { l1, ...resolveL2L3(l1, text) };
}

// ── Reporting ───────────────────────────────────────────────────────
const seenL1 = new Set(), seenL2 = new Set(), seenL3 = new Set();
let tagged = 0, untagged = 0;
const dangling = new Set();
function record(t) {
  const c1 = (t.processCatalogL1.match(/^([\d.]+)/) || [])[1];
  const c2 = (t.processCatalogL2.match(/^([\d.]+)/) || [])[1];
  const c3 = (t.processCatalogL3.match(/^([\d.]+)/) || [])[1];
  if (c1) { seenL1.add(c1); tagged++; } else { untagged++; }
  if (c2) seenL2.add(c2);
  if (c3) seenL3.add(c3);
  for (const c of [c1, c2, c3]) if (c && !validCode(c)) dangling.add(c);
}
const setTags = (obj, t) => { obj.tags = { ...(obj.tags || {}), ...t }; record(t); };

// ── Pass 1: entities (build the inheritance map, then tag them) ──────
const entFile = join(DATA, "EntityInventory.json");
const entJson = readJson(entFile);
const allEntities = [];
for (const cat of Object.values(entJson.entities || {})) if (Array.isArray(cat)) allEntities.push(...cat);
if (Array.isArray(entJson.standardEntitiesCustomized)) allEntities.push(...entJson.standardEntitiesCustomized);
// First compute classification for every entity...
for (const e of allEntities) {
  const cls = classifyEntity(e.logicalName, e.displayName, e.description, e.tags?.d365Module);
  entityClass[String(e.logicalName).toLowerCase()] = cls;
}
// ...then stamp tags (so cross-entity inheritance is stable).
for (const e of allEntities) {
  const cls = entityClass[String(e.logicalName).toLowerCase()];
  setTags(e, toTags(cls.l1, cls.l2, cls.l3));
}
writeJson(entFile, entJson);

// ── Pass 2: component inventories ───────────────────────────────────
function processInventory(file, key, map) {
  const p = join(DATA, file);
  if (!existsSync(p)) return;
  const j = readJson(p);
  const arr = j[key];
  if (!Array.isArray(arr)) return;
  for (const item of arr) setTags(item, toTags(...map(item)));
  writeJson(p, j);
}
// map(item) → [l1,l2,l3] via classifyComponent
const cc = (fields) => { const c = classifyComponent(fields); return [c.l1, c.l2, c.l3]; };

processInventory("FormInventory.json", "forms", (f) => cc({ name: f.name, entity: f.entity }));
processInventory("ViewInventory.json", "views", (v) => cc({ name: v.name, entity: v.entity }));
processInventory("WorkflowInventory.json", "workflows", (w) => cc({ name: w.name, entity: w.primaryEntity, description: w.description }));

// Plugin steps: derive the entity from the step name when the field is empty,
// and tally each step's L1 by the plugin it belongs to ("… — <PluginName>").
const pluginL1Votes = {};
{
  const p = join(DATA, "PluginStepInventory.json");
  if (existsSync(p)) {
    const jd = readJson(p);
    for (const s of (Array.isArray(jd.pluginSteps) ? jd.pluginSteps : [])) {
      const ent = s.entity && s.entity !== "none" ? s.entity : entityFromStepName(s.name);
      const c = classifyComponent({ name: s.name, entity: ent, description: s.description });
      setTags(s, toTags(c.l1, c.l2, c.l3));
      const pn = (String(s.name).split("—").pop() || "").trim();
      if (pn && c.l1) (pluginL1Votes[pn] ||= []).push(c.l1);
    }
    writeJson(p, jd);
  }
}
// Plugins: classify by entity/name; if unresolved, inherit the modal L1 of the
// plugin's own steps (a plugin's process = the process of the entities it fires on).
{
  const p = join(DATA, "PluginInventory.json");
  if (existsSync(p)) {
    const jd = readJson(p);
    for (const pl of (Array.isArray(jd.plugins) ? jd.plugins : [])) {
      let c = classifyComponent({ name: pl.name, entity: pl.entity, description: pl.businessLogic });
      if (!c.l1 && pluginL1Votes[pl.name]?.length) {
        const v = pluginL1Votes[pl.name];
        const modal = [...v].sort((a, b) => v.filter((x) => x === b).length - v.filter((x) => x === a).length)[0];
        c = { l1: modal, ...resolveL2L3(modal, `${pl.name} ${pl.businessLogic || ""}`.toLowerCase()) };
      }
      setTags(pl, toTags(c.l1, c.l2, c.l3));
    }
    writeJson(p, jd);
  }
}
processInventory("WebResourceInventory.json", "webResources", (w) => cc({ name: `${w.name || ""} ${w.displayName || ""}`, entity: w.relatedEntity && w.relatedEntity !== "none" ? w.relatedEntity : entityFromWebResourceName(w.name) }));
processInventory("ReportInventory.json", "reports", (r) => cc({ name: `${r.name || ""} ${r.fileName || ""}`, entity: r.entity, category: r.category }));
processInventory("SecurityRoleInventory.json", "roles", (r) => cc({ name: r.name, category: r.category }));
processInventory("OptionSetInventory.json", "optionSets", (o) => cc({ name: `${o.displayName || ""} ${o.schemaName || ""}`, entity: Array.isArray(o.entities) ? o.entities[0] : undefined }));
processInventory("EnvironmentVariableInventory.json", "environmentVariables", (e) => cc({ name: `${e.displayName || ""} ${e.schemaName || ""}`, description: e.description }));
processInventory("SiteMapInventory.json", "siteMaps", (s) => cc({ name: s.name }));
processInventory("TemplateInventory.json", "templates", (t) => cc({ name: `${t.title || ""} ${t.templateTypeName || ""}` }));
processInventory("DashboardInventory.json", "dashboards", (d) => cc({ name: d.name }));
processInventory("PCFControlInventory.json", "controls", (c) => cc({ name: `${c.name || ""} ${c.displayName || ""}` }));
processInventory("AppActionInventory.json", "appActions", (a) => cc({ name: `${a.buttonLabel || ""} ${a.name || ""}`, entity: a.contextEntity }));

// Apps (two arrays) + AI components (three arrays) — classify by name/entity.
for (const [file, keys] of [["AppInventory.json", ["modelDrivenApps", "canvasApps"]], ["AIComponentInventory.json", ["botComponents", "customAPIs", "aiSkillConfigs"]]]) {
  const p = join(DATA, file);
  if (!existsSync(p)) continue;
  const j = readJson(p);
  for (const key of keys) for (const item of (Array.isArray(j[key]) ? j[key] : [])) {
    setTags(item, toTags(...cc({ name: `${item.displayName || item.name || ""}`, entity: item.entity })));
  }
  writeJson(p, j);
}

// ── Write the real catalog as the demo's ProcessCatalog.json ─────────
// Keep the real end-to-end → area → process taxonomy (L1/L2/L3). L4+ scenarios
// are implementation-specific leaves that carry no component mappings (components
// classify to L3), so we omit them — the tree still shows the complete real
// 15→94→672 catalog without shipping ~5k empty per-node snapshot files.
writeJson(join(DATA, "ProcessCatalog.json"), {
  l1Processes: catalog.l1Processes || [],
  l2Processes: catalog.l2Processes || [],
  l3Processes: catalog.l3Processes || [],
});

// ── Summary ─────────────────────────────────────────────────────────
function writeJson(p, obj) { writeFileSync(p, JSON.stringify(obj, null, 2) + "\n"); }
const litL1 = L1_CODES.filter((c) => seenL1.has(c));
console.log("\n=== BPC classification complete ===");
console.log(`  tagged components : ${tagged}   (untagged: ${untagged})`);
console.log(`  End-to-End covered: ${litL1.length}/${L1_CODES.length}  → ${litL1.map((c) => c).join(", ")}`);
console.log(`  Areas covered     : ${seenL2.size}/${(catalog.l2Processes || []).length}`);
console.log(`  Processes covered : ${seenL3.size}/${(catalog.l3Processes || []).length}`);
console.log(`  dangling codes    : ${dangling.size ? [...dangling].join(", ") : "none ✓"}`);
const missing = L1_CODES.filter((c) => !seenL1.has(c));
if (missing.length) console.log(`  ⚠ L1 with no components: ${missing.map((c) => `${c} ${title1[c]}`).join(" | ")}`);
