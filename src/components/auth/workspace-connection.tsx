"use client";

import { useConvexAuth } from "convex/react";

export function WorkspaceConnection() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  return (
    <p role="status" aria-live="polite" className="mt-4 text-xs leading-6 text-muted-foreground">
      {isLoading
        ? "Connecting your workspace…"
        : isAuthenticated
          ? "Your workspace connection is ready."
          : "Your workspace connection isn’t ready yet. Please try again shortly."}
    </p>
  );
}
