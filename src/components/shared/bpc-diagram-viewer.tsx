"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { DiagramManifest, DiagramEntry } from "@/lib/diagram-manifest";
import { assetUrl } from "@/lib/asset-path";
import { Badge } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";

export function BpcDiagramViewer({
  code,
  manifest,
}: {
  code: string;
  manifest: DiagramManifest;
}) {
  const [selected, setSelected] = useState<DiagramEntry | null>(null);
  const diagrams = manifest[code];

  if (!diagrams || diagrams.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
        Process Flow Diagrams
        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
          {diagrams.length}
        </Badge>
      </h3>

      <div className="space-y-2">
        {diagrams.map((d, i) => (
          <div
            key={i}
            className="group cursor-pointer rounded-md border border-border/50 overflow-hidden hover:border-brand-primary/50 transition-colors"
            onClick={() => setSelected(d)}
          >
            <div className="bg-white p-2 flex items-center justify-center">
              <img
                src={assetUrl(`/${d.path}`)}
                alt={d.name}
                className="max-h-[120px] w-auto object-contain"
              />
            </div>
            <div className="px-2 py-1 bg-muted/30 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground truncate group-hover:text-foreground transition-colors">
                {d.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Full-size dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">{selected?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              BPC {code}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto custom-scroll min-h-0 bg-white rounded-md border">
            {selected && (
              <img
                src={assetUrl(`/${selected.path}`)}
                alt={selected.name}
                className="w-full h-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
