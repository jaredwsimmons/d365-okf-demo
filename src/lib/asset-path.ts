// Same-origin path resolution for the static GitHub Pages build.
//
// On Pages the app is served from a subpath (NEXT_PUBLIC_BASE_PATH, e.g.
// "/d365-okf-demo"). Next's basePath rewrites <Link> and the router, but NOT
// raw fetch()/<img src> to public assets — those must be prefixed manually or
// they 404. In the live (server) build NEXT_PUBLIC_BASE_PATH is "" so both
// helpers are no-ops.

const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

// MUST match fileSlug() in api-client.ts and scripts/okf/build-snapshot.mjs.
const fileSlug = (s: string): string => s.replace(/[^a-zA-Z0-9._-]/g, "_");

/** Prefix a public asset/data path (/icons/x.svg, /data/x.json) with basePath. */
export function assetUrl(path: string): string {
  if (!path || /^https?:\/\//.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`;
}

/**
 * Resolve an /api/v1/* path to a fetchable URL for callers that use raw fetch()
 * instead of the typed api-client. In static mode it maps to the baked snapshot
 * JSON (query params are dropped — the snapshot is the full list and callers
 * filter client-side); otherwise it returns the live route path unchanged.
 */
export function apiUrl(path: string): string {
  if (!STATIC) return path;
  const p = path.split("?")[0] ?? path;
  const rel = p.replace(/^\/api\/v1\//, "").replace(/\/$/, "");
  const file = rel.split("/").map((s) => fileSlug(decodeURIComponent(s))).join("/");
  return `${BASE}/api-snapshot/v1/${file}.json`;
}
