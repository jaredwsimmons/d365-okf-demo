// Typed API client — same-origin fetch to Next.js route handlers under /api/v1/*.
//
// In the static OKF build (NEXT_PUBLIC_STATIC=1) there is no server: GET requests
// are served from baked JSON snapshots under <basePath>/api-snapshot/v1/*.json,
// list filtering + search run client-side, and writes are accepted as no-ops.

const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// MUST match fileSlug() in scripts/okf/build-snapshot.mjs.
const fileSlug = (s: string): string => s.replace(/[^a-zA-Z0-9._-]/g, "_");

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  if (STATIC) {
    const method = (options?.method ?? "GET").toUpperCase();
    // No backend in the static demo: writes succeed but are not persisted.
    if (method !== "GET") return { success: true, static: true } as T;
    return staticFetch<T>(path);
  }

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ─── static snapshot serving (NEXT_PUBLIC_STATIC=1) ─────────────────
async function loadSnapshot(rel: string): Promise<unknown> {
  const file = rel.split("/").map((s) => fileSlug(decodeURIComponent(s))).join("/");
  const res = await fetch(`${BASE}/api-snapshot/v1/${file}.json`);
  if (!res.ok) throw new Error(`snapshot ${file} -> ${res.status}`);
  return res.json();
}

async function staticFetch<T>(path: string): Promise<T> {
  const u = new URL(path, "http://snapshot.local");
  const rel = u.pathname.replace(/^\/api\/v1\//, "").replace(/\/$/, "");
  const sp = u.searchParams;

  if (rel === "search") return staticSearch(sp) as T;

  const data = await loadSnapshot(rel);

  // inventory list endpoint: apply solution/entity/search filter + pagination here
  if (
    /^inventory\/[^/]+$/.test(rel) &&
    data && typeof data === "object" &&
    Array.isArray((data as { items?: unknown }).items)
  ) {
    return filterInventory(data as InventoryListResult<Record<string, unknown>>, sp) as T;
  }
  return data as T;
}

function filterInventory<T extends Record<string, unknown>>(
  list: InventoryListResult<T>,
  sp: URLSearchParams,
): InventoryListResult<T> {
  let items = list.items;
  const solution = sp.get("solution");
  const entity = sp.get("entity");
  const search = sp.get("search")?.toLowerCase();
  if (solution) items = items.filter((i) => String(i.solution ?? "") === solution);
  if (entity) items = items.filter((i) => String(i.entity ?? i.primaryEntity ?? "") === entity);
  if (search)
    items = items.filter((i) =>
      Object.values(i).some((v) => typeof v === "string" && v.toLowerCase().includes(search)),
    );
  const total = items.length;
  const page = Number(sp.get("page") ?? 1) || 1;
  const limit = Number(sp.get("limit") ?? total) || total;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    metadata: { type: list.metadata.type, total, page, limit, hasMore: start + limit < total },
  };
}

async function staticSearch(sp: URLSearchParams): Promise<SearchResponse> {
  const q = (sp.get("q") ?? "").toLowerCase();
  const limit = Number(sp.get("limit") ?? 50) || 50;
  const idx = (await loadSnapshot("search-index")) as { results: SearchResult[]; total: number };
  if (!q) return { results: [], total: idx.total };
  const results = idx.results
    .filter((r) => r.name.toLowerCase().includes(q) || r.searchName.toLowerCase().includes(q))
    .slice(0, limit);
  return { results, total: results.length };
}

// ─── Inventory ─────────────────────────────────────────────────────

export interface InventoryListResult<T> {
  items: T[];
  metadata: {
    type: string;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface InventoryItemResult<T> {
  item: T;
  metadata: { type: string; id: string };
}

export interface ListOptions {
  page?: number;
  limit?: number;
  solution?: string;
  search?: string;
  entity?: string;
}

export function getInventory<T = Record<string, unknown>>(
  type: string,
  options?: ListOptions,
): Promise<InventoryListResult<T>> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.solution) params.set("solution", options.solution);
  if (options?.search) params.set("search", options.search);
  if (options?.entity) params.set("entity", options.entity);

  const qs = params.toString();
  return fetchApi<InventoryListResult<T>>(`/api/v1/inventory/${type}${qs ? `?${qs}` : ""}`);
}

export function getInventoryItem<T = Record<string, unknown>>(
  type: string,
  id: string,
): Promise<InventoryItemResult<T>> {
  return fetchApi<InventoryItemResult<T>>(`/api/v1/inventory/${type}/${encodeURIComponent(id)}`);
}

// ─── Overrides ─────────────────────────────────────────────────────

export function saveOverride(
  dataKey: string,
  itemId: string,
  override: Record<string, unknown>,
): Promise<{ success: boolean; dataKey: string; itemId: string }> {
  return fetchApi("/api/v1/overrides", {
    method: "POST",
    body: JSON.stringify({ dataKey, itemId, override }),
  });
}

// ─── Governance ────────────────────────────────────────────────────

export interface GovernanceResult {
  summary: { totalFindings: number; score: number; bySeverity: Record<string, number> };
  findings: Record<string, unknown>[];
}

export function getGovernance(): Promise<GovernanceResult> {
  return fetchApi<GovernanceResult>("/api/v1/governance");
}

// ─── Process Catalog ───────────────────────────────────────────────

export function getProcessCatalog(): Promise<Record<string, unknown>> {
  return fetchApi("/api/v1/process-catalog");
}

// ─── Solutions ─────────────────────────────────────────────────────

export function getSolutions(): Promise<Record<string, unknown>> {
  return fetchApi("/api/v1/solutions");
}

// ─── Aggregations ──────────────────────────────────────────────────

export interface SolutionComponentsResult {
  bySolution: Record<string, { total: number; byType: Record<string, number> }>;
  totalSolutions: number;
}

export function getSolutionComponents(): Promise<SolutionComponentsResult> {
  return fetchApi<SolutionComponentsResult>("/api/v1/solution-components");
}

export interface ProcessCatalogComponentsResult {
  byL1: Record<string, number>;
  byL2: Record<string, number>;
  byL3: Record<string, number>;
  totalTagged: number;
}

export function getProcessCatalogComponents(): Promise<ProcessCatalogComponentsResult> {
  return fetchApi<ProcessCatalogComponentsResult>("/api/v1/process-catalog-components");
}

export interface SolutionComponentsDetail {
  solution: string;
  total: number;
  components: { name: string; type: string; id: string; tags?: Record<string, unknown> }[];
}

export function getSolutionDetail(solutionName: string): Promise<SolutionComponentsDetail> {
  return fetchApi<SolutionComponentsDetail>(`/api/v1/solution-components/${encodeURIComponent(solutionName)}`);
}

export interface ProcessNodeComponents {
  code: string;
  total: number;
  components: { name: string; type: string; id: string; solution?: string; tags?: Record<string, unknown> }[];
}

export function getProcessNodeComponents(code: string): Promise<ProcessNodeComponents> {
  return fetchApi<ProcessNodeComponents>(`/api/v1/process-catalog-components/${encodeURIComponent(code)}`);
}

export function getEntityRelationships(): Promise<{ entityRelationships: Array<Record<string, unknown>> }> {
  return fetchApi("/api/v1/entity-relationships");
}

export function getEnvironmentComponentMatrix(): Promise<Record<string, unknown>> {
  return fetchApi("/api/v1/environment-component-matrix");
}

export function getEnvironmentDriftFull(): Promise<Record<string, unknown>> {
  return fetchApi("/api/v1/environment-drift-full");
}

// ─── Capability Map ────────────────────────────────────────────────

export function getCapabilityMap(): Promise<Record<string, unknown>> {
  return fetchApi("/api/v1/capability-map");
}

// ─── Untagged Queue ────────────────────────────────────────────────

export function getUntagged(): Promise<{ total: number; byType: Record<string, number>; items: Record<string, unknown>[] }> {
  return fetchApi("/api/v1/untagged");
}

export function getOrphaned(): Promise<{ orphans: Record<string, unknown>[]; byType?: Record<string, number>; metadata?: Record<string, unknown> }> {
  return fetchApi("/api/v1/orphaned-components");
}

// ─── Process Diagrams ──────────────────────────────────────────────

export type ProcessDiagramsMap = Record<string, { url: string; title?: string }>;

export function getProcessDiagrams(): Promise<ProcessDiagramsMap> {
  return fetchApi("/api/v1/process-diagrams");
}

export function saveProcessDiagram(code: string, url: string, title?: string): Promise<{ success: boolean; code: string }> {
  return fetchApi(`/api/v1/process-diagrams/${encodeURIComponent(code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, title }),
  });
}

export function deleteProcessDiagram(code: string): Promise<{ success: boolean; code: string }> {
  return fetchApi(`/api/v1/process-diagrams/${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
}

// ─── Search ────────────────────────────────────────────────────────

export interface SearchResult {
  name: string;
  type: string;
  tabId: string;
  searchName: string;
  itemId?: string;
  sub?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export function searchComponents(q: string, limit = 50): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  return fetchApi<SearchResponse>(`/api/v1/search?${params}`);
}

// ─── Workflow Definitions ──────────────────────────────────────────

export interface WorkflowDefinitionManifestEntry {
  solution: string | null;
  actionCount: number | null;
  triggerCount: number | null;
}

export function getWorkflowDefinitionManifest(): Promise<
  Record<string, WorkflowDefinitionManifestEntry>
> {
  return fetchApi("/api/v1/workflow-definitions");
}

export interface WorkflowDefinitionDetail {
  guid: string;
  solution: string | null;
  actionCount: number | null;
  triggerCount: number | null;
  definition: Record<string, unknown>;
}

export function getWorkflowDefinition(
  guid: string,
): Promise<WorkflowDefinitionDetail> {
  return fetchApi(`/api/v1/workflow-definitions/${encodeURIComponent(guid)}`);
}

export function getWorkflowNameMap(): Promise<Record<string, string>> {
  return fetchApi("/api/v1/workflow-name-map");
}
