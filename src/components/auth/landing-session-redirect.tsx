/**
 * TEMPO-002 — Client session redirect for restored or cached landing pages.
 * Code map: src/components/code-map.md
 */
"use client";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
// Also cover restored/cached landing pages after signing in in this browser.
/**
 * TEMPO-002-F05 — LandingSessionRedirect
 * Purpose: Redirects authenticated landing visitors after client session loading.
 * Used by: LandingPage when Clerk is configured.
 * Trigger: Session changes or browser pageshow event.
 */
export function LandingSessionRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  useEffect(() => {
    const check = () => {
      if (isLoaded && isSignedIn) router.replace("/dashboard");
    };
    check();
    window.addEventListener("pageshow", check);
    return () => window.removeEventListener("pageshow", check);
  }, [isLoaded, isSignedIn, router]);
  return null;
}
