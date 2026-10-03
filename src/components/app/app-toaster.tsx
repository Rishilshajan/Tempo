"use client";

import { Toaster } from "@/components/ui/sonner";
import { useIsDesktop } from "@/hooks/use-is-desktop";

export function AppToaster() {
  const isDesktop = useIsDesktop();
  // White (popover) background via sonner.tsx defaults; no richColors.
  return <Toaster position={isDesktop ? "top-right" : "top-center"} />;
}
