/**
 * TEMPO-002 — Signed-in account controls used within the workspace.
 * Code map: src/components/code-map.md
 */
"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { TempoSignOutButton } from "./sign-out-button";

/**
 * TEMPO-002-F06 — WorkspaceAccount
 * Purpose: Displays the Clerk account menu, user details, and sign-out action.
 * Used by: TodaySurface via dynamic import.
 * Trigger: Workspace account area renders.
 */
export function WorkspaceAccount() {
  const { user } = useUser();
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-card p-2.5">
      <div className="size-8 shrink-0">
        <UserButton />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {user?.fullName || user?.firstName || "Your workspace"}
        </p>
        <p
          className="mt-0.5 truncate text-[10px] text-muted-foreground"
          title={user?.primaryEmailAddress?.emailAddress}
        >
          {user?.primaryEmailAddress?.emailAddress || "Account settings"}
        </p>
      </div>
      <TempoSignOutButton iconOnly />
    </div>
  );
}
