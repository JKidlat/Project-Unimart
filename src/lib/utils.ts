/**
 * ==============================================================================
 * CLASSNAME UTILITY HELPER (cn)
 * ==============================================================================
 * This file provides the `cn` (className) utility function commonly used across
 * Tailwind CSS React projects.
 *
 * Why is this needed?
 * - `clsx`: Allows conditional class names (e.g. `isActive && 'text-red-500'`).
 * - `twMerge`: Solves Tailwind CSS specificity conflicts (e.g., if you pass
 *   both 'px-2' and 'px-4', twMerge ensures only 'px-4' takes effect rather than
 *   creating random CSS conflict behavior).
 *
 * How to use:
 * <div className={cn("base-class", condition && "conditional-class", customClassName)} />
 * ==============================================================================
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class name strings, objects, or arrays and safely merges
 * conflicting Tailwind CSS classes into a single clean string.
 *
 * @param inputs - List of class names, boolean expressions, or arrays.
 * @returns A deduplicated, conflict-free className string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
