"use client";

import { useForm, useStore } from "@tanstack/react-form";
import * as z from "zod";
import { toast } from "sonner";
import type { ProcessCatalog, Tags } from "@/types/inventory";
import type { IndexedComponent } from "@/lib/component-index";
import { useBpcCascade } from "@/hooks/use-bpc-cascade";
import { Badge } from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Separator } from "@/components/ui";
import { ScrollArea } from "@/components/ui";
import { Checkbox } from "@/components/ui";
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
import { saveOverride } from "@/lib/data";
import { InlineLoader } from "@/components/shared/loading-states";

const bulkEditFormSchema = z.object({
  processCatalogL1: z.string().optional(),
  processCatalogL2: z.string().optional(),
  processCatalogL3: z.string().optional(),
  vertical: z.string().optional(),
  capability: z.string().optional(),
  integration: z.string().optional(),
  needsReview: z.boolean(),
});

type BulkEditFormValues = z.infer<typeof bulkEditFormSchema>;

export function BulkEditPanel({
  catalog,
  currentComps,
  checkedComps,
  onCheckAll,
  onUncheckAll,
  onClose,
  onApplied,
}: {
  catalog: ProcessCatalog;
  currentComps: IndexedComponent[];
  checkedComps: Set<string>;
  onCheckAll: () => void;
  onUncheckAll: () => void;
  onClose: () => void;
  onApplied: () => void;
}) {
  const verticalOptions: string[] = [];
  const checkedCount = checkedComps.size;

  const form = useForm({
    defaultValues: {
      processCatalogL1: "",
      processCatalogL2: "",
      processCatalogL3: "",
      vertical: "",
      capability: "",
      integration: "",
      needsReview: false,
    } as BulkEditFormValues,
    validators: { onChange: bulkEditFormSchema },
    onSubmit: async ({ value }) => {
      if (checkedCount === 0) return;

      const tagUpdates: Partial<Tags> = {};
      if (value.processCatalogL1) tagUpdates.processCatalogL1 = value.processCatalogL1;
      if (value.processCatalogL2) tagUpdates.processCatalogL2 = value.processCatalogL2;
      if (value.processCatalogL3) tagUpdates.processCatalogL3 = value.processCatalogL3;
      if (value.vertical) tagUpdates.vertical = value.vertical;
      if (value.capability) tagUpdates.capability = value.capability;
      if (value.integration) tagUpdates.integration = value.integration;
      if (value.needsReview) tagUpdates.needsReview = true;

      if (Object.keys(tagUpdates).length === 0) {
        toast.error("No changes to apply", {
          description: "Please select at least one field to update.",
        });
        return;
      }

      const checked = currentComps.filter((c) => checkedComps.has(`${c.dataKey}::${c.itemId}`));

      let successCount = 0;
      let failCount = 0;

      for (const comp of checked) {
        const newTags: Tags = { ...(comp.tags || {}), ...tagUpdates };
        comp.tags = newTags;
        const ok = await saveOverride(comp.dataKey, comp.itemId, newTags);
        if (ok) successCount++;
        else failCount++;
      }

      if (failCount === 0) {
        toast.success("Bulk update successful!", {
          description: `Updated ${successCount} component${successCount !== 1 ? "s" : ""}.`,
        });
      } else if (successCount === 0) {
        toast.error("Bulk update failed", {
          description: `Failed to update ${failCount} component${failCount !== 1 ? "s" : ""}.`,
        });
      } else {
        toast.warning("Partial success", {
          description: `Updated ${successCount}, failed ${failCount} component${failCount !== 1 ? "s" : ""}.`,
        });
      }

      onApplied();
    },
  });

  const l1Live = useStore(form.store, (s) => s.values.processCatalogL1);
  const l2Live = useStore(form.store, (s) => s.values.processCatalogL2);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);

  const { l1Value, l2Value, l1Options, l2Options, l3Options, handleL1Change, handleL2Change } =
    useBpcCascade(catalog, form as unknown as import("@/hooks/use-bpc-cascade").CascadeFormApi, {
      l1: l1Live,
      l2: l2Live,
    });

  return (
    <div className="w-[280px] shrink-0 border-l bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b shrink-0">
        <h3 className="text-sm font-semibold text-foreground pb-2">Edit Components</h3>
        <button
          className="text-muted-foreground hover:text-foreground text-lg leading-none px-1"
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
            {/* Selection controls */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {checkedCount} selected
              </Badge>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onCheckAll} type="button">
                All
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onUncheckAll} type="button">
                None
              </Button>
            </div>
            <Separator />

            <form.Field name="processCatalogL1">
              {(field) => (
                <FormItem>
                  <FormLabel className="text-xs" error={field.state.meta.errors.length > 0}>
                    L1 End-to-End Process
                  </FormLabel>
                  <Select value={field.state.value || "__none__"} onValueChange={handleL1Change}>
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
                    <Select value={field.state.value || "__none__"} onValueChange={handleL2Change}>
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
                      onValueChange={(val) =>
                        form.setFieldValue("processCatalogL3", val === "__none__" ? "" : val)
                      }
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

            <Separator />

            <form.Field name="vertical">
              {(field) => (
                <FormItem>
                  <FormLabel className="text-xs" error={field.state.meta.errors.length > 0}>
                    Vertical
                  </FormLabel>
                  <Select
                    value={field.state.value || "__none__"}
                    onValueChange={(val) =>
                      form.setFieldValue("vertical", val === "__none__" ? "" : val)
                    }
                  >
                    <FormControl error={field.state.meta.errors.length > 0}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select vertical..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {verticalOptions.map((m) => (
                        <SelectItem key={m || "__none__"} value={m || "__none__"} className="text-xs">
                          {m || "-- None --"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage errors={field.state.meta.errors} />
                </FormItem>
              )}
            </form.Field>

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

            <form.Field name="integration">
              {(field) => (
                <FormItem>
                  <FormLabel className="text-xs" error={field.state.meta.errors.length > 0}>
                    Integration
                  </FormLabel>
                  <FormControl error={field.state.meta.errors.length > 0}>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g., F&O"
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </FormControl>
                  <FormMessage errors={field.state.meta.errors} />
                </FormItem>
              )}
            </form.Field>

            <form.Field name="needsReview">
              {(field) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl error={field.state.meta.errors.length > 0}>
                    <Checkbox
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked === true)}
                    />
                  </FormControl>
                  <FormLabel className="text-xs font-normal cursor-pointer" error={field.state.meta.errors.length > 0}>
                    Needs Review
                  </FormLabel>
                </FormItem>
              )}
            </form.Field>
          </form>
        </div>
      </ScrollArea>

      {/* Apply footer */}
      <div className="px-4 py-3 border-t shrink-0">
        <Button
          size="sm"
          className="w-full h-8 text-xs bg-brand-accent hover:bg-brand-accent/90 text-white"
          onClick={() => void form.handleSubmit()}
          disabled={isSubmitting || checkedCount === 0}
          type="submit"
        >
          {isSubmitting ? <><InlineLoader /> Applying...</> : `Apply to ${checkedCount} component${checkedCount !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
