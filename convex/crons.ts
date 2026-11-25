import { cronJobs, makeFunctionReference } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("tempo-notification-recovery", { hours: 1 },
  makeFunctionReference<"mutation", Record<string, never>>("notificationScheduling:reconcile"), {});
// Local midnight is different for each task. Catch up safely after any missed run.
crons.interval(
  "tempo-roll-forward",
  { hours: 1 },
  makeFunctionReference<"mutation", Record<string, never>>("notificationScheduling:runMaintenance"),
  {},
);
crons.interval(
  "extend-recurring-sessions",
  { hours: 6 },
  internal.series.extend,
  {},
);
export default crons;
