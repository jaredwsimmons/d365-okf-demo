import { getItem } from "@/lib/services/inventory-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;
  const result = await getItem(type, decodeURIComponent(id));

  if (!result) {
    return Response.json(
      { error: "NotFound", message: `${type} '${id}' not found` },
      { status: 404 },
    );
  }

  return Response.json(result);
}
