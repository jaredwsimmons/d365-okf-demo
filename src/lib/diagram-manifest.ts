export interface DiagramEntry {
  path: string; // e.g. "bpc-diagrams/95-service-to-deliver/service-to-cash-process-flow.svg"
  name: string; // Human-readable label
}

export type DiagramManifest = Record<string, DiagramEntry[]>;

export async function loadDiagramManifest(): Promise<DiagramManifest> {
  try {
    const res = await fetch("/api/v1/bpc-diagrams");
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
