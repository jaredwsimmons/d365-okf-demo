import { getSummary } from "@/lib/services/inventory-service";

export async function GET() {
  const summary = await getSummary();
  return Response.json(summary);
}
