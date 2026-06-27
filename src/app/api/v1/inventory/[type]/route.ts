import { listItems } from "@/lib/services/inventory-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await params;
    const url = new URL(request.url);
    const page = url.searchParams.get("page");
    const limit = url.searchParams.get("limit");

    const result = await listItems(type, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      solution: url.searchParams.get("solution") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      entity: url.searchParams.get("entity") ?? undefined,
    });

    return Response.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Unknown inventory type")) {
      return Response.json({ error: "NotFound", message: err.message }, { status: 404 });
    }
    throw err;
  }
}
