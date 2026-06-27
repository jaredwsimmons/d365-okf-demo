// Shared utilities for Next.js API route handlers

/**
 * Extract the authenticated user's email from the reverse-proxy auth header.
 * The header name is configurable via AUTH_USER_EMAIL_HEADER and defaults to
 * the header set by Cloudflare Access. Returns null in local dev (no proxy)
 * or when the header is missing.
 */
export function getUserEmail(request: Request): string | null {
  const header =
    process.env.AUTH_USER_EMAIL_HEADER || "cf-access-authenticated-user-email";
  return request.headers.get(header) || null;
}

/** Hard ceiling on inventory list page size — bounds memory in the container. */
export const MAX_LIST_LIMIT = 500;

export interface ListParams {
  page: number;
  limit: number;
  solution?: string;
  search?: string;
  entity?: string;
}

/**
 * Parse + clamp inventory list query params at the trust boundary.
 * Guards against NaN / negative / oversized values that would otherwise reach
 * SQL OFFSET/LIMIT — a malformed `?page=abc` 500s and `?limit=99999999` is a
 * memory-exhaustion lever in a capped container.
 */
export function parseListParams(searchParams: URLSearchParams): ListParams {
  const clampInt = (raw: string | null, def: number, min: number, max: number): number => {
    if (raw == null) return def;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, n));
  };
  return {
    page: clampInt(searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER),
    limit: clampInt(searchParams.get("limit"), MAX_LIST_LIMIT, 1, MAX_LIST_LIMIT),
    solution: searchParams.get("solution") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    entity: searchParams.get("entity") ?? undefined,
  };
}
