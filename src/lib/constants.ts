/**
 * Shared constants used across the application
 */

// Re-export the inventory type registry for backwards compat. New code should
// import from "@/lib/inventory-types" directly.
export { TYPE_ORDER, TYPE_LABELS } from "./inventory-types";

export const LEVEL_NAMES: Record<number, string> = {
  1: "End-to-End",
  2: "Process Area",
  3: "Business Process",
  4: "Scenario",
  5: "System Process",
  6: "Test Case",
};
