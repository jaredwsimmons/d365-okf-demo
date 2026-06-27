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
