
### Authentication handoff loading

- TEMPO-002-F09 — AuthProgress (components/auth/auth-progress.tsx): shared indeterminate progress presentation.
- TEMPO-002-F10 — AuthTransition (components/auth/auth-transition.tsx): keeps Clerk mounted, hides stale auth links during session activation, and redirects only after authenticated state is available.
- TEMPO-002-F11 — AuthPanelContent (components/auth/auth-panel.tsx): gates client auth hooks on Clerk configuration.
- TEMPO-002-F12 — DashboardLoading (app/(protected)/dashboard/loading.tsx): Next.js route fallback for the auth-to-dashboard handoff.
