/**
 * TEMPO-002 — Shared sign-in/signup shell, public header, and copyright.
 * Code map: src/components/code-map.md
 */
import { inter } from "@/lib/fonts";
import { SiteHeader } from "@/components/landing/site-header";

/**
 * TEMPO-002-F01 — AuthLayout
 * Purpose: Wraps authentication routes with shared branding and compact spacing.
 * Used by: Next.js (auth) route group.
 * Trigger: Visitor opens /login or /signup, including nested verification steps.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`tempo-light landing auth-shell ${inter.className}`}>
      <SiteHeader variant="auth" />
      <main className="auth-main">{children}</main>
      <footer className="auth-footer">
        © {new Date().getFullYear()} Tempo
      </footer>
    </div>
  );
}
