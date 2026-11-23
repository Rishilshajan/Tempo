/**
 * TEMPO-002 — Catch-all account creation entry, including verification steps.
 * Code map: src/components/code-map.md
 */
import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = { title: "Create an account · Tempo" };

/**
 * TEMPO-002-F03 — SignupPage
 * Purpose: Selects the sign-up mode of AuthPanel.
 * Used by: Next.js /signup/[[...signup]] route.
 * Trigger: Visitor opens a signup URL.
 */
export default function SignupPage() {
  return <AuthPanel mode="sign-up" />;
}
