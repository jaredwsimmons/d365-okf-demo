"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProcessCatalog } from "@/types/inventory";
import type { IndexedComponent, ComponentIndex } from "@/lib/component-index";
import { Badge } from "@/components/ui";
import { Separator } from "@/components/ui";
import { DashboardIcon } from "@/components/shared/dashboard-icon";
import { LEVEL_NAMES, TYPE_ORDER, TYPE_LABELS } from "@/lib/constants";
import type { DiagramManifest } from "@/lib/diagram-manifest";
import { BpcDiagramViewer } from "@/components/shared/bpc-diagram-viewer";
import { ComponentTypeGroup } from "@/components/shared/component-type-group";
import { AccordionSection } from "@/components/shared/accordion-section";
import { CoverageDot, type TreeData } from "./process-catalog-tree";
import { Frame, FileImage, Pencil, Trash2, ExternalLink, Check, X } from "lucide-react";
import { getProcessDiagrams, saveProcessDiagram, deleteProcessDiagram, type ProcessDiagramsMap } from "@/lib/api-client";

// --- Process Diagrams ---
type ProcessDiagrams = ProcessDiagramsMap;

let diagramCache: ProcessDiagrams | null = null;

async function loadProcessDiagrams(): Promise<ProcessDiagrams> {
  if (diagramCache) return diagramCache;
  try {
    diagramCache = await getProcessDiagrams();
    return diagramCache;
  } catch { return {}; }
}

async function saveProcessDiagrams(data: ProcessDiagrams, changed?: { code: string; entry: { url: string; title?: string } | null }): Promise<boolean> {
  try {
    diagramCache = data;
    if (!changed) return true;
    if (changed.entry === null) {
      await deleteProcessDiagram(changed.code);
    } else {
      await saveProcessDiagram(changed.code, changed.entry.url, changed.entry.title);
    }
    return true;
  } catch { return false; }
}

// --- Detail Panel ---
export function PCDetail({
  catalog,
  treeData,
  compIndex,
  code,
  level,
  onSelect,
  onNavigate,
  manifest,
  bulkEditOpen,
  checkedComps,
  onToggleCheck,
}: {
  catalog: ProcessCatalog;
  treeData: TreeData;
  compIndex: ComponentIndex;
  code: string;
  level: number;
  onSelect: (code: string, level: number) => void;
  onNavigate: (tabId: string, searchName: string) => void;
  manifest: DiagramManifest;
  bulkEditOpen: boolean;
  checkedComps: Set<string>;
  onToggleCheck: (key: string) => void;
}) {
  // --- Diagram state ---
  const [diagrams, setDiagrams] = useState<ProcessDiagrams>({});
  const [editing, setEditing] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");

  useEffect(() => {
    loadProcessDiagrams().then(setDiagrams);
  }, []);

  const currentDiagram = diagrams[code];

  const handleSave = useCallback(async () => {
    if (!urlInput.trim()) return;
    // Normalize Lucid URL to embed format
    let embedUrl = urlInput.trim();
    if (embedUrl.includes("lucid.app/") && !embedUrl.includes("/embedded/")) {
      embedUrl = embedUrl.replace(
        /lucid\.app\/(lucidchart|documents)\/([^/]+)\/.*/,
        "lucid.app/documents/embedded/$2"
      );
    }
    const entry = { url: embedUrl, title: titleInput.trim() || undefined };
    const updated = { ...diagrams, [code]: entry };
    const ok = await saveProcessDiagrams(updated, { code, entry });
    if (ok) {
      setDiagrams(updated);
      setEditing(false);
      setUrlInput("");
      setTitleInput("");
    }
  }, [code, diagrams, urlInput, titleInput]);

  const handleDelete = useCallback(async () => {
    const updated = { ...diagrams };
    delete updated[code];
    const ok = await saveProcessDiagrams(updated, { code, entry: null });
    if (ok) {
      setDiagrams(updated);
    }
  }, [code, diagrams]);

  const l1K = catalog.lookup.l1 || {};
  const l2K = catalog.lookup.l2 || {};
  const l3K = catalog.lookup.l3 || {};

  // Resolve breadcrumb
  const parts = code.split(".");
  const l1Code = parts[0] + ".00";
  const l2Code = level >= 2 ? parts[0] + "." + parts[1] : "";
  const l3Code = level >= 3 ? code : "";

  const l1Name = l1K[l1Code] || "";
  const l2Name = l2Code ? l2K[l2Code] || "" : "";
  const l3Name = l3Code ? l3K[l3Code] || "" : "";

  // Get components for this level
  let comps: IndexedComponent[] = [];
  if (level === 1) comps = compIndex.byL1[code] || [];
  else if (level === 2) comps = compIndex.byL2[code] || [];
  else if (level === 3) comps = compIndex.byL3[code] || [];

  // Find process object for metadata
  const proc = findProcess(catalog, code, level);
  const title =
    level === 1
      ? l1Name
      : level === 2
        ? l2Name
        : level === 3
          ? l3Name
          : proc?.title || code;

  // Component type breakdown
  const byType: Record<string, IndexedComponent[]> = {};
  comps.forEach((c) => {
    if (!byType[c.type]) byType[c.type] = [];
    byType[c.type]!.push(c);
  });

  // Child processes
  const childL2s =
    level === 1 ? (treeData.l2sByL1[code] || []) : [];
  const childL3s =
    level === 2 ? (treeData.l3sByL2[code] || []) : [];
  const childL4s =
    level === 3 ? (treeData.l4sByL3[code] || []) : [];

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 flex-wrap">
        <button
          className="hover:text-foreground hover:underline"
          onClick={() => onSelect(l1Code, 1)}
        >
          {LEVEL_NAMES[1]}
        </button>
        {level >= 2 && (
          <>
            <span>&rsaquo;</span>
            <button
              className={
                level > 2
                  ? "hover:text-foreground hover:underline"
                  : "text-foreground"
              }
              onClick={() => level > 2 && onSelect(l2Code, 2)}
            >
              {LEVEL_NAMES[2]}
            </button>
          </>
        )}
        {level >= 3 && (
          <>
            <span>&rsaquo;</span>
            <button
              className={
                level > 3
                  ? "hover:text-foreground hover:underline"
                  : "text-foreground"
              }
              onClick={() => level > 3 && onSelect(l3Code, 3)}
            >
              {LEVEL_NAMES[3]}
            </button>
          </>
        )}
        {level >= 4 && (
          <>
            <span>&rsaquo;</span>
            <span className="text-foreground">{LEVEL_NAMES[level]}</span>
          </>
        )}
      </div>

      {/* Title */}
      <h2 className="text-base font-semibold text-foreground mb-1">{title}</h2>
      <div className="text-xs text-muted-foreground mb-3">
        BPC: {code}
        {proc?.apqc && (
          <>
            {" | "}
            APQC: {proc.apqc.id}
            {proc.apqc.description && ` - ${proc.apqc.description}`}
          </>
        )}
      </div>
      <Separator className="mb-3" />

      {/* Component type pills */}
      {comps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {TYPE_ORDER.filter((t) => byType[t]).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className="text-xs font-normal flex items-center gap-1"
            >
              <DashboardIcon iconKey={t} className="w-3.5 h-3.5 shrink-0" />
              {byType[t]!.length} {TYPE_LABELS[t] || t}
            </Badge>
          ))}
        </div>
      )}

      {/* Description */}
      {proc?.description && (
        <div className="text-sm text-foreground/80 bg-muted rounded-md px-3 py-2 leading-relaxed mb-4 border-l-2 border-muted-foreground/20">
          {proc.description.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < proc.description!.split("\n").length - 1 && <br />}
            </span>
          ))}
        </div>
      )}

      {/* Microsoft Learn links */}
      {proc?.microsoftReferences && proc.microsoftReferences.length > 0 && (
        <div className="mb-4">
          {proc.microsoftReferences.map((ref, i) => (
            <a
              key={i}
              href={ref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-primary hover:underline mr-3"
            >
              Microsoft Learn &rarr;
            </a>
          ))}
        </div>
      )}

      {/* Process Flow Diagrams */}
      <BpcDiagramViewer code={code} manifest={manifest} />

      {/* Lucid / Embedded Diagram */}
      {currentDiagram ? (
        <div className="mb-4">
          <AccordionSection
            title={currentDiagram.title || `${title} — Diagram`}
            lucideIcon={Frame}
            defaultOpen={false}
          >
            <div className="flex items-center justify-end gap-1 px-1 py-1">
              <a
                href={currentDiagram.url.replace("/embedded/", "/lucidchart/").replace("/documents/embedded/", "/lucidchart/")}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Open in Lucidchart"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => {
                  setUrlInput(currentDiagram.url);
                  setTitleInput(currentDiagram.title || "");
                  setEditing(true);
                }}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Edit diagram URL"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Remove diagram"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <iframe
              src={currentDiagram.url}
              className="w-full border-0 rounded-b"
              style={{ height: "450px" }}
              allowFullScreen
              title={currentDiagram.title || "Process Diagram"}
            />
          </AccordionSection>
        </div>
      ) : editing ? (
        <div className="border rounded-lg p-3 space-y-2 bg-muted/30 mb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
            <FileImage className="w-3.5 h-3.5" />
            Add Process Diagram
          </div>
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Diagram title (optional)"
            className="w-full px-2 py-1.5 text-xs border rounded bg-background"
          />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste Lucidchart URL or embed URL..."
            className="w-full px-2 py-1.5 text-xs border rounded bg-background"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!urlInput.trim()}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="w-3 h-3" /> Save
            </button>
            <button
              onClick={() => { setEditing(false); setUrlInput(""); setTitleInput(""); }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border hover:bg-accent"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Supports Lucidchart, Visio Online, draw.io, or any embeddable URL. For Lucidchart, paste the share link — it will be converted to embed format automatically.
          </p>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded border border-dashed hover:border-solid hover:bg-accent/30 w-full mb-4"
        >
          <FileImage className="w-3.5 h-3.5" />
          Add process diagram...
        </button>
      )}

      {/* Metadata */}
      {proc && (proc.applicationFamily || proc.products) && (
        <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-xs mb-4 bg-muted/50 rounded-md px-3 py-2">
          {proc.applicationFamily && (
            <>
              <span className="text-muted-foreground">App Family</span>
              <span>{proc.applicationFamily}</span>
            </>
          )}
          {proc.products && (
            <>
              <span className="text-muted-foreground">Products</span>
              <span>{proc.products}</span>
            </>
          )}
        </div>
      )}

      {/* Child L2s (when L1 selected) */}
      {childL2s.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Process Areas ({childL2s.length})
          </h3>
          <div className="space-y-0.5">
            {childL2s.map((c) => {
              const cnt = (compIndex.byL2[c] || []).length;
              return (
                <div
                  key={c}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 cursor-pointer text-xs"
                  onClick={() => onSelect(c, 2)}
                >
                  <CoverageDot hasComponents={cnt > 0} level={2} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {c}
                  </span>
                  <span className="flex-1 truncate">{l2K[c] || ""}</span>
                  {cnt > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {cnt}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Child L3s (when L2 selected) */}
      {childL3s.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Business Processes ({childL3s.length})
          </h3>
          <div className="space-y-0.5">
            {childL3s.map((c) => {
              const cnt = (compIndex.byL3[c] || []).length;
              return (
                <div
                  key={c}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 cursor-pointer text-xs"
                  onClick={() => onSelect(c, 3)}
                >
                  <CoverageDot hasComponents={cnt > 0} level={3} />
                  <span className="font-mono text-xs text-muted-foreground">
                    {c}
                  </span>
                  <span className="flex-1 truncate">{l3K[c] || ""}</span>
                  {cnt > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {cnt}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Child L4s (when L3 selected) */}
      {childL4s.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Scenarios ({childL4s.length})
          </h3>
          <div className="space-y-0.5">
            {childL4s
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((l4) => (
                <div
                  key={l4.code}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 cursor-pointer text-xs"
                  onClick={() => onSelect(l4.code, 4)}
                >
                  <CoverageDot hasComponents={false} level={4} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {l4.code}
                  </span>
                  <span className="flex-1 truncate text-foreground/80">
                    {l4.title}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Mapped Components */}
      {comps.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Mapped Components ({comps.length})
          </h3>
          {TYPE_ORDER.filter((t) => byType[t]).map((type) => {
            const items = byType[type]!.sort((a, b) =>
              (a.name ?? "").localeCompare(b.name ?? "")
            );
            return (
              <ComponentTypeGroup
                key={type}
                type={type}
                items={items}
                onNavigate={onNavigate}
                bulkEdit={bulkEditOpen ? { checkedComps, onToggleCheck } : undefined}
              />
            );
          })}
        </div>
      )}

      {/* No components message */}
      {comps.length === 0 && level <= 3 && (
        <div className="bg-muted/50 rounded-md px-3 py-3 text-sm text-muted-foreground">
          No components currently mapped to this process. This is a gap /
          opportunity area.
        </div>
      )}
    </>
  );
}

// --- Helpers ---
function findProcess(
  catalog: ProcessCatalog,
  code: string,
  level: number
): {
  title: string;
  description?: string;
  microsoftReferences?: string[];
  applicationFamily?: string;
  products?: string;
  apqc?: { id: string; description: string };
} | null {
  if (level === 1) {
    return catalog.l1Processes.find((p) => p.code === code) || null;
  }
  if (level === 2) {
    return catalog.l2Processes.find((p) => p.code === code) || null;
  }
  if (level === 3) {
    return catalog.l3Processes.find((p) => p.code === code) || null;
  }
  if (level === 4) {
    return (
      (catalog.l4Processes || []).find((p) => p.code === code) || null
    );
  }
  if (level === 5) {
    return (
      (catalog.l5Processes || []).find((p) => p.code === code) || null
    );
  }
  return null;
}
