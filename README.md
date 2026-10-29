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

This checkout is linked to the existing `giddy-corgi-8` development deployment, and its auth configuration has been synced with the `noble-ferret-167` issuer. Use `npx convex dev --once --typecheck enable` for subsequent syncs. Do not create a different project or anonymous local backend. Existing remote functions must be inspected before pushing a new local function set. No task tables or task functions are introduced by this integration.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/login/[[...login]]` | Sign-in and Clerk's additional flow steps |
| `/signup/[[...signup]]` | Sign-up and Clerk's additional flow steps |
| `/dashboard` | Protected Today empty-state foundation, with sign out |
| `/api/health` | Database-independent health response |

`/sign-in` and `/sign-up` are aliases for the existing `/login` and `/signup` URLs. Former task routes redirect to `/dashboard`. The installed PWA also starts at `/dashboard`.

## Current scope

Today currently provides a responsive shell and a minimal empty state with Create Task and Create Domain actions. At the user's request this step is UI only: the actions show a coming-next notification, search and future navigation are disabled, and no creation forms or product queries are introduced. The reusable empty-state component renders only when both supplied totals are zero; the page supplies explicit zero totals until task/domain persistence and returning-user content are implemented.

The old Supabase authentication, Drizzle/Postgres integration, task/domain/settings screens, server actions, database migration files, push delivery, and scheduled GitHub roll-forward workflow have been removed from this source tree. No remote database, account, deployment, or hosted scheduled job was deleted or changed. A preexisting `.env` was backed up locally to the ignored `.env.legacy.local` before disconnecting its old variables. That backup is not loaded by Next.js.

The documents under `docs/` describe the previous application and are historical references, not the current architecture. Build the next product screens incrementally from this foundation. Convex authentication wiring is present; product tables and task functions remain to be built. Existing users and data have not been migrated into Clerk.

## Checks

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

The development and production scripts use Next.js's Webpack compiler because Turbopack workers fail in this Windows environment. Next/font downloads Inter at build time, so the builder needs access to Google Fonts.

## References

- [Clerk Next.js setup](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Clerk SignIn component](https://clerk.com/docs/nextjs/reference/components/authentication/sign-in)
- [Convex and Clerk](https://docs.convex.dev/auth/clerk)
