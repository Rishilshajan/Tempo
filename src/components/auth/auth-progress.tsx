/**
 * TEMPO-002 — Shared auth-to-workspace loading presentation.
 * Code map: src/components/code-map.md
 */
/**
 * TEMPO-002-F09 — AuthProgress
 * Purpose: Shows indeterminate progress without inventing a completion percentage.
 * Used by: AuthTransition, AuthPanel fallback, and dashboard loading route.
 * Trigger: Authentication loads or navigation waits for the workspace.
 */
export function AuthProgress({
  message = "Opening your workspace…",
}: {
  message?: string;
}) {
  return (
    <div className="auth-progress" role="status" aria-live="polite">
      <p>{message}</p>
      <div className="auth-progress-track" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
