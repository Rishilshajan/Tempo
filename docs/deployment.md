# Development → PR → Production

Convex code is deployed, not copied between databases. Schema, indexes,
queries, mutations, actions, auth config and crons come from `convex/` in Git.
Development records and dashboard environment variables are not copied.
Keep development on giddy-corgi-8 and production on colorless-oyster-445.

## One-time setup

1. In GitHub, protect `master` with a ruleset requiring PRs and the **Lint,
   types, tests and build** check. The workflow runs on PRs, pushes to master,
   and manual dispatch. It needs no secrets and tests only in-memory data.
2. In Convex → **Production / colorless-oyster-445 → Settings**, generate a
   production deploy key with `deployment:deploy` permission. In Vercel →
   Environment Variables, add `CONVEX_DEPLOY_KEY` scoped to **Production only**.
   Do not paste keys into Git, chat or workflow files.
3. Vercel Production must also have the live Clerk publishable and secret
   keys. Convex Production must retain the production `CLERK_FRONTEND_API_URL`
   issuer and enabled Clerk Convex integration. These are configured once in
   the respective dashboards, not copied from `.env.local`.
4. For PR previews, add a **Convex preview deploy key** in Vercel scoped only
   to Preview. Configure Convex project default preview environment variables
   and matching Clerk test keys in Vercel Preview. Preview backends are separate
   from production; without a preview deploy key, preview builds intentionally
   fail rather than using the production key.
5. Vercel must use `master` as its Production Branch and the repository root
   (the folder containing package.json) as Root Directory. The committed
   `vercel.json` sets the build command. Remove any conflicting dashboard Build
   Command override or set it to `npm run deploy:vercel`. Install dev dependencies
   too; the checks require TypeScript, ESLint and esbuild.

## Normal workflow

Develop using `npx convex dev` → verify locally → push a feature branch → open
a PR → GitHub checks pass → merge to `master` → Vercel runs `npm run ci` →
Convex CLI builds Next.js using the target backend URL → Convex schema/functions/
indexes/crons deploy → Vercel publishes the frontend.

The build command explicitly passes `NEXT_PUBLIC_CONVEX_URL` from the deploy-key
target, avoiding a stale development URL. The resolved production URL is checked
inside Convex's build callback before code is pushed, without assuming a secret
key text format. GitHub Actions does not separately deploy Convex,
so there are no competing GitHub/Vercel backend deployment jobs. A direct push
still runs Vercel's own checks even if branch protection is bypassed.

## Limits and failures

- A schema deployment validates existing production data. Incompatible required
  fields need an optional-field deployment, an explicit production data migration,
  then stricter validation. Deploying code does not migrate existing records.
- Changed cron definitions deploy with code; already scheduled jobs and existing
  records are not reset. Never seed demo records as a production build step.
- A failed check/build/deploy stops publication. Vercel and Convex are not an
  atomic transaction: if frontend publication fails after the backend deployed,
  the previous frontend remains. Keep backend changes backward compatible and
  inspect both build logs and Convex logs before retrying.
- Rolling back Vercel does not roll back Convex code or database data. Review and
  redeploy compatible Convex code separately when needed.
- CI's build uses no auth secrets; it checks compilation, not live login. Verify
  signup/login and task creation on the deployed preview before merging.

Manual recovery only (normally unnecessary): from an authenticated local checkout,
`npx convex deploy --dry-run` previews the default production target, then
`npx convex deploy` deploys code. Do not export/import development data for a
normal release.

References: [Convex + Vercel](https://docs.convex.dev/production/hosting/vercel),
[Convex deploy](https://docs.convex.dev/cli/reference/deploy).
