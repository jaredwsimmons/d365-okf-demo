// Static-export build wrapper. Route handlers (src/app/api) cannot be statically
// exported, and the OKF app doesn't need them at runtime (it reads the API
// snapshots under public/api-snapshot/). So: stash src/app/api aside, run
// `next build` in export mode, and restore it afterward — even if the build fails.
//
//   STATIC_EXPORT=1 (set here) + NEXT_PUBLIC_BASE_PATH (optional, the Pages subpath)
//   output -> out/
import { rename } from "node:fs/promises";
import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const api = join(root, "src", "app", "api");
const stash = join(root, ".api-stash");

const move = async (from, to) => { if (existsSync(from)) await rename(from, to); };

let stashed = false;
try {
  await move(api, stash);
  stashed = existsSync(stash);
  // Clear stale build/type artifacts so route validators don't reference the
  // stashed API handlers (and `out/` is rebuilt cleanly). maxRetries rides out
  // Windows file-lock races when a dev server was just stopped.
  const rmOpts = { recursive: true, force: true, maxRetries: 10, retryDelay: 300 };
  rmSync(join(root, ".next"), rmOpts);
  rmSync(join(root, "out"), rmOpts);
  const r = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, STATIC_EXPORT: "1" },
  });
  process.exitCode = r.status ?? 1;
} finally {
  if (stashed) await move(stash, api);
}
