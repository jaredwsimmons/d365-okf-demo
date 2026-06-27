import { saveOverride } from "@/lib/services/override-service";
import { getUserEmail } from "@/lib/api-utils";

// Cap the persisted override blob so a client can't store an unbounded jsonb payload.
const MAX_OVERRIDE_BYTES = 256 * 1024;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { dataKey, itemId, override } = body ?? {};

  if (
    typeof dataKey !== "string" ||
    typeof itemId !== "string" ||
    typeof override !== "object" ||
    override === null ||
    Array.isArray(override)
  ) {
    return Response.json(
      { error: "BadRequest", message: "dataKey (string), itemId (string), and override (object) are required" },
      { status: 400 },
    );
  }

  if (JSON.stringify(override).length > MAX_OVERRIDE_BYTES) {
    return Response.json(
      { error: "PayloadTooLarge", message: "override exceeds the maximum allowed size" },
      { status: 413 },
    );
  }

  const result = await saveOverride(dataKey, itemId, override, getUserEmail(request) ?? undefined);
  return Response.json(result);
}
