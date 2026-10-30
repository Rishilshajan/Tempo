"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

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
