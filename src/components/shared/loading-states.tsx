import { Card } from "@/components/ui";
import { Skeleton } from "@/components/ui";
import { Loader2 } from "lucide-react";

// Loading skeleton for Explorer component
export function ExplorerSkeleton() {
  return (
    <Card className="flex-1 flex overflow-hidden">
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex-1 p-2 space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-5">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-2" />
        <Skeleton className="h-4 w-2/3 mb-6" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </Card>
  );
}

// Loading skeleton for Process Catalog
export function ProcessCatalogSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      <Card className="col-span-5 flex flex-col">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-6 w-3/4 ml-4" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="col-span-7 p-5">
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

// Generic full-page loader
export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

// Inline spinner for buttons/small areas
export function InlineLoader({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }[size];

  return <Loader2 className={`${sizeClass} animate-spin`} />;
}
