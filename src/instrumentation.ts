export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_DB_MIGRATIONS === "1") return;

  const { runMigrations } = await import("./lib/db/migrate");
  await runMigrations();
}
