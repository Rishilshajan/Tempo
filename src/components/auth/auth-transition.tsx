/**
 * TEMPO-002 — Keeps the auth UI coherent while Clerk activates a session.
 * Code map: src/components/code-map.md
 */
"use client";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthProgress } from "./auth-progress";

/**
 * TEMPO-002-F10 — AuthTransition
 * Purpose: Replaces completed auth forms with progress until dashboard navigation finishes.
 * Used by: AuthPanel when Clerk is configured.
 * Trigger: Clerk signs the visitor in or enters its reset-password-success step.
 */
export function AuthTransition({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const completing = pathname.endsWith("/reset-password-success");
  const transitioning = !isLoaded || isSignedIn || completing;

  useEffect(() => {
    // Wait for Clerk's authenticated state; a success URL alone is not proof of a session.
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  return (
    <>
      {/* Keep Clerk mounted so session activation and its own redirects can complete. */}
      <div hidden={transitioning}>{children}</div>
      {transitioning && (
        <AuthProgress
          message={
            isLoaded ? "Opening your workspace…" : "Loading secure sign-in…"
          }
        />
      )}
    </>
  );
}
