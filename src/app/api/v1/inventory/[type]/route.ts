import { listItems } from "@/lib/services/inventory-service";
import { parseListParams } from "@/lib/api-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await params;
    const url = new URL(request.url);

    const result = await listItems(type, parseListParams(url.searchParams));

    return Response.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Unknown inventory type")) {
      return Response.json({ error: "NotFound", message: err.message }, { status: 404 });
    }
    throw err;
  }
}
