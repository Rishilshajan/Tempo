/**
 * TEMPO-002 — Auth handoff fallback while the dashboard route streams.
 * Code map: src/components/code-map.md
 */
import { AuthProgress } from "@/components/auth/auth-progress";

/**
 * TEMPO-002-F12 — DashboardLoading
 * Purpose: Keeps workspace navigation visibly responsive.
 * Used by: Next.js dashboard loading boundary.
 * Trigger: Dashboard route is loading.
 */
export default function DashboardLoading() {
  return (
    <main className="tempo-light auth-workspace-loading">
      <section className="auth-card">
        <AuthProgress />
      </section>
    </main>
  );
}
