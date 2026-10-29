# Deploying the Tempo foundation

Deploy the Next.js project from this directory using your existing hosting provider. No deployment is performed by the local implementation work.

Configure the deployment environment with the Clerk publishable key and secret key from the correct production application. `.env.example` lists the expected route and redirect settings. Never commit credentials.

Configure the deployed domain and enabled authentication methods in Clerk. Build with the same public key that will be used at runtime. The root landing page remains public; `/dashboard` checks Clerk authentication before rendering.

Set `NEXT_PUBLIC_CONVEX_URL` for the intended Convex deployment. Set its `CLERK_FRONTEND_API_URL` environment variable to the issuer of the matching Clerk instance, then sync `convex/auth.config.ts` to that same deployment. Production Convex must trust the production Clerk issuer; do not reuse development Clerk keys or issuer on the production application.

No Supabase, Drizzle, AI, push, or cron credentials are required by the current source. Remove obsolete variables from your hosting configuration when you retire the old deployment. Local cleanup does not delete the hosted database or disable SQL jobs already scheduled in Supabase; review and retire those separately in that service. The previous GitHub roll-forward workflow has been removed from source and its scheduled trigger is removed when that change reaches the repository's default branch.

Before release, verify `/`, `/login`, `/signup`, and `/api/health`; test sign-up, verification, sign-in, sign-out, and signed-out access to `/dashboard`. Do not treat a successful build without keys as an end-to-end authentication test.
