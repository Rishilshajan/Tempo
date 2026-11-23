/**
 * TEMPO-002 — Shared Clerk sign-out action with optional icon presentation.
 * Code map: src/components/code-map.md
 */
"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

/**
 * TEMPO-002-F07 — TempoSignOutButton
 * Purpose: Ends the Clerk session and returns the visitor home.
 * Used by: WorkspaceAccount.
 * Trigger: User activates the sign-out button.
 */
export function TempoSignOutButton({
  iconOnly = false,
}: {
  iconOnly?: boolean;
}) {
  return (
    <SignOutButton redirectUrl="/">
      <Button
        variant={iconOnly ? "ghost" : "outline"}
        size={iconOnly ? "icon-sm" : "default"}
        aria-label="Sign out"
        title="Sign out"
        className={
          iconOnly ? "size-7 shrink-0 text-muted-foreground" : "min-h-11 px-5"
        }
      >
        {iconOnly ? (
          <LogOut className="size-3.5" aria-hidden="true" />
        ) : (
          "Sign out"
        )}
      </Button>
    </SignOutButton>
  );
}
