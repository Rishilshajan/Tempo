# Clerk on tempo-rs.vercel.app

Use the app-origin Frontend API proxy:
`https://tempo-rs.vercel.app/__clerk`. No vercel.app DNS changes are required.

## Verified in this checkout

- Installed `@clerk/nextjs` 7.9.22 supports auto-proxy. The installed middleware
  enables its Frontend API proxy for live keys on `.vercel.app` request hosts.
- `src/proxy.ts` explicitly matches `/__clerk/:path*`.
- ClerkProvider uses `/login`, `/signup`, and `/dashboard` redirects.
- No explicit Clerk domain or proxyUrl overrides are set by the app.

## Vercel Production environment

Configure both keys from the SAME Clerk Production instance:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_<production value>
CLERK_SECRET_KEY=sk_live_<production value>
CLERK_FRONTEND_API_URL=<actual Clerk Production JWT issuer URL>
NEXT_PUBLIC_CONVEX_URL=<production Convex deployment URL>
```

Do not use the development noble-ferret issuer alongside production keys. Tempo's
configuration guard compares the publishable key's domain with that issuer and
disables Clerk rendering if they differ. The Frontend API proxy route is not a
replacement for the JWT issuer: copy the Production issuer from Clerk's Convex
integration/JWT configuration and use it on the corresponding Convex deployment
as well (`applicationID: convex`). Enable Clerk's Convex integration in Production.
Keep development configuration and users separate.

Vercel auto-proxy's client-side configuration reads `VERCEL_TARGET_ENV=production`
and `VERCEL_PROJECT_PRODUCTION_URL=tempo-rs.vercel.app`. These are Vercel system
environment variables; ensure system environment variables are available to the
deployment. Do not set `CLERK_DISABLE_AUTO_PROXY=true` or add conflicting explicit
Clerk domain/proxy overrides. Redeploy after changing build-time public keys.

## Verification still required in the hosted account

The Vercel environment has not been inspected from this checkout. Never paste the
secret key into chat. Confirm the two live prefixes in Vercel Project Settings →
Environment Variables → Production, then redeploy this checkout. The public key
is compiled into the client; changing only runtime settings is insufficient.

In a private browser, test sign-up, email verification, sign-out/sign-in, password
reset code, and access to the authenticated Convex dashboard. Browser Network
requests should use `https://tempo-rs.vercel.app/__clerk/...` successfully. Verify
Clerk Production logs and the Convex auth identity after login.

For this vercel.app setup, use the shared accounts.dev email infrastructure for
sign-in, sign-up, verification codes and password reset code emails. Email code
flows do not require branded email DNS. Custom branded email templates, email
link authentication and app/organization invitations should use a custom domain
when those capabilities are needed.
