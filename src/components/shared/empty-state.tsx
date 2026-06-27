import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export function EmptyState({ icon, title, subtitle, className }: EmptyStateProps) {
  return (
    <div className={cn("flex-1 flex items-center justify-center text-muted-foreground", className)}>
      <div className="text-center">
        {icon && <div className="flex justify-center mb-2 opacity-30">{icon}</div>}
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
