import type { NextConfig } from "next";

// The OKF app ships as a static, database-free site (GitHub Pages). Set
// STATIC_EXPORT=1 to produce the static export; NEXT_PUBLIC_BASE_PATH sets the
// Pages subpath (e.g. "/d365-okf-demo"). Without STATIC_EXPORT it runs as a
// normal Next app — used locally only, to generate the API snapshots from a
// seeded database (see scripts/okf/build-snapshot.ts).
const STATIC = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = STATIC
  ? {
      output: "export",
      ...(basePath ? { basePath } : {}),
      images: { unoptimized: true },
      trailingSlash: true,
    }
  : {};

export default nextConfig;
