"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function TempoSignOutButton() {
  return (
    <SignOutButton redirectUrl="/">
      <Button variant="outline" className="min-h-11 px-5">Sign out</Button>
    </SignOutButton>
  );
}
