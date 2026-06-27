import { saveOverride } from "@/lib/services/override-service";
import { getUserEmail } from "@/lib/api-utils";

export async function POST(request: Request) {
  const body = await request.json();
  const { dataKey, itemId, override } = body ?? {};

  if (!dataKey || !itemId || !override) {
    return Response.json(
      { error: "BadRequest", message: "dataKey, itemId, and override are required" },
      { status: 400 },
    );
  }

  const result = await saveOverride(dataKey, itemId, override, getUserEmail(request) ?? undefined);
  return Response.json(result);
}
