"use client";

import { useMemo } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import * as z from "zod";
import { toast } from "sonner";
import { saveOverride } from "@/lib/data";
import { useProcessCatalog } from "@/hooks/use-inventory-api";
import { useBpcCascade } from "@/hooks/use-bpc-cascade";
import { InlineLoader } from "@/components/shared/loading-states";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { ScrollArea } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui";
import type { Tags, FieldConfig, ProcessCatalog } from "@/types/inventory";

interface TagEditPanelProps {
  dataKey: string;
  itemId: string;
  itemName: string;
  currentTags: Tags;
  currentItem?: Record<string, unknown>;
  editableFields?: FieldConfig[];
  onSave: (updates: { tags: Tags; fields?: Record<string, unknown> }) => void;
  onClose: () => void;
}

const formSchema = z.object({
  processCatalogL1: z.string().optional(),
  processCatalogL2: z.string().optional(),
  processCatalogL3: z.string().optional(),
  capability: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function TagEditPanel({
  dataKey,
  itemId,
  itemName,
  currentTags,
  onSave,
  onClose,
}: TagEditPanelProps) {
  const { data: apiCatalog } = useProcessCatalog();
  const catalog = (apiCatalog as unknown) as ProcessCatalog | null;

  const defaultValues = useMemo<FormValues>(
    () => ({
      processCatalogL1: (currentTags.processCatalogL1 as string) || "",
      processCatalogL2: (currentTags.processCatalogL2 as string) || "",
      processCatalogL3: (currentTags.processCatalogL3 as string) || "",
      capability: (currentTags.capability as string) || "",
    }),
    [currentTags],
  );

  const form = useForm({
    defaultValues,
    validators: { onChange: formSchema },
    onSubmit: async ({ value }) => {
      const tags: Tags = { ...currentTags };

      if (value.processCatalogL1) tags.processCatalogL1 = value.processCatalogL1;
      else delete tags.processCatalogL1;

      if (value.processCatalogL2) tags.processCatalogL2 = value.processCatalogL2;
      else delete tags.processCatalogL2;

      if (value.processCatalogL3) tags.processCatalogL3 = value.processCatalogL3;
      else delete tags.processCatalogL3;

      if (value.capability) tags.capability = value.capability;
      else delete tags.capability;

      const ok = await saveOverride(dataKey, itemId, { tags });

      if (ok) {
        toast.success("Changes saved successfully!", {
          description: "Component has been updated.",
        });
        onSave({ tags });
      } else {
        toast.error("Failed to save changes", {
          description: "Please try again or contact support if the issue persists.",
        });
      }
    },
  });

  // Subscribe to L1/L2 so the cascade re-evaluates when they change.
  const l1Live = useStore(form.store, (s) => s.values.processCatalogL1 || "");
  const l2Live = useStore(form.store, (s) => s.values.processCatalogL2 || "");
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);

  const { l1Value, l2Value, l1Options, l2Options, l3Options, handleL1Change, handleL2Change, handleL3Change } =
    useBpcCascade(catalog, form as unknown as import("@/hooks/use-bpc-cascade").CascadeFormApi, {
      l1: l1Live,
      l2: l2Live,
    });

  return (
    <div className="w-[300px] shrink-0 border-l bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Edit Component
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {itemName}
          </p>
        </div>
        <button
          className="text-muted-foreground hover:text-foreground text-lg leading-none px-1 shrink-0"
          onClick={onClose}
        >
          &times;
        </button>
      </div>

      {/* Scrollable form body */}
      <ScrollArea className="flex-1 h-0">
        <div className="px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="space-y-3"
          >
            <form.Field name="processCatalogL1">
              {(field) => (
                <FormItem>
                  <FormLabel className="text-xs" error={field.state.meta.errors.length > 0}>
                    L1 End-to-End Process
                  </FormLabel>
                  <Select
                    value={field.state.value || "__none__"}
                    onValueChange={handleL1Change}
                  >
                    <FormControl error={field.state.meta.errors.length > 0}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select L1..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">-- None --</SelectItem>
                      {l1Options.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage errors={field.state.meta.errors} />
                </FormItem>
              )}
            </form.Field>

            {l1Value && l2Options.length > 0 && (
              <form.Field name="processCatalogL2">
                {(field) => (
                  <FormItem>
                    <FormLabel className="text-xs" error={field.state.meta.errors.length > 0}>
                      L2 Process Area
                    </FormLabel>
                    <Select
                      value={field.state.value || "__none__"}
                      onValueChange={handleL2Change}
                    >
                      <FormControl error={field.state.meta.errors.length > 0}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select L2..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {l2Options.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage errors={field.state.meta.errors} />
                  </FormItem>
                )}
              </form.Field>
            )}

            {l2Value && l3Options.length > 0 && (
              <form.Field name="processCatalogL3">
                {(field) => (
                  <FormItem>
                    <FormLabel className="text-xs" error={field.state.meta.errors.length > 0}>
                      L3 Business Process
                    </FormLabel>
                    <Select
                      value={field.state.value || "__none__"}
                      onValueChange={handleL3Change}
                    >
                      <FormControl error={field.state.meta.errors.length > 0}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select L3..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-- None --</SelectItem>
                        {l3Options.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage errors={field.state.meta.errors} />
                  </FormItem>
                )}
              </form.Field>
            )}

            <form.Field name="capability">
              {(field) => (
                <FormItem>
                  <FormLabel className="text-xs" error={field.state.meta.errors.length > 0}>
                    Capability
                  </FormLabel>
                  <FormControl error={field.state.meta.errors.length > 0}>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g., Work Order Management"
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </FormControl>
                  <FormMessage errors={field.state.meta.errors} />
                </FormItem>
              )}
            </form.Field>
          </form>
        </div>
      </ScrollArea>

      {/* Footer buttons */}
      <div className="px-4 py-3 border-t shrink-0 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={onClose}
          type="button"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs flex-1 bg-brand-accent hover:bg-brand-accent/90 text-white"
          onClick={() => void form.handleSubmit()}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <InlineLoader /> Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}
