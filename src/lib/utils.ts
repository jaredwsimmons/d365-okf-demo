import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Coerce a value that is meant to be an array into one. Guards against the
 * PowerShell/JSON single-element-array unwrap (a 1-element array serialized as a
 * bare scalar): a scalar becomes `[scalar]`, null/undefined become `[]`, and an
 * existing array passes through. Use at data boundaries before `.map/.find/.join`.
 */
export function toArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === null || value === undefined) return [];
  return [value as T];
}
