// TanStack Query hooks for the CoE Dashboard API

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getInventory,
  getInventoryItem,
  getGovernance,
  getProcessCatalog,
  getSolutions,
  getCapabilityMap,
  getEnvironmentDriftFull,
  getEnvironmentComponentMatrix,
  getEntityRelationships,
  getUntagged,
  getSolutionComponents,
  getSolutionDetail,
  getProcessCatalogComponents,
  getProcessNodeComponents,
  getWorkflowDefinitionManifest,
  getWorkflowDefinition,
  getWorkflowNameMap,
  type ListOptions,
} from "@/lib/api-client";

// ─── Inventory List ────────────────────────────────────────────────

export function useInventory<T = Record<string, unknown>>(
  type: string,
  options?: ListOptions,
  queryOptions?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["inventory", type, options],
    queryFn: () => getInventory<T>(type, options),
    staleTime: 5 * 60 * 1000, // 5 min
    enabled: queryOptions?.enabled ?? true,
  });
}

// ─── Single Inventory Item ─────────────────────────────────────────

export function useInventoryItem<T = Record<string, unknown>>(
  type: string,
  id: string | null,
  queryOptions?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["inventory", type, id],
    queryFn: () => getInventoryItem<T>(type, id!),
    enabled: (queryOptions?.enabled ?? true) && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Governance ────────────────────────────────────────────────────

export function useGovernance(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["governance"],
    queryFn: getGovernance,
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

// ─── Process Catalog ───────────────────────────────────────────────

export function useProcessCatalog(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["process-catalog"],
    queryFn: getProcessCatalog,
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

// ─── Solutions ─────────────────────────────────────────────────────

export function useSolutions(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["solutions"],
    queryFn: getSolutions,
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

// ─── Capability Map ────────────────────────────────────────────────

export function useCapabilityMap(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["capability-map"],
    queryFn: getCapabilityMap,
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

// ─── Untagged Queue ────────────────────────────────────────────────

export function useUntagged(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["untagged"],
    queryFn: getUntagged,
    staleTime: 5 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

// ─── Aggregations ──────────────────────────────────────────────────

export function useSolutionDetail(solutionName: string | null, queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["solution-detail", solutionName],
    queryFn: () => getSolutionDetail(solutionName!),
    staleTime: 5 * 60 * 1000,
    enabled: (queryOptions?.enabled ?? true) && !!solutionName,
  });
}

export function useSolutionComponents(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["solution-components"],
    queryFn: getSolutionComponents,
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

export function useProcessNodeComponents(code: string | null, queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["process-node-components", code],
    queryFn: () => getProcessNodeComponents(code!),
    staleTime: 5 * 60 * 1000,
    enabled: (queryOptions?.enabled ?? true) && !!code,
  });
}

export function useProcessCatalogComponents(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["process-catalog-components"],
    queryFn: getProcessCatalogComponents,
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

export function useEntityRelationships(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["entity-relationships"],
    queryFn: getEntityRelationships,
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

export function useEnvironmentComponentMatrix(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["environment-component-matrix"],
    queryFn: getEnvironmentComponentMatrix,
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

export function useEnvironmentDriftFull(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["environment-drift-full"],
    queryFn: getEnvironmentDriftFull,
    staleTime: 10 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

// ─── Workflow Definitions ──────────────────────────────────────────

export function useWorkflowDefinitionManifest(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["workflow-definition-manifest"],
    queryFn: getWorkflowDefinitionManifest,
    staleTime: 30 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}

export function useWorkflowDefinition(guid: string | null, queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["workflow-definition", guid],
    queryFn: () => getWorkflowDefinition(guid!),
    staleTime: 30 * 60 * 1000,
    enabled: (queryOptions?.enabled ?? true) && !!guid,
  });
}

export function useWorkflowNameMap(queryOptions?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["workflow-name-map"],
    queryFn: getWorkflowNameMap,
    staleTime: 30 * 60 * 1000,
    enabled: queryOptions?.enabled ?? true,
  });
}
