import { spawnSync } from "node:child_process";

// Vercel is the sole deployer. GitHub Actions checks PRs without deploy secrets.
const key = process.env.CONVEX_DEPLOY_KEY?.trim();
if (!key) throw new Error("Set CONVEX_DEPLOY_KEY in Vercel for this environment.");
process.env.CONVEX_DEPLOY_KEY = key;
if (process.env.VERCEL_ENV === "production") {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_") ||
      !process.env.CLERK_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error("Vercel Production requires both live Clerk keys.");
  }
} else if (process.env.VERCEL_ENV === "preview") {
  if (!key.startsWith("preview:")) {
    throw new Error("Vercel Preview requires a separate Convex preview deploy key.");
  }
} else {
  throw new Error("This command is for Vercel builds. Use convex dev locally.");
}

function run(command, args, shell = false) {
  const result = spawnSync(command, args, { stdio: "inherit", shell });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("npm", ["run", "ci"], process.platform === "win32");
// Convex builds the frontend with the target URL, then pushes the backend.
// Vercel publishes the frontend only after this command succeeds.
run(process.execPath, ["node_modules/convex/bin/main.js", "deploy",
  "--typecheck", "enable",
  "--cmd-url-env-var-name", "NEXT_PUBLIC_CONVEX_URL",
  "--cmd", "node scripts/build-convex-target.mjs"]);
