"use client";

import type { DetailConfig } from "@/types/inventory";
import {
  DetailHeader,
  DetailDesc,
  DetailGrid,
  BPCPath,
  PillList,
  CrossReferenceList,
} from "@/components/explorer/detail-helpers";

export function DynamicDetail<T extends Record<string, unknown>>({
  item,
  config,
  icon,
  onNavigate,
}: {
  item: T;
  config: DetailConfig<T>;
  icon?: string;
  onNavigate?: (tabId: string, searchName: string) => void;
}) {
  const tags = (item.tags as Record<string, unknown>) || {};

  // Extract header info
  const header = config.getHeader(item);

  // Extract description if provided
  const description = config.getDescription?.(item);

  // Extract grid rows
  const rows = config.getGridRows(item);

  // Extract pill sections
  const pillSections = config.getPillSections(item);

  // Extract cross-references if provided
  const crossRefs = config.getCrossReferences?.(item) || [];

  return (
    <>
      <DetailHeader icon={icon} title={header.title} subtitle={header.subtitle} />
      {description && <DetailDesc text={description} />}
      <DetailGrid rows={rows} />
      <BPCPath tags={tags} />
      {pillSections.map((section, idx) => (
        <PillList key={idx} title={section.title} items={section.items} />
      ))}
      {onNavigate && (crossRefs.length > 0 || config.renderExtra) && (
        <CrossReferenceList sections={crossRefs} onNavigate={onNavigate}>
          {config.renderExtra?.(item)}
        </CrossReferenceList>
      )}
    </>
  );
}
