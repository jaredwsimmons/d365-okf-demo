"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// Presentational form primitives designed to pair with TanStack Form's
// `form.Field` render-prop pattern. Field state (value, errors) is passed in
// explicitly by the caller rather than read from a form context.

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="form-item" className={cn("space-y-1.5", className)} {...props} />;
}

function FormLabel({
  className,
  error,
  ...props
}: React.ComponentProps<typeof Label> & { error?: boolean }) {
  return (
    <Label
      data-slot="form-label"
      data-error={error || undefined}
      className={cn(error && "text-destructive", className)}
      {...props}
    />
  );
}

function FormControl({
  error,
  children,
}: {
  error?: boolean;
  children: React.ReactElement;
}) {
  return React.cloneElement(
    children as React.ReactElement<Record<string, unknown>>,
    { "aria-invalid": error || undefined },
  );
}

type FieldError = string | { message?: string } | null | undefined;

function FormMessage({
  errors,
  className,
  children,
}: {
  errors?: FieldError[];
  className?: string;
  children?: React.ReactNode;
}) {
  const first = errors?.find(Boolean);
  const text = typeof first === "string" ? first : first?.message;
  const body = text ?? children;
  if (!body) return null;
  return (
    <p data-slot="form-message" className={cn("text-xs text-destructive", className)}>
      {body}
    </p>
  );
}

export { FormItem, FormLabel, FormControl, FormMessage };
