/**
 * TEMPO-002 — Catch-all login entry, including Clerk sign-in steps.
 * Code map: src/components/code-map.md
 */
import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = { title: "Sign in · Tempo" };

/**
 * TEMPO-002-F02 — LoginPage
 * Purpose: Selects the sign-in mode of AuthPanel.
 * Used by: Next.js /login/[[...login]] route.
 * Trigger: Visitor opens a sign-in URL.
 */
export default function LoginPage() {
  return <AuthPanel mode="sign-in" />;
}
