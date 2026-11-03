import { spawnSync } from "node:child_process";
import { validateDeploymentTarget } from "./deployment-target.mjs";

// Convex supplies the authenticated target URL to --cmd before pushing code.
validateDeploymentTarget(process.env.VERCEL_ENV, process.env.NEXT_PUBLIC_CONVEX_URL);
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build", "--webpack"], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
