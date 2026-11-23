/** TEMPO-003-F08: shared safe action error text. */
import { ConvexError } from "convex/values";
/**
 * TEMPO-003-F08 - errorMessage
 * Purpose: Provides the existing errorMessage behavior for its owning view.
 * Used by: See src/components/code-map.md for direct callers.
 * Trigger: The owning view renders or its associated interaction runs.
 */
export function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof ConvexError && typeof cause.data === "string"
    ? cause.data
    : fallback;
}
