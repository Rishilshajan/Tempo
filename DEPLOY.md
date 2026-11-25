# Deploying the Tempo foundation

Deploy the Next.js project from this directory using your existing hosting provider. No deployment is performed by the local implementation work.

Configure the deployment environment with the Clerk publishable key and secret key from the correct production application. `.env.example` lists the expected route and redirect settings. Never commit credentials.

Configure the deployed domain and enabled authentication methods in Clerk. Build with the same public key that will be used at runtime. The root landing page remains public; `/dashboard` checks Clerk authentication before rendering.

Set `NEXT_PUBLIC_CONVEX_URL` for the intended Convex deployment. Set its `CLERK_FRONTEND_API_URL` environment variable to the issuer of the matching Clerk instance, then sync `convex/auth.config.ts` to that same deployment. Production Convex must trust the production Clerk issuer; do not reuse development Clerk keys or issuer on the production application.

No Supabase, Drizzle or AI credentials are required. Push delivery uses the existing VAPID settings on Convex; reminder scheduling uses the explicit background-job flag described below. Remove obsolete variables from your hosting configuration when you retire the old deployment. Local cleanup does not delete the hosted database or disable SQL jobs already scheduled in Supabase; review and retire those separately in that service. The previous GitHub roll-forward workflow has been removed from source and its scheduled trigger is removed when that change reaches the repository's default branch.

Before release, verify `/`, `/login`, `/signup`, and `/api/health`; test sign-up, verification, sign-in, sign-out, and signed-out access to `/dashboard`. Do not treat a successful build without keys as an end-to-end authentication test.

## Notification scheduling and database I/O

The reminder scheduler is opt-in per Convex deployment through `TEMPO_BACKGROUND_JOBS_ENABLED=true`. Configure this in Convex deployment environment variables; Next.js `.env.local` does not configure backend runtime variables. Leave the flag unset or false in development/preview unless deliberately testing scheduled reminders. Do not set a project-wide true default for every deployment.

Before deploying the new backend to production, set the flag to true on that production deployment. Deploy the code and new additive scheduling table/indexes, then initialize existing accounts with the internal bounded bootstrap or let the hourly reconciliation initialize them. Newly created accounts and task/preference edits maintain their schedules automatically. Verify bootstrap completion and an actual near-future reminder before considering rollout complete.

The minute-by-minute account/task scan is removed from cron scheduling. Due reminders use task-specific scheduled callbacks and stale-job guards. Hourly reconciliation reads indexed due schedules and uninitialized accounts; it is not a recurring full task scan. Owner daily work and roll-forward notifications are deduplicated, with roll-forward maintenance at an hourly cadence. Existing recurrence extension remains independent.

Scheduled callbacks reread current preferences/task state before delivery. Push delivery also rejects obsolete task generations or preference snapshots. Explicit test push remains available without enabling the background-job flag. Turning the flag off stops automatic reminder processing. After initial rollout or re-enabling, run internal `notificationScheduling:bootstrapOwners` with `{"force":true}` once on the intended deployment to rebuild schedules for changes made while disabled. The rebuild is paginated; normal hourly recovery does not repeat this full rebuild. Previously accrued database I/O is not reset.

Validate with `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. Compare Production and Development Database I/O over equal post-rollout windows; do not infer savings from a successful build alone.
