// Generates synthetic Contoso process-flow SVGs + the BPC diagram manifest.
//
//   node scripts/gen-bpc-diagrams.mjs
//
// Emits:
//   public/bpc-diagrams/<area>/<file>.svg          (one per flow)
//   public/api-snapshot/v1/bpc-diagrams.json       (manifest keyed by BPC code)
//
// The manifest shape matches DiagramManifest (src/lib/diagram-manifest.ts):
//   { [bpcCode]: [{ path, name }] }  where path is the public-relative SVG path.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");

// ── Palette (matches the favicon brand blue) ───────────────────────
const C = {
  ink: "#0b3a6b",
  border: "#0b5cab",
  fillA: "#eef4fb",
  fillB: "#dceaf6",
  arrow: "#7c8a99",
  sub: "#5b6b7a",
  band: "#f6f9fd",
};

// ── Flows to render ────────────────────────────────────────────────
const FLOWS = [
  {
    code: "FS.00",
    area: "field-service",
    file: "service-delivery-flow.svg",
    name: "Service Delivery — End-to-End Flow",
    stages: ["Schedule Work", "Dispatch Technician", "Execute Visit", "Inspect & QA", "Invoice", "Close Job"],
  },
  {
    code: "FS.20",
    area: "field-service",
    file: "execute-work-order-flow.svg",
    name: "Execute Work Order — On-Site Flow",
    stages: ["Arrive On-Site", "Diagnose Issue", "Perform Repair", "Record Parts Used", "Customer Sign-off"],
  },
  {
    code: "SA.00",
    area: "sales",
    file: "sales-to-order-flow.svg",
    name: "Sales to Order — Lead to Booked Work",
    stages: ["Capture Lead", "Qualify", "Build Quote", "Negotiate", "Convert to Order"],
  },
];

// ── SVG geometry ───────────────────────────────────────────────────
const BOX_W = 150;
const BOX_H = 60;
const GAP = 38;
const MARGIN = 24;
const TITLE_H = 46;
const BOX_Y = TITLE_H + 18;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(label) {
  if (label.length <= 16) return [label];
  const words = label.split(" ");
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function renderStage(stage, i) {
  const x = MARGIN + i * (BOX_W + GAP);
  const cx = x + BOX_W / 2;
  const fill = i % 2 === 0 ? C.fillA : C.fillB;
  const lines = wrap(stage);
  const startY = BOX_Y + BOX_H / 2 - (lines.length - 1) * 8 + 4;
  const text = lines
    .map((ln, j) => `<text x="${cx}" y="${startY + j * 16}" text-anchor="middle" font-size="13" font-weight="600" fill="${C.ink}">${esc(ln)}</text>`)
    .join("");
  const num = `<circle cx="${x + 14}" cy="${BOX_Y + 14}" r="9" fill="${C.border}"/><text x="${x + 14}" y="${BOX_Y + 18}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${i + 1}</text>`;
  return `<rect x="${x}" y="${BOX_Y}" width="${BOX_W}" height="${BOX_H}" rx="8" fill="${fill}" stroke="${C.border}" stroke-width="1.5"/>${num}${text}`;
}

function renderArrow(i) {
  const x1 = MARGIN + i * (BOX_W + GAP) + BOX_W;
  const x2 = x1 + GAP;
  const y = BOX_Y + BOX_H / 2;
  return `<line x1="${x1 + 4}" y1="${y}" x2="${x2 - 6}" y2="${y}" stroke="${C.arrow}" stroke-width="2" marker-end="url(#arrow)"/>`;
}

function renderFlow(flow) {
  const n = flow.stages.length;
  const width = MARGIN * 2 + n * BOX_W + (n - 1) * GAP;
  const height = BOX_Y + BOX_H + MARGIN;
  const stages = flow.stages.map(renderStage).join("");
  const arrows = flow.stages.slice(0, -1).map((_, i) => renderArrow(i)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Segoe UI, system-ui, sans-serif">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="${C.arrow}"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="${C.band}"/>
  <text x="${MARGIN}" y="26" font-size="16" font-weight="700" fill="${C.ink}">${esc(flow.name)}</text>
  <text x="${MARGIN}" y="42" font-size="11" fill="${C.sub}">BPC ${flow.code} · synthetic Contoso process flow</text>
  ${arrows}
  ${stages}
</svg>
`;
}

// ── Emit ───────────────────────────────────────────────────────────
const manifest = {};
for (const flow of FLOWS) {
  const rel = `bpc-diagrams/${flow.area}/${flow.file}`;
  const abs = join(PUBLIC, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, renderFlow(flow), "utf8");
  (manifest[flow.code] ||= []).push({ path: rel, name: flow.name });
  console.log("wrote", rel);
}

const manifestPath = join(PUBLIC, "api-snapshot/v1/bpc-diagrams.json");
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("wrote", "api-snapshot/v1/bpc-diagrams.json", "(" + Object.keys(manifest).length + " codes)");
