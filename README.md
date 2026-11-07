# Tempo

A clean Next.js App Router foundation with the public landing page and Clerk authentication. TypeScript, Tailwind CSS, Inter, Sage Focus tokens, and shared Base UI/shadcn primitives are retained.

## Local development

Run `npm install`, then `npm run dev` from this directory. The development server prints its local URL.

The landing page and authentication shell can render without credentials. The authentication pages show an explicit unavailable state until Clerk is configured; they do not collect passwords or simulate signing in.

## Connect Clerk

1. Select or create your Tempo application in the Clerk Dashboard.
2. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env` (or `.env.local`), using `.env.example` as a reference. Preserve the existing Convex deployment settings in `.env.local`. Keep the secret on the server. Do not paste credentials into chat or commit them.
3. Configure the sign-in methods, verification requirements, profile fields, and any social providers you want in Clerk. Only methods enabled for that application will appear. Password recovery and verification are handled by Clerk.
4. Restart the development server after changing environment variables. Use the same keys during the production build and deployment.
5. Open `/signup`, create a test account yourself, and confirm it reaches the protected Today screen at `/dashboard` after Clerk verifies the session. Sign out, then sign in through `/login`. Successful sign-in and sign-up always redirect to `/dashboard`; already-signed-in visitors to either authentication page redirect there too.

The SDK uses `ClerkProvider` inside the root body and `clerkMiddleware` in Next.js 16's `src/proxy.ts`. The dashboard checks the verified user from `auth()` at the resource boundary and redirects signed-out requests to `/login`. The prebuilt Clerk components own authentication, password handling, verification, and recovery; there are no custom credential forms.

### Signup fields and password policy

Account creation requires Name, Email and Password. Clerk's `first_name` field is labelled Name in Tempo. Returning users sign in with Email and Password; name is not an authentication identifier.

The signup card displays the required password guidance: at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character. Clerk must enforce these settings in its instance policy for signup and password changes; the guidance alone is not validation. Keep compromised-password rejection and Clerk's minimum-strength checks enabled.

Run `node scripts/check-auth-policy.mjs` to read the selected issuer's public settings and verify all three required fields and all five password rules. This check sends no credentials and changes no settings. The policy was verified for the `noble-ferret-167` development application on 29 October 2026. Both local Clerk keys must belong to that same instance before testing the local forms.

When an issuer is configured, Tempo checks that the publishable key matches it before rendering authentication. A mismatched application remains unavailable instead of silently signing users into a different Clerk instance.

The existing shared components and Tempo theme remain in use; HeroUI has not been added as a second component system.

## Connect Convex to Clerk

The intended deployment is `https://giddy-corgi-8.convex.cloud`. Set `NEXT_PUBLIC_CONVEX_URL` locally before starting Next.js. Set `CLERK_FRONTEND_API_URL` to the issuer of the same Clerk application as both keys. The public key, secret key and issuer must agree; do not mix keys from two Clerk applications.

`ConvexClientProvider` wraps the protected route group beneath `ClerkProvider` and uses `ConvexProviderWithClerk`. Public marketing and authentication pages remain independent of Convex.

Enable the native Convex integration in the Clerk Dashboard. Alternatively, Convex supports a JWT template named `convex` with audience `convex`. The idempotent `node scripts/configure-clerk-convex.mjs` checks the keys, issuer and template without displaying secrets. `--apply` creates the supported template fallback if absent; it will not overwrite a conflicting existing template.

The backend validation configuration is in `convex/auth.config.ts`. Convex does not read the Next.js environment file, so configure its issuer separately on the existing deployment:

```sh
npx convex login
npx convex env set CLERK_FRONTEND_API_URL <matching-Clerk-Frontend-API-URL> --deployment giddy-corgi-8
```

This checkout is linked to the existing `giddy-corgi-8` development deployment, and its auth configuration has been synced with the `noble-ferret-167` issuer. Use `npx convex dev --once --typecheck enable` for subsequent syncs. Do not create a different project or anonymous local backend. Existing remote functions must be inspected before pushing a new local function set. Domain and task functions use this same authenticated deployment.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/login/[[...login]]` | Sign-in and Clerk's additional flow steps |
| `/signup/[[...signup]]` | Sign-up and Clerk's additional flow steps |
| `/dashboard` | Protected Today Command Center and creation sheets |
| `/dashboard?view=all` | My Tasks: accumulated upcoming, current, and completed tasks |
| `/api/health` | Database-independent health response |

`/sign-in` and `/sign-up` are aliases for the existing `/login` and `/signup` URLs. `/my-tasks` redirects to `/dashboard?view=all`; other former task routes redirect to `/dashboard`. The installed PWA also starts at `/dashboard`.

## Current scope

Today provides a responsive shell and a minimal empty state with Create Task and Create Domain actions. Create Domain opens the shared right-side sheet, with name, optional purpose, seven colors, eight Lucide icons, and a live badge preview. Create Task opens a compact sheet with title, description, optional domain, priority, flexible/fixed scheduling, estimated hours/minutes, and dated or undated subtasks. The sheet reuses Select, DatePicker, Calendar, TimePicker, and Sheet. Search and remaining navigation are reserved for later steps.

Domains persist in Convex through `domains.create`, `domains.update`, `domains.remove`, and an indexed, paginated `domains.list` query. Every operation requires a verified Clerk identity; ownership comes from its token identifier, never a user ID supplied by the browser. Update and delete also verify the stored owner. Reactive results update plain icon-and-text navigation rows in the sidebar and mobile More sheet. Their three-dot menus reuse the existing shared DropdownMenu, editing reuses the domain sheet, and deletion requires confirmation. Domains are classifications, so Today does not display a domain grid or domain-created onboarding content. Selecting a domain filters its tasks. Tasks retain their content if a domain is deleted and display as Uncategorized.

Tasks persist in a single `tasks` table, with up to 30 embedded subtasks saved atomically. `tasks.create` validates domain ownership and uses an indexed submission UUID for idempotency. `src/lib/validation/task.ts` shares Zod rules between the sheet and mutation, including calendar dates, timezone, end-after-start, and an estimate that fits the fixed window. Estimates store whole minutes; the UI accepts hours and minutes. Completion and subtask completion timestamps are saved through owner-checked `tasks.setCompleted`.

`tasks.list` uses bounded pagination and owner indexes for My Tasks and domain views. My Tasks includes upcoming and completed work. `tasks.hasAny` prevents the initial onboarding state from appearing for an account whose tasks are only future-dated or completed.

The populated Today Command Center uses `dashboard.feed` to page through the selected day's dated work, overlapping fixed intervals, completed work, and (on Today only) open backlog. All pages load before publishing totals; overlapping feeds deduplicate parent task IDs, and subtasks do not add workload. Fixed estimates prorate across day boundaries, falling back to scheduled duration; flexible work uses its estimate. The full-day timeline uses actual timestamps, adjacent overlap lanes, and the local day's true length across DST. Date navigation follows the today-or-later policy. Future days show their own planned work rather than today's undated tasks or backlog. The timezone comes from the device/browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`, not IP geolocation; the timeline displays its friendly name and UTC offset while preserving IANA IDs for scheduling. Today, My Tasks, and domain views share the full-width content alignment. Mobile places Create Task below the date controls; desktop keeps it in the top bar.

Today includes a user-selected focus anchor, expandable due-date alerts, allocation totals, domain and task-type filters, priority ordering, completion, and task details. `dailyFocus` stores one owned task selection per user/date; completed or rescheduled-out tasks stop appearing as the anchor. Three additional task indexes support work-date, fixed-end-time, and completion-time feeds. `tasks.get` and `tasks.reschedule` verify ownership; rescheduling reuses Zod validation and preserves subtask dates and recurrence anchors. Quick Add and timeline hours prefill the existing task sheet. Unfinished work stays visible without copying rows or changing its original deadline. Daily capacity, hard-deadline categories, focus timers, and actual time tracking are not part of the current model.

Repeat supports Daily, Weekly, Monthly, and Custom intervals in days/weeks/months, with Never, On a date, and After N occurrences endings. Completion creates one next occurrence atomically with the completion update. Each occurrence has a stable series root, ordinal, and idempotency key; undo/re-complete retains the already-created next occurrence. Count limits include the first task, and end dates are inclusive. Monthly dates stay anchored to the original day, clamping to the shorter month's last day. Fixed-time repeats preserve the original local start time and elapsed duration across DST; nonexistent times move forward and ambiguous times use the earlier occurrence. Subtasks reset and retain relative date offsets. Existing tasks without repeat settings remain ordinary tasks.

Draft persistence, natural-language drafting, overlap detection, and task-detail activity remain future work. Fixed-time overlaps are saved as entered. No AI or draft controls are presented.

All editable date pickers enforce today or later, including non-repeating tasks and subtasks. The shared DatePicker applies this floor by default, refreshes it when opened and at date boundaries, and allows callers only to tighten it. Shared Zod checks enforce the same date policy on the server using the task's timezone. Repeating fixed-time tasks also reject elapsed start times, and repeat end dates cannot precede the first occurrence. Invalid values remain visible until corrected. Validation and save failures use a deduplicated toast plus inline feedback. Existing overdue tasks remain readable and completable without changing their historical deadlines. Retry lookup precedes clock-sensitive checks so a successful save can be retried safely after midnight.

Late recurring completions advance to the next valid calendar slot rather than generating expired tasks or dated subtasks. This uses a bounded search, preserves the series anchor and relative subtask offsets, respects inclusive end dates, and counts actual generated occurrences separately from skipped slots. Existing records use optional recurrence-slot metadata for compatibility.

`src/lib/validation/domain.ts` shares Zod rules between the form and mutation: trimmed name (1–80 characters), optional purpose (up to 500), supported color/icon identifiers, and a UUID submission identifier. Convex also validates arguments and results at the API boundary. Submission identifiers make retries idempotent. Errors keep the sheet open and preserve its values. Schema and functions are synced to the existing development deployment; live creation should be checked using your signed-in session.

The old Supabase authentication, Drizzle/Postgres integration, task/domain/settings screens, server actions, database migration files, push delivery, and scheduled GitHub roll-forward workflow have been removed from this source tree. No remote database, account, deployment, or hosted scheduled job was deleted or changed. A preexisting `.env` was backed up locally to the ignored `.env.legacy.local` before disconnecting its old variables. That backup is not loaded by Next.js.

The documents under `docs/` describe the previous application and are historical references, not the current architecture. Build subsequent product screens incrementally from this foundation. Existing legacy users and data have not been migrated into Clerk or Convex.

## Checks

Account-backed verification fixtures are managed separately by `scripts/manage-verification-data.mjs`. The authorized October 30–31 batch uses `[Demo]` task/domain labels and an ignored `.tempo-verification.local.json` manifest containing exact record IDs and submission UUIDs. `node scripts/manage-verification-data.mjs verify` checks the tracked batch. After the user finishes verification, `node scripts/manage-verification-data.mjs cleanup` removes only matching owned records and their sample focus references, preserving original records and any sample domain adopted by a real task. The Convex helpers are admin-only internal functions; they are not exposed through the browser API. Do not clean up before verification is complete.

Use `/dashboard?demo=1` for the optional Today dashboard sample view, with separate sample tasks for today and tomorrow. The preview reuses the actual shell, timeline, filters, and sheets. Sample tasks/domains and preview edits stay in component memory; no dummy records are sent to Convex or included in real My Tasks/domain lists. **Clear sample data & exit** clears the preview and returns to the real workspace. Leaving the preview releases its state, and an open preview expires after tomorrow. Reloading the sample URL deliberately starts a fresh sample session.

- `npx tsc --noEmit`
- `npm run build`
- `node scripts/check-domain-validation.mjs` (Node 22.18+ with native TypeScript stripping)
- `node scripts/check-task-validation.mjs` (Node 22.18+)
- `node scripts/check-task-handlers.mjs` (local handler tests using the existing Convex/esbuild toolchain; no live writes)
- `node scripts/check-recurrence.mjs` (recurrence dates, ending rules, and DST)
- `node scripts/check-today-dashboard.mjs` (day membership, overlaps, allocation, timezones/DST, pagination, owner isolation, focus, and rescheduling; local fixtures only)
- `node scripts/check-verification-data.mjs` (in-memory tests of bounded seed/cleanup, ownership, idempotency, and preservation of original records)

The development and production scripts use Next.js's Webpack compiler because Turbopack workers fail in this Windows environment. Next/font downloads Inter at build time, so the builder needs access to Google Fonts.

## References

- [Clerk Next.js setup](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Clerk SignIn component](https://clerk.com/docs/nextjs/reference/components/authentication/sign-in)
- [Convex and Clerk](https://docs.convex.dev/auth/clerk)

## Notifications and device push

In-app reminders use the Convex notification cron and work independently of push.
Deploy the Convex schema and functions along with the frontend.

To enable push, generate a VAPID key pair once per environment with
`npx web-push generate-vapid-keys`. Set `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (a contact mailto URI) on that
Convex deployment. Set the same public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
on the corresponding Next.js deployment and rebuild the frontend.
Keep the private key in Convex.

To verify delivery, enable notifications from Settings → Notifications &
Reminders on each device. On iOS or iPadOS, install Tempo to the Home Screen
and open it there before enabling push. Schedule a fixed task with a reminder
lead time that will become due shortly, close Tempo, and confirm that the device
shows the reminder and that tapping it opens the task. Repeat on a desktop
browser and Android, then verify inbox clearing and both quiet-hours policies.
