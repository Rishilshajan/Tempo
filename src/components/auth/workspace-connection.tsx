/**
 * TEMPO-002 — Connection status helper; currently has no callers.
 * Code map: src/components/code-map.md
 */
"use client";

import { useConvexAuth } from "convex/react";

/**
 * TEMPO-002-F08 — WorkspaceConnection
 * Purpose: Announces the Convex authentication connection state.
 * Used by: No current callers; available for a workspace status area.
 * Trigger: When mounted, updates as useConvexAuth changes.
 */
export function WorkspaceConnection() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  return (
    <p
      role="status"
      aria-live="polite"
      className="mt-4 text-xs leading-6 text-muted-foreground"
    >
      {isLoading
        ? "Connecting your workspace…"
        : isAuthenticated
          ? "Your workspace connection is ready."
          : "Your workspace connection isn’t ready yet. Please try again shortly."}
    </p>
  );
}
