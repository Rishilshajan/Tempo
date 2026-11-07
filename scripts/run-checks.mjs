import { spawnSync } from "node:child_process";

// Only offline/in-memory checks. Never run auth-policy, seeding or cleanup
// scripts against a live deployment from CI.
const checks = [
  "check-typescript-any",
  "check-deployment-target",
  "check-clerk-config", "check-domain-validation", "check-domain-settings",
  "check-task-validation", "check-task-handlers", "check-task-details",
  "check-recurrence", "check-session-series", "check-roll-forward",
  "check-today-dashboard", "check-calendar", "check-kanban",
  "check-overlay-history", "check-verification-data",
  "check-notifications", "check-notification-worker",
];
for (const check of checks) {
  console.log(`\nRunning ${check}`);
  const result = spawnSync(process.execPath, ["--experimental-strip-types", `scripts/${check}.mjs`], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
